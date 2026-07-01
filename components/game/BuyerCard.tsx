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
  completedPrivateDealIds?: string[];
  onSell: (dealId: string, cubeIds: string[]) => void;
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
    if (needed > 0) return null; // can't fulfill
  }

  return chosenIds;
}

export function BuyerCard({
  buyer,
  def,
  playerSupply,
  isPrivate = false,
  completedPrivateDealIds = [],
  onSell,
}: BuyerCardProps) {
  const [selling, setSelling] = useState<string | null>(null);

  const handleSell = async (deal: DealDef) => {
    const cubeIds = canFulfillDeal(deal, playerSupply);
    if (!cubeIds) return;
    setSelling(deal.id);
    try {
      await onSell(deal.id, cubeIds);
    } finally {
      setSelling(null);
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
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {isPrivate ? 'Private Buyer' : `Buyer`}
        </span>
        {isPrivate && (
          <span className="text-xs bg-purple-800 text-purple-200 px-2 py-0.5 rounded-full">
            Private
          </span>
        )}
      </div>

      {/* Deals */}
      <div className="flex flex-col gap-1.5">
        {def.deals.map((deal) => {
          const isDone = isPrivate
            ? completedPrivateDealIds.includes(deal.id)
            : buyer.completedDealIds.includes(deal.id);
          const cubeIds = !isDone ? canFulfillDeal(deal, playerSupply) : null;
          const canSell = cubeIds !== null && !isDone;

          return (
            <div
              key={deal.id}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg border',
                isDone
                  ? 'border-green-800 bg-green-900/20 opacity-60'
                  : canSell
                  ? 'border-indigo-700 bg-indigo-900/20'
                  : 'border-gray-700 bg-gray-800/50',
              )}
            >
              {/* Deal label */}
              <span
                className={cn(
                  'text-xs font-bold w-4 shrink-0',
                  isDone ? 'text-green-400' : 'text-gray-400',
                )}
              >
                {isDone ? '✓' : deal.label}
              </span>

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
              <span className={cn('text-xs font-bold shrink-0', isDone ? 'text-green-400' : 'text-yellow-400')}>
                {deal.credits}c
              </span>

              {/* Sell button — not shown on private buyers */}
              {!isDone && !isPrivate && (
                <Button
                  size="sm"
                  variant={canSell ? 'primary' : 'ghost'}
                  disabled={!canSell || selling === deal.id}
                  loading={selling === deal.id}
                  onClick={() => handleSell(deal)}
                  className="text-xs px-2 py-1 shrink-0"
                >
                  Sell
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
