'use client';
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function Section({ title }: { title: string }) {
  return (
    <h2 className="text-teal-400 text-xs font-bold uppercase tracking-[0.2em] border-b border-teal-800 pb-1 mb-3">
      {title}
    </h2>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <div>
        <p className="text-white font-semibold text-sm">{title}</p>
        <div className="text-gray-300 text-sm mt-0.5">{children}</div>
      </div>
    </div>
  );
}

function ActionBlock({
  number,
  title,
  cost,
  children,
}: {
  number: number;
  title: string;
  cost: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-white font-bold text-sm">{number}. {title}</span>
        <span className="text-xs text-gray-400">(Cost: {cost})</span>
      </div>
      <div className="pl-4 border-l-2 border-gray-700 text-sm text-gray-300 space-y-1">
        {children}
      </div>
    </div>
  );
}

function Cube({ color }: { color: string }) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    white: 'bg-white',
    red: 'bg-red-500',
    black: 'bg-gray-800 border border-gray-600',
  };
  return (
    <span
      className={`inline-block w-3.5 h-3.5 rounded-sm align-middle mx-0.5 ${bg[color] ?? 'bg-gray-500'}`}
    />
  );
}

const PAGES = [
  // Page 1 — Intro
  <div key="intro">
    <div className="text-center mb-6">
      <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1">
        Space{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">
          Trader
        </span>
      </h1>
      <p className="text-xs text-gray-500">Created by Pink Ogre Games · Designed by Freckled Yellow</p>
    </div>

    <Section title="Intro / Overview" />
    <p className="text-gray-300 text-sm leading-relaxed mb-4">
      <strong className="text-white">The year is 2707.</strong> Earth's resources have been diminished
      by centuries of pollution and overuse. The galaxies have been mapped, and the billions of
      people still alive have moved to outer space. With new planets being discovered, space merchants
      now have the opportunity to gather resources from these planets and sell them to the eager
      populace. You are one of these space merchants. You have a ship, a map, and determination,
      but not much else.
    </p>

    <div className="bg-purple-900/40 border border-purple-700 rounded-xl p-4 text-center">
      <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">Your Goal</p>
      <p className="text-white font-bold text-lg">To earn more space credits than your rivals.</p>
    </div>

    <Section title="Objective" />
    <p className="text-gray-300 text-sm leading-relaxed">
      The goal of Space Trader is to score the most space credits by{' '}
      <span className="text-white font-semibold">gathering resources from planets</span> and then{' '}
      <span className="text-white font-semibold">selling them to Buyers</span>.
    </p>
  </div>,

  // Page 2 — Setup steps
  <div key="setup">
    <Section title="Setup" />
    <Step n={1} title="Form the game board.">
      Shuffle the 30 Planet cards and randomly place the top 16 in a 4×4 grid. Return all other
      Planet cards to the box.
    </Step>
    <Step n={2} title="Place resource cubes on the game board.">
      Place one resource cube of the matching color on each colored square. Once all squares are
      covered, return remaining resource cubes to the box.
    </Step>
    <Step n={3} title="Set up the Buyers.">
      Shuffle the Buyer cards and place them facedown to form the deck. Flip the top 4 Buyer cards
      faceup to form the <span className="text-white font-semibold">Market</span>. Deal one card
      from the deck to each player as their{' '}
      <span className="text-white font-semibold">Private Buyer</span> (kept secret).
    </Step>
    <Step n={4} title="Pick colors.">
      Each player chooses a color and receives the matching rocket ship and scoring marker.
    </Step>
    <Step n={5} title="Build the scoring track.">
      Place the two Scoring Track cards together. Each player places their scoring marker on the
      spot marked "0."
    </Step>
    <Step n={6} title="Place rocket ships.">
      Randomly choose a starting player. Each player in{' '}
      <span className="text-white font-semibold">counterclockwise order</span> places their rocket
      ship on an edge planet. Ships cannot share a starting planet.
    </Step>
  </div>,

  // Page 3 — Gameplay: turn order + move
  <div key="gameplay1">
    <Section title="Game Play" />

    <div className="mb-4">
      <p className="text-white font-bold text-sm mb-1">1. Turn Order</p>
      <p className="text-gray-300 text-sm">
        The <span className="text-white font-semibold">last player to place a rocket ship</span>{' '}
        begins the game. Turns proceed{' '}
        <span className="text-white font-semibold">clockwise</span> until game end.
      </p>
    </div>

    <div className="mb-4">
      <p className="text-white font-bold text-sm mb-2">2. Turn Overview</p>
      <div className="bg-purple-900/30 border border-purple-700 rounded-lg px-4 py-2 mb-3 text-center">
        <span className="text-purple-200 font-bold text-sm">Play up to 3 Actions</span>
      </div>
      <p className="text-gray-300 text-sm mb-3">
        Each Action Type can be played in any order and can be played multiple times, provided you
        have enough actions remaining. There are four Action Types:
      </p>
    </div>

    <ActionBlock number={1} title="Move to another Planet" cost="0–3 Actions">
      <p>
        Your ship must be on a planet <strong className="text-white">adjacent</strong> (not
        diagonal) to the destination. Each ring around a planet costs one action to cross. You may
        only move if you have enough remaining actions to cross all rings.
      </p>
      <p className="mt-1 text-gray-400 italic">
        Example: moving from a 1-ring planet to a 2-ring planet costs 3 actions (1+2).
      </p>
      <p className="mt-1">
        Multiple rocket ships can be on the same planet at any time (except during initial
        placement).
      </p>
    </ActionBlock>
  </div>,

  // Page 4 — Actions 2–4 + Remove Buyers
  <div key="gameplay2">
    <Section title="Game Play (cont'd)" />

    <ActionBlock number={2} title="Gather a Resource" cost="1 Action">
      <p>
        Take 1 resource cube of your choice off the planet your ship is on and put it in your
        Supply.
      </p>
    </ActionBlock>

    <ActionBlock number={3} title="Sell to a Buyer" cost="1 Action">
      <p>
        Complete <strong className="text-white">any number of deals</strong> to one Buyer on the
        Market (or your Private Buyer during Game End). See the Deals section for details.
      </p>
      <p className="mt-1">
        If all deals on a Buyer are completed, immediately discard that Buyer and replace it with
        the top card from the deck.
      </p>
    </ActionBlock>

    <ActionBlock number={4} title="Draw an Additional Private Buyer" cost="3 Actions">
      <p>
        Draw the top card from the Buyer deck and keep it as a second Private Buyer (hidden from
        other players).
      </p>
    </ActionBlock>

    <div className="bg-purple-900/30 border border-purple-700 rounded-lg px-4 py-2 mb-3">
      <span className="text-purple-200 font-bold text-sm">Remove Buyers</span>
    </div>
    <p className="text-gray-300 text-sm">
      At any time during your turn, you may remove any Buyer cards from the Market where{' '}
      <strong className="text-white">no possible deals can be made</strong> — when all remaining
      deals need more resources than any player can possibly provide (given their Supply and the
      remaining resource cubes on the board). For each removed Buyer, immediately replace it with
      the top card from the deck.
    </p>
  </div>,

  // Page 5 — Deals
  <div key="deals">
    <Section title="Deals" />
    <p className="text-gray-300 text-sm leading-relaxed mb-4">
      Buyers will trade space credits for completed deals. Each deal is denoted by a connected block
      of colored squares with a number stating the value of the deal. A deal is completed when you
      cover each square of the deal with resource cubes of the matching color taken from your
      Supply. After completing a deal, move your scoring marker the corresponding number of spaces.
    </p>

    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { color: 'blue', name: 'Blue', label: 'Water' },
        { color: 'green', name: 'Green', label: 'Plants/Food' },
        { color: 'yellow', name: 'Yellow', label: 'Energy' },
        { color: 'white', name: 'White', label: 'Gems' },
        { color: 'red', name: 'Red', label: 'Radioactive' },
        { color: 'black', name: 'Black', label: 'Alien Goods' },
      ].map((r) => (
        <div key={r.color} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
          <Cube color={r.color} />
          <div>
            <p className="text-white text-xs font-semibold">{r.name}</p>
            <p className="text-gray-400 text-xs">{r.label}</p>
          </div>
        </div>
      ))}
    </div>

    <Section title="Game End Sequence" />
    <p className="text-gray-300 text-sm leading-relaxed mb-2">
      The game end is triggered when{' '}
      <strong className="text-white">only one planet has resource cubes remaining</strong> on it:
    </p>
    <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
      <li>The player who triggers game end may play any remaining actions.</li>
      <li>
        Each player then reveals their Private Buyers and completes as many deals as they wish
        (using their current Supply). This does not cost actions.
      </li>
    </ul>
  </div>,

  // Page 6 — Declaring the Winner
  <div key="winner">
    <Section title="Declaring the Winner" />
    <p className="text-gray-300 text-sm leading-relaxed mb-4">
      At the end of the game, the winner is the player with the{' '}
      <strong className="text-white">most space credits</strong>.
    </p>

    <p className="text-white text-sm font-semibold mb-2">Tiebreakers (in order if needed):</p>
    <div className="space-y-2 mb-6">
      {[
        'The most resource cubes remaining in your Supply.',
        'The fewest Private Buyers.',
      ].map((text, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-teal-500 text-teal-400 text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <p className="text-gray-300 text-sm pt-0.5">{text}</p>
        </div>
      ))}
    </div>
    <p className="text-gray-400 text-sm italic">
      If there is still a tie, the tied players share the victory.
    </p>
  </div>,

  // Page 7 — Components
  <div key="components">
    <Section title="Components" />

    <p className="text-white text-sm font-bold mb-2">66 Cards</p>
    <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-gray-300">
      <div className="bg-gray-800 rounded-lg p-2">30 Planet cards</div>
      <div className="bg-gray-800 rounded-lg p-2">30 Buyer cards</div>
      <div className="bg-gray-800 rounded-lg p-2">2 Scoring Track cards</div>
      <div className="bg-gray-800 rounded-lg p-2">4 Reference cards</div>
    </div>

    <p className="text-white text-sm font-bold mb-2">78 Resource Cubes</p>
    <div className="grid grid-cols-2 gap-1.5 mb-4">
      {[
        { color: 'blue', count: 21, label: '"Water" Cubes' },
        { color: 'white', count: 12, label: '"Gems" Cubes' },
        { color: 'green', count: 17, label: '"Plants/Food" Cubes' },
        { color: 'red', count: 9, label: '"Radioactive" Cubes' },
        { color: 'yellow', count: 14, label: '"Energy" Cubes' },
        { color: 'black', count: 5, label: '"Alien Goods" Cubes' },
      ].map((r) => (
        <div key={r.color} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2 text-sm">
          <Cube color={r.color} />
          <span className="text-white font-semibold">{r.count}</span>
          <span className="text-gray-400 text-xs">{r.label}</span>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
      <div className="bg-gray-800 rounded-lg p-2">4 Rocket Ships (one per color)</div>
      <div className="bg-gray-800 rounded-lg p-2">4 Scoring Markers (one per color)</div>
    </div>
  </div>,
];

const PAGE_TITLES = [
  'Intro & Overview',
  'Setup',
  'Game Play — Move',
  'Game Play — Actions',
  'Deals & Game End',
  'Declaring the Winner',
  'Components',
];

export function RulebookModal({ isOpen, onClose }: RulebookModalProps) {
  const [page, setPage] = useState(0);
  const total = PAGES.length;

  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const next = useCallback(() => setPage((p) => Math.min(total - 1, p + 1)), [total]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, next, prev]);

  // Reset to first page when opened
  useEffect(() => {
    if (isOpen) setPage(0);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="rulebook-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="rulebook-panel"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-gray-950 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-xl pointer-events-auto flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">Rulebook</span>
                  <span className="text-xs text-gray-500">{PAGE_TITLES[page]}</span>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded"
                  aria-label="Close rulebook"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={page}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.15 }}
                  >
                    {PAGES[page]}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer — navigation */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 flex-shrink-0">
                <button
                  onClick={prev}
                  disabled={page === 0}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Previous
                </button>

                {/* Page dots */}
                <div className="flex gap-1.5">
                  {PAGES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === page ? 'bg-indigo-400' : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                      aria-label={`Go to page ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={next}
                  disabled={page === total - 1}
                  className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
