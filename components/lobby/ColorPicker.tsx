'use client';
import { PlayerColor } from '@/lib/game/types';
import { PLAYER_COLOR_MAP } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TakenColor {
  color: PlayerColor;
  name: string;
}

interface ColorPickerProps {
  selectedColor: PlayerColor | null;
  takenColors: TakenColor[];
  onSelect: (color: PlayerColor) => void;
}

const COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];

// Rocket SVG icon
function RocketIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
      <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 005.022-2.051.75.75 0 10-1.202-.897 3.744 3.744 0 01-3.008 1.51c0-1.23.592-2.323 1.51-3.008z" />
    </svg>
  );
}

export function ColorPicker({ selectedColor, takenColors, onSelect }: ColorPickerProps) {
  const takenMap = new Map(takenColors.map((t) => [t.color, t.name]));

  return (
    <div className="flex gap-3 flex-wrap">
      {COLORS.map((color) => {
        const colorInfo = PLAYER_COLOR_MAP[color];
        const takenBy = takenMap.get(color);
        const isTaken = !!takenBy;
        const isSelected = selectedColor === color;

        return (
          <button
            key={color}
            onClick={() => !isTaken && onSelect(color)}
            disabled={isTaken}
            title={isTaken ? `Taken by ${takenBy}` : `Choose ${color}`}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
              isSelected
                ? `${colorInfo.border} bg-gray-800 shadow-lg`
                : 'border-gray-700 bg-gray-900 hover:border-gray-500',
              isTaken && 'opacity-40 cursor-not-allowed',
              !isTaken && !isSelected && 'hover:bg-gray-800 cursor-pointer',
            )}
            aria-pressed={isSelected}
            aria-label={isTaken ? `${color} - taken by ${takenBy}` : `Select ${color}`}
          >
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', colorInfo.bg)}>
              <RocketIcon className="w-5 h-5 text-white" />
            </div>
            <span className={cn('text-xs font-medium capitalize', isSelected ? colorInfo.text : 'text-gray-400')}>
              {color}
            </span>
            {isTaken && (
              <span className="text-xs text-gray-500 max-w-16 text-center leading-tight">
                {takenBy}
              </span>
            )}
            {isSelected && (
              <span className="text-xs text-indigo-400 font-semibold">You</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
