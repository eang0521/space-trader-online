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
import { ruleBasedValueFunction } from '@/lib/game/bot';

const botValueFunction = ruleBasedValueFunction;

const BOT_ACTION_DELAY_MS = 750;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type PersistFn = (state: GameState) => Promise<void>;

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
        console.log(`Bot turn: player ${botIndex}, turn ${s.turnNumber}, planned ${actions.length} actions`);
      } catch (err) {
        console.error(`Bot planning error (player ${botIndex}, turn ${s.turnNumber}):`, err);
      }

      for (const action of actions) {
        await sleep(BOT_ACTION_DELAY_MS);
        try {
          s = applyBotAction(s, botIndex, action);
          await persist(s);
        } catch (err) {
          console.error(`Bot action apply error (${action.type}):`, err);
          break;
        }
      }

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

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, state')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.state) {
      return NextResponse.json({ error: 'Game state not initialized' }, { status: 400 });
    }

    let state = game.state as GameState;

    const persist: PersistFn = async (s) => {
      const statusVal = s.status === 'placement' ? 'playing' : s.status;
      const { error } = await supabase
        .from('games')
        .update({ status: statusVal, state: s })
        .eq('id', gameId);
      if (error) {
        console.error('persist error:', error);
      }
    };

    if (state.status === 'ended') {
      return NextResponse.json({ error: 'Game is already over' }, { status: 409 });
    }

    if (state.status === 'lobby') {
      return NextResponse.json({ error: 'Game has not started yet' }, { status: 409 });
    }

    const playerIndex = state.players.findIndex((p) => p.sessionId === sessionId);
    if (playerIndex === -1) {
      return NextResponse.json({ error: 'Player not in game' }, { status: 403 });
    }

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
        console.log(`END_TURN: next player ${newState.currentPlayerIndex}, isBot=${newState.players[newState.currentPlayerIndex]?.isBot}`);
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

    await persist(newState);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/games/[id]/action error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
