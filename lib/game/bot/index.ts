export type { ValueFunction, BotConfig } from './types';
export { ruleBasedValueFunction } from './heuristics';
export { enumerateCandidates, buildBestSellDeals, applyBotAction } from './candidates';
export { planBotTurn } from './planner';
export { encodeState, ENCODING_SIZE } from './encoder';
export { learnedValueFunction, hybridValueFunction, createWeights, deserializeWeights } from './model';

import { GameState } from '../types';
import { addLog, advanceTurn, applyPlacement } from '../engine';
import { planBotTurn } from './planner';
import { applyBotAction } from './candidates';
import { ruleBasedValueFunction } from './heuristics';
import { BotConfig } from './types';

// Run a complete bot turn: plan actions, apply them, then advance to the next player.
// Returns the game state after the bot's turn ends.
export function runBotTurn(
  state: GameState,
  playerIndex: number,
  config?: Partial<BotConfig>,
): GameState {
  const botConfig: BotConfig = {
    valueFunction: config?.valueFunction ?? ruleBasedValueFunction,
  };

  const actions = planBotTurn(state, playerIndex, botConfig);

  let newState = state;
  for (const action of actions) {
    try {
      newState = applyBotAction(newState, playerIndex, action);
    } catch {
      break;
    }
  }

  // End the bot's turn
  newState = addLog(newState, playerIndex, 'ended their turn', 'end_turn');
  newState = advanceTurn(newState);

  return newState;
}

// Auto-place a bot ship during placement phase.
// Picks the edge planet with the most resource cubes for maximum early-game value.
export function autoBotPlacement(state: GameState, playerIndex: number): GameState {
  const EDGE_POSITIONS: [number, number][] = [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 3],
    [2, 0], [2, 3],
    [3, 0], [3, 1], [3, 2], [3, 3],
  ];

  const occupied = new Set(
    state.players
      .filter((p) => p.shipRow >= 0)
      .map((p) => `${p.shipRow},${p.shipCol}`),
  );

  let bestPos: [number, number] | null = null;
  let bestCubeCount = -1;

  for (const [r, c] of EDGE_POSITIONS) {
    if (occupied.has(`${r},${c}`)) continue;
    const cell = state.planetGrid[r]?.[c];
    if (!cell) continue;
    const cubeCount = Object.values(cell.cubes).filter((cube) => cube !== null).length;
    if (cubeCount > bestCubeCount) {
      bestCubeCount = cubeCount;
      bestPos = [r, c];
    }
  }

  if (!bestPos) return state; // no valid position (shouldn't happen)

  return applyPlacement(state, playerIndex, bestPos[0], bestPos[1]);
}
