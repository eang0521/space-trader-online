'use client';
import { TutorialStep } from '@/lib/game/tutorial';
import { Button } from '@/components/ui/Button';

interface TutorialOverlayProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  hint: string | null;
  onNext: () => void;
  isLastStep: boolean;
  nextDisabled?: boolean;
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

export function TutorialOverlay({
  step,
  stepIndex,
  totalSteps,
  hint,
  onNext,
  isLastStep,
  nextDisabled = false,
}: TutorialOverlayProps) {
  const progress = ((stepIndex + 1) / totalSteps) * 100;

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
          Tutorial
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-indigo-200 font-semibold text-sm mb-0.5">{step.title}</p>
        {hint ? (
          <p className="text-amber-400 text-sm">{hint}</p>
        ) : (
          <p className="text-gray-300 text-sm leading-relaxed">
            {formatBody(step.body)}
          </p>
        )}
      </div>

      {/* Button area */}
      {step.waitFor === null ? (
        <Button onClick={onNext} size="sm" className="shrink-0 whitespace-nowrap" disabled={nextDisabled}>
          {isLastStep ? 'Play a Real Game!' : 'Next →'}
        </Button>
      ) : (
        !hint && (
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-indigo-400">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            Your move
          </div>
        )
      )}
    </div>
  );
}
