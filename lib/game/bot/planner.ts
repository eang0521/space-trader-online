import { GameState, GameAction } from '../types';
import { BotConfig } from './types';
import { enumerateCandidates, applyBotAction } from './candidates';

// Greedily plan the bot's actions for one full turn, returning the list of
// actions taken (not including the final END_TURN).
export function planBotTurn(
  initialState: GameState,
  playerIndex: number,
  config: BotConfig,
): GameAction[] {
  const actions: GameAction[] = [];
  let state = initialState;

  for (let step = 0; step < 10; step++) {
    // Stop if it's no longer the bot's turn (safety guard)
    if (state.currentPlayerIndex !== playerIndex || state.actionsRemaining <= 0) break;

    const candidates = enumerateCandidates(state, playerIndex);
    if (candidates.length === 0) break;

    let bestAction: GameAction | null = null;
    let bestScore = -Infinity;

    for (const action of candidates) {
      if (action.type === 'END_TURN') continue; // evaluated last
      try {
        const nextState = applyBotAction(state, playerIndex, action);
        const score = config.valueFunction(nextState, playerIndex);
        if (score > bestScore) {
          bestScore = score;
          bestAction = action;
        }
      } catch {
        // Skip actions that throw (shouldn't happen if candidates are valid)
      }
    }

    // Compare the best non-END_TURN action against just ending the turn now
    const endTurnScore = config.valueFunction(state, playerIndex);
    if (bestAction === null || endTurnScore >= bestScore) break;

    actions.push(bestAction);
    state = applyBotAction(state, playerIndex, bestAction);
  }

  return actions;
}
