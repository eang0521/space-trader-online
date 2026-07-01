'use client';
import { LobbyPlayer } from '@/lib/game/types';
import { PLAYER_COLOR_MAP } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PlayerSlotProps {
  player?: LobbyPlayer;
  seatIndex: number;
}

export function PlayerSlot({ player, seatIndex }: PlayerSlotProps) {
  if (!player) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-700 bg-gray-900/50">
        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
          <span className="text-gray-600 text-sm">{seatIndex + 1}</span>
        </div>
        <span className="text-gray-500 text-sm italic">Waiting for player...</span>
      </div>
    );
  }

  const colorInfo = player.color ? PLAYER_COLOR_MAP[player.color] : null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border bg-gray-900',
        colorInfo ? colorInfo.border : 'border-gray-700',
      )}
    >
      {/* Color chip / seat number */}
      {colorInfo ? (
        <div className={cn('w-8 h-8 rounded-full flex-shrink-0', colorInfo.bg)} />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
          <span className="text-gray-400 text-sm">{player.seatIndex + 1}</span>
        </div>
      )}

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium truncate">{player.displayName}</p>
        {player.color && (
          <p className={cn('text-xs capitalize', colorInfo?.text ?? 'text-gray-400')}>
            {player.color}
          </p>
        )}
        {!player.color && (
          <p className="text-xs text-amber-400 italic">Choosing color...</p>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {player.isHost && (
          <span className="text-xs bg-indigo-700 text-indigo-200 px-2 py-0.5 rounded-full font-medium">
            Host
          </span>
        )}
      </div>
    </div>
  );
}
