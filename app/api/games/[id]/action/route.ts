import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GameAction, GameState } from '@/lib/game/types';
import {
  isValidMove,
  applyMove,
  isValidGather,
  applyGather,
  isValidSell,
  applySell,
  isValidDrawPrivateBuyer,
  applyDrawPrivateBuyer,
  canRemoveBuyer,
  applyRemoveBuyer,
  advanceTurn,
  addLog,
  isValidPlacement,
  applyPlacement,
} from '@/lib/game/engine';
import {
  autoBotPlacement,
  planBotTurn,
  applyBotAction,
} from '@/lib/game/bot';
import { hybridValueFunction } from '@/lib/game/bot/model';
import type { MLPWeights } from '@/lib/game/bot/model';
import weightsJson from '@/scripts/weights.json';

const botValueFunction = hybridValueFunction(weightsJson as unknown as MLPWeights);

const BOT_ACTION_DELAY_MS = 750;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Persist a game state snapshot to the database.
type PersistFn = (state: GameState) => Promise<void>;

// Run all consecutive bot turns, persisting each individual action with a delay
// so the client can watch the moves unfold via realtime.
async function runBotTurnsAnimated(
  persist: PersistFn,
  initialState: GameState,
): Promise<GameState> {
  let s = initialState;

  for (let guard = 0; guard < 20; guard++) {
    const currentPlayer = s.players[s.currentPlayerIndex];
    if (!currentPlayer?.isBot) break;

    if (s.status === 'placement') {
      await sleep(BOT_ACTION_DELAY_MS);
      s = autoBotPlacement(s, s.currentPlayerIndex);
      await persist(s);
    } else if (s.status === 'playing' || s.status === 'game_end_triggered' || s.status === 'game_end_phase') {
      const botIndex = s.currentPlayerIndex;
      let actions: GameAction[] = [];
      try {
        actions = planBotTurn(s, botIndex, { valueFunction: botValueFunction });
      } catch (err) {
        console.error(`Bot planning error (player ${botIndex}, turn ${s.turnNumber}):`, err);
      }

      for (const action of actions) {
        await sleep(BOT_ACTION_DELAY_MS);
        try {
          s = applyBotAction(s, botIndex, action);
          await persist(s);
        } catch {
          break;
        }
      }

      // End the bot's turn
      await sleep(BOT_ACTION_DELAY_MS);
      s = addLog(s, botIndex, 'ended their turn', 'end_turn');
      s = advanceTurn(s);
      await persist(s);
    } else {
      break;
    }
  }

  return s;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: gameId } = await params;
    const body = await request.json();
    const { sessionId, action } = body as {
      sessionId?: string;
      action?: GameAction;
    };

    if (!sessionId || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch current game state
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, state, version')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.state) {
      return NextResponse.json({ error: 'Game state not initialized' }, { status: 400 });
    }

    let state = game.state as GameState;

    const originalVersion = (game as { version?: number }).version ?? 0;
    let currentVersion = originalVersion;

    class ConcurrentModificationError extends Error {
      constructor() { super('Concurrent modification'); }
    }

    const persist: PersistFn = async (state) => {
      const nextVersion = currentVersion + 1;
      const statusVal = state.status === 'placement' ? 'playing' : state.status;

      if (currentVersion === originalVersion) {
        // Match both version=N and version IS NULL (for rows that predate the version column).
        const versionFilter = originalVersion === 0
          ? `version.eq.0,version.is.null`
          : `version.eq.${originalVersion}`;
        const { data: rows, error: updateError } = await supabase
          .from('games')
          .update({ status: statusVal, state, version: nextVersion })
          .eq('id', gameId)
          .or(versionFilter)
          .select('id');
        if (updateError) {
          // Column may not exist — fall back to unconditional update without version
          await supabase
            .from('games')
            .update({ status: statusVal, state })
            .eq('id', gameId);
        } else if (!rows || rows.length === 0) {
          throw new ConcurrentModificationError();
        }
      } else {
        await supabase
          .from('games')
          .update({ status: statusVal, state, version: nextVersion })
          .eq('id', gameId);
      }
      currentVersion = nextVersion;
    };

    if (state.status === 'ended') {
      return NextResponse.json({ error: 'Game is already over' }, { status: 409 });
    }

    if (state.status === 'lobby') {
      return NextResponse.json({ error: 'Game has not started yet' }, { status: 409 });
    }

    // Find the player making the action
    const playerIndex = state.players.findIndex((p) => p.sessionId === sessionId);
    if (playerIndex === -1) {
      return NextResponse.json({ error: 'Player not in game' }, { status: 403 });
    }

    // Apply action
    let newState: GameState;

    switch (action.type) {
      case 'MOVE': {
        if (state.status !== 'playing') {
          return NextResponse.json(
            { error: 'Move not allowed during game end phase' },
            { status: 400 },
          );
        }
        const validation = isValidMove(state, playerIndex, action.toRow, action.toCol);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.reason }, { status: 400 });
        }
        newState = applyMove(state, playerIndex, action.toRow, action.toCol);
        break;
      }

      case 'GATHER': {
        if (state.status !== 'playing') {
          return NextResponse.json(
            { error: 'Gather not allowed during game end phase' },
            { status: 400 },
          );
        }
        const validation = isValidGather(
          state,
          playerIndex,
          action.slotId,
          action.planetRow,
          action.planetCol,
        );
        if (!validation.valid) {
          return NextResponse.json({ error: validation.reason }, { status: 400 });
        }
        newState = applyGather(
          state,
          playerIndex,
          action.slotId,
          action.planetRow,
          action.planetCol,
        );
        break;
      }

      case 'SELL': {
        const player = state.players[playerIndex];
        const isPrivate = player.privateBuyers.includes(action.buyerCardId);

        if (state.currentPlayerIndex !== playerIndex) {
          return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
        }

        const validation = isValidSell(
          state,
          playerIndex,
          action.buyerCardId,
          action.dealSells,
          isPrivate,
        );
        if (!validation.valid) {
          return NextResponse.json({ error: validation.reason }, { status: 400 });
        }
        newState = applySell(
          state,
          playerIndex,
          action.buyerCardId,
          action.dealSells,
          isPrivate,
        );
        break;
      }

      case 'DRAW_PRIVATE_BUYER': {
        if (state.status !== 'playing') {
          return NextResponse.json(
            { error: 'Cannot draw private buyer during game end phase' },
            { status: 400 },
          );
        }
        const validation = isValidDrawPrivateBuyer(state, playerIndex);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.reason }, { status: 400 });
        }
        newState = applyDrawPrivateBuyer(state, playerIndex);
        break;
      }

      case 'REMOVE_BUYER': {
        if (state.currentPlayerIndex !== playerIndex) {
          return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
        }
        if (!canRemoveBuyer(state, action.buyerCardId)) {
          return NextResponse.json(
            { error: 'Buyer cannot be removed — some deals are still possible' },
            { status: 400 },
          );
        }
        newState = applyRemoveBuyer(state, playerIndex, action.buyerCardId);
        break;
      }

      case 'PLACE_SHIP': {
        const validation = isValidPlacement(state, playerIndex, action.row, action.col);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.reason }, { status: 400 });
        }
        newState = applyPlacement(state, playerIndex, action.row, action.col);
        // If a bot is next to place (or the game just started playing with a bot),
        // persist the current state first then animate the bot's moves.
        if (newState.players[newState.currentPlayerIndex]?.isBot) {
          await persist(newState);
          await runBotTurnsAnimated(persist, newState);
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'END_TURN': {
        if (state.currentPlayerIndex !== playerIndex) {
          return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
        }
        newState = addLog(state, playerIndex, 'ended their turn', 'end_turn');
        newState = advanceTurn(newState);
        // Animate the bot's turn before responding
        if (newState.players[newState.currentPlayerIndex]?.isBot) {
          await persist(newState);
          await runBotTurnsAnimated(persist, newState);
          return NextResponse.json({ success: true });
        }
        break;
      }

      default: {
        return NextResponse.json({ error: 'Unknown action type' }, { status: 400 });
      }
    }

    // Normal (non-bot) persist
    await persist(newState);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/games/[id]/action error:', err);
    if (err instanceof Error && err.message === 'Concurrent modification') {
      return NextResponse.json(
        { error: 'Game state changed — please retry your action' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
