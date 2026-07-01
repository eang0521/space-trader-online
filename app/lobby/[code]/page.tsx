'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useGame } from '@/hooks/useGame';
import { LobbyRoom } from '@/components/lobby/LobbyRoom';

export default function LobbyPage() {
  const params = useParams();
  const code = (params?.code as string)?.toUpperCase();
  const router = useRouter();
  const { sessionId } = useSession();

  const [gameId, setGameId] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(true);

  // Resolve code -> gameId
  useEffect(() => {
    if (!code) return;

    async function lookup() {
      try {
        const res = await fetch(`/api/games?code=${code}`);
        const data = await res.json();
        if (!res.ok) {
          setLookupError(data.error ?? 'Game not found');
          return;
        }
        if (data.status === 'playing' || data.status === 'game_end') {
          router.replace(`/game/${data.gameId}`);
          return;
        }
        if (data.status === 'ended') {
          setLookupError('This game has already ended');
          return;
        }
        setGameId(data.gameId);
      } catch {
        setLookupError('Failed to load game');
      } finally {
        setLookupLoading(false);
      }
    }

    lookup();
  }, [code, router]);

  const { lobbyPlayers, gameState, loading } = useGame(gameId ?? '');

  // Watch for game start via realtime
  useEffect(() => {
    if (gameState?.status === 'playing' || gameState?.status === 'game_end') {
      router.replace(`/game/${gameId}`);
    }
  }, [gameState?.status, gameId, router]);

  const handleStart = async () => {
    if (!sessionId || !gameId) throw new Error('No session or game');

    const res = await fetch(`/api/games/${gameId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to start game');
    // Redirect will happen via realtime update
    router.replace(`/game/${gameId}`);
  };

  if (lookupLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading lobby...</p>
        </div>
      </main>
    );
  }

  if (lookupError) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{lookupError}</p>
          <a href="/" className="text-indigo-400 hover:text-indigo-300 underline">
            Return to home
          </a>
        </div>
      </main>
    );
  }

  if (!gameId || !sessionId) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Game Lobby</h1>
          <p className="text-gray-400 text-sm">Waiting for players to join...</p>
        </div>

        <LobbyRoom
          gameId={gameId}
          code={code}
          lobbyPlayers={lobbyPlayers}
          sessionId={sessionId}
          onStart={handleStart}
        />
      </div>
    </main>
  );
}
