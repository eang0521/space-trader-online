'use client';
import { useState } from 'react';
import { ActiveBuyer, BuyerCardDef, ResourceCube, DealDef } from '@/lib/game/types';
import { RESOURCE_COLOR_MAP } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface BuyerCardProps {
  buyer: ActiveBuyer;
  def: BuyerCardDef;
  playerSupply: ResourceCube[];
  isPrivate?: boolean;
  canSellNow?: boolean;
  onSell: (dealSells: { dealId: string; cubeIds: string[] }[]) => void;
}

function canFulfillDeal(deal: DealDef, supply: ResourceCube[]): string[] | null {
  const available = [...supply];
  const chosenIds: string[] = [];

  for (const req of deal.requirements) {
    let needed = req.count;
    for (let i = available.length - 1; i >= 0; i--) {
      if (needed <= 0) break;
      if (available[i].color === req.color) {
        chosenIds.push(available[i].id);
        available.splice(i, 1);
        needed--;
      }
    }
    if (needed > 0) return null;
  }

  return chosenIds;
}

function getAutoFulfillDealSells(
  deals: DealDef[],
  completedDealIds: string[],
  supply: ResourceCube[],
): { dealId: string; cubeIds: string[] }[] {
  let remainingSupply = [...supply];
  const results: { dealId: string; cubeIds: string[] }[] = [];

  for (const deal of deals) {
    if (completedDealIds.includes(deal.id)) continue;
    const cubeIds = canFulfillDeal(deal, remainingSupply);
    if (cubeIds !== null) {
      results.push({ dealId: deal.id, cubeIds });
      const usedSet = new Set(cubeIds);
      remainingSupply = remainingSupply.filter((c) => !usedSet.has(c.id));
    }
  }

  return results;
}

function Checkmark() {
  return (
    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function BuyerCard({
  buyer,
  def,
  playerSupply,
  isPrivate = false,
  canSellNow = true,
  onSell,
}: BuyerCardProps) {
  const [deselectedIds, setDeselectedIds] = useState<Set<string>>(new Set());
  const [selling, setSelling] = useState(false);

  // Deals that can all be fulfilled simultaneously with current supply
  const allDealSells = getAutoFulfillDealSells(def.deals, buyer.completedDealIds, playerSupply);
  const fulfillableIds = new Set(allDealSells.map((d) => d.dealId));

  // Only keep deselections that are still in the fulfillable set
  const activeDeselected = new Set([...deselectedIds].filter((id) => fulfillableIds.has(id)));

  const selectedSells = allDealSells.filter((d) => !activeDeselected.has(d.dealId));
  const selectedCredits = selectedSells.reduce(
    (sum, { dealId }) => sum + def.deals.find((d) => d.id === dealId)!.credits,
    0,
  );

  const toggleDeal = (dealId: string) => {
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(dealId)) next.delete(dealId);
      else next.add(dealId);
      return next;
    });
  };

  const handleSell = async () => {
    if (selectedSells.length === 0 || selling) return;
    setSelling(true);
    try {
      await onSell(selectedSells);
    } finally {
      setSelling(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-gray-900 border rounded-xl p-3 flex flex-col gap-2',
        isPrivate ? 'border-purple-600' : 'border-gray-700',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-100 truncate">{def.name}</span>
        {isPrivate && (
          <span className="text-xs bg-purple-800 text-purple-200 px-2 py-0.5 rounded-full shrink-0">
            Private
          </span>
        )}
      </div>

      {/* Deals */}
      <div className="flex flex-col gap-1.5">
        {def.deals.map((deal) => {
          const isDone = buyer.completedDealIds.includes(deal.id);
          const isFulfillable = fulfillableIds.has(deal.id);
          const isSelected = isFulfillable && !activeDeselected.has(deal.id);

          return (
            <div
              key={deal.id}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg border',
                isDone
                  ? 'border-green-800 bg-green-900/20 opacity-60'
                  : isSelected && canSellNow
                  ? 'border-indigo-700 bg-indigo-900/20'
                  : isFulfillable && canSellNow
                  ? 'border-gray-600 bg-gray-800/50'
                  : 'border-gray-700 bg-gray-800/50',
              )}
            >
              {/* Checkbox (fulfillable & canSellNow) or label/done indicator */}
              {!isDone && isFulfillable && canSellNow ? (
                <button
                  onClick={() => toggleDeal(deal.id)}
                  className={cn(
                    'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'bg-transparent border-gray-500 hover:border-gray-400',
                  )}
                  aria-label={isSelected ? 'Deselect deal' : 'Select deal'}
                >
                  {isSelected && <Checkmark />}
                </button>
              ) : (
                <span
                  className={cn(
                    'text-xs font-bold w-4 shrink-0 text-center',
                    isDone ? 'text-green-400' : 'text-gray-500',
                  )}
                >
                  {isDone ? '✓' : deal.label}
                </span>
              )}

              {/* Deal label (when showing checkbox) */}
              {!isDone && isFulfillable && canSellNow && (
                <span className="text-xs font-bold text-gray-400 shrink-0">{deal.label}</span>
              )}

              {/* Requirements */}
              <div className="flex flex-wrap gap-1 flex-1">
                {deal.requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-0.5">
                    {Array.from({ length: req.count }).map((_, j) => (
                      <div
                        key={j}
                        className={cn(
                          'w-4 h-4 rounded border border-white/10 shadow-sm',
                          RESOURCE_COLOR_MAP[req.color].bg,
                          req.color === 'black' && 'border-gray-600',
                        )}
                        title={RESOURCE_COLOR_MAP[req.color].label}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Credits */}
              <span
                className={cn(
                  'text-xs font-bold shrink-0',
                  isDone ? 'text-green-400' : 'text-yellow-400',
                )}
              >
                {deal.credits}c
              </span>
            </div>
          );
        })}
      </div>

      {/* Sell button — only shown when there are fulfillable deals and selling is allowed */}
      {canSellNow && fulfillableIds.size > 0 && (
        <Button
          size="sm"
          variant={selectedSells.length > 0 ? 'primary' : 'ghost'}
          disabled={selectedSells.length === 0 || selling}
          loading={selling}
          onClick={handleSell}
          className="w-full text-xs mt-1"
        >
          {selectedSells.length === 0
            ? 'No deals selected'
            : `Sell ${selectedSells.length} deal${selectedSells.length > 1 ? 's' : ''} (${selectedCredits}c)`}
        </Button>
      )}
    </div>
  );
}
