'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GameState, GameAction, ActiveBuyer } from '@/lib/game/types';
import { GameBoard } from '@/components/game/GameBoard';
import { BuyerMarket } from '@/components/game/BuyerMarket';
import { PlayerPanel } from '@/components/game/PlayerPanel';
import { ScoringTrack } from '@/components/game/ScoringTrack';
import { ActionBar } from '@/components/game/ActionBar';
import { GameLog } from '@/components/game/GameLog';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import {
  applyMove,
  applyGather,
  applySell,
  applyDrawPrivateBuyer,
  applyRemoveBuyer,
  advanceTurn,
  addLog,
  canRemoveBuyer,
  isValidMove,
  isValidGather,
  isValidSell,
  isValidDrawPrivateBuyer,
} from '@/lib/game/engine';
import {
  TUTORIAL_INITIAL_STATE,
  TUTORIAL_STEPS,
  TutorialStep,
  P2ScriptedAction,
  matchesWait,
} from '@/lib/game/tutorial';
import { cn } from '@/lib/utils';

const P1_SESSION = 'tutorial-player-1';
const P1_INDEX = 0;
const P2_INDEX = 1;

function getWrongActionHint(step: TutorialStep): string {
  if (!step.waitFor) return 'Click Next to continue.';
  switch (step.waitFor.type) {
    case 'MOVE': return 'Move your ship to the highlighted planet.';
    case 'GATHER': return 'Click a glowing resource slot on your current planet.';
    case 'SELL': return 'Find the glowing buyer in the market, select deals, and click Sell.';
    case 'DRAW_PRIVATE_BUYER': return 'Click "Draw Private Buyer" in the market panel.';
    case 'REMOVE_BUYER': return 'Click the ✕ button on the buyer with only red deals left.';
    case 'END_TURN': return 'Click "End Turn" in the action panel below the board.';
    default: return 'Follow the tutorial instructions.';
  }
}

export default function TutorialPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>(TUTORIAL_INITIAL_STATE);
  const [stepIndex, setStepIndex] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [p2Animating, setP2Animating] = useState(false);
  const [p2Narration, setP2Narration] = useState<string | null>(null);

  // Keep a ref for gameState so P2 action callbacks always use latest state
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const currentStep = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;
  const isP2Turn = gameState.currentPlayerIndex === P2_INDEX;

  // Apply a single P2 scripted action to a state
  const applyP2Action = useCallback((action: GameAction, state: GameState): GameState => {
    switch (action.type) {
      case 'MOVE':
        return applyMove(state, P2_INDEX, action.toRow, action.toCol);
      case 'GATHER':
        return applyGather(state, P2_INDEX, action.slotId, action.planetRow, action.planetCol);
      case 'END_TURN':
        return advanceTurn(addLog(state, P2_INDEX, 'ended their turn', 'end_turn'));
      default:
        return state;
    }
  }, []);

  // Schedule P2's scripted action sequence
  const runP2Sequence = useCallback(
    (p2Actions: P2ScriptedAction[]) => {
      if (!p2Actions.length) return;
      setP2Animating(true);
      setP2Narration(null);
      const maxDelay = Math.max(...p2Actions.map((a) => a.delayMs));

      p2Actions.forEach(({ action, delayMs, narration }) => {
        setTimeout(() => {
          setGameState((prev) => applyP2Action(action, prev));
          if (narration) setP2Narration(narration);
        }, delayMs);
      });

      // Clear animating flag after all actions have fired
      setTimeout(() => {
        setP2Animating(false);
        setP2Narration(null);
      }, maxDelay + 400);
    },
    [applyP2Action],
  );

  // Handle an action from the player
  const handleAction = useCallback(
    (action: GameAction) => {
      if (p2Animating || isP2Turn) return;

      const step = TUTORIAL_STEPS[stepIndex];

      // Steps without a waitFor need the Next button, not a game action
      if (!step.waitFor) {
        setHint('Click "Next →" to continue!');
        return;
      }

      // Check if this action matches what the tutorial expects
      if (!matchesWait(action, step.waitFor)) {
        setHint(getWrongActionHint(step));
        return;
      }

      setHint(null);

      // Apply the action using engine functions
      let newState = gameState;
      try {
        switch (action.type) {
          case 'MOVE': {
            const v = isValidMove(newState, P1_INDEX, action.toRow, action.toCol);
            if (!v.valid) { setHint(v.reason ?? 'Invalid move'); return; }
            newState = applyMove(newState, P1_INDEX, action.toRow, action.toCol);
            break;
          }
          case 'GATHER': {
            const v = isValidGather(newState, P1_INDEX, action.slotId, action.planetRow, action.planetCol);
            if (!v.valid) { setHint(v.reason ?? 'Invalid gather'); return; }
            newState = applyGather(newState, P1_INDEX, action.slotId, action.planetRow, action.planetCol);
            break;
          }
          case 'SELL': {
            const player = newState.players[P1_INDEX];
            const isPrivate = player.privateBuyers.includes(action.buyerCardId);
            const v = isValidSell(newState, P1_INDEX, action.buyerCardId, action.dealSells, isPrivate);
            if (!v.valid) { setHint(v.reason ?? 'Invalid sell'); return; }
            newState = applySell(newState, P1_INDEX, action.buyerCardId, action.dealSells, isPrivate);
            break;
          }
          case 'DRAW_PRIVATE_BUYER': {
            const v = isValidDrawPrivateBuyer(newState, P1_INDEX);
            if (!v.valid) { setHint(v.reason ?? 'Cannot draw private buyer'); return; }
            newState = applyDrawPrivateBuyer(newState, P1_INDEX);
            break;
          }
          case 'REMOVE_BUYER': {
            if (!canRemoveBuyer(newState, action.buyerCardId)) {
              setHint('That buyer still has deals that could be completed. Find the one with only red deals left.');
              return;
            }
            newState = applyRemoveBuyer(newState, action.buyerCardId);
            newState = addLog(newState, P1_INDEX, 'removed an impossible buyer', 'remove');
            break;
          }
          case 'END_TURN': {
            newState = addLog(newState, P1_INDEX, 'ended their turn', 'end_turn');
            newState = advanceTurn(newState);
            break;
          }
          default:
            return;
        }
      } catch {
        setHint('Something went wrong. Try again.');
        return;
      }

      setGameState(newState);

      const nextStep = stepIndex + 1;
      setStepIndex(nextStep);

      if (step.p2Actions?.length) {
        runP2Sequence(step.p2Actions);
      }
    },
    [gameState, stepIndex, p2Animating, isP2Turn, runP2Sequence],
  );

  // ---- Game event handlers ----

  const handlePlanetClick = useCallback(
    (row: number, col: number) => {
      handleAction({ type: 'MOVE', toRow: row, toCol: col });
    },
    [handleAction],
  );

  const handleSlotClick = useCallback(
    (row: number, col: number, slotId: string) => {
      handleAction({ type: 'GATHER', slotId, planetRow: row, planetCol: col });
    },
    [handleAction],
  );

  const handleSell = useCallback(
    (buyerCardId: string, dealSells: { dealId: string; cubeIds: string[] }[]) => {
      handleAction({ type: 'SELL', buyerCardId, dealSells });
    },
    [handleAction],
  );

  const handleDrawPrivateBuyer = useCallback(() => {
    handleAction({ type: 'DRAW_PRIVATE_BUYER' });
  }, [handleAction]);

  const handleRemoveBuyer = useCallback(
    (buyerCardId: string) => {
      handleAction({ type: 'REMOVE_BUYER', buyerCardId });
    },
    [handleAction],
  );

  const handleEndTurn = useCallback(() => {
    handleAction({ type: 'END_TURN' });
  }, [handleAction]);

  const handleNext = useCallback(() => {
    setHint(null);
    if (isLastStep) {
      router.push('/');
    } else {
      setStepIndex((prev) => prev + 1);
    }
  }, [isLastStep, router]);

  // ---- Derived state ----

  const myPlayer = gameState.players[P1_INDEX];
  const isMyTurn = !isP2Turn && !p2Animating;

  const myPrivateBuyers: ActiveBuyer[] = myPlayer.privateBuyers.map((id) => ({
    cardId: id,
    completedDealIds: [],
  }));

  const impossibleBuyerIds = gameState.market
    .filter((b) => canRemoveBuyer(gameState, b.cardId))
    .map((b) => b.cardId);

  const boardHighlight = currentStep.highlight === 'board';
  const marketHighlight = currentStep.highlight === 'market';
  const actionBarHighlight = currentStep.highlight === 'action-bar';

  // Tutorial element highlights — only active on the player's turn
  const waitFor = isMyTurn ? currentStep.waitFor : null;
  const tutorialTargetPlanet =
    waitFor?.type === 'MOVE' ? { row: waitFor.toRow, col: waitFor.toCol } : undefined;
  const tutorialGatherPlanet =
    waitFor?.type === 'GATHER'
      ? { row: myPlayer.shipRow, col: myPlayer.shipCol }
      : undefined;
  const tutorialHighlightBuyerId =
    waitFor?.type === 'SELL' ? waitFor.buyerCardId : undefined;
  const tutorialHighlightDrawBuyer = waitFor?.type === 'DRAW_PRIVATE_BUYER';
  const tutorialHighlightRemoveBuyerId =
    waitFor?.type === 'REMOVE_BUYER' ? waitFor.buyerCardId : undefined;
  const tutorialHighlightEndTurn = waitFor?.type === 'END_TURN';
  const tutorialCalloutPlanet = currentStep.calloutPlanet;

  return (
    <main className="min-h-screen flex flex-col p-3 gap-3">
      {/* Scoring track */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4">
        <ScoringTrack players={gameState.players} />
      </div>

      {/* Tutorial step banner */}
      <TutorialOverlay
        step={currentStep}
        stepIndex={stepIndex}
        totalSteps={TUTORIAL_STEPS.length}
        hint={hint}
        p2Animating={p2Animating}
        p2Narration={p2Narration}
        onNext={handleNext}
        isLastStep={isLastStep}
      />

      {/* Main game area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px_220px] gap-3 min-h-0">
        {/* Board + action bar column */}
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              'bg-gray-900/80 border border-gray-800 rounded-2xl p-3 transition-all duration-300',
              boardHighlight && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-950',
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Planet Grid
              </h2>
              <span className="text-xs text-gray-500">Turn {gameState.turnNumber}</span>
            </div>
            <GameBoard
              gameState={gameState}
              currentPlayer={isMyTurn ? myPlayer : null}
              onPlanetClick={handlePlanetClick}
              onSlotClick={handleSlotClick}
              tutorialTargetPlanet={tutorialTargetPlanet}
              tutorialGatherPlanet={tutorialGatherPlanet}
              tutorialCalloutPlanet={tutorialCalloutPlanet}
            />
          </div>

          <div
            className={cn(
              'transition-all duration-300 rounded-2xl',
              actionBarHighlight && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-950',
            )}
          >
            <ActionBar
              actionsRemaining={gameState.actionsRemaining}
              isMyTurn={isMyTurn}
              onEndTurn={handleEndTurn}
              gameStatus={gameState.status}
              currentPlayerName={gameState.players[gameState.currentPlayerIndex]?.displayName}
              tutorialHighlightEndTurn={tutorialHighlightEndTurn}
            />
          </div>
        </div>

        {/* Buyer market */}
        <div
          className={cn(
            'bg-gray-900/80 border border-gray-800 rounded-2xl p-3 overflow-y-auto custom-scrollbar transition-all duration-300',
            marketHighlight && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-950',
          )}
        >
          <BuyerMarket
            market={gameState.market}
            deckCount={gameState.buyerDeck.length}
            playerSupply={myPlayer.supply}
            actionsRemaining={gameState.actionsRemaining}
            isMyTurn={isMyTurn}
            gameStatus={gameState.status}
            onSell={handleSell}
            onDrawPrivateBuyer={handleDrawPrivateBuyer}
            onRemoveBuyer={handleRemoveBuyer}
            privateBuyers={myPrivateBuyers}
            tutorialHighlightBuyerId={tutorialHighlightBuyerId}
            tutorialHighlightDrawBuyer={tutorialHighlightDrawBuyer}
            tutorialHighlightRemoveBuyerId={tutorialHighlightRemoveBuyerId}
            impossibleBuyerIds={impossibleBuyerIds}
          />
        </div>

        {/* Right sidebar: players + log */}
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3">
            <PlayerPanel
              players={gameState.players}
              currentPlayerIndex={gameState.currentPlayerIndex}
              mySessionId={P1_SESSION}
            />
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3 flex-1 flex flex-col min-h-0">
            <GameLog log={gameState.log} />
          </div>
        </div>
      </div>
    </main>
  );
}
