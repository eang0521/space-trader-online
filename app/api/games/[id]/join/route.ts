import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { PlayerColor } from '@/lib/game/types';

const VALID_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: gameId } = await params;
    const body = await request.json();
    const { sessionId, displayName, color } = body as {
      sessionId?: string;
      displayName?: string;
      color?: string;
    };

    if (!sessionId || !displayName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length > 24) {
      return NextResponse.json(
        { error: 'Display name must be 1-24 characters' },
        { status: 400 },
      );
    }

    if (color && !VALID_COLORS.includes(color as PlayerColor)) {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify game exists and is in lobby
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'Game already started' }, { status: 409 });
    }

    // Check if player already in game
    const { data: existingPlayer } = await supabase
      .from('game_players')
      .select('id, color')
      .eq('game_id', gameId)
      .eq('session_id', sessionId)
      .single();

    if (existingPlayer) {
      // Update color if provided
      if (color && color !== existingPlayer.color) {
        // Check color not taken by another player
        const { data: colorTaken } = await supabase
          .from('game_players')
          .select('id')
          .eq('game_id', gameId)
          .eq('color', color)
          .neq('session_id', sessionId)
          .single();

        if (colorTaken) {
          return NextResponse.json({ error: 'Color already taken' }, { status: 409 });
        }

        await supabase
          .from('game_players')
          .update({ color, display_name: trimmedName })
          .eq('id', existingPlayer.id);
      }
      return NextResponse.json({ success: true, playerId: existingPlayer.id });
    }

    // Check max players
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    if ((count ?? 0) >= 4) {
      return NextResponse.json({ error: 'Game is full (max 4 players)' }, { status: 409 });
    }

    // Check color not taken
    if (color) {
      const { data: colorTaken } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', gameId)
        .eq('color', color)
        .single();

      if (colorTaken) {
        return NextResponse.json({ error: 'Color already taken' }, { status: 409 });
      }
    }

    // Get next seat index
    const { data: players } = await supabase
      .from('game_players')
      .select('seat_index')
      .eq('game_id', gameId)
      .order('seat_index', { ascending: false })
      .limit(1);

    const nextSeat = players && players.length > 0 ? players[0].seat_index + 1 : 1;
    const playerId = uuidv4();

    const { error: insertError } = await supabase.from('game_players').insert({
      id: playerId,
      game_id: gameId,
      session_id: sessionId,
      display_name: trimmedName,
      color: color ?? null,
      seat_index: nextSeat,
      is_host: false,
    });

    if (insertError) {
      console.error('Join insert error:', insertError);
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
    }

    return NextResponse.json({ success: true, playerId }, { status: 201 });
  } catch (err) {
    console.error('POST /api/games/[id]/join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update color selection
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: gameId } = await params;
    const body = await request.json();
    const { sessionId, color } = body as { sessionId?: string; color?: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    if (color && !VALID_COLORS.includes(color as PlayerColor)) {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check color not taken by another player
    if (color) {
      const { data: colorTaken } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_id', gameId)
        .eq('color', color)
        .neq('session_id', sessionId)
        .single();

      if (colorTaken) {
        return NextResponse.json({ error: 'Color already taken' }, { status: 409 });
      }
    }

    const { error } = await supabase
      .from('game_players')
      .update({ color: color ?? null })
      .eq('game_id', gameId)
      .eq('session_id', sessionId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update color' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/games/[id]/join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
