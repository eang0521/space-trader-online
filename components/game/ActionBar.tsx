'use client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ActionBarProps {
  actionsRemaining: number;
  isMyTurn: boolean;
  onEndTurn: () => void;
  gameStatus: string;
  currentPlayerName?: string;
  tutorialHighlightEndTurn?: boolean;
  autoEndTurn?: boolean;
  onToggleAutoEndTurn?: () => void;
}

export function ActionBar({
  actionsRemaining,
  isMyTurn,
  onEndTurn,
  gameStatus,
  currentPlayerName,
  tutorialHighlightEndTurn,
  autoEndTurn,
  onToggleAutoEndTurn,
}: ActionBarProps) {
  if (gameStatus === 'placement') {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-sm text-gray-400 font-medium text-center">
          Ship Placement Phase
        </div>
        {isMyTurn ? (
          <p className="text-sm text-indigo-300 text-center">
            Click an edge planet to place your ship
          </p>
        ) : (
          <p className="text-sm text-gray-500 italic text-center">
            Waiting for {currentPlayerName} to place their ship...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400 font-medium">Actions:</span>
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-5 h-5 rounded-full border-2 transition-colors',
                i < actionsRemaining
                  ? 'bg-indigo-500 border-indigo-400'
                  : 'bg-gray-800 border-gray-700',
              )}
            />
          ))}
        </div>
        <span className="text-sm text-gray-400">{actionsRemaining} remaining</span>

        {gameStatus === 'game_end' && (
          <span className="ml-auto text-xs bg-amber-800 text-amber-200 px-2 py-0.5 rounded-full animate-pulse">
            Game End Phase
          </span>
        )}
      </div>

      {!isMyTurn ? (
        <div className="text-sm text-gray-500 italic text-center py-2">
          Waiting for other players...
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2 border-t border-gray-800 pt-2">
          {onToggleAutoEndTurn && (
            <button
              onClick={onToggleAutoEndTurn}
              title={autoEndTurn ? 'Auto-end turn is ON — click to disable' : 'Auto-end turn is OFF — click to enable'}
              className={cn(
                'flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border transition-all duration-150',
                autoEndTurn
                  ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400',
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              Auto
            </button>
          )}
          <div
            className={cn(
              'rounded-lg transition-all duration-200',
              tutorialHighlightEndTurn && 'ring-4 ring-cyan-400 shadow-[0_0_16px_4px_rgba(34,211,238,0.45)] animate-pulse',
            )}
          >
            <Button variant="secondary" size="sm" onClick={onEndTurn}>
              End Turn
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
