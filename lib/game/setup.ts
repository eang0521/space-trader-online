import {
  GameState,
  PlanetCell,
  LobbyPlayer,
  PlayerState,
  PlayerColor,
  ResourceCube,
} from './types';
import { PLANET_CARDS } from './data/planets';
import { BUYER_CARDS } from './data/buyers';
import { v4 as uuidv4 } from 'uuid';

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Edge positions in a 4x4 grid (row, col) — only the 12 border cells
const EDGE_POSITIONS: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [0, 3],
  [1, 0], [1, 3],
  [2, 0], [2, 3],
  [3, 0], [3, 1], [3, 2], [3, 3],
];

export function createInitialGameState(
  gameId: string,
  code: string,
  lobbyPlayers: LobbyPlayer[],
): GameState {
  // ---- Planet grid setup ----
  const shuffledPlanets = shuffleArray(PLANET_CARDS);
  const selectedPlanets = shuffledPlanets.slice(0, 16);

  const planetGrid: (PlanetCell | null)[][] = [];
  for (let row = 0; row < 4; row++) {
    planetGrid.push([]);
    for (let col = 0; col < 4; col++) {
      const card = selectedPlanets[row * 4 + col];
      const cubes: Record<string, ResourceCube | null> = {};
      for (const slot of card.resourceSlots) {
        cubes[slot.id] = { id: uuidv4(), color: slot.color };
      }
      planetGrid[row].push({
        cardId: card.id,
        row,
        col,
        cubes,
      });
    }
  }

  // ---- Buyer deck setup ----
  const shuffledBuyers = shuffleArray(BUYER_CARDS);
  const allBuyerIds = shuffledBuyers.map((b) => b.id);

  // Deal 1 private buyer per player first (these come from the top of the shuffled deck)
  const numPlayers = lobbyPlayers.length;
  const privateBuyerIds = allBuyerIds.slice(0, numPlayers);
  const remaining = allBuyerIds.slice(numPlayers);

  // Deal 4 to market
  const marketIds = remaining.slice(0, 4);
  const buyerDeckIds = remaining.slice(4);

  const market = marketIds.map((id) => ({
    cardId: id,
    completedDealIds: [] as string[],
  }));

  // ---- Player setup (no pre-placement; ships placed during placement phase) ----
  const sortedPlayers = [...lobbyPlayers].sort((a, b) => a.seatIndex - b.seatIndex);

  const players: PlayerState[] = sortedPlayers.map((lp, i) => {
    const privateId = privateBuyerIds[i] ?? null;
    return {
      id: lp.id,
      sessionId: lp.sessionId,
      displayName: lp.displayName,
      color: (lp.color ?? 'red') as PlayerColor,
      seatIndex: lp.seatIndex,
      score: 0,
      supply: [],
      privateBuyers: privateId ? [privateId] : [],
      shipRow: -1,
      shipCol: -1,
      isHost: lp.isHost,
      isBot: lp.sessionId.startsWith('bot:'),
    };
  });

  // Placement order: counterclockwise from a random starting player
  const startIdx = Math.floor(Math.random() * numPlayers);
  const placementOrder = Array.from(
    { length: numPlayers },
    (_, i) => (startIdx - i + numPlayers) % numPlayers,
  );

  return {
    id: gameId,
    code,
    status: 'placement',
    planetGrid,
    buyerDeck: buyerDeckIds,
    market,
    players,
    currentPlayerIndex: placementOrder[0],
    actionsRemaining: 3,
    turnNumber: 1,
    placementOrder,
    placementIndex: 0,
    log: [
      {
        id: uuidv4(),
        playerColor: players[placementOrder[0]]?.color ?? 'red',
        playerName: players[placementOrder[0]]?.displayName ?? 'Unknown',
        message: 'Game started! Place your ship on an edge planet.',
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
