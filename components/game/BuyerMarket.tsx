'use client';
import { ActiveBuyer, GameStatus, ResourceCube } from '@/lib/game/types';
import { getBuyerDef } from '@/lib/game/engine';
import { BuyerCard } from './BuyerCard';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface BuyerMarketProps {
  market: ActiveBuyer[];
  deckCount: number;
  playerSupply: ResourceCube[];
  actionsRemaining: number;
  isMyTurn: boolean;
  gameStatus: GameStatus;
  onSell: (buyerCardId: string, dealSells: { dealId: string; cubeIds: string[] }[]) => void;
  onDrawPrivateBuyer: () => void;
  onRemoveBuyer: (buyerCardId: string) => void;
  privateBuyers?: ActiveBuyer[];
  impossibleBuyerIds?: string[];
  tutorialHighlightBuyerId?: string;
  tutorialHighlightDrawBuyer?: boolean;
  tutorialHighlightRemoveBuyerId?: string;
}

export function BuyerMarket({
  market,
  deckCount,
  playerSupply,
  actionsRemaining,
  isMyTurn,
  gameStatus,
  onSell,
  onDrawPrivateBuyer,
  onRemoveBuyer,
  privateBuyers = [],
  impossibleBuyerIds = [],
  tutorialHighlightBuyerId,
  tutorialHighlightDrawBuyer,
  tutorialHighlightRemoveBuyerId,
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

      {/* Game end banners */}
      {gameStatus === 'game_end_triggered' && (
        <div className="bg-amber-950/40 border border-amber-700/60 rounded-xl px-3 py-2 text-xs text-amber-200/80">
          <span className="text-amber-400 font-semibold">Game End triggered</span> — finish your turn normally, then each player gets one final turn to sell their private buyer.
        </div>
      )}
      {gameStatus === 'game_end_phase' && (
        <details className="bg-purple-950/40 border border-purple-700/60 rounded-xl overflow-hidden" open>
          <summary className="cursor-pointer select-none flex items-center gap-2 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-900/30 transition-colors">
            <span className="text-purple-400">★</span>
            Game End Phase — sell your private buyers
          </summary>
          <p className="px-3 pb-3 pt-1 text-xs text-purple-200/70 leading-relaxed">
            Market sales are closed. Sell to your <span className="text-purple-300 font-medium">private buyers</span> below — it's free, no action points required!
          </p>
        </details>
      )}

      {/* Market buyers */}
      <div className="flex flex-col gap-2">
        {market.map((activeBuyer) => {
          const def = getBuyerDef(activeBuyer.cardId);
          const isTutorialSell = tutorialHighlightBuyerId === activeBuyer.cardId;
          const isTutorialRemove = tutorialHighlightRemoveBuyerId === activeBuyer.cardId;
          const isImpossible = impossibleBuyerIds.includes(activeBuyer.cardId) || isTutorialRemove;
          return (
            <div
              key={activeBuyer.cardId}
              className={cn(
                'relative rounded-xl transition-all duration-200',
                isTutorialSell && 'ring-4 ring-cyan-400 shadow-[0_0_16px_4px_rgba(34,211,238,0.45)] animate-pulse',
                isTutorialRemove && 'ring-4 ring-red-400 shadow-[0_0_16px_4px_rgba(248,113,113,0.45)] animate-pulse',
              )}
            >
              <BuyerCard
                buyer={activeBuyer}
                def={def}
                playerSupply={isMyTurn ? playerSupply : []}
                canSellNow={gameStatus === 'playing' || gameStatus === 'game_end_triggered'}
                onSell={(dealSells) => onSell(activeBuyer.cardId, dealSells)}
              />
              {/* Remove button: always visible but highlighted red when the buyer is impossible */}
              {isMyTurn && (
                <button
                  onClick={() => isImpossible ? onRemoveBuyer(activeBuyer.cardId) : undefined}
                  className={cn(
                    'absolute top-2 right-2 text-xs leading-none transition-all duration-150',
                    isImpossible
                      ? 'px-1.5 py-0.5 rounded border border-red-500 text-red-400 hover:bg-red-900/40 cursor-pointer'
                      : 'text-gray-700 cursor-default select-none',
                  )}
                  title={isImpossible ? 'All remaining deals are impossible — click to replace' : 'Cannot remove: some deals are still possible'}
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
          <div
            className={cn(
              'rounded-lg transition-all duration-200',
              tutorialHighlightDrawBuyer && 'ring-4 ring-cyan-400 shadow-[0_0_16px_4px_rgba(34,211,238,0.45)] animate-pulse',
            )}
          >
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
            const isTutorialSell = tutorialHighlightBuyerId === pb.cardId;
            return (
              <div
                key={pb.cardId}
                className={cn(
                  'rounded-xl transition-all duration-200',
                  isTutorialSell && 'ring-4 ring-cyan-400 shadow-[0_0_16px_4px_rgba(34,211,238,0.45)] animate-pulse',
                )}
              >
                <BuyerCard
                  buyer={pb}
                  def={def}
                  playerSupply={isMyTurn ? playerSupply : []}
                  isPrivate
                  canSellNow={gameStatus === 'game_end_phase'}
                  onSell={(dealSells) => onSell(pb.cardId, dealSells)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
