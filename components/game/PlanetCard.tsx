'use client';
import { motion } from 'framer-motion';
import { PlanetCell, PlanetCardDef, PlayerState, SlotPosition } from '@/lib/game/types';
import { PLAYER_COLOR_MAP, cn } from '@/lib/utils';
import { ResourceCube } from './ResourceCube';

interface PlanetCardProps {
  cell: PlanetCell | null;
  def: PlanetCardDef;
  ships: PlayerState[];
  isSelected: boolean;
  isTargetable: boolean;
  isCurrentPlayerHere: boolean;
  isGatherMode?: boolean;
  moveCost?: number;
  onClick?: () => void;
  onSlotClick?: (slotId: string) => void;
  /** Tutorial: this is the exact planet the player must move to */
  isTutorialTarget?: boolean;
  /** Tutorial: this planet is where the player must gather from */
  isTutorialGather?: boolean;
  /** Tutorial: point this planet out for explanation (amber, no move implication) */
  isTutorialCallout?: boolean;
}

function RingIndicators({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full border border-white/20"
          style={{ width: `${60 + i * 14}%`, height: `${60 + i * 14}%` }}
        />
      ))}
    </div>
  );
}

function ShipIcon({ color, isBot }: { color: string; isBot?: boolean }) {
  return (
    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shadow-md', color)}>
      {isBot ? (
        // Gear icon for CPU players
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
          <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
        </svg>
      ) : (
        // Rocket icon for human players
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
          <path d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
          <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 005.022-2.051.75.75 0 10-1.202-.897 3.744 3.744 0 01-3.008 1.51c0-1.23.592-2.323 1.51-3.008z" />
        </svg>
      )}
    </div>
  );
}

const PLANET_GRADIENTS = [
  'from-teal-900/80 to-gray-900',
  'from-blue-900/80 to-gray-900',
  'from-purple-900/80 to-gray-900',
  'from-red-900/60 to-gray-900',
];

// BL/BR use bottom-[5%] to mirror TL/TR's top-[5%].
// The slot divs are rendered after the name bar in DOM order so they appear on top.
// The name bar uses px-[28%] text-center to keep text in the center gap between BL/BR cubes.
const SLOT_CLASSES: Record<SlotPosition, string> = {
  TL: 'top-[5%] left-[4%]',
  TR: 'top-[5%] right-[4%]',
  BL: 'bottom-[5%] left-[4%]',
  BR: 'bottom-[5%] right-[4%]',
};

export function PlanetCard({
  cell,
  def,
  ships,
  isSelected,
  isTargetable,
  isCurrentPlayerHere,
  isGatherMode,
  moveCost,
  onClick,
  onSlotClick,
  isTutorialTarget,
  isTutorialGather,
  isTutorialCallout,
}: PlanetCardProps) {
  const gradient = PLANET_GRADIENTS[Math.min(def.rings, 3)];

  return (
    <motion.div
      whileHover={isTargetable ? { scale: 1.03 } : {}}
      whileTap={isTargetable || isCurrentPlayerHere ? { scale: 0.97 } : {}}
      onClick={onClick}
      className={cn(
        'relative w-full aspect-square rounded-xl border-2 overflow-hidden',
        `bg-gradient-to-br ${gradient}`,
        isTutorialTarget && 'border-cyan-400 shadow-[0_0_20px_6px_rgba(34,211,238,0.5)] cursor-pointer',
        isTutorialGather && !isTutorialTarget && 'border-cyan-400',
        isTutorialCallout && !isTutorialTarget && !isTutorialGather && 'border-amber-400 shadow-[0_0_14px_4px_rgba(251,191,36,0.4)]',
        isSelected && !isTutorialTarget && !isTutorialGather && !isTutorialCallout && 'border-white shadow-lg shadow-white/20',
        isTargetable && !isSelected && !isTutorialTarget && !isTutorialGather && !isTutorialCallout && 'border-yellow-400 shadow-md shadow-yellow-400/30 cursor-pointer',
        isCurrentPlayerHere && !isSelected && !isTargetable && !isTutorialTarget && !isTutorialGather && !isTutorialCallout && 'border-indigo-400',
        !isSelected && !isTargetable && !isCurrentPlayerHere && !isTutorialTarget && !isTutorialGather && !isTutorialCallout && 'border-gray-700',
        'transition-all duration-150',
      )}
    >
      {/* Ring indicators */}
      {def.rings > 0 && <RingIndicators count={def.rings} />}

      {/* Planet circle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={cn(
            'rounded-full opacity-30',
            def.rings === 0 && 'w-12 h-12 bg-teal-300',
            def.rings === 1 && 'w-10 h-10 bg-blue-400',
            def.rings === 2 && 'w-9 h-9 bg-purple-400',
            def.rings === 3 && 'w-8 h-8 bg-red-400',
          )}
        />
      </div>

      {/* Ships */}
      {ships.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 items-center pointer-events-none">
          {ships.map((ship) => (
            <ShipIcon key={ship.id} color={PLAYER_COLOR_MAP[ship.color].bg} isBot={ship.isBot} />
          ))}
        </div>
      )}

      {/* Move cost badge */}
      {isTargetable && moveCost !== undefined && (
        <div className="absolute bottom-5 left-1 bg-yellow-400/90 text-black text-xs font-bold px-1 rounded pointer-events-none">
          {moveCost}
        </div>
      )}

      {/* Planet name — centered horizontally with padding to clear BL/BR corner cubes */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-[28%] py-0.5 text-center">
        <p className="text-white text-xs font-medium truncate leading-tight">{def.name}</p>
      </div>

      {/* Resource cubes at card corners — rendered after name bar to appear on top */}
      {def.resourceSlots.map((slot) => {
        const cube = cell ? cell.cubes[slot.id] : undefined;
        const isPresent = cube != null;
        const canGather = isGatherMode && isCurrentPlayerHere && isPresent;

        if (!isPresent) return null;

        return (
          <motion.div
            key={slot.id}
            whileHover={canGather ? { scale: 1.2 } : {}}
            onClick={
              canGather && onSlotClick
                ? (e) => { e.stopPropagation(); onSlotClick(slot.id); }
                : undefined
            }
            className={cn(
              'absolute w-[27%] h-[27%] flex items-center justify-center rounded-sm',
              SLOT_CLASSES[slot.position],
              canGather && !isTutorialGather && 'cursor-pointer ring-2 ring-white/80',
              canGather && isTutorialGather && 'cursor-pointer ring-2 ring-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]',
            )}
            title={canGather ? `Gather ${cube.color}` : cube.color}
          >
            <ResourceCube color={cube.color} size="md" className="pointer-events-none" />
          </motion.div>
        );
      })}

      {/* Move target glow */}
      {isTargetable && !isTutorialTarget && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-yellow-400/50 animate-pulse pointer-events-none" />
      )}

      {/* Tutorial target glow — bright cyan pulse */}
      {isTutorialTarget && (
        <div className="absolute inset-0 rounded-xl ring-4 ring-cyan-400 animate-pulse pointer-events-none" />
      )}

      {/* Tutorial callout — amber pulse, informational only */}
      {isTutorialCallout && !isTutorialTarget && (
        <div className="absolute inset-0 rounded-xl ring-4 ring-amber-400/70 animate-pulse pointer-events-none" />
      )}
    </motion.div>
  );
}
