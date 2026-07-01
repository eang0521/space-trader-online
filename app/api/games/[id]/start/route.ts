import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createInitialGameState } from '@/lib/game/setup';
import { LobbyPlayer, PlayerColor } from '@/lib/game/types';

interface GamePlayerRow {
  id: string;
  game_id: string;
  session_id: string;
  display_name: string;
  color: string | null;
  seat_index: number;
  is_host: boolean;
}

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

    // Verify game exists and is in lobby
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, code, status, host_session_id')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'Game already started' }, { status: 409 });
    }

    if (game.host_session_id !== sessionId) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
    }

    // Fetch players
    const { data: playersData, error: playersError } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('seat_index', { ascending: true });

    if (playersError || !playersData) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    const players = playersData as GamePlayerRow[];

    if (players.length < 2) {
      return NextResponse.json(
        { error: 'Need at least 2 players to start' },
        { status: 400 },
      );
    }

    if (players.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 players' }, { status: 400 });
    }

    // All players must have a color
    const missingColor = players.find((p) => !p.color);
    if (missingColor) {
      return NextResponse.json(
        { error: `Player "${missingColor.display_name}" has not chosen a color` },
        { status: 400 },
      );
    }

    // Build lobby players for game state creation
    const lobbyPlayers: LobbyPlayer[] = players.map((p) => ({
      id: p.id,
      sessionId: p.session_id,
      displayName: p.display_name,
      color: p.color as PlayerColor,
      seatIndex: p.seat_index,
      isHost: p.is_host,
    }));

    // Create initial game state
    const initialState = createInitialGameState(gameId, game.code, lobbyPlayers);

    // Update game status and state
    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: 'playing',
        state: initialState,
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Game start update error:', updateError);
      return NextResponse.json({ error: 'Failed to start game' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/games/[id]/start error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
