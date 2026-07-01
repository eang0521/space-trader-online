'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GameState, LobbyPlayer } from '@/lib/game/types';

interface GameRow {
  id: string;
  code: string;
  status: string;
  state: GameState | null;
  host_session_id: string;
}

interface GamePlayerRow {
  id: string;
  game_id: string;
  session_id: string;
  display_name: string;
  color: string | null;
  seat_index: number;
  is_host: boolean;
}

function rowToLobbyPlayer(row: GamePlayerRow): LobbyPlayer {
  return {
    id: row.id,
    sessionId: row.session_id,
    displayName: row.display_name,
    color: row.color as LobbyPlayer['color'],
    seatIndex: row.seat_index,
    isHost: row.is_host,
  };
}

export function useGame(gameId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const supabase = createClient();
    let mounted = true;

    async function fetchInitial() {
      try {
        // Fetch game state
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError) throw new Error(gameError.message);
        if (!gameData) throw new Error('Game not found');

        const game = gameData as GameRow;

        if (!mounted) return;

        if (game.state) {
          setGameState(game.state);
        }

        // Fetch lobby players
        const { data: playersData, error: playersError } = await supabase
          .from('game_players')
          .select('*')
          .eq('game_id', gameId)
          .order('seat_index', { ascending: true });

        if (playersError) throw new Error(playersError.message);

        if (mounted && playersData) {
          setLobbyPlayers((playersData as GamePlayerRow[]).map(rowToLobbyPlayer));
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchInitial();

    // Subscribe to game state changes
    const gamesChannel = supabase
      .channel(`game-state-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          if (!mounted) return;
          const newGame = payload.new as GameRow;
          if (newGame?.state) {
            setGameState(newGame.state);
          }
        },
      )
      .subscribe();

    // Subscribe to player changes (lobby)
    const playersChannel = supabase
      .channel(`game-players-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        async () => {
          if (!mounted) return;
          const { data } = await supabase
            .from('game_players')
            .select('*')
            .eq('game_id', gameId)
            .order('seat_index', { ascending: true });

          if (mounted && data) {
            setLobbyPlayers((data as GamePlayerRow[]).map(rowToLobbyPlayer));
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(gamesChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [gameId]);

  return { gameState, lobbyPlayers, loading, error };
}
