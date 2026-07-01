'use client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface ActionBarProps {
  actionsRemaining: number;
  isMyTurn: boolean;
  onEndTurn: () => void;
  gameStatus: string;
  currentPlayerName?: string;
}

export function ActionBar({ actionsRemaining, isMyTurn, onEndTurn, gameStatus, currentPlayerName }: ActionBarProps) {
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
        <div className="flex items-center justify-end border-t border-gray-800 pt-2">
          <Button variant="secondary" size="sm" onClick={onEndTurn}>
            End Turn
          </Button>
        </div>
      )}
    </div>
  );
}
