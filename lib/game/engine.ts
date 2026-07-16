import {
  GameState,
  PlanetCell,
  ResourceCube,
  ResourceColor,
  GameLogEntry,
  LogEntryKind,
} from './types';
import { PLANET_CARDS } from './data/planets';
import { BUYER_CARDS } from './data/buyers';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getPlanetDef(cardId: string) {
  const def = PLANET_CARDS.find((c) => c.id === cardId);
  if (!def) throw new Error(`Planet def not found: ${cardId}`);
  return def;
}

export function getBuyerDef(cardId: string) {
  const def = BUYER_CARDS.find((c) => c.id === cardId);
  if (!def) throw new Error(`Buyer def not found: ${cardId}`);
  return def;
}

// ---------------------------------------------------------------------------
// Resource counting
// ---------------------------------------------------------------------------

export function countCubesOnBoard(
  state: GameState,
): Record<ResourceColor, number> {
  const counts: Record<ResourceColor, number> = {
    blue: 0,
    green: 0,
    yellow: 0,
    white: 0,
    red: 0,
    black: 0,
  };
  for (const row of state.planetGrid) {
    for (const cell of row) {
      if (!cell) continue;
      for (const cube of Object.values(cell.cubes)) {
        if (cube) counts[cube.color]++;
      }
    }
  }
  return counts;
}

export function countCubesInSupplies(
  state: GameState,
): Record<ResourceColor, number> {
  const counts: Record<ResourceColor, number> = {
    blue: 0,
    green: 0,
    yellow: 0,
    white: 0,
    red: 0,
    black: 0,
  };
  for (const player of state.players) {
    for (const cube of player.supply) {
      counts[cube.color]++;
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Move action
// ---------------------------------------------------------------------------

export function isValidMove(
  state: GameState,
  playerIndex: number,
  toRow: number,
  toCol: number,
): { valid: boolean; reason?: string } {
  if (state.status !== 'playing') {
    return { valid: false, reason: 'Game is not in playing phase' };
  }
  if (state.currentPlayerIndex !== playerIndex) {
    return { valid: false, reason: 'Not your turn' };
  }
  const player = state.players[playerIndex];
  const fromRow = player.shipRow;
  const fromCol = player.shipCol;

  // Must be adjacent (not diagonal)
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  if (rowDiff + colDiff !== 1) {
    return { valid: false, reason: 'Can only move to adjacent planets (not diagonal)' };
  }

  // Destination must be in bounds
  if (toRow < 0 || toRow > 3 || toCol < 0 || toCol > 3) {
    return { valid: false, reason: 'Destination out of bounds' };
  }

  const destCell = state.planetGrid[toRow]?.[toCol];
  if (!destCell) {
    return { valid: false, reason: 'No planet at destination' };
  }

  // Cost = rings on origin planet + rings on destination planet
  const originCell = state.planetGrid[fromRow][fromCol]!;
  const originDef = getPlanetDef(originCell.cardId);
  const destDef = getPlanetDef(destCell.cardId);
  const cost = originDef.rings + destDef.rings;

  if (cost > state.actionsRemaining) {
    return {
      valid: false,
      reason: cost === 0
        ? 'Not enough actions'
        : `Not enough actions. Need ${cost}, have ${state.actionsRemaining}`,
    };
  }

  return { valid: true };
}

export function applyMove(
  state: GameState,
  playerIndex: number,
  toRow: number,
  toCol: number,
): GameState {
  const player = state.players[playerIndex];
  const originCell = state.planetGrid[player.shipRow][player.shipCol]!;
  const originDef = getPlanetDef(originCell.cardId);
  const destCell = state.planetGrid[toRow][toCol]!;
  const destDef = getPlanetDef(destCell.cardId);
  const cost = originDef.rings + destDef.rings;

  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    return { ...p, shipRow: toRow, shipCol: toCol };
  });

  const newState: GameState = {
    ...state,
    players: newPlayers,
    actionsRemaining: state.actionsRemaining - cost,
  };

  const costLabel = cost === 0 ? 'free' : `${cost} action${cost !== 1 ? 's' : ''}`;
  return addLog(newState, playerIndex, `moved to ${destDef.name} (${costLabel})`, 'move');
}

// ---------------------------------------------------------------------------
// Placement action (ship placement phase)
// ---------------------------------------------------------------------------

const EDGE_POSITIONS = new Set<string>(
  [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 3],
    [2, 0], [2, 3],
    [3, 0], [3, 1], [3, 2], [3, 3],
  ].map(([r, c]) => `${r},${c}`),
);

function isEdgePosition(row: number, col: number): boolean {
  return EDGE_POSITIONS.has(`${row},${col}`);
}

export function isValidPlacement(
  state: GameState,
  playerIndex: number,
  row: number,
  col: number,
): { valid: boolean; reason?: string } {
  if (state.status !== 'placement') {
    return { valid: false, reason: 'Game is not in placement phase' };
  }

  const expectedPlayer = (state.placementOrder ?? [])[state.placementIndex ?? 0];
  if (expectedPlayer !== playerIndex) {
    return { valid: false, reason: 'Not your turn to place' };
  }

  if (!isEdgePosition(row, col)) {
    return { valid: false, reason: 'Ships must be placed on edge planets' };
  }

  const cell = state.planetGrid[row]?.[col];
  if (!cell) {
    return { valid: false, reason: 'No planet at this location' };
  }

  const occupied = state.players.some(
    (p) => p.shipRow >= 0 && p.shipRow === row && p.shipCol === col,
  );
  if (occupied) {
    return { valid: false, reason: 'Another ship is already on this planet' };
  }

  return { valid: true };
}

export function applyPlacement(
  state: GameState,
  playerIndex: number,
  row: number,
  col: number,
): GameState {
  const cell = state.planetGrid[row][col]!;
  const planetDef = getPlanetDef(cell.cardId);

  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    return { ...p, shipRow: row, shipCol: col };
  });

  let newState: GameState = {
    ...state,
    players: newPlayers,
  };

  newState = addLog(newState, playerIndex, `placed ship on ${planetDef.name}`, 'placement');

  const placementOrder = state.placementOrder ?? [];
  const nextIndex = (state.placementIndex ?? 0) + 1;
  const numPlayers = state.players.length;

  if (nextIndex >= numPlayers) {
    // All ships placed — last placer goes first, then clockwise
    return {
      ...newState,
      status: 'playing',
      currentPlayerIndex: placementOrder[placementOrder.length - 1],
      actionsRemaining: 3,
      placementIndex: nextIndex,
    };
  }

  return {
    ...newState,
    currentPlayerIndex: placementOrder[nextIndex],
    placementIndex: nextIndex,
  };
}

// ---------------------------------------------------------------------------
// Gather action
// ---------------------------------------------------------------------------

export function isValidGather(
  state: GameState,
  playerIndex: number,
  slotId: string,
  planetRow: number,
  planetCol: number,
): { valid: boolean; reason?: string } {
  if (state.status !== 'playing') {
    return { valid: false, reason: 'Game is not in playing phase' };
  }
  if (state.currentPlayerIndex !== playerIndex) {
    return { valid: false, reason: 'Not your turn' };
  }
  if (state.actionsRemaining < 1) {
    return { valid: false, reason: 'No actions remaining' };
  }

  const player = state.players[playerIndex];
  if (player.shipRow !== planetRow || player.shipCol !== planetCol) {
    return { valid: false, reason: 'Your ship is not on this planet' };
  }

  const cell = state.planetGrid[planetRow]?.[planetCol];
  if (!cell) {
    return { valid: false, reason: 'No planet at this location' };
  }

  const cube = cell.cubes[slotId];
  if (cube === undefined) {
    return { valid: false, reason: 'Invalid slot ID' };
  }
  if (cube === null) {
    return { valid: false, reason: 'This slot has already been gathered' };
  }

  return { valid: true };
}

export function applyGather(
  state: GameState,
  playerIndex: number,
  slotId: string,
  planetRow: number,
  planetCol: number,
): GameState {
  const cell = state.planetGrid[planetRow][planetCol]!;
  const cube = cell.cubes[slotId]!;

  // Remove cube from planet (set to null = depleted)
  const newCell: PlanetCell = {
    ...cell,
    cubes: { ...cell.cubes, [slotId]: null },
  };

  const newGrid = state.planetGrid.map((row, r) =>
    r !== planetRow
      ? row
      : row.map((c, col) => (col !== planetCol ? c : newCell)),
  );

  const newCube: ResourceCube = { ...cube };
  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    return { ...p, supply: [...p.supply, newCube] };
  });

  let newState: GameState = {
    ...state,
    planetGrid: newGrid,
    players: newPlayers,
    actionsRemaining: state.actionsRemaining - 1,
  };

  const def = getPlanetDef(cell.cardId);
  newState = addLog(newState, playerIndex, `from ${def.name}`, 'gather', cube.color);

  // Check game end condition
  if (checkGameEndCondition(newState)) {
    newState = {
      ...newState,
      status: 'game_end',
      gameEndTriggeredByIndex: playerIndex,
    };
    newState = addLog(newState, playerIndex, 'triggered game end — only 1 planet remains!', 'system');
  }

  return newState;
}

// ---------------------------------------------------------------------------
// Sell action
// ---------------------------------------------------------------------------

export function isValidSell(
  state: GameState,
  playerIndex: number,
  buyerCardId: string,
  dealSells: { dealId: string; cubeIds: string[] }[],
  isPrivate = false,
): { valid: boolean; reason?: string } {
  if (state.status !== 'playing' && state.status !== 'game_end') {
    return { valid: false, reason: 'Game is not active' };
  }
  if (state.currentPlayerIndex !== playerIndex) {
    return { valid: false, reason: 'Not your turn' };
  }
  if (state.actionsRemaining < 1) {
    return { valid: false, reason: 'No actions remaining' };
  }
  if (dealSells.length === 0) {
    return { valid: false, reason: 'No deals to sell' };
  }

  const player = state.players[playerIndex];

  if (isPrivate) {
    if (!player.privateBuyers.includes(buyerCardId)) {
      return { valid: false, reason: 'You do not have this private buyer' };
    }
    if (state.status !== 'game_end') {
      return { valid: false, reason: 'Private buyer sales only allowed during game end phase' };
    }
  } else {
    if (state.status === 'game_end') {
      return { valid: false, reason: 'Market buyer sales are not allowed during the end phase — only private buyers' };
    }
    const marketBuyer = state.market.find((b) => b.cardId === buyerCardId);
    if (!marketBuyer) {
      return { valid: false, reason: 'Buyer not in market' };
    }
    for (const { dealId } of dealSells) {
      if (marketBuyer.completedDealIds.includes(dealId)) {
        return { valid: false, reason: `Deal ${dealId} already completed` };
      }
    }
  }

  const buyerDef = getBuyerDef(buyerCardId);
  const supplyCubeIds = new Set(player.supply.map((c) => c.id));
  const allUsedCubeIds = new Set<string>();

  for (const { dealId, cubeIds } of dealSells) {
    const dealDef = buyerDef.deals.find((d) => d.id === dealId);
    if (!dealDef) {
      return { valid: false, reason: `Deal ${dealId} not found on buyer` };
    }

    for (const id of cubeIds) {
      if (!supplyCubeIds.has(id)) {
        return { valid: false, reason: `Cube ${id} not in your supply` };
      }
      if (allUsedCubeIds.has(id)) {
        return { valid: false, reason: `Cube ${id} used in multiple deals` };
      }
      allUsedCubeIds.add(id);
    }

    const usedCubes = cubeIds.map((id) => player.supply.find((c) => c.id === id)!);
    const colorCounts: Partial<Record<ResourceColor, number>> = {};
    for (const cube of usedCubes) {
      colorCounts[cube.color] = (colorCounts[cube.color] ?? 0) + 1;
    }

    for (const req of dealDef.requirements) {
      const have = colorCounts[req.color] ?? 0;
      if (have < req.count) {
        return {
          valid: false,
          reason: `Deal ${dealDef.label}: need ${req.count} ${req.color}, have ${have}`,
        };
      }
    }

    const totalRequired = dealDef.requirements.reduce((s, r) => s + r.count, 0);
    if (cubeIds.length !== totalRequired) {
      return {
        valid: false,
        reason: `Deal ${dealDef.label}: wrong number of cubes. Need ${totalRequired}, got ${cubeIds.length}`,
      };
    }
  }

  return { valid: true };
}

export function applySell(
  state: GameState,
  playerIndex: number,
  buyerCardId: string,
  dealSells: { dealId: string; cubeIds: string[] }[],
  isPrivate = false,
): GameState {
  const buyerDef = getBuyerDef(buyerCardId);

  const allCubeIdSet = new Set<string>();
  let totalCredits = 0;
  const dealLabels: string[] = [];

  for (const { dealId, cubeIds } of dealSells) {
    const dealDef = buyerDef.deals.find((d) => d.id === dealId)!;
    for (const id of cubeIds) allCubeIdSet.add(id);
    totalCredits += dealDef.credits;
    dealLabels.push(dealDef.label);
  }

  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    const updated = {
      ...p,
      supply: p.supply.filter((c) => !allCubeIdSet.has(c.id)),
      score: p.score + totalCredits,
    };
    if (isPrivate) {
      return { ...updated, privateBuyers: p.privateBuyers.filter((id) => id !== buyerCardId) };
    }
    return updated;
  });

  let newState: GameState = {
    ...state,
    players: newPlayers,
    actionsRemaining: state.actionsRemaining - 1,
  };

  if (!isPrivate) {
    const marketBuyerIdx = newState.market.findIndex((b) => b.cardId === buyerCardId);
    const newCompletedIds = [
      ...newState.market[marketBuyerIdx].completedDealIds,
      ...dealSells.map((d) => d.dealId),
    ];
    const updatedMarketBuyer = {
      ...newState.market[marketBuyerIdx],
      completedDealIds: newCompletedIds,
    };

    let newMarket = newState.market.map((b, i) =>
      i === marketBuyerIdx ? updatedMarketBuyer : b,
    );

    const allDealsCompleted = buyerDef.deals.every((d) =>
      newCompletedIds.includes(d.id),
    );

    let newDeck = [...newState.buyerDeck];
    if (allDealsCompleted) {
      if (newDeck.length > 0) {
        const [nextBuyerId, ...restDeck] = newDeck;
        newDeck = restDeck;
        newMarket = newMarket.map((b, i) =>
          i === marketBuyerIdx ? { cardId: nextBuyerId, completedDealIds: [] } : b,
        );
      } else {
        newMarket = newMarket.filter((_, i) => i !== marketBuyerIdx);
      }
    }

    newState = { ...newState, market: newMarket, buyerDeck: newDeck };
  }

  const dealText = dealLabels.join('+');
  const buyerText = isPrivate ? `private buyer (${buyerDef.name})` : buyerDef.name;
  return addLog(newState, playerIndex, `sold ${dealText} to ${buyerText} · ${totalCredits}c`, 'sell');
}

// ---------------------------------------------------------------------------
// Draw Private Buyer
// ---------------------------------------------------------------------------

export function isValidDrawPrivateBuyer(
  state: GameState,
  playerIndex: number,
): { valid: boolean; reason?: string } {
  if (state.status !== 'playing') {
    return { valid: false, reason: 'Game is not in playing phase' };
  }
  if (state.currentPlayerIndex !== playerIndex) {
    return { valid: false, reason: 'Not your turn' };
  }
  if (state.actionsRemaining < 3) {
    return {
      valid: false,
      reason: 'Drawing a private buyer costs 3 actions (must have 3 remaining)',
    };
  }
  if (state.buyerDeck.length === 0) {
    return { valid: false, reason: 'Buyer deck is empty' };
  }
  return { valid: true };
}

export function applyDrawPrivateBuyer(
  state: GameState,
  playerIndex: number,
): GameState {
  const [drawnId, ...restDeck] = state.buyerDeck;

  const newPlayers = state.players.map((p, i) => {
    if (i !== playerIndex) return p;
    return { ...p, privateBuyers: [...p.privateBuyers, drawnId] };
  });

  let newState: GameState = {
    ...state,
    players: newPlayers,
    buyerDeck: restDeck,
    actionsRemaining: state.actionsRemaining - 3,
  };

  newState = addLog(newState, playerIndex, 'drew a private buyer', 'draw');
  return newState;
}

// ---------------------------------------------------------------------------
// Remove Buyer
// ---------------------------------------------------------------------------

export function canRemoveBuyer(state: GameState, buyerCardId: string): boolean {
  const marketBuyer = state.market.find((b) => b.cardId === buyerCardId);
  if (!marketBuyer) return false;

  const buyerDef = getBuyerDef(buyerCardId);
  const incompleteDealDefs = buyerDef.deals.filter(
    (d) => !marketBuyer.completedDealIds.includes(d.id),
  );

  if (incompleteDealDefs.length === 0) return false; // all deals done

  // A deal is completable only if a single player can fulfill it —
  // their current supply plus any cubes still on the board (best case).
  const boardCubes = countCubesOnBoard(state);

  for (const deal of incompleteDealDefs) {
    for (const player of state.players) {
      // Count this player's supply by color
      const playerCounts: Record<ResourceColor, number> = {
        blue: 0, green: 0, yellow: 0, white: 0, red: 0, black: 0,
      };
      for (const cube of player.supply) playerCounts[cube.color]++;

      const canComplete = deal.requirements.every(
        (req) => playerCounts[req.color] + boardCubes[req.color] >= req.count,
      );
      if (canComplete) return false; // this player could still complete this deal
    }
  }

  // No incomplete deal can be completed
  return true;
}

export function applyRemoveBuyer(
  state: GameState,
  buyerCardId: string,
): GameState {
  let newDeck = [...state.buyerDeck];

  // Replace the removed buyer at the same position so the layout doesn't shift.
  const newMarket: typeof state.market = [];
  for (const b of state.market) {
    if (b.cardId !== buyerCardId) {
      newMarket.push(b);
    } else if (newDeck.length > 0) {
      const [nextId, ...restDeck] = newDeck;
      newDeck = restDeck;
      newMarket.push({ cardId: nextId, completedDealIds: [] });
    }
    // else deck is empty — slot disappears
  }

  return {
    ...state,
    market: newMarket,
    buyerDeck: newDeck,
  };
}

// ---------------------------------------------------------------------------
// Game end condition
// ---------------------------------------------------------------------------

export function checkGameEndCondition(state: GameState): boolean {
  let planetsWithCubes = 0;
  for (const row of state.planetGrid) {
    for (const cell of row) {
      if (!cell) continue;
      const hasCubes = Object.values(cell.cubes).some((c) => c !== null);
      if (hasCubes) planetsWithCubes++;
    }
  }
  return planetsWithCubes <= 1;
}

// ---------------------------------------------------------------------------
// Turn management
// ---------------------------------------------------------------------------

export function advanceTurn(state: GameState): GameState {
  const numPlayers = state.players.length;
  let nextPlayerIndex = (state.currentPlayerIndex + 1) % numPlayers;

  // In game_end phase: cycle through all players to let them sell to private buyers
  // Game ends when we have cycled back to the triggering player (or all have had a turn)
  if (state.status === 'game_end') {
    // If we've gone all the way around, finalize
    if (nextPlayerIndex === state.gameEndTriggeredByIndex) {
      return processGameEnd({
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        actionsRemaining: 3,
        turnNumber: state.turnNumber + 1,
      });
    }
  }

  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    actionsRemaining: 3,
    turnNumber: state.turnNumber + 1,
  };
}

// ---------------------------------------------------------------------------
// Game end / winners
// ---------------------------------------------------------------------------

export function calculateWinners(state: GameState): string[] {
  if (state.players.length === 0) return [];

  const sorted = [...state.players].sort((a, b) => {
    // Most credits
    if (b.score !== a.score) return b.score - a.score;
    // Most cubes in supply
    if (b.supply.length !== a.supply.length) return b.supply.length - a.supply.length;
    // Fewest private buyers
    return a.privateBuyers.length - b.privateBuyers.length;
  });

  const topScore = sorted[0].score;
  const topSupply = sorted[0].supply.length;
  const topPrivate = sorted[0].privateBuyers.length;

  return sorted
    .filter(
      (p) =>
        p.score === topScore &&
        p.supply.length === topSupply &&
        p.privateBuyers.length === topPrivate,
    )
    .map((p) => p.id);
}

export function processGameEnd(state: GameState): GameState {
  // Allow players to sell private buyers in game_end phase (already handled by SELL action)
  // Now finalize
  const winners = calculateWinners(state);

  let newState: GameState = {
    ...state,
    status: 'ended',
    winners,
  };

  const winnerNames = winners
    .map((id) => state.players.find((p) => p.id === id)?.displayName ?? id)
    .join(', ');

  // Add log entry using a neutral system log (use first player as actor for log structure)
  newState = {
    ...newState,
    log: [
      ...newState.log,
      {
        id: uuidv4(),
        playerColor: newState.players[0]?.color ?? 'red',
        playerName: 'Game',
        message: `Game over! Winner${winners.length > 1 ? 's' : ''}: ${winnerNames}`,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return newState;
}

// ---------------------------------------------------------------------------
// Log helper
// ---------------------------------------------------------------------------

export function addLog(
  state: GameState,
  playerIndex: number,
  message: string,
  kind: LogEntryKind = 'system',
  resource?: ResourceColor,
): GameState {
  const player = state.players[playerIndex];
  if (!player) return state;

  const entry: GameLogEntry = {
    id: uuidv4(),
    playerColor: player.color,
    playerName: player.displayName,
    message,
    timestamp: new Date().toISOString(),
    kind,
    turnNumber: state.turnNumber,
    resource,
  };

  return {
    ...state,
    log: [...state.log, entry],
  };
}
