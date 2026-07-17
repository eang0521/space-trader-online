/**
 * Bot training script — run with:
 *   npx ts-node --project tsconfig.scripts.json scripts/train-bot.ts
 *
 * Two improvements over the naive MC approach:
 *
 * 1. TD(λ) returns (λ=0.9)
 *    Instead of labeling every state with the flat final score, targets are
 *    computed via backward-view TD(λ):
 *      G_T = final_score
 *      G_t = (1−λ)·V(s_{t+1}) + λ·G_{t+1}
 *    This bootstraps off the model's own predictions, giving earlier states
 *    tighter, lower-variance targets and improving per-step credit assignment.
 *
 * 2. ε-greedy exploration
 *    With probability ε the bot takes a random legal action instead of the
 *    greedy one. ε decays exponentially from EPSILON_START→EPSILON_END over
 *    training. Without this, self-play converges to a single strategy and the
 *    model never discovers alternatives.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { GameState, LobbyPlayer, PlayerColor, GameAction } from '../lib/game/types';
import { createInitialGameState } from '../lib/game/setup';
import { autoBotPlacement, ruleBasedValueFunction, enumerateCandidates, applyBotAction } from '../lib/game/bot';
import { addLog, advanceTurn } from '../lib/game/engine';
import { hybridValueFunction, learnedValueFunction } from '../lib/game/bot/model';
import { encodeState } from '../lib/game/bot/encoder';
import {
  MLPWeights,
  AdamState,
  Gradients,
  createWeights,
  createAdamState,
  forward,
  backward,
  adamUpdate,
  serializeWeights,
  deserializeWeights,
} from '../lib/game/bot/model';

// ---- Hyperparameters ----

const NUM_PLAYERS = 2;
const GAMES_PER_EPOCH = 100;
const EPOCHS = 30;
const BATCH_SIZE = 64;
const LEARNING_RATE = 3e-4;
const CURRICULUM_SWITCH_EPOCH = 10;

// TD(λ): 1.0 = pure MC (no bootstrapping), 0.0 = pure TD(0)
const LAMBDA = 0.9;

// ε-greedy: probability of taking a random action instead of greedy
const EPSILON_START = 0.20;
const EPSILON_END = 0.02;

const WEIGHTS_PATH = path.resolve(__dirname, 'weights.json');

// Action types that spend action points (as opposed to free actions like REMOVE_BUYER)
const SPENDING_TYPES = new Set<GameAction['type']>(['MOVE', 'GATHER', 'SELL', 'DRAW_PRIVATE_BUYER']);

// ---- Game bootstrap ----

function makeTrainingPlayers(n: number): LobbyPlayer[] {
  const colors: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
  return Array.from({ length: n }, (_, i) => ({
    id: uuidv4(),
    sessionId: `bot:train:${i}`,
    displayName: `Bot${i + 1}`,
    color: colors[i],
    seatIndex: i,
    isHost: i === 0,
    isBot: true,
  }));
}

function bootstrapGame(): GameState {
  const players = makeTrainingPlayers(NUM_PLAYERS);
  let state = createInitialGameState(uuidv4(), 'TRAIN', players);
  let guard = 0;
  while (state.status === 'placement' && guard++ < 20) {
    state = autoBotPlacement(state, state.currentPlayerIndex);
  }
  return state;
}

// ---- ε-greedy action selection ----

function selectAction(
  state: GameState,
  pi: number,
  valueFunc: (s: GameState, p: number) => number,
  epsilon: number,
): GameAction | null {
  const candidates = enumerateCandidates(state, pi).filter((a) => a.type !== 'END_TURN');

  // Only act if there are action-spending moves available
  if (!candidates.some((a) => SPENDING_TYPES.has(a.type))) return null;

  if (Math.random() < epsilon) {
    // Explore: random legal action (including free ones)
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Exploit: highest-scoring action by value function
  let best: GameAction | null = null;
  let bestScore = -Infinity;
  for (const action of candidates) {
    try {
      const next = applyBotAction(state, pi, action);
      const score = valueFunc(next, pi);
      if (score > bestScore) {
        bestScore = score;
        best = action;
      }
    } catch {
      // skip invalid
    }
  }
  return best;
}

// ---- Episode ----

interface StepRecord {
  stateVec: Float32Array;
  playerIndex: number;
}

function runEpisode(
  weights: MLPWeights | null,
  epsilon: number,
): { records: StepRecord[]; finalScores: number[] } {
  let state = bootstrapGame();
  const records: StepRecord[] = [];

  // Hybrid for exploitation (rule-based signal + learned strategy)
  // Rule-based only during curriculum phase (weights = null)
  const valueFunc = weights
    ? hybridValueFunction(weights)
    : ruleBasedValueFunction;

  function recordTurn(pi: number): void {
    let guard = 0;
    while (state.currentPlayerIndex === pi && state.actionsRemaining > 0 && guard++ < 10) {
      const action = selectAction(state, pi, valueFunc, epsilon);
      if (!action) break;
      records.push({ stateVec: encodeState(state, pi), playerIndex: pi });
      state = applyBotAction(state, pi, action);
    }
    // Capture state after last action (actionsRemaining may be 0 or the last spend)
    records.push({ stateVec: encodeState(state, pi), playerIndex: pi });
    state = addLog(state, pi, 'ended their turn', 'end_turn');
    state = advanceTurn(state);
  }

  let guard = 0;
  while (state.status === 'playing' && guard++ < 300) {
    recordTurn(state.currentPlayerIndex);
  }
  guard = 0;
  while ((state.status === 'game_end_triggered' || state.status === 'game_end_phase') && guard++ < 20) {
    recordTurn(state.currentPlayerIndex);
  }

  const scores = state.players.map((p) => p.score);
  const maxScore = Math.max(...scores, 1);
  const finalScores = scores.map((s) => s / maxScore);

  return { records, finalScores };
}

// ---- TD(λ) target computation ----

interface Experience {
  stateVec: Float32Array;
  target: number;
}

// Backward-view TD(λ) computed per-player's state subsequence.
// Uses the pure learned model (not hybrid) for bootstrapping so the
// bootstrapped values are consistent with what we're training.
function computeTargets(
  records: StepRecord[],
  finalScores: number[],
  bootstrapWeights: MLPWeights | null,
  lambda: number,
): Experience[] {
  // During rule-based phase there's no learned model — fall back to plain MC
  if (!bootstrapWeights || lambda >= 1.0) {
    return records.map(({ stateVec, playerIndex }) => ({
      stateVec,
      target: finalScores[playerIndex] ?? 0,
    }));
  }

  const targets = new Float32Array(records.length);
  const numPlayers = Math.max(...records.map((r) => r.playerIndex)) + 1;

  for (let pi = 0; pi < numPlayers; pi++) {
    // Indices in `records` that belong to this player, in order
    const indices: number[] = [];
    for (let i = 0; i < records.length; i++) {
      if (records[i].playerIndex === pi) indices.push(i);
    }
    if (indices.length === 0) continue;

    const finalScore = finalScores[pi] ?? 0;

    // Last state in this player's sequence gets the MC return
    targets[indices[indices.length - 1]] = finalScore;

    // Backward pass: G_t = (1−λ)·V(s_{t+1}) + λ·G_{t+1}
    for (let k = indices.length - 2; k >= 0; k--) {
      const nextIdx = indices[k + 1];
      const vNext = forward(bootstrapWeights, records[nextIdx].stateVec).output;
      const gNext = targets[nextIdx];
      targets[indices[k]] = (1 - lambda) * vNext + lambda * gNext;
    }
  }

  return records.map(({ stateVec }, i) => ({ stateVec, target: targets[i] }));
}

// ---- Training ----

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trainBatch(
  weights: MLPWeights,
  adam: AdamState,
  batch: Experience[],
  lr: number,
): number {
  const accGrads: Gradients = {
    layers: weights.layers.map(({ w, b }) => ({
      gw: new Array(w.length).fill(0),
      gb: new Array(b.length).fill(0),
    })),
  };

  let totalLoss = 0;
  for (const { stateVec, target } of batch) {
    const result = forward(weights, stateVec);
    totalLoss += (result.output - target) ** 2;
    const grads = backward(weights, result, target);
    for (let l = 0; l < accGrads.layers.length; l++) {
      const dst = accGrads.layers[l];
      const src = grads.layers[l];
      for (let k = 0; k < dst.gw.length; k++) dst.gw[k] += src.gw[k] / batch.length;
      for (let k = 0; k < dst.gb.length; k++) dst.gb[k] += src.gb[k] / batch.length;
    }
  }

  adamUpdate(weights, accGrads, adam, lr);
  return totalLoss / batch.length;
}

// ---- Main ----

function main(): void {
  let weights: MLPWeights;
  if (fs.existsSync(WEIGHTS_PATH)) {
    console.log(`Resuming from ${WEIGHTS_PATH}`);
    weights = deserializeWeights(fs.readFileSync(WEIGHTS_PATH, 'utf8'));
  } else {
    console.log('Initializing fresh weights');
    weights = createWeights();
  }
  const adam = createAdamState(weights);

  console.log(`Training: ${EPOCHS} epochs × ${GAMES_PER_EPOCH} games, batch=${BATCH_SIZE}, lr=${LEARNING_RATE}`);
  console.log(`TD(λ=${LAMBDA}), ε ${EPSILON_START}→${EPSILON_END}, curriculum switch at epoch ${CURRICULUM_SWITCH_EPOCH}\n`);

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const useLearnedBot = epoch >= CURRICULUM_SWITCH_EPOCH;
    const phaseLabel = useLearnedBot ? 'self-play' : 'rule-based';

    // Exponential ε decay only during self-play phase
    const selfPlayEpoch = Math.max(0, epoch - CURRICULUM_SWITCH_EPOCH);
    const selfPlayTotal = EPOCHS - CURRICULUM_SWITCH_EPOCH;
    const epsilon = useLearnedBot
      ? EPSILON_START * Math.pow(EPSILON_END / EPSILON_START, selfPlayEpoch / selfPlayTotal)
      : 0; // no random exploration during rule-based curriculum

    const allExperiences: Experience[] = [];
    let totalReward = 0;

    for (let g = 0; g < GAMES_PER_EPOCH; g++) {
      const { records, finalScores } = runEpisode(useLearnedBot ? weights : null, epsilon);
      // TD(λ) targets during self-play, plain MC during rule-based phase
      const experiences = computeTargets(records, finalScores, useLearnedBot ? weights : null, LAMBDA);
      allExperiences.push(...experiences);
      totalReward += finalScores.reduce((s, v) => s + v, 0) / finalScores.length;
    }

    const avgReward = totalReward / GAMES_PER_EPOCH;
    const shuffled = shuffle(allExperiences);

    let totalLoss = 0;
    let batches = 0;
    for (let b = 0; b + BATCH_SIZE <= shuffled.length; b += BATCH_SIZE) {
      totalLoss += trainBatch(weights, adam, shuffled.slice(b, b + BATCH_SIZE), LEARNING_RATE);
      batches++;
    }

    const avgLoss = batches > 0 ? totalLoss / batches : 0;
    const epsStr = useLearnedBot ? ` ε=${epsilon.toFixed(3)}` : '';
    console.log(
      `Epoch ${String(epoch + 1).padStart(2)} [${phaseLabel}${epsStr}] | ` +
      `${allExperiences.length} exp | ` +
      `reward ${avgReward.toFixed(3)} | ` +
      `loss ${avgLoss.toFixed(5)}`,
    );

    fs.writeFileSync(WEIGHTS_PATH, serializeWeights(weights), 'utf8');
  }

  console.log(`\nDone. Weights → ${WEIGHTS_PATH}`);
}

main();
