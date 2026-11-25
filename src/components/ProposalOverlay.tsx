import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';
import { ProposalResponse } from '../types/game';

interface ProposalOverlayProps {
  herName: string;
  customCelebrationMessage: string;
  response: ProposalResponse;
  onRespond: (choice: 'yes' | 'no') => void;
  onCloseToExplore: () => void;
}

export const ProposalOverlay: React.FC<ProposalOverlayProps> = ({
  herName,
  customCelebrationMessage,
  response,
  onRespond,
  onCloseToExplore,
}) => {
  const [noCount, setNoCount] = useState(0);

  const handleNo = () => {
    setNoCount((c) => Math.min(c + 1, 5));
    onRespond('no');
  };

  const yesScale = 1 + noCount * 0.08;

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
      {/* Warm translucent card positioned gently so the kneeling scene remains visible */}
      <div className="pointer-events-auto w-full max-w-lg rounded-3xl border border-[#D4A55D]/45 bg-[#191217]/88 p-6 sm:p-8 text-center shadow-2xl space-y-6">
        {response === 'yes' ? (
          <div className="space-y-5">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#B85D6E]/25 border border-[#E17A8C]/50 flex items-center justify-center">
              <Heart className="w-6 h-6 text-[#E17A8C] fill-current" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#F2D091]">
              Forever Begins Here
            </h2>
            <p className="text-sm sm:text-base text-[#FAF6F0]/90 leading-relaxed">
              {customCelebrationMessage}
            </p>
            <button
              type="button"
              onClick={onCloseToExplore}
              className="rounded-xl bg-gradient-to-r from-[#C86475] to-[#D4A55D] px-6 py-3 text-sm font-semibold text-[#141115] hover:brightness-105 cursor-pointer"
            >
              Continue Exploring Together
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-end -mt-2 -mr-2">
              <button
                type="button"
                onClick={onCloseToExplore}
                className="p-1.5 rounded-lg text-[#FAF6F0]/55 hover:text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
                aria-label="Return to room"
                title="Return to room"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs tracking-[0.2em] uppercase text-[#E9C992]/80">
                A Question From The Heart
              </p>
              <h2
                className="font-display text-3xl sm:text-4xl font-semibold text-[#FAF6F0] leading-snug"
                style={{ textWrap: 'balance' }}
              >
                {herName.toUpperCase()}, WILL YOU BE MY RED DRESS?
              </h2>
            </div>

            {response === 'no' && (
              <p className="text-xs sm:text-sm text-[#F4C7D0] italic">
                Hehe, take all the time you need—I’m not going anywhere. You can still look around or change your mind anytime.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onRespond('yes')}
                style={{ transform: `scale(${yesScale})` }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#C86475] to-[#D4A55D] px-7 py-3.5 text-base font-semibold text-[#141115] shadow-lg hover:brightness-105 transition-transform cursor-pointer"
              >
                YES ❤️
              </button>
              <button
                type="button"
                onClick={handleNo}
                className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-medium text-[#FAF6F0]/85 hover:bg-white/10 transition-colors cursor-pointer"
              >
                NO
              </button>
            </div>

            {response === 'no' && (
              <button
                type="button"
                onClick={onCloseToExplore}
                className="text-xs text-[#FAF6F0]/60 underline hover:text-[#FAF6F0] cursor-pointer"
              >
                Return to gameplay
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
