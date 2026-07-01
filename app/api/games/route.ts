import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateGameCode } from '@/lib/game/setup';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, displayName } = body as {
      sessionId?: string;
      displayName?: string;
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

    const supabase = await createClient();
    const code = generateGameCode();

    // Create the game
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .insert({
        code,
        status: 'lobby',
        state: null,
        host_session_id: sessionId,
      })
      .select('id')
      .single();

    if (gameError || !gameData) {
      console.error('Game insert error:', gameError);
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }

    const gameId = gameData.id as string;

    // Add host as first player
    const playerId = uuidv4();
    const { error: playerError } = await supabase.from('game_players').insert({
      id: playerId,
      game_id: gameId,
      session_id: sessionId,
      display_name: trimmedName,
      color: null,
      seat_index: 0,
      is_host: true,
    });

    if (playerError) {
      console.error('Player insert error:', playerError);
      // Clean up game
      await supabase.from('games').delete().eq('id', gameId);
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
    }

    return NextResponse.json({ gameId, code }, { status: 201 });
  } catch (err) {
    console.error('POST /api/games error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('games')
      .select('id, code, status')
      .eq('code', code.toUpperCase())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ gameId: data.id, code: data.code, status: data.status });
  } catch (err) {
    console.error('GET /api/games error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
