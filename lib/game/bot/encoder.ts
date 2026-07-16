import { GameState, PlayerState, ResourceColor } from '../types';
import { getPlanetDef, getBuyerDef } from '../engine';

// Fixed-size encoding of a GameState from the perspective of one player.
//
// Layout (288 floats total):
//   [  0- 9]  Self            (10)  — supply × 6, score, row, col, private buyers
//   [ 10- 39]  Opponents      (30)  — same 10 floats × 3 padded slots
//   [ 40-151]  Planet grid   (112)  — 7 floats × 16 cells (6 color counts + rings)
//   [152-283]  Market        (132)  — 33 floats × 4 buyer slots
//   [284-287]  Meta            (4)  — actions, turn, phase, deck
export const ENCODING_SIZE = 288;

const COLORS: ResourceColor[] = ['blue', 'green', 'yellow', 'white', 'red', 'black'];

function encodePlayer(player: PlayerState | undefined, vec: Float32Array, offset: number): number {
  if (!player) return offset + 10;
  for (const color of COLORS) {
    vec[offset++] = player.supply.filter((c) => c.color === color).length / 4;
  }
  vec[offset++] = player.score / 50;
  vec[offset++] = Math.max(0, player.shipRow) / 3;
  vec[offset++] = Math.max(0, player.shipCol) / 3;
  vec[offset++] = player.privateBuyers.length / 5;
  return offset;
}

export function encodeState(state: GameState, playerIndex: number): Float32Array {
  const vec = new Float32Array(ENCODING_SIZE);
  let i = 0;

  // Self
  i = encodePlayer(state.players[playerIndex], vec, i);

  // Opponents — always 3 padded slots so encoding size is fixed regardless of player count
  const opponents = state.players.filter((_, idx) => idx !== playerIndex);
  for (let o = 0; o < 3; o++) {
    i = encodePlayer(opponents[o], vec, i);
  }

  // Planet grid (row-major)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = state.planetGrid[r]?.[c];
      if (cell) {
        for (const color of COLORS) {
          const count = Object.values(cell.cubes).filter(
            (cube) => cube !== null && cube.color === color,
          ).length;
          vec[i++] = count / 2; // max 2 cubes of same color on one planet
        }
        const def = getPlanetDef(cell.cardId);
        vec[i++] = def.rings / 3;
      } else {
        i += 7;
      }
    }
  }

  // Market — 4 buyer slots, each with up to 4 deals
  for (let slot = 0; slot < 4; slot++) {
    const activeBuyer = state.market[slot];
    if (!activeBuyer) {
      i += 33;
      continue;
    }
    vec[i++] = 1; // slot is occupied
    const def = getBuyerDef(activeBuyer.cardId);
    for (let d = 0; d < 4; d++) {
      const deal = def.deals[d];
      if (!deal) {
        i += 8;
        continue;
      }
      for (const color of COLORS) {
        const req = deal.requirements.find((r) => r.color === color);
        vec[i++] = (req?.count ?? 0) / 3;
      }
      vec[i++] = deal.credits / 25;
      vec[i++] = activeBuyer.completedDealIds.includes(deal.id) ? 1 : 0;
    }
  }

  // Meta
  vec[i++] = state.actionsRemaining / 3;
  vec[i++] = Math.min(state.turnNumber, 30) / 30;
  vec[i++] = state.status === 'game_end' ? 1 : 0;
  vec[i++] = Math.min(state.buyerDeck.length, 20) / 20;

  if (i !== ENCODING_SIZE) {
    throw new Error(`Encoder bug: wrote ${i} values, expected ${ENCODING_SIZE}`);
  }

  return vec;
}
