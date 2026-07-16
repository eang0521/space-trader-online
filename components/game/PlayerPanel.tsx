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

function ShipIcon({ size = 'md', isBot }: { size?: 'sm' | 'md'; isBot?: boolean }) {
  const cls = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  if (isBot) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
        <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={cls}>
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
                <ShipIcon size="sm" isBot={player.isBot} />
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
