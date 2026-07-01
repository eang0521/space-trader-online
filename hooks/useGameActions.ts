'use client';
import { GameAction } from '@/lib/game/types';

export function useGameActions(gameId: string, sessionId: string | null) {
  const performAction = async (action: GameAction): Promise<{ error?: string }> => {
    if (!sessionId) return { error: 'No session' };
    const res = await fetch(`/api/games/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, sessionId }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Action failed' };
    return {};
  };

  return { performAction };
}
