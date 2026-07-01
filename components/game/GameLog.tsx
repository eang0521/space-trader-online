'use client';
import { useEffect, useRef } from 'react';
import { GameLogEntry } from '@/lib/game/types';
import { PLAYER_COLOR_MAP } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface GameLogProps {
  log: GameLogEntry[];
}

export function GameLog({ log }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 flex-shrink-0">
        Game Log
      </h2>
      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar min-h-0 max-h-48">
        {log.length === 0 && (
          <p className="text-gray-600 text-xs italic">No actions yet</p>
        )}
        {log.map((entry) => {
          const colorInfo =
            entry.playerName === 'Game'
              ? null
              : PLAYER_COLOR_MAP[entry.playerColor];

          return (
            <div key={entry.id} className="flex gap-1.5 text-xs">
              <span className="text-gray-600 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span
                className={cn(
                  'font-semibold shrink-0',
                  colorInfo ? colorInfo.text : 'text-indigo-400',
                )}
              >
                {entry.playerName}:
              </span>
              <span className="text-gray-300">{entry.message}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
