export type ResourceColor = 'blue' | 'green' | 'yellow' | 'white' | 'red' | 'black';
export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export type GameStatus = 'lobby' | 'placement' | 'playing' | 'game_end' | 'ended';

export interface ResourceCube {
  id: string;
  color: ResourceColor;
}

export interface PlanetCardDef {
  id: string;
  name: string;
  rings: number; // 0-3, movement cost to enter this planet
  resourceSlots: PlanetResourceSlot[];
}

export type SlotPosition = 'TL' | 'TR' | 'BL' | 'BR';

export interface PlanetResourceSlot {
  id: string;
  color: ResourceColor;
  position: SlotPosition;
}

export interface PlanetCell {
  cardId: string;
  row: number;
  col: number;
  cubes: Record<string, ResourceCube | null>; // slotId -> cube or null (null = depleted)
}

export interface BuyerCardDef {
  id: string;
  name: string;
  deals: DealDef[];
}

export interface DealDef {
  id: string;
  label: string; // 'A', 'B', 'C', 'D'
  requirements: DealRequirement[];
  credits: number;
}

export interface DealRequirement {
  color: ResourceColor;
  count: number;
}

export interface ActiveBuyer {
  cardId: string;
  completedDealIds: string[];
}

export interface PlayerState {
  id: string;
  sessionId: string;
  displayName: string;
  color: PlayerColor;
  seatIndex: number;
  score: number;
  supply: ResourceCube[];
  privateBuyers: string[]; // buyer card IDs
  shipRow: number;
  shipCol: number;
  isHost: boolean;
  isBot?: boolean;
}

export type LogEntryKind =
  | 'move'
  | 'gather'
  | 'sell'
  | 'draw'
  | 'remove'
  | 'placement'
  | 'end_turn'
  | 'system';

export interface GameLogEntry {
  id: string;
  playerColor: PlayerColor;
  playerName: string;
  message: string;
  timestamp: string;
  // Optional enrichment — absent on entries from older game states
  kind?: LogEntryKind;
  turnNumber?: number;
  resource?: ResourceColor; // colour gathered, for inline rendering
}

export interface GameState {
  id: string;
  code: string;
  status: GameStatus;
  planetGrid: (PlanetCell | null)[][]; // 4x4
  buyerDeck: string[]; // buyer card IDs (ordered)
  market: ActiveBuyer[]; // 4 face-up buyers
  players: PlayerState[];
  currentPlayerIndex: number;
  actionsRemaining: number;
  turnNumber: number;
  gameEndTriggeredByIndex?: number;
  winners?: string[]; // player IDs
  placementOrder?: number[];
  placementIndex?: number;
  log: GameLogEntry[];
}

// Action payloads sent from client -> API
export type GameAction =
  | { type: 'MOVE'; toRow: number; toCol: number }
  | { type: 'GATHER'; slotId: string; planetRow: number; planetCol: number }
  | { type: 'SELL'; buyerCardId: string; dealSells: { dealId: string; cubeIds: string[] }[] }
  | { type: 'DRAW_PRIVATE_BUYER' }
  | { type: 'REMOVE_BUYER'; buyerCardId: string }
  | { type: 'END_TURN' }
  | { type: 'PLACE_SHIP'; row: number; col: number };

export interface LobbyPlayer {
  id: string;
  sessionId: string;
  displayName: string;
  color: PlayerColor | null;
  seatIndex: number;
  isHost: boolean;
  isBot?: boolean;
}
