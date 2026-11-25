import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
  stage: string;
  error: string | null;
  onRetry: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  stage,
  error,
  onRetry,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#141115] px-6 text-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-4xl font-semibold tracking-wide text-[#FAF6F0]">
            FIND MY HEART
          </h1>
          <p className="text-sm text-[#FAF6F0]/60">A little world for two.</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#B85D6E]/40 bg-[#22171D] p-5 space-y-4">
            <p className="text-sm text-[#F4C7D0]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4A55D] px-5 py-2.5 text-sm font-semibold text-[#141115] hover:bg-[#E3B76F] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#B85D6E] to-[#D4A55D] transition-all duration-200"
                style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[#FAF6F0]/60 tabular-nums">
              <span>{stage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
