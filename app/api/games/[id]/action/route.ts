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
        // Check if it's a private buyer sell
        const player = state.players[playerIndex];
        const isPrivate = player.privateBuyers.includes(action.buyerCardId);

        if (state.currentPlayerIndex !== playerIndex) {
          return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
        }

        const validation = isValidSell(
          state,
          playerIndex,
          action.buyerCardId,
          action.dealId,
          action.cubeIds,
          isPrivate,
        );
        if (!validation.valid) {
          return NextResponse.json({ error: validation.reason }, { status: 400 });
        }
        newState = applySell(
          state,
          playerIndex,
          action.buyerCardId,
          action.dealId,
          action.cubeIds,
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
        newState = applyRemoveBuyer(state, action.buyerCardId);
        newState = addLog(newState, playerIndex, `removed an impossible buyer from the market`);
        break;
      }

      case 'PLACE_SHIP': {
        const validation = isValidPlacement(state, playerIndex, action.row, action.col);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.reason }, { status: 400 });
        }
        newState = applyPlacement(state, playerIndex, action.row, action.col);
        break;
      }

      case 'END_TURN': {
        if (state.currentPlayerIndex !== playerIndex) {
          return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
        }
        newState = addLog(state, playerIndex, 'ended their turn');
        newState = advanceTurn(newState);
        break;
      }

      default: {
        return NextResponse.json({ error: 'Unknown action type' }, { status: 400 });
      }
    }

    // Persist updated state
    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: newState.status,
        state: newState,
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('State update error:', updateError);
      return NextResponse.json({ error: 'Failed to save game state' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/games/[id]/action error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
