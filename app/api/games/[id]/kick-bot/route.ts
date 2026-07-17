import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GameState, GameAction } from '@/lib/game/types';
import { autoBotPlacement, planBotTurn, applyBotAction } from '@/lib/game/bot';
import { hybridValueFunction } from '@/lib/game/bot/model';
import type { MLPWeights } from '@/lib/game/bot/model';
import weightsJson from '@/scripts/weights.json';
import { addLog, advanceTurn } from '@/lib/game/engine';

const botValueFunction = hybridValueFunction(weightsJson as unknown as MLPWeights);
const BOT_ACTION_DELAY_MS = 750;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type PersistFn = (state: GameState) => Promise<void>;

async function runBotTurnsAnimated(persist: PersistFn, initialState: GameState): Promise<GameState> {
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
        console.error(`Kick-bot: planning error (player ${botIndex}, turn ${s.turnNumber}):`, err);
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
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, state, version')
      .eq('id', gameId)
      .single();

    if (gameError || !game?.state) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const state = game.state as GameState;

    // Verify the requester is a player in this game
    const playerIndex = state.players.findIndex((p) => p.sessionId === sessionId);
    if (playerIndex === -1) {
      return NextResponse.json({ error: 'Not in game' }, { status: 403 });
    }

    // Only kick if it's actually a bot's turn
    const currentPlayer = state.players[state.currentPlayerIndex];
    if (!currentPlayer?.isBot) {
      return NextResponse.json({ error: 'Not a bot turn' }, { status: 409 });
    }

    const originalVersion = (game as { version?: number }).version ?? 0;
    let currentVersion = originalVersion;

    const persist: PersistFn = async (s) => {
      const nextVersion = currentVersion + 1;
      const statusVal = s.status === 'placement' ? 'playing' : s.status;
      if (currentVersion === originalVersion) {
        // Match both version=N and version IS NULL (for rows that predate the version column).
        const versionFilter = originalVersion === 0
          ? `version.eq.0,version.is.null`
          : `version.eq.${originalVersion}`;
        const { data: rows, error: updateError } = await supabase
          .from('games')
          .update({ status: statusVal, state: s, version: nextVersion })
          .eq('id', gameId)
          .or(versionFilter)
          .select('id');
        if (updateError) {
          // Column may not exist — fall back to unconditional update without version
          await supabase
            .from('games')
            .update({ status: statusVal, state: s })
            .eq('id', gameId);
        } else if (!rows || rows.length === 0) {
          throw new Error('Version conflict');
        }
      } else {
        await supabase
          .from('games')
          .update({ status: statusVal, state: s, version: nextVersion })
          .eq('id', gameId);
      }
      currentVersion = nextVersion;
    };

    await runBotTurnsAnimated(persist, state);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'Version conflict') {
      // Another request already handled this bot turn — not an error from the client's POV
      return NextResponse.json({ success: true });
    }
    console.error('POST /api/games/[id]/kick-bot error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
