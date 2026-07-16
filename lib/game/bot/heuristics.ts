import { GameState, ResourceColor } from '../types';
import { getBuyerDef } from '../engine';
import { ValueFunction } from './types';

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

// Reward being on or near planets that still have cubes.
// Without this, moving to a resource-rich planet looks identical to staying on a
// depleted one (no immediate score/supply change), causing the bot to end its turn
// prematurely instead of repositioning.
function locationValue(state: GameState, playerIndex: number): number {
  const player = state.players[playerIndex];
  let value = 0;

  // Cubes on the current planet are immediately gatherable
  const currentCell = state.planetGrid[player.shipRow]?.[player.shipCol];
  if (currentCell) {
    const localCubes = Object.values(currentCell.cubes).filter(Boolean).length;
    value += localCubes * 1.2;
  }

  // Cubes on adjacent planets are one move away
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const r = player.shipRow + dr;
    const c = player.shipCol + dc;
    const adjCell = state.planetGrid[r]?.[c];
    if (!adjCell) continue;
    const adjCubes = Object.values(adjCell.cubes).filter(Boolean).length;
    value += adjCubes * 0.4;
  }

  return value;
}

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

  let value = player.score * 10;
  value += supplyValue(state, playerIndex);
  value += locationValue(state, playerIndex);
  value += marketOpportunity(state, playerIndex);

  for (let i = 0; i < state.players.length; i++) {
    if (i !== playerIndex) {
      value -= state.players[i].score * 2;
    }
  }

  return value;
};
