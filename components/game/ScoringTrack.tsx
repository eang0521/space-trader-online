'use client';
import { motion } from 'framer-motion';
import { PlayerState } from '@/lib/game/types';
import { PLAYER_COLOR_MAP } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ScoringTrackProps {
  players: PlayerState[];
}

const MAX_SCORE = 75;
const TRACK_STEPS = 15; // 0, 5, 10, ... 75

export function ScoringTrack({ players }: ScoringTrackProps) {
  return (
    <div className="relative">
      {/* Track */}
      <div className="relative h-8 bg-gray-800 rounded-full border border-gray-700 overflow-visible">
        {/* Step markers */}
        <div className="absolute inset-0 flex items-center">
          {Array.from({ length: TRACK_STEPS + 1 }).map((_, i) => {
            const val = i * 5;
            return (
              <div
                key={val}
                className="flex-1 flex items-center justify-center relative"
              >
                {i < TRACK_STEPS && (
                  <div className="absolute right-0 w-px h-4 bg-gray-700" />
                )}
                {val % 25 === 0 && (
                  <span className="text-xs text-gray-500 absolute -bottom-5 -translate-x-1/2 left-0">
                    {val}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Fill */}
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-indigo-900 to-indigo-800 opacity-30"
          style={{ width: '100%' }}
        />

        {/* Player markers */}
        {players.map((player) => {
          const pct = Math.min(player.score / MAX_SCORE, 1) * 100;
          const colorInfo = PLAYER_COLOR_MAP[player.color];

          return (
            <motion.div
              key={player.id}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-gray-900 shadow-lg flex items-center justify-center',
                colorInfo.bg,
              )}
              animate={{ left: `calc(${pct}% - 12px)` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              title={`${player.displayName}: ${player.score} credits`}
            >
              <span className="text-white text-xs font-bold leading-none">
                {player.displayName.charAt(0).toUpperCase()}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Labels below */}
      <div className="flex justify-between mt-6 px-1">
        {[0, 25, 50, 75].map((val) => (
          <span key={val} className="text-xs text-gray-500">
            {val}
          </span>
        ))}
      </div>

      {/* Player scores summary */}
      <div className="flex gap-3 mt-1 flex-wrap">
        {players.map((player) => {
          const colorInfo = PLAYER_COLOR_MAP[player.color];
          return (
            <div key={player.id} className="flex items-center gap-1.5">
              <div className={cn('w-3 h-3 rounded-full', colorInfo.bg)} />
              <span className="text-xs text-gray-300">
                {player.displayName}:{' '}
                <span className="text-yellow-400 font-semibold">{player.score}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
