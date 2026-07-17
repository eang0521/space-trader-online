import { GameState, GameAction } from '../types';
import { BotConfig } from './types';
import { enumerateCandidates, applyBotAction } from './candidates';

const SPENDING_TYPES = new Set<GameAction['type']>(['MOVE', 'GATHER', 'SELL', 'DRAW_PRIVATE_BUYER']);

type ValueFn = (state: GameState, playerIndex: number) => number;

// Apply all available free (zero-cost) actions before a search node is evaluated.
// Includes REMOVE_BUYER always, and private SELL during game_end_phase (those are free).
function drainFreeActions(state: GameState, playerIndex: number): { state: GameState; actions: GameAction[] } {
  let s = state;
  const actions: GameAction[] = [];
  for (let guard = 0; guard < 16; guard++) {
    const freeAction = enumerateCandidates(s, playerIndex).find(
      (a) => a.type === 'REMOVE_BUYER' || (a.type === 'SELL' && s.status === 'game_end_phase'),
    );
    if (!freeAction) break;
    try {
      s = applyBotAction(s, playerIndex, freeAction);
    } catch {
      break;
    }
    actions.push(freeAction);
  }
  return { state: s, actions };
}

// Recursive full-turn tree search. Explores every sequence of spending actions
// (branching factor ~5-8, depth = actionsRemaining ≤ 3, so ≤ ~500 leaf nodes)
// and returns the action sequence that leads to the highest-valued final state.
function searchTurn(
  state: GameState,
  playerIndex: number,
  valueFunc: ValueFn,
): { actions: GameAction[]; score: number } {
  const { state: s, actions: freeActions } = drainFreeActions(state, playerIndex);

  const candidates = enumerateCandidates(s, playerIndex).filter((a) => SPENDING_TYPES.has(a.type));

  if (candidates.length === 0 || s.actionsRemaining <= 0 || s.currentPlayerIndex !== playerIndex) {
    return { actions: freeActions, score: valueFunc(s, playerIndex) };
  }

  let bestActions: GameAction[] | null = null;
  let bestScore = -Infinity;

  for (const action of candidates) {
    try {
      const nextState = applyBotAction(s, playerIndex, action);
      const { actions: subActions, score } = searchTurn(nextState, playerIndex, valueFunc);
      if (score > bestScore) {
        bestScore = score;
        bestActions = [...freeActions, action, ...subActions];
      }
    } catch {
      // skip invalid actions
    }
  }

  if (bestActions === null) {
    return { actions: freeActions, score: valueFunc(s, playerIndex) };
  }

  return { actions: bestActions, score: bestScore };
}

export function planBotTurn(
  initialState: GameState,
  playerIndex: number,
  config: BotConfig,
): GameAction[] {
  const { actions } = searchTurn(initialState, playerIndex, config.valueFunction);
  return actions;
}
