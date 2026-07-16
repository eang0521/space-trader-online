import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlayerColor } from '@/lib/game/types';

const ALL_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: gameId } = await params;
    const body = await request.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, host_session_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'Can only add bots before the game starts' }, { status: 409 });
    }

    if (game.host_session_id !== sessionId) {
      return NextResponse.json({ error: 'Only the host can add bots' }, { status: 403 });
    }

    const { data: existingPlayers, error: playersError } = await supabase
      .from('game_players')
      .select('seat_index, color')
      .eq('game_id', gameId)
      .order('seat_index', { ascending: true });

    if (playersError || !existingPlayers) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    if (existingPlayers.length >= 4) {
      return NextResponse.json({ error: 'Maximum 4 players' }, { status: 400 });
    }

    const takenColors = existingPlayers.map((p) => p.color).filter(Boolean) as PlayerColor[];
    const availableColor = ALL_COLORS.find((c) => !takenColors.includes(c));
    if (!availableColor) {
      return NextResponse.json({ error: 'No colors available' }, { status: 400 });
    }

    const seatIndex = existingPlayers.length;
    const botSessionId = `bot:${gameId}:${seatIndex}`;

    const { error: insertError } = await supabase.from('game_players').insert({
      game_id: gameId,
      session_id: botSessionId,
      display_name: `CPU ${seatIndex}`,
      color: availableColor,
      seat_index: seatIndex,
      is_host: false,
    });

    if (insertError) {
      console.error('Bot insert error:', insertError);
      return NextResponse.json({ error: 'Failed to add bot' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/games/[id]/add-bot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: gameId } = await params;
    const body = await request.json();
    const { sessionId, botSessionId } = body as {
      sessionId?: string;
      botSessionId?: string;
    };

    if (!sessionId || !botSessionId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, host_session_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'Can only remove bots before the game starts' }, { status: 409 });
    }

    if (game.host_session_id !== sessionId) {
      return NextResponse.json({ error: 'Only the host can remove bots' }, { status: 403 });
    }

    if (!botSessionId.startsWith('bot:')) {
      return NextResponse.json({ error: 'Can only remove bot players this way' }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from('game_players')
      .delete()
      .eq('game_id', gameId)
      .eq('session_id', botSessionId);

    if (deleteError) {
      console.error('Bot remove error:', deleteError);
      return NextResponse.json({ error: 'Failed to remove bot' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/games/[id]/add-bot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
