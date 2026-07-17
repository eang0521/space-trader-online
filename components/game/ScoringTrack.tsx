'use client';
import { PlayerState } from '@/lib/game/types';
import { PLAYER_COLOR_MAP } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ScoringTrackProps {
  players: PlayerState[];
}

export function ScoringTrack({ players }: ScoringTrackProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {sorted.map((player) => {
        const colorInfo = PLAYER_COLOR_MAP[player.color];
        const isLeading = player.score > 0 && player.score === topScore;

        return (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
              isLeading
                ? 'bg-yellow-950/40 border-yellow-700/60'
                : 'bg-gray-800 border-gray-700',
            )}
          >
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', colorInfo.bg)} />
            <span className="text-sm text-gray-300">{player.displayName}</span>
            <span className={cn('text-sm font-bold', isLeading ? 'text-yellow-400' : 'text-gray-400')}>
              {player.score}c
            </span>
            {isLeading && (
              <span className="text-yellow-500 text-xs leading-none">★</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
