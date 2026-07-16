'use client';
import { useEffect, useRef } from 'react';
import { GameLogEntry, LogEntryKind } from '@/lib/game/types';
import { PLAYER_COLOR_MAP, RESOURCE_COLOR_MAP, cn } from '@/lib/utils';

interface GameLogProps {
  log: GameLogEntry[];
}

const KIND_ICON: Record<LogEntryKind, string> = {
  move: '→',
  gather: '⛏',
  sell: '$',
  draw: '✦',
  remove: '✕',
  placement: '⚓',
  end_turn: '—',
  system: '★',
};

const KIND_COLOR: Record<LogEntryKind, string> = {
  move: 'text-sky-400',
  gather: 'text-emerald-400',
  sell: 'text-yellow-400',
  draw: 'text-purple-400',
  remove: 'text-rose-400',
  placement: 'text-indigo-400',
  end_turn: 'text-gray-600',
  system: 'text-indigo-300',
};

function TurnDivider({ turnNumber }: { turnNumber: number }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="flex-1 h-px bg-gray-800" />
      <span className="text-gray-600 text-xs font-mono shrink-0">Turn {turnNumber}</span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  );
}

export function GameLog({ log }: GameLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  // Collect visible entries (hide end_turn; use them only for turn-boundary detection)
  type RenderedItem =
    | { type: 'divider'; turnNumber: number; key: string }
    | { type: 'entry'; entry: GameLogEntry };

  const items: RenderedItem[] = [];
  let lastTurn: number | undefined = undefined;

  for (const entry of log) {
    const isEndTurn = entry.kind === 'end_turn';
    const turnNum = entry.turnNumber;

    // Insert a divider when the turn number changes (skip for the very first entry)
    if (turnNum !== undefined && turnNum !== lastTurn && lastTurn !== undefined) {
      // The divider labels the NEW turn starting
      items.push({ type: 'divider', turnNumber: turnNum, key: `div-${turnNum}` });
    }
    if (turnNum !== undefined) lastTurn = turnNum;

    // Don't render end_turn entries as rows — the divider already signals the boundary
    if (!isEndTurn) {
      items.push({ type: 'entry', entry });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2 flex-shrink-0">
        Game Log
      </h2>
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1">
        {items.length === 0 && (
          <p className="text-gray-600 text-xs italic px-1 pt-1">No actions yet</p>
        )}

        {items.map((item) => {
          if (item.type === 'divider') {
            return <TurnDivider key={item.key} turnNumber={item.turnNumber} />;
          }

          const { entry } = item;
          const kind = entry.kind ?? 'system';
          const colorInfo = PLAYER_COLOR_MAP[entry.playerColor as keyof typeof PLAYER_COLOR_MAP];

          return (
            <div key={entry.id} className="flex items-start gap-1.5 py-0.5 text-xs group">
              {/* Action icon */}
              <span
                className={cn(
                  'shrink-0 w-3.5 text-center font-mono mt-px',
                  KIND_COLOR[kind],
                )}
                title={kind}
              >
                {KIND_ICON[kind]}
              </span>

              {/* Player name */}
              <span
                className={cn(
                  'font-semibold shrink-0',
                  colorInfo ? colorInfo.text : 'text-indigo-400',
                )}
              >
                {entry.playerName}
              </span>

              {/* Message body */}
              <span className="text-gray-300 leading-tight">
                {kind === 'gather' && entry.resource ? (
                  <>
                    gathered{' '}
                    <span
                      className={cn(
                        'inline-block w-2.5 h-2.5 rounded-sm align-middle mx-0.5 border border-black/20',
                        RESOURCE_COLOR_MAP[entry.resource].bg,
                      )}
                      title={RESOURCE_COLOR_MAP[entry.resource].label}
                    />
                    {' '}{entry.message}
                  </>
                ) : (
                  entry.message
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
