import { GameState, GameAction } from '../types';
import { BotConfig } from './types';
import { enumerateCandidates, applyBotAction } from './candidates';

const SPENDING_TYPES = new Set<GameAction['type']>(['MOVE', 'GATHER', 'SELL', 'DRAW_PRIVATE_BUYER']);

type ValueFn = (state: GameState, playerIndex: number) => number;

// Apply all available REMOVE_BUYER free actions before a search node is evaluated.
function drainFreeActions(state: GameState, playerIndex: number): { state: GameState; actions: GameAction[] } {
  let s = state;
  const actions: GameAction[] = [];
  for (let guard = 0; guard < 8; guard++) {
    const removeAction = enumerateCandidates(s, playerIndex).find((a) => a.type === 'REMOVE_BUYER');
    if (!removeAction) break;
    s = applyBotAction(s, playerIndex, removeAction);
    actions.push(removeAction);
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
