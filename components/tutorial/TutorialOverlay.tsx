'use client';
import { TutorialStep } from '@/lib/game/tutorial';
import { Button } from '@/components/ui/Button';

interface TutorialOverlayProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  hint: string | null;
  p2Animating: boolean;
  /** Live commentary text set as each P2 action fires */
  p2Narration: string | null;
  onNext: () => void;
  isLastStep: boolean;
}

function formatBody(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function Spinner() {
  return (
    <span className="inline-block w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin align-middle mr-1.5" />
  );
}

export function TutorialOverlay({
  step,
  stepIndex,
  totalSteps,
  hint,
  p2Animating,
  p2Narration,
  onNext,
  isLastStep,
}: TutorialOverlayProps) {
  const progress = ((stepIndex + 1) / totalSteps) * 100;
  const isCommentaryStep = step.isP2Commentary === true;

  // Decide what to show in the body area
  let bodyContent: React.ReactNode;
  if (p2Animating) {
    if (p2Narration) {
      // Show live action narration from Cosmo's scripted actions
      bodyContent = (
        <p className="text-gray-200 text-sm italic flex items-start gap-2">
          <Spinner />
          <span>{p2Narration}</span>
        </p>
      );
    } else {
      // Generic waiting message before first action fires
      bodyContent = (
        <p className="text-gray-400 text-sm italic flex items-center gap-2">
          <Spinner />
          Cosmo is thinking…
        </p>
      );
    }
  } else if (hint) {
    bodyContent = <p className="text-amber-400 text-sm">{hint}</p>;
  } else {
    bodyContent = (
      <p className="text-gray-300 text-sm leading-relaxed">
        {formatBody(step.body)}
      </p>
    );
  }

  return (
    <div className="bg-indigo-950 border border-indigo-700 rounded-2xl p-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-6 shadow-lg">
      {/* Progress indicator */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-indigo-400 text-xs font-mono whitespace-nowrap">
          {stepIndex + 1} / {totalSteps}
        </span>
        <div className="w-20 h-1.5 bg-indigo-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wide bg-indigo-900 px-2 py-0.5 rounded-full">
          {isCommentaryStep && p2Animating ? "Cosmo's move" : 'Tutorial'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-indigo-200 font-semibold text-sm mb-0.5">{step.title}</p>
        {bodyContent}
      </div>

      {/* Button area */}
      {step.waitFor === null ? (
        // Commentary / welcome / complete steps: button is always shown, disabled during animation
        <Button
          onClick={onNext}
          size="sm"
          className="shrink-0 whitespace-nowrap"
          disabled={p2Animating}
        >
          {p2Animating
            ? 'Watching…'
            : isLastStep
            ? 'Play a Real Game!'
            : 'Next →'}
        </Button>
      ) : (
        // Steps waiting for a player action
        !p2Animating && !hint && (
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-indigo-400">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            Your move
          </div>
        )
      )}
    </div>
  );
}
