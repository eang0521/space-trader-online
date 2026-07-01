'use client';
import { ActiveBuyer, ResourceCube } from '@/lib/game/types';
import { getBuyerDef } from '@/lib/game/engine';
import { BuyerCard } from './BuyerCard';
import { Button } from '@/components/ui/Button';

interface BuyerMarketProps {
  market: ActiveBuyer[];
  deckCount: number;
  playerSupply: ResourceCube[];
  actionsRemaining: number;
  isMyTurn: boolean;
  onSell: (buyerCardId: string, dealId: string, cubeIds: string[]) => void;
  onDrawPrivateBuyer: () => void;
  onRemoveBuyer: (buyerCardId: string) => void;
  privateBuyers?: ActiveBuyer[];
  completedPrivateDealIds?: Record<string, string[]>;
}

export function BuyerMarket({
  market,
  deckCount,
  playerSupply,
  actionsRemaining,
  isMyTurn,
  onSell,
  onDrawPrivateBuyer,
  onRemoveBuyer,
  privateBuyers = [],
  completedPrivateDealIds = {},
}: BuyerMarketProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Market header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          Buyer Market
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="bg-gray-800 border border-gray-700 px-2 py-1 rounded-lg">
            Deck: {deckCount}
          </span>
        </div>
      </div>

      {/* Market buyers */}
      <div className="flex flex-col gap-2">
        {market.map((activeBuyer) => {
          const def = getBuyerDef(activeBuyer.cardId);
          return (
            <div key={activeBuyer.cardId} className="relative">
              <BuyerCard
                buyer={activeBuyer}
                def={def}
                playerSupply={isMyTurn ? playerSupply : []}
                onSell={(dealId, cubeIds) =>
                  onSell(activeBuyer.cardId, dealId, cubeIds)
                }
              />
              {/* Remove buyer button */}
              {isMyTurn && (
                <button
                  onClick={() => onRemoveBuyer(activeBuyer.cardId)}
                  className="absolute top-2 right-2 text-xs text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove impossible buyer"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
        {market.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No buyers in market</p>
        )}
      </div>

      {/* Draw private buyer */}
      {isMyTurn && (
        <div className="border-t border-gray-800 pt-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={actionsRemaining < 3 || deckCount === 0}
            onClick={onDrawPrivateBuyer}
            title={
              actionsRemaining < 3
                ? 'Costs 3 actions (must have 3 remaining)'
                : deckCount === 0
                ? 'Deck is empty'
                : 'Draw a private buyer card (costs 3 actions)'
            }
          >
            Draw Private Buyer (3 actions)
          </Button>
        </div>
      )}

      {/* Private buyers */}
      {privateBuyers.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-gray-800 pt-3">
          <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
            Your Private Buyers
          </h3>
          {privateBuyers.map((pb) => {
            const def = getBuyerDef(pb.cardId);
            return (
              <BuyerCard
                key={pb.cardId}
                buyer={pb}
                def={def}
                playerSupply={isMyTurn ? playerSupply : []}
                isPrivate
                completedPrivateDealIds={completedPrivateDealIds[pb.cardId] ?? []}
                onSell={(dealId, cubeIds) =>
                  onSell(pb.cardId, dealId, cubeIds)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
