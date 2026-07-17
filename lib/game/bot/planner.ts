import { GameState, GameAction } from '../types';
import { BotConfig } from './types';
import { enumerateCandidates, applyBotAction } from './candidates';

// The action types that consume action points. The bot must keep taking actions
// as long as any of these exist — unused actions are lost at end of turn, so
// there is never a reason to end early when a spending action is available.
const SPENDING_TYPES = new Set<GameAction['type']>(['MOVE', 'GATHER', 'SELL', 'DRAW_PRIVATE_BUYER']);

export function planBotTurn(
  initialState: GameState,
  playerIndex: number,
  config: BotConfig,
): GameAction[] {
  const actions: GameAction[] = [];
  let state = initialState;

  for (let step = 0; step < 10; step++) {
    if (state.currentPlayerIndex !== playerIndex || state.actionsRemaining <= 0) break;

    const candidates = enumerateCandidates(state, playerIndex).filter(
      (a) => a.type !== 'END_TURN',
    );

    // If no action-spending moves exist (only free REMOVE_BUYER or nothing), stop.
    // The engine already excludes moves that cost more actions than remain, so
    // any MOVE/GATHER/SELL/DRAW in candidates is genuinely executable.
    if (!candidates.some((a) => SPENDING_TYPES.has(a.type))) break;

    // Pick the highest-scoring candidate. The value function chooses WHICH action
    // to take; the loop above decides WHETHER to act at all.
    let bestAction: GameAction | null = null;
    let bestScore = -Infinity;

    for (const action of candidates) {
      try {
        const nextState = applyBotAction(state, playerIndex, action);
        const score = config.valueFunction(nextState, playerIndex);
        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      } catch {
        // skip actions that throw
      }
    }

    if (bestAction === null) break;

    actions.push(bestAction);
    state = applyBotAction(state, playerIndex, bestAction);
  }

  return actions;
}
