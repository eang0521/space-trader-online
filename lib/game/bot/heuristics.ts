import { GameState, ResourceColor } from '../types';
import { getBuyerDef } from '../engine';
import { ValueFunction } from './types';

// Rough per-cube value based on scarcity / deal demand
const CUBE_VALUE: Record<ResourceColor, number> = {
  blue: 1.5,
  green: 1.5,
  yellow: 1.5,
  white: 2.0,
  red: 2.0,
  black: 2.0,
};

function supplyValue(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  let v = 0;
  for (const cube of player.supply) v += CUBE_VALUE[cube.color];
  return v;
}

// Estimate how close a player is to completing market deals
function marketOpportunity(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  let opportunity = 0;

  const supplyColors: Partial<Record<ResourceColor, number>> = {};
  for (const cube of player.supply) {
    supplyColors[cube.color] = (supplyColors[cube.color] ?? 0) + 1;
  }

  for (const activeBuyer of state.market) {
    const def = getBuyerDef(activeBuyer.cardId);
    const incompleteDeals = def.deals.filter((d) => !activeBuyer.completedDealIds.includes(d.id));

    for (const deal of incompleteDeals) {
      let satisfied = 0;
      let total = 0;
      for (const req of deal.requirements) {
        total += req.count;
        satisfied += Math.min(req.count, supplyColors[req.color] ?? 0);
      }
      if (total > 0) {
        opportunity += (satisfied / total) * deal.credits * 0.4;
      }
    }
  }

  return opportunity;
}

export const ruleBasedValueFunction: ValueFunction = (state, playerIndex) => {
  const player = state.players[playerIndex];

  // Own score carries the most weight
  let value = player.score * 10;

  // Estimated value of cubes in hand
  value += supplyValue(state, playerIndex);

  // How close we are to cashing in on market deals
  value += marketOpportunity(state, playerIndex);

  // Penalise for each opponent credit (competitive element)
  for (let i = 0; i < state.players.length; i++) {
    if (i !== playerIndex) {
      value -= state.players[i].score * 2;
    }
  }

  return value;
};
