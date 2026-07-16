'use client';
import { useState, useCallback } from 'react';
import { LobbyPlayer, PlayerColor } from '@/lib/game/types';
import { ColorPicker } from './ColorPicker';
import { PlayerSlot } from './PlayerSlot';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface LobbyRoomProps {
  gameId: string;
  code: string;
  lobbyPlayers: LobbyPlayer[];
  sessionId: string;
  onStart: () => Promise<void>;
}

export function LobbyRoom({
  gameId,
  code,
  lobbyPlayers,
  sessionId,
  onStart,
}: LobbyRoomProps) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [colorLoading, setColorLoading] = useState(false);
  const [addingBot, setAddingBot] = useState(false);

  const me = lobbyPlayers.find((p) => p.sessionId === sessionId);
  const isHost = me?.isHost ?? false;

  const takenColors = lobbyPlayers
    .filter((p) => p.sessionId !== sessionId && p.color)
    .map((p) => ({ color: p.color as PlayerColor, name: p.displayName }));

  const canStart =
    isHost &&
    lobbyPlayers.length >= 2 &&
    lobbyPlayers.every((p) => p.color !== null);

  const canAddBot = isHost && lobbyPlayers.length < 4;

  const handleAddBot = async () => {
    if (!sessionId || addingBot || !canAddBot) return;
    setAddingBot(true);
    try {
      await fetch(`/api/games/${gameId}/add-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err) {
      console.error('Add bot error:', err);
    } finally {
      setAddingBot(false);
    }
  };

  const handleRemoveBot = async (botSessionId: string) => {
    if (!sessionId) return;
    try {
      await fetch(`/api/games/${gameId}/add-bot`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, botSessionId }),
      });
    } catch (err) {
      console.error('Remove bot error:', err);
    }
  };

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }, [code]);

  const handleSelectColor = async (color: PlayerColor) => {
    if (!sessionId || colorLoading) return;
    setColorLoading(true);
    try {
      await fetch(`/api/games/${gameId}/join`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, color }),
      });
    } catch (err) {
      console.error('Color select error:', err);
    } finally {
      setColorLoading(false);
    }
  };

  const handleStart = async () => {
    if (!canStart || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      await onStart();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Failed to start game');
    } finally {
      setStarting(false);
    }
  };

  // Fill slots up to 4
  const slots = Array.from({ length: 4 }, (_, i) => lobbyPlayers[i] ?? undefined);

  return (
    <div className="max-w-lg w-full mx-auto flex flex-col gap-6">
      {/* Game code */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
        <p className="text-sm text-gray-400 mb-2 text-center">Game Code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl font-mono font-bold tracking-widest text-indigo-300 select-all">
            {code}
          </span>
          <button
            onClick={handleCopyCode}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800"
            aria-label="Copy game code"
          >
            {copied ? (
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          Share this code with friends to join
        </p>
      </div>

      {/* Players */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
          Players ({lobbyPlayers.length}/4)
        </h2>
        {slots.map((player, i) => (
          <div key={player?.id ?? `empty-${i}`} className="flex items-center gap-2">
            <div className="flex-1">
              <PlayerSlot player={player} seatIndex={i} />
            </div>
            {isHost && player?.isBot && (
              <button
                onClick={() => handleRemoveBot(player.sessionId)}
                className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors"
                title="Remove CPU player"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Color picker */}
      {me && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Choose Your Color
          </h2>
          <ColorPicker
            selectedColor={me.color}
            takenColors={takenColors}
            onSelect={handleSelectColor}
          />
          {colorLoading && (
            <p className="text-xs text-gray-500">Saving color choice...</p>
          )}
        </div>
      )}

      {/* Start / waiting */}
      <div className="flex flex-col gap-2">
        {isHost ? (
          <>
            <div className="flex gap-2">
              <Button
                onClick={handleStart}
                loading={starting}
                disabled={!canStart}
                size="lg"
                className="flex-1"
              >
                Start Game
              </Button>
              <Button
                onClick={handleAddBot}
                loading={addingBot}
                disabled={!canAddBot}
                size="lg"
                className="shrink-0"
                variant="secondary"
              >
                + CPU
              </Button>
            </div>
            {!canStart && lobbyPlayers.length < 2 && (
              <p className="text-xs text-amber-400 text-center">
                Need at least 2 players to start
              </p>
            )}
            {!canStart && lobbyPlayers.length >= 2 && lobbyPlayers.some((p) => !p.color) && (
              <p className="text-xs text-amber-400 text-center">
                All players must choose a color
              </p>
            )}
          </>
        ) : (
          <div className={cn(
            'text-center py-3 rounded-xl border border-gray-700 bg-gray-900',
            'text-gray-400 text-sm',
          )}>
            <div className="flex items-center justify-center gap-2">
              <svg className="animate-pulse w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="10" />
              </svg>
              Waiting for host to start the game...
            </div>
          </div>
        )}

        {startError && (
          <p className="text-sm text-red-400 text-center">{startError}</p>
        )}
      </div>
    </div>
  );
}
