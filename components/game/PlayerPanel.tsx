'use client';
import { PlayerState } from '@/lib/game/types';
import { PLAYER_COLOR_MAP } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ResourceCube } from './ResourceCube';

interface PlayerPanelProps {
  players: PlayerState[];
  currentPlayerIndex: number;
  mySessionId: string | null;
}

// Rocket icon
function RocketIcon({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}
    >
      <path d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
      <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 005.022-2.051.75.75 0 10-1.202-.897 3.744 3.744 0 01-3.008 1.51c0-1.23.592-2.323 1.51-3.008z" />
    </svg>
  );
}

export function PlayerPanel({ players, currentPlayerIndex, mySessionId }: PlayerPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Players</h2>

      {players.map((player, i) => {
        const isCurrentTurn = i === currentPlayerIndex;
        const isMe = player.sessionId === mySessionId;
        const colorInfo = PLAYER_COLOR_MAP[player.color];

        return (
          <div
            key={player.id}
            className={cn(
              'p-3 rounded-xl border transition-colors',
              isCurrentTurn
                ? `border-2 ${colorInfo.border} bg-gray-800`
                : 'border-gray-700 bg-gray-900',
            )}
          >
            {/* Header row */}
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('p-1 rounded-lg flex-shrink-0', colorInfo.bg)}>
                <RocketIcon size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white truncate">
                    {player.displayName}
                  </span>
                  {isMe && (
                    <span className="text-xs bg-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded-full shrink-0">
                      You
                    </span>
                  )}
                  {isCurrentTurn && (
                    <span className="text-xs bg-yellow-700 text-yellow-200 px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                      Turn
                    </span>
                  )}
                </div>
              </div>
              {/* Score */}
              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-yellow-400">{player.score}</span>
                <span className="text-xs text-gray-500 ml-0.5">c</span>
              </div>
            </div>

            {/* Supply */}
            <div className="flex flex-wrap gap-1 min-h-4">
              {player.supply.map((cube) => (
                <ResourceCube key={cube.id} color={cube.color} size="sm" />
              ))}
              {player.supply.length === 0 && (
                <span className="text-xs text-gray-600 italic">Empty supply</span>
              )}
            </div>

            {/* Private buyers count */}
            {player.privateBuyers.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1">
                <span className="text-xs text-purple-400">
                  {player.privateBuyers.length} private buyer{player.privateBuyers.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Location */}
            <div className="mt-1 text-xs text-gray-500">
              Grid: ({player.shipRow}, {player.shipCol})
            </div>
          </div>
        );
      })}
    </div>
  );
}
