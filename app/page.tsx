'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

type ModalMode = 'create' | 'join' | null;

export default function LandingPage() {
  const router = useRouter();
  const { sessionId } = useSession();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [displayName, setDisplayName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = (mode: ModalMode) => {
    setModalMode(mode);
    setError(null);
    setDisplayName('');
    setGameCode('');
  };

  const handleCloseModal = () => {
    if (loading) return;
    setModalMode(null);
    setError(null);
  };

  const handleCreateGame = async () => {
    if (!sessionId) return;
    const name = displayName.trim();
    if (!name) {
      setError('Please enter a display name');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, displayName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create game');
        return;
      }
      router.push(`/lobby/${data.code}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!sessionId) return;
    const name = displayName.trim();
    const code = gameCode.trim().toUpperCase();
    if (!name) {
      setError('Please enter a display name');
      return;
    }
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-character game code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Look up game by code
      const lookupRes = await fetch(`/api/games?code=${code}`);
      const lookupData = await lookupRes.json();
      if (!lookupRes.ok) {
        setError(lookupData.error ?? 'Game not found');
        return;
      }

      const gameId = lookupData.gameId as string;
      const status = lookupData.status as string;

      if (status !== 'lobby') {
        setError('This game has already started');
        return;
      }

      // Join the game
      const joinRes = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, displayName: name }),
      });
      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        setError(joinData.error ?? 'Failed to join game');
        return;
      }

      router.push(`/lobby/${code}`);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="mb-4 inline-flex items-center gap-2 bg-indigo-900/40 border border-indigo-700 text-indigo-300 text-sm px-4 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
          2–4 Players • Multiplayer
        </div>

        <h1 className="text-6xl font-extrabold text-white mb-4 tracking-tight">
          Space{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">
            Trader
          </span>
        </h1>

        <p className="text-gray-400 text-lg leading-relaxed mb-8">
          Navigate a galaxy of planets, gather rare resources, and outsmart your
          rivals. Complete deals with buyers to earn the most space credits and
          claim galactic supremacy.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => handleOpenModal('create')}>
            Create Game
          </Button>
          <Button size="lg" variant="secondary" onClick={() => handleOpenModal('join')}>
            Join Game
          </Button>
        </div>
      </div>

      {/* Rules summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl w-full mx-auto">
        {[
          {
            emoji: '\u{1F680}',
            title: 'Move',
            desc: 'Fly to adjacent planets. Cost = planet rings.',
          },
          {
            emoji: '⛏',
            title: 'Gather',
            desc: 'Collect resource cubes from your current planet.',
          },
          {
            emoji: '\u{1F4B0}',
            title: 'Sell',
            desc: 'Match resources to buyer deals for credits.',
          },
          {
            emoji: '\u{1F0CF}',
            title: 'Private Buyer',
            desc: 'Spend 3 actions to draw a secret buyer card.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center"
          >
            <div className="text-2xl mb-2">{item.emoji}</div>
            <h3 className="text-white font-semibold mb-1">{item.title}</h3>
            <p className="text-gray-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Create game modal */}
      <Modal
        isOpen={modalMode === 'create'}
        onClose={handleCloseModal}
        title="Create New Game"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Your Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Captain Nova"
            maxLength={24}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button loading={loading} onClick={handleCreateGame} className="w-full">
            Create Game
          </Button>
        </div>
      </Modal>

      {/* Join game modal */}
      <Modal
        isOpen={modalMode === 'join'}
        onClose={handleCloseModal}
        title="Join Game"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Your Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Captain Nova"
            maxLength={24}
            autoFocus
          />
          <Input
            label="Game Code"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="font-mono uppercase tracking-widest text-center text-lg"
            onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button loading={loading} onClick={handleJoinGame} className="w-full">
            Join Game
          </Button>
        </div>
      </Modal>
    </main>
  );
}
