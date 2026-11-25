import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-2 rounded-lg border border-[#D4A55D]/40 bg-[#D4A55D]/15 text-[#F2D091] hover:bg-[#D4A55D]/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm font-medium'
        }`}
      >
        <Download className="w-4 h-4" />
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 text-[#FAF6F0]/85 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm font-medium'
          }`}
        >
          <Share className="w-4 h-4 text-[#D4A55D]" />
          Add to Home
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-[#D4A55D]/30 bg-[#1B161B] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-2xl font-semibold text-[#FAF6F0]">Install on iPhone</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-lg text-[#FAF6F0]/60 hover:text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
                  aria-label="Close install guide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#FAF6F0]/80 leading-relaxed">
                1. Tap the <strong className="text-[#F2D091]">Share</strong> button in Safari.
                <br />
                2. Scroll down and tap <strong className="text-[#F2D091]">Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#D4A55D] py-2.5 text-sm font-semibold text-[#141115] hover:bg-[#E2B771] transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
