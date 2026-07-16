import { GameState } from '../types';

export type ValueFunction = (state: GameState, playerIndex: number) => number;

export interface BotConfig {
  valueFunction: ValueFunction;
}
