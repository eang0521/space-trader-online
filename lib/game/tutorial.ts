import { GameAction, GameState, ResourceCube } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TutorialStep {
  title: string;
  /** Supports **bold** markdown syntax */
  body: string;
  /** Null = show "Next" button; non-null = wait for this action */
  waitFor: WaitCondition | null;
  /** Which UI zone to highlight with a pulsing ring */
  highlight?: 'board' | 'market' | 'action-bar';
  /** P2 scripted actions that run after this step's action is applied */
  p2Actions?: P2ScriptedAction[];
  /**
   * True for steps that are shown while P2 is animating (commentary steps).
   * The Next button is visible but disabled until animation finishes.
   */
  isP2Commentary?: boolean;
  /** Planet to highlight with an amber callout ring (informational, not a move target) */
  calloutPlanet?: { row: number; col: number };
}

export type WaitCondition =
  | { type: 'MOVE'; toRow: number; toCol: number }
  | { type: 'GATHER' }
  | { type: 'SELL'; buyerCardId: string }
  | { type: 'DRAW_PRIVATE_BUYER' }
  | { type: 'REMOVE_BUYER'; buyerCardId: string }
  | { type: 'END_TURN' };

export interface P2ScriptedAction {
  action: GameAction;
  delayMs: number;
  /** Live commentary shown in the overlay when this action fires */
  narration?: string;
}

// ---------------------------------------------------------------------------
// Match helper
// ---------------------------------------------------------------------------

export function matchesWait(action: GameAction, wait: WaitCondition): boolean {
  if (action.type !== wait.type) return false;
  if (wait.type === 'MOVE' && action.type === 'MOVE') {
    return action.toRow === wait.toRow && action.toCol === wait.toCol;
  }
  if (wait.type === 'SELL' && action.type === 'SELL') {
    return action.buyerCardId === wait.buyerCardId;
  }
  if (wait.type === 'REMOVE_BUYER' && action.type === 'REMOVE_BUYER') {
    return action.buyerCardId === wait.buyerCardId;
  }
  return true; // GATHER, DRAW_PRIVATE_BUYER, END_TURN: type match is sufficient
}

// ---------------------------------------------------------------------------
// P2 scripted sequences
// ---------------------------------------------------------------------------

// P2 starts on Nocturnis (3,3) — 3 blue slots
const P2_TURN_1: P2ScriptedAction[] = [
  {
    action: { type: 'GATHER', slotId: 'p16-s1', planetRow: 3, planetCol: 3 },
    delayMs: 700,
    narration: "Cosmo gathers a blue cube from Nocturnis — 1 action used.",
  },
  {
    action: { type: 'GATHER', slotId: 'p16-s2', planetRow: 3, planetCol: 3 },
    delayMs: 1300,
    narration: "Another blue! Nocturnis has 3 blue resource slots.",
  },
  {
    action: { type: 'GATHER', slotId: 'p16-s3', planetRow: 3, planetCol: 3 },
    delayMs: 1900,
    narration: "Third gather — all 3 actions spent. Maximum efficiency!",
  },
  {
    action: { type: 'END_TURN' },
    delayMs: 2500,
    narration: "Cosmo ends their turn with 3 blue cubes. Your turn next!",
  },
];

// P2 on Nocturnis (3,3) all depleted → move to Thalassa (3,2) and gather all 3
const P2_TURN_2: P2ScriptedAction[] = [
  {
    action: { type: 'MOVE', toRow: 3, toCol: 2 },
    delayMs: 700,
    narration: "Nocturnis is depleted — Cosmo moves to Thalassa. Both have 0 rings, so the move is free!",
  },
  {
    action: { type: 'GATHER', slotId: 'p25-s1', planetRow: 3, planetCol: 2 },
    delayMs: 1400,
    narration: "Blue cube from Thalassa.",
  },
  {
    action: { type: 'GATHER', slotId: 'p25-s2', planetRow: 3, planetCol: 2 },
    delayMs: 2000,
    narration: "Green! Cosmo is collecting different colors to match more buyer deals.",
  },
  {
    action: { type: 'GATHER', slotId: 'p25-s3', planetRow: 3, planetCol: 2 },
    delayMs: 2600,
    narration: "Another green — all 3 actions used!",
  },
  {
    action: { type: 'END_TURN' },
    delayMs: 3200,
    narration: "Cosmo ends their turn. Your turn!",
  },
];

// P2 on Thalassa (3,2) with s4 remaining → gather, move to Gaios (3,1), gather x2
const P2_TURN_3: P2ScriptedAction[] = [
  {
    action: { type: 'GATHER', slotId: 'p25-s4', planetRow: 3, planetCol: 2 },
    delayMs: 700,
    narration: "Last cube on Thalassa — white!",
  },
  {
    action: { type: 'MOVE', toRow: 3, toCol: 1 },
    delayMs: 1400,
    narration: "Moving to Gaios — still 0 rings, still free. Cosmo chains free moves to reach new planets.",
  },
  {
    action: { type: 'GATHER', slotId: 'p26-s1', planetRow: 3, planetCol: 1 },
    delayMs: 2000,
    narration: "Blue from Gaios. New planet, new resources!",
  },
  {
    action: { type: 'GATHER', slotId: 'p26-s2', planetRow: 3, planetCol: 1 },
    delayMs: 2600,
    narration: "Green — all 3 actions spent!",
  },
  {
    action: { type: 'END_TURN' },
    delayMs: 3200,
    narration: "Cosmo ends their turn. You have 3 fresh actions — make them count!",
  },
];

// ---------------------------------------------------------------------------
// Tutorial steps
// ---------------------------------------------------------------------------

export const TUTORIAL_STEPS: TutorialStep[] = [
  // 0 — Welcome
  {
    title: 'Welcome to Space Trader!',
    body: "You're the **blue** captain. Fly between planets, gather resources, and sell them to buyers for credits. Win by earning the most! Let's learn the basics.",
    waitFor: null,
  },
  // 1 — Ring rating explanation (callout Caelion at 2,2)
  {
    title: 'Planet Ring Ratings',
    body: "Each planet has a **ring rating** that affects movement cost. Moving costs **origin rings + destination rings** actions. Most planets here have 0 rings — moves between them are free. The **amber-glowing planet** (Caelion) has **2 rings** — entering it from a 0-ring planet would cost 2 actions. High-ring planets contain rare resources but demand careful planning!",
    waitFor: null,
    highlight: 'board',
    calloutPlanet: { row: 2, col: 2 },
  },
  // 2 — Move
  {
    title: 'Action 1: Move',
    body: "Your ship is on **Lumox** (top-left). Move to the adjacent planet **Ferros** (one to the right). Both have **0 rings** — this move is free! Click the highlighted planet.",
    waitFor: { type: 'MOVE', toRow: 0, toCol: 1 },
    highlight: 'board',
  },
  // 3 — Gather first
  {
    title: 'Action 2: Gather',
    body: "You're on Ferros! **Click a glowing resource slot** to gather a green cube. Each gather costs 1 action.",
    waitFor: { type: 'GATHER' },
    highlight: 'board',
  },
  // 4 — Gather second
  {
    title: 'Keep Gathering',
    body: "Gather the **second** green cube from Ferros. You have 2 actions left.",
    waitFor: { type: 'GATHER' },
    highlight: 'board',
  },
  // 5 — Move back
  {
    title: 'Move Back to Lumox',
    body: "Move back to **Lumox** (to the left). Another free move! You'll still have 1 action left.",
    waitFor: { type: 'MOVE', toRow: 0, toCol: 0 },
    highlight: 'board',
  },
  // 6 — Gather from Lumox
  {
    title: 'Gather from Lumox',
    body: "Lumox has blue, green, and yellow resources. Gather one cube — this uses your last action this turn.",
    waitFor: { type: 'GATHER' },
    highlight: 'board',
  },
  // 7 — End turn (triggers P2_TURN_1)
  {
    title: 'End Your Turn',
    body: "You're out of actions! Click **End Turn** to pass to your opponent.",
    waitFor: { type: 'END_TURN' },
    highlight: 'action-bar',
    p2Actions: P2_TURN_1,
  },
  // 8 — P2 commentary (shown while P2_TURN_1 animates)
  {
    title: "Cosmo's Turn",
    body: "Cosmo spent all 3 actions gathering blue cubes from Nocturnis. **Every action counts** — try to use all of yours each turn. The log on the right tracks every move!",
    waitFor: null,
    isP2Commentary: true,
  },
  // 9 — Gather on turn 2
  {
    title: 'Your Turn Again!',
    body: "You get **3 fresh actions** each turn. Gather another resource from Lumox to build your supply.",
    waitFor: { type: 'GATHER' },
    highlight: 'board',
  },
  // 10 — Gather one more
  {
    title: 'One More Resource',
    body: "Gather one more resource from Lumox. After this you'll have enough to sell!",
    waitFor: { type: 'GATHER' },
    highlight: 'board',
  },
  // 11 — Sell
  {
    title: 'Action 3: Sell',
    body: "Check the **market panel** on the right. **Vega Trading** takes blue, yellow, and green. Select the deals that match your supply (checkboxes), then click **Sell**. Selling to one buyer costs **1 action** no matter how many deals you complete!",
    waitFor: { type: 'SELL', buyerCardId: 'b1' },
    highlight: 'market',
  },
  // 12 — End turn 2 (triggers P2_TURN_2)
  {
    title: 'Great Trade!',
    body: "You earned credits! Completing multiple deals in one sell is how you pull ahead. End your turn.",
    waitFor: { type: 'END_TURN' },
    highlight: 'action-bar',
    p2Actions: P2_TURN_2,
  },
  // 13 — P2 commentary (shown while P2_TURN_2 animates)
  {
    title: "Cosmo Explores",
    body: "Cosmo's home planet was depleted, so they **moved for free** to Thalassa and gathered 3 new resources. When your current planet runs dry, move on — free moves cost nothing but get you fresh cubes!",
    waitFor: null,
    isP2Commentary: true,
  },
  // 14 — Draw Private Buyer
  {
    title: 'Private Buyers',
    body: "Spending **all 3 actions at once** draws a **Private Buyer** card — a secret buyer only you can sell to! Private buyers are scored during the final round. Click **Draw Private Buyer** in the market panel.",
    waitFor: { type: 'DRAW_PRIVATE_BUYER' },
    highlight: 'market',
  },
  // 15 — End turn 3 (triggers P2_TURN_3)
  {
    title: 'Private Buyer Drawn!',
    body: "Your private buyer appears under **My Private Buyers** in the market. You can't sell to it until the game ends — save it for the final round! End your turn.",
    waitFor: { type: 'END_TURN' },
    highlight: 'action-bar',
    p2Actions: P2_TURN_3,
  },
  // 16 — P2 commentary (shown while P2_TURN_3 animates)
  {
    title: "Cosmo Chains Moves",
    body: "Cosmo gathered the last cube on Thalassa, then **moved for free** to Gaios and grabbed more cubes there — two planets in one turn! Chaining free moves between 0-ring planets is one of the most powerful strategies.",
    waitFor: null,
    isP2Commentary: true,
  },
  // 17 — Complete a buyer (b5 Verdant Pact has only deal C remaining: 1green)
  {
    title: 'Completing a Buyer',
    body: "**Verdant Pact** in the market only has one deal left — deal C needs just **1 green** cube. Complete all their deals to clear them out and a **new buyer enters from the deck**! Click Sell on Verdant Pact.",
    waitFor: { type: 'SELL', buyerCardId: 'b5' },
    highlight: 'market',
  },
  // 18 — Commentary after buyer replacement
  {
    title: 'New Buyer Arrived!',
    body: "When every deal on a buyer is completed, they leave the market and a **fresh buyer enters automatically**. Keep an eye on this — completing buyers efficiently refreshes the market with new opportunities.",
    waitFor: null,
  },
  // 19 — Remove impossible buyer
  {
    title: 'Removing Impossible Buyers',
    body: "**Crimson Accord** still needs a red cube — but there are **no red planets** in this galaxy! You can remove buyers whose remaining deals are impossible. Click the **✕** on Crimson Accord to discard them.",
    waitFor: { type: 'REMOVE_BUYER', buyerCardId: 'b9' },
    highlight: 'market',
  },
  // 20 — Complete
  {
    title: 'Tutorial Complete!',
    body: "You've mastered the basics: **Move**, **Gather**, **Sell** (multiple deals at once!), **Private Buyers**, **completing buyers**, and **removing impossible buyers**. Now start a real game and challenge your friends!",
    waitFor: null,
  },
];

// ---------------------------------------------------------------------------
// Initial game state
// ---------------------------------------------------------------------------

function cube(id: string, color: ResourceCube['color']): ResourceCube {
  return { id, color };
}

export const TUTORIAL_INITIAL_STATE: GameState = {
  id: 'tutorial',
  code: 'TUTOR',
  status: 'playing',
  currentPlayerIndex: 0,
  actionsRemaining: 3,
  turnNumber: 1,
  buyerDeck: ['b6', 'b24', 'b18', 'b4'],
  log: [],
  winners: undefined,
  gameEndTriggeredByIndex: undefined,

  players: [
    {
      id: 'player-1',
      sessionId: 'tutorial-player-1',
      displayName: 'You',
      color: 'blue',
      seatIndex: 0,
      score: 0,
      supply: [],
      privateBuyers: [],
      shipRow: 0,
      shipCol: 0,
      isHost: true,
    },
    {
      id: 'player-2',
      sessionId: 'tutorial-player-2',
      displayName: 'Cosmo (CPU)',
      color: 'red',
      seatIndex: 1,
      score: 0,
      supply: [],
      privateBuyers: [],
      shipRow: 3,
      shipCol: 3,
      isHost: false,
    },
  ],

  market: [
    { cardId: 'b1', completedDealIds: [] },
    // b9 with only C remaining (1 red = 5c) — no red on this board, so removable
    { cardId: 'b9', completedDealIds: ['b9-A', 'b9-B'] },
    { cardId: 'b15', completedDealIds: [] },
    // b5 with only deal C remaining (1green = 2c) — used to demo buyer auto-replacement
    { cardId: 'b5', completedDealIds: ['b5-A', 'b5-B'] },
  ],

  planetGrid: [
    // Row 0
    [
      // (0,0) Lumox — 0 rings, blue TL, blue TR, green BL, yellow BR
      {
        cardId: 'p4',
        row: 0,
        col: 0,
        cubes: {
          'p4-s1': cube('tut-p4s1', 'blue'),
          'p4-s2': cube('tut-p4s2', 'blue'),
          'p4-s3': cube('tut-p4s3', 'green'),
          'p4-s4': cube('tut-p4s4', 'yellow'),
        },
      },
      // (0,1) Ferros — 0 rings, green TL, green BR
      {
        cardId: 'p5',
        row: 0,
        col: 1,
        cubes: {
          'p5-s1': cube('tut-p5s1', 'green'),
          'p5-s2': cube('tut-p5s2', 'green'),
        },
      },
      // (0,2) Aethon — 1 ring, blue TL, yellow TR, yellow BL, white BR
      {
        cardId: 'p1',
        row: 0,
        col: 2,
        cubes: {
          'p1-s1': cube('tut-p1s1', 'blue'),
          'p1-s2': cube('tut-p1s2', 'yellow'),
          'p1-s3': cube('tut-p1s3', 'yellow'),
          'p1-s4': cube('tut-p1s4', 'white'),
        },
      },
      // (0,3) Rubus — 0 rings, blue TL, blue BR
      {
        cardId: 'p30',
        row: 0,
        col: 3,
        cubes: {
          'p30-s1': cube('tut-p30s1', 'blue'),
          'p30-s2': cube('tut-p30s2', 'blue'),
        },
      },
    ],
    // Row 1
    [
      // (1,0) Viridan — 0 rings, green TL, green TR, green BL
      {
        cardId: 'p2',
        row: 1,
        col: 0,
        cubes: {
          'p2-s1': cube('tut-p2s1', 'green'),
          'p2-s2': cube('tut-p2s2', 'green'),
          'p2-s3': cube('tut-p2s3', 'green'),
        },
      },
      // (1,1) Terrova — 0 rings, blue TL, green BR
      {
        cardId: 'p28',
        row: 1,
        col: 1,
        cubes: {
          'p28-s1': cube('tut-p28s1', 'blue'),
          'p28-s2': cube('tut-p28s2', 'green'),
        },
      },
      // (1,2) Caelos — 1 ring, blue TL, white BR
      {
        cardId: 'p7',
        row: 1,
        col: 2,
        cubes: {
          'p7-s1': cube('tut-p7s1', 'blue'),
          'p7-s2': cube('tut-p7s2', 'white'),
        },
      },
      // (1,3) Viridax — 0 rings, blue TL, blue TR, green BL
      {
        cardId: 'p29',
        row: 1,
        col: 3,
        cubes: {
          'p29-s1': cube('tut-p29s1', 'blue'),
          'p29-s2': cube('tut-p29s2', 'blue'),
          'p29-s3': cube('tut-p29s3', 'green'),
        },
      },
    ],
    // Row 2
    [
      // (2,0) Solanus — 1 ring, green TL, yellow BR
      {
        cardId: 'p27',
        row: 2,
        col: 0,
        cubes: {
          'p27-s1': cube('tut-p27s1', 'green'),
          'p27-s2': cube('tut-p27s2', 'yellow'),
        },
      },
      // (2,1) Violus — 1 ring, blue TL, yellow BR
      {
        cardId: 'p6',
        row: 2,
        col: 1,
        cubes: {
          'p6-s1': cube('tut-p6s1', 'blue'),
          'p6-s2': cube('tut-p6s2', 'yellow'),
        },
      },
      // (2,2) Caelion — 2 rings, white TL, black BR (demonstrates high-ring planet)
      {
        cardId: 'p22',
        row: 2,
        col: 2,
        cubes: {
          'p22-s1': cube('tut-p22s1', 'white'),
          'p22-s2': cube('tut-p22s2', 'black'),
        },
      },
      // (2,3) Aureon — 1 ring, blue TL, green TR, yellow BL
      {
        cardId: 'p15',
        row: 2,
        col: 3,
        cubes: {
          'p15-s1': cube('tut-p15s1', 'blue'),
          'p15-s2': cube('tut-p15s2', 'green'),
          'p15-s3': cube('tut-p15s3', 'yellow'),
        },
      },
    ],
    // Row 3
    [
      // (3,0) Violetia — 0 rings, blue TL, blue BR
      {
        cardId: 'p19',
        row: 3,
        col: 0,
        cubes: {
          'p19-s1': cube('tut-p19s1', 'blue'),
          'p19-s2': cube('tut-p19s2', 'blue'),
        },
      },
      // (3,1) Gaios — 0 rings, blue TL, green TR, green BL
      {
        cardId: 'p26',
        row: 3,
        col: 1,
        cubes: {
          'p26-s1': cube('tut-p26s1', 'blue'),
          'p26-s2': cube('tut-p26s2', 'green'),
          'p26-s3': cube('tut-p26s3', 'green'),
        },
      },
      // (3,2) Thalassa — 0 rings, blue TL, green TR, green BL, white BR
      {
        cardId: 'p25',
        row: 3,
        col: 2,
        cubes: {
          'p25-s1': cube('tut-p25s1', 'blue'),
          'p25-s2': cube('tut-p25s2', 'green'),
          'p25-s3': cube('tut-p25s3', 'green'),
          'p25-s4': cube('tut-p25s4', 'white'),
        },
      },
      // (3,3) Nocturnis — 0 rings, blue TL, blue TR, blue BL — P2 starts here
      {
        cardId: 'p16',
        row: 3,
        col: 3,
        cubes: {
          'p16-s1': cube('tut-p16s1', 'blue'),
          'p16-s2': cube('tut-p16s2', 'blue'),
          'p16-s3': cube('tut-p16s3', 'blue'),
        },
      },
    ],
  ],
};
