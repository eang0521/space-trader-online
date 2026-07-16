import { GameState, GameAction, ResourceCube } from '../types';
import {
  isValidMove,
  isValidGather,
  isValidSell,
  isValidDrawPrivateBuyer,
  canRemoveBuyer,
  getBuyerDef,
  applyMove,
  applyGather,
  applySell,
  applyDrawPrivateBuyer,
  applyRemoveBuyer,
  addLog,
  advanceTurn,
} from '../engine';

// Enumerate all legal actions the bot can take in the current state
export function enumerateCandidates(state: GameState, playerIndex: number): GameAction[] {
  const candidates: GameAction[] = [];
  const player = state.players[playerIndex];

  // GATHER on current planet
  const cell = state.planetGrid[player.shipRow]?.[player.shipCol];
  if (cell) {
    for (const [slotId, cube] of Object.entries(cell.cubes)) {
      if (cube !== null) {
        const v = isValidGather(state, playerIndex, slotId, player.shipRow, player.shipCol);
        if (v.valid) {
          candidates.push({
            type: 'GATHER',
            slotId,
            planetRow: player.shipRow,
            planetCol: player.shipCol,
          });
        }
      }
    }
  }

  // SELL on market buyers — build best possible sell for each buyer
  for (const activeBuyer of state.market) {
    const deals = buildBestSellDeals(
      player.supply,
      activeBuyer.cardId,
      activeBuyer.completedDealIds,
    );
    if (deals.length > 0) {
      const v = isValidSell(state, playerIndex, activeBuyer.cardId, deals, false);
      if (v.valid) {
        candidates.push({ type: 'SELL', buyerCardId: activeBuyer.cardId, dealSells: deals });
      }
    }
  }

  // MOVE to adjacent planets
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const toRow = player.shipRow + dr;
    const toCol = player.shipCol + dc;
    if (toRow >= 0 && toRow < 4 && toCol >= 0 && toCol < 4) {
      const v = isValidMove(state, playerIndex, toRow, toCol);
      if (v.valid) {
        candidates.push({ type: 'MOVE', toRow, toCol });
      }
    }
  }

  // DRAW_PRIVATE_BUYER
  if (isValidDrawPrivateBuyer(state, playerIndex).valid) {
    candidates.push({ type: 'DRAW_PRIVATE_BUYER' });
  }

  // REMOVE_BUYER (free action — always consider it)
  for (const activeBuyer of state.market) {
    if (canRemoveBuyer(state, activeBuyer.cardId)) {
      candidates.push({ type: 'REMOVE_BUYER', buyerCardId: activeBuyer.cardId });
    }
  }

  // END_TURN always available as a fallback
  candidates.push({ type: 'END_TURN' });

  return candidates;
}

// Build the best possible sell action for a buyer: fulfill as many deals as possible,
// sorted by credits descending so we prioritize high-value deals first.
export function buildBestSellDeals(
  supply: ResourceCube[],
  buyerCardId: string,
  completedDealIds: string[],
): { dealId: string; cubeIds: string[] }[] {
  const buyerDef = getBuyerDef(buyerCardId);
  const incompleteDeals = buyerDef.deals.filter((d) => !completedDealIds.includes(d.id));
  const sortedDeals = [...incompleteDeals].sort((a, b) => b.credits - a.credits);

  const remainingSupply = [...supply];
  const dealSells: { dealId: string; cubeIds: string[] }[] = [];

  for (const deal of sortedDeals) {
    const cubeIds: string[] = [];
    const tempSupply = [...remainingSupply];
    let canFulfill = true;

    for (const req of deal.requirements) {
      let needed = req.count;
      const matching = tempSupply.filter((c) => c.color === req.color);
      if (matching.length < needed) {
        canFulfill = false;
        break;
      }
      for (let i = 0; i < needed; i++) {
        cubeIds.push(matching[i].id);
        tempSupply.splice(tempSupply.indexOf(matching[i]), 1);
      }
    }

    if (canFulfill) {
      dealSells.push({ dealId: deal.id, cubeIds });
      // Remove used cubes from remaining supply for subsequent deals
      for (const id of cubeIds) {
        const idx = remainingSupply.findIndex((c) => c.id === id);
        if (idx !== -1) remainingSupply.splice(idx, 1);
      }
    }
  }

  return dealSells;
}

// Apply a single bot action to a game state
export function applyBotAction(
  state: GameState,
  playerIndex: number,
  action: GameAction,
): GameState {
  switch (action.type) {
    case 'MOVE':
      return applyMove(state, playerIndex, action.toRow, action.toCol);
    case 'GATHER':
      return applyGather(state, playerIndex, action.slotId, action.planetRow, action.planetCol);
    case 'SELL': {
      const player = state.players[playerIndex];
      const isPrivate = player.privateBuyers.includes(action.buyerCardId);
      return applySell(state, playerIndex, action.buyerCardId, action.dealSells, isPrivate);
    }
    case 'DRAW_PRIVATE_BUYER':
      return applyDrawPrivateBuyer(state, playerIndex);
    case 'REMOVE_BUYER':
      return applyRemoveBuyer(state, action.buyerCardId);
    case 'END_TURN':
      return advanceTurn(addLog(state, playerIndex, 'ended their turn', 'end_turn'));
    default:
      return state;
  }
}
