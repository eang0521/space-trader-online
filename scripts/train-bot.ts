/**
 * Bot training script — run with:
 *   npx ts-node --project tsconfig.scripts.json scripts/train-bot.ts
 *
 * Generates self-play episodes using the rule-based bot, collects (state, score)
 * pairs, and trains an MLP to predict each player's normalized final score from
 * any game state. Saves weights to scripts/weights.json after each epoch.
 *
 * To plug the trained model into the live bot, load weights.json and pass it
 * to learnedValueFunction() in lib/game/bot/model.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { GameState, LobbyPlayer, PlayerColor } from '../lib/game/types';
import { createInitialGameState } from '../lib/game/setup';
import { autoBotPlacement, runBotTurn, ruleBasedValueFunction } from '../lib/game/bot';
import { learnedValueFunction } from '../lib/game/bot/model';
import { encodeState } from '../lib/game/bot/encoder';
import {
  MLPWeights,
  AdamState,
  ForwardResult,
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

const NUM_PLAYERS = 2;        // players per training game (2 or 4)
const GAMES_PER_EPOCH = 100;  // self-play episodes per training epoch
const EPOCHS = 30;            // total training epochs
const BATCH_SIZE = 64;        // mini-batch size for gradient updates
const LEARNING_RATE = 3e-4;   // Adam learning rate
// After this epoch index the training bot switches from rule-based to the
// current learned model, creating a curriculum: learn from strong play first,
// then refine via self-play.
const CURRICULUM_SWITCH_EPOCH = 10;

const WEIGHTS_PATH = path.resolve(__dirname, 'weights.json');

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

  // Run the placement phase (applyPlacement advances currentPlayerIndex each call)
  let guard = 0;
  while (state.status === 'placement' && guard++ < 20) {
    state = autoBotPlacement(state, state.currentPlayerIndex);
  }

  return state;
}

// ---- Episode ----

interface StepRecord {
  stateVec: Float32Array;
  playerIndex: number;
}

function runEpisode(weights: MLPWeights | null): { records: StepRecord[]; finalScores: number[] } {
  let state = bootstrapGame();
  const records: StepRecord[] = [];
  const valueFunc = weights ? learnedValueFunction(weights) : ruleBasedValueFunction;

  // Playing phase
  let guard = 0;
  while (state.status === 'playing' && guard++ < 300) {
    const pi = state.currentPlayerIndex;
    records.push({ stateVec: encodeState(state, pi), playerIndex: pi });
    state = runBotTurn(state, pi, { valueFunction: valueFunc });
  }

  // Game-end phase: players sell private buyers
  guard = 0;
  while (state.status === 'game_end' && guard++ < 20) {
    const pi = state.currentPlayerIndex;
    records.push({ stateVec: encodeState(state, pi), playerIndex: pi });
    state = runBotTurn(state, pi, { valueFunction: valueFunc });
  }

  // Normalize final scores so targets live in [0, 1]
  const scores = state.players.map((p) => p.score);
  const maxScore = Math.max(...scores, 1);
  const finalScores = scores.map((s) => s / maxScore);

  return { records, finalScores };
}

// ---- Training ----

interface Experience {
  stateVec: Float32Array;
  target: number;
}

function buildExperiences(records: StepRecord[], finalScores: number[]): Experience[] {
  return records.map(({ stateVec, playerIndex }) => ({
    stateVec,
    target: finalScores[playerIndex] ?? 0,
  }));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Compute mean gradient across a mini-batch and apply one Adam step.
function trainBatch(
  weights: MLPWeights,
  adam: AdamState,
  batch: Experience[],
  lr: number,
): number {
  // Accumulate gradients
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
  // Resume from saved weights if available
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
  console.log(`Curriculum switch at epoch ${CURRICULUM_SWITCH_EPOCH} (rule-based → self-play)\n`);

  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const useLearnedBot = epoch >= CURRICULUM_SWITCH_EPOCH;
    const phaseLabel = useLearnedBot ? 'self-play' : 'rule-based';

    const allExperiences: Experience[] = [];
    let totalReward = 0;

    for (let g = 0; g < GAMES_PER_EPOCH; g++) {
      const { records, finalScores } = runEpisode(useLearnedBot ? weights : null);
      allExperiences.push(...buildExperiences(records, finalScores));
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
    console.log(
      `Epoch ${String(epoch + 1).padStart(2)} [${phaseLabel}] | ` +
      `${allExperiences.length} experiences | ` +
      `avg reward ${avgReward.toFixed(3)} | ` +
      `loss ${avgLoss.toFixed(5)}`,
    );

    fs.writeFileSync(WEIGHTS_PATH, serializeWeights(weights), 'utf8');
  }

  console.log(`\nDone. Weights → ${WEIGHTS_PATH}`);
  console.log('To use the trained model, add to your bot config:');
  console.log('  import { deserializeWeights, learnedValueFunction } from "@/lib/game/bot/model";');
  console.log('  import weightsJson from "@/scripts/weights.json";');
  console.log('  const valueFunction = learnedValueFunction(deserializeWeights(JSON.stringify(weightsJson)));');
}

main();
