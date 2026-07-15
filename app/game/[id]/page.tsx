'use client';
import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useGame } from '@/hooks/useGame';
import { useGameActions } from '@/hooks/useGameActions';
import { GameBoard } from '@/components/game/GameBoard';
import { BuyerMarket } from '@/components/game/BuyerMarket';
import { PlayerPanel } from '@/components/game/PlayerPanel';
import { ScoringTrack } from '@/components/game/ScoringTrack';
import { ActionBar } from '@/components/game/ActionBar';
import { GameLog } from '@/components/game/GameLog';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ActiveBuyer, PlayerState } from '@/lib/game/types';
import { getBuyerDef } from '@/lib/game/engine';
import { RulebookModal } from '@/components/game/RulebookModal';

export default function GamePage() {
  const params = useParams();
  const gameId = params?.id as string;
  const router = useRouter();
  const { sessionId } = useSession();

  const { gameState, loading, error } = useGame(gameId);
  const { performAction } = useGameActions(gameId, sessionId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [rulebookOpen, setRulebookOpen] = useState(false);

  // Derived state
  const myPlayerIndex = gameState?.players.findIndex(
    (p) => p.sessionId === sessionId,
  ) ?? -1;
  const myPlayer: PlayerState | null =
    myPlayerIndex >= 0 ? gameState!.players[myPlayerIndex] : null;
  const isMyTurn =
    gameState !== null && gameState.currentPlayerIndex === myPlayerIndex;
  const currentPlayerName =
    gameState?.players[gameState.currentPlayerIndex]?.displayName;

  // Show end modal when game ends
  useEffect(() => {
    if (gameState?.status === 'ended') {
      setShowEndModal(true);
    }
  }, [gameState?.status]);

  // Redirect to lobby if game not started
  useEffect(() => {
    if (gameState?.status === 'lobby') {
      router.replace(`/lobby/${gameState.code}`);
    }
  }, [gameState?.status, gameState?.code, router]);

  const handlePlanetClick = useCallback(
    async (row: number, col: number) => {
      if (!isMyTurn || !gameState) return;
      setActionError(null);
      let result;
      if (gameState.status === 'placement') {
        result = await performAction({ type: 'PLACE_SHIP', row, col });
      } else {
        result = await performAction({ type: 'MOVE', toRow: row, toCol: col });
      }
      if (result.error) setActionError(result.error);
    },
    [isMyTurn, gameState, performAction],
  );

  const handleSlotClick = useCallback(
    async (row: number, col: number, slotId: string) => {
      if (!isMyTurn || !gameState) return;
      setActionError(null);
      const result = await performAction({
        type: 'GATHER',
        slotId,
        planetRow: row,
        planetCol: col,
      });
      if (result.error) setActionError(result.error);
    },
    [isMyTurn, gameState, performAction],
  );

  const handleSell = useCallback(
    async (buyerCardId: string, dealSells: { dealId: string; cubeIds: string[] }[]) => {
      setActionError(null);
      const result = await performAction({
        type: 'SELL',
        buyerCardId,
        dealSells,
      });
      if (result.error) setActionError(result.error);
    },
    [performAction],
  );

  const handleDrawPrivateBuyer = useCallback(async () => {
    setActionError(null);
    const result = await performAction({ type: 'DRAW_PRIVATE_BUYER' });
    if (result.error) setActionError(result.error);
  }, [performAction]);

  const handleRemoveBuyer = useCallback(
    async (buyerCardId: string) => {
      setActionError(null);
      const result = await performAction({ type: 'REMOVE_BUYER', buyerCardId });
      if (result.error) setActionError(result.error);
    },
    [performAction],
  );

  const handleEndTurn = useCallback(async () => {
    setActionError(null);
    const result = await performAction({ type: 'END_TURN' });
    if (result.error) setActionError(result.error);
  }, [performAction]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading game...</p>
        </div>
      </main>
    );
  }

  if (error || !gameState) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error ?? 'Game not found'}</p>
          <a href="/" className="text-indigo-400 hover:text-indigo-300 underline">
            Return to home
          </a>
        </div>
      </main>
    );
  }

  // Prepare private buyers for current player (shown in market panel)
  const myPrivateBuyerIds = myPlayer?.privateBuyers ?? [];
  const myPrivateBuyers: ActiveBuyer[] = myPrivateBuyerIds.map((id) => ({
    cardId: id,
    completedDealIds: [],
  }));

  return (
    <main className="min-h-screen flex flex-col p-3 gap-3">
      {/* Scoring track */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4">
        <ScoringTrack players={gameState.players} />
      </div>

      {/* Main game area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px_220px] gap-3 min-h-0">
        {/* Game board */}
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Planet Grid
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Turn {gameState.turnNumber}</span>
                <button
                  onClick={() => setRulebookOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  title="View rulebook"
                >
                  How to Play
                </button>
              </div>
            </div>
            <GameBoard
              gameState={gameState}
              currentPlayer={isMyTurn ? myPlayer : null}
              onPlanetClick={handlePlanetClick}
              onSlotClick={handleSlotClick}
            />
          </div>

          {/* Action bar */}
          <ActionBar
            actionsRemaining={gameState.actionsRemaining}
            isMyTurn={isMyTurn}
            onEndTurn={handleEndTurn}
            gameStatus={gameState.status}
            currentPlayerName={currentPlayerName}
          />

          {actionError && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-2">
              <p className="text-red-400 text-sm">{actionError}</p>
            </div>
          )}
        </div>

        {/* Buyer market */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3 overflow-y-auto custom-scrollbar">
          <BuyerMarket
            market={gameState.market}
            deckCount={gameState.buyerDeck.length}
            playerSupply={myPlayer?.supply ?? []}
            actionsRemaining={gameState.actionsRemaining}
            isMyTurn={isMyTurn}
            gameStatus={gameState.status}
            onSell={handleSell}
            onDrawPrivateBuyer={handleDrawPrivateBuyer}
            onRemoveBuyer={handleRemoveBuyer}
            privateBuyers={myPrivateBuyers}
          />
        </div>

        {/* Right sidebar: players + log */}
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3">
            <PlayerPanel
              players={gameState.players}
              currentPlayerIndex={gameState.currentPlayerIndex}
              mySessionId={sessionId}
            />
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3 flex-1 flex flex-col min-h-0">
            <GameLog log={gameState.log} />
          </div>
        </div>
      </div>

      <RulebookModal isOpen={rulebookOpen} onClose={() => setRulebookOpen(false)} />

      {/* Game end modal */}
      <Modal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        title="Game Over!"
      >
        <div className="flex flex-col gap-4">
          {gameState.winners && gameState.winners.length > 0 ? (
            <>
              <div className="text-center">
                <p className="text-2xl mb-2">
                  {gameState.winners.includes(myPlayer?.id ?? '') ? (
                    <span className="text-yellow-400 font-bold">You Win!</span>
                  ) : (
                    <span className="text-gray-300">Game Over</span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                  Final Scores
                </h3>
                {[...gameState.players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, i) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm w-4">{i + 1}.</span>
                        <span className="text-white font-medium">{player.displayName}</span>
                        {gameState.winners?.includes(player.id) && (
                          <span className="text-xs text-yellow-400">Winner!</span>
                        )}
                      </div>
                      <span className="text-yellow-400 font-bold">{player.score}c</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="text-gray-300 text-center">Calculating results...</p>
          )}

          <Button onClick={() => router.push('/')} variant="secondary" className="w-full">
            Return to Home
          </Button>
        </div>
      </Modal>
    </main>
  );
}
