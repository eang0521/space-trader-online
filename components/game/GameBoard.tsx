'use client';
import { GameState, PlayerState } from '@/lib/game/types';
import { getPlanetDef } from '@/lib/game/engine';
import { PlanetCard } from './PlanetCard';

interface GameBoardProps {
  gameState: GameState;
  currentPlayer: PlayerState | null;
  onPlanetClick: (row: number, col: number) => void;
  onSlotClick?: (row: number, col: number, slotId: string) => void;
}

const EDGE_SET = new Set<string>(
  [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 3],
    [2, 0], [2, 3],
    [3, 0], [3, 1], [3, 2], [3, 3],
  ].map(([r, c]) => `${r},${c}`),
);

function isEdge(row: number, col: number): boolean {
  return EDGE_SET.has(`${row},${col}`);
}

function isOccupied(state: GameState, row: number, col: number): boolean {
  return state.players.some((p) => p.shipRow >= 0 && p.shipRow === row && p.shipCol === col);
}

function isValidMoveTarget(
  state: GameState,
  player: PlayerState,
  row: number,
  col: number,
): boolean {
  const rowDiff = Math.abs(row - player.shipRow);
  const colDiff = Math.abs(col - player.shipCol);
  if (rowDiff + colDiff !== 1) return false;

  const cell = state.planetGrid[row]?.[col];
  if (!cell) return false;

  const originCell = state.planetGrid[player.shipRow][player.shipCol]!;
  const originRings = getPlanetDef(originCell.cardId).rings;
  const destRings = getPlanetDef(cell.cardId).rings;
  return originRings + destRings <= state.actionsRemaining;
}

export function GameBoard({ gameState, currentPlayer, onPlanetClick, onSlotClick }: GameBoardProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-2">
        {gameState.planetGrid.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return <div key={`${r}-${c}`} className="aspect-square" />;

            const def = getPlanetDef(cell.cardId);
            // Only show ships for players who have been placed (shipRow >= 0)
            const shipsHere = gameState.players.filter(
              (p) => p.shipRow >= 0 && p.shipRow === r && p.shipCol === c,
            );
            const isCurrentPlayerHere =
              currentPlayer !== null &&
              currentPlayer.shipRow === r &&
              currentPlayer.shipCol === c;

            let isTargetable = false;
            let isGatherMode = false;
            let onClick: (() => void) | undefined = undefined;
            let moveCost: number | undefined = undefined;

            if (gameState.status === 'placement') {
              isTargetable =
                currentPlayer !== null &&
                isEdge(r, c) &&
                !isOccupied(gameState, r, c);
              isGatherMode = false;
              onClick = isTargetable ? () => onPlanetClick(r, c) : undefined;
            } else {
              isTargetable =
                currentPlayer !== null &&
                gameState.status === 'playing' &&
                isValidMoveTarget(gameState, currentPlayer, r, c);
              isGatherMode = isCurrentPlayerHere;
              onClick = isTargetable ? () => onPlanetClick(r, c) : undefined;
              if (isTargetable && currentPlayer) {
                const originCell = gameState.planetGrid[currentPlayer.shipRow]?.[currentPlayer.shipCol];
                const originRings = originCell ? getPlanetDef(originCell.cardId).rings : 0;
                moveCost = originRings + def.rings;
              }
            }

            return (
              <PlanetCard
                key={cell.cardId}
                cell={cell}
                def={def}
                ships={shipsHere}
                isSelected={false}
                isTargetable={isTargetable}
                isCurrentPlayerHere={isCurrentPlayerHere}
                isGatherMode={isGatherMode}
                moveCost={moveCost}
                onClick={onClick}
                onSlotClick={
                  isCurrentPlayerHere && onSlotClick
                    ? (slotId) => onSlotClick(r, c, slotId)
                    : undefined
                }
              />
            );
          }),
        )}
      </div>
    </div>
  );
}
