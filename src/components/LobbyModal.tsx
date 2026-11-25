import React, { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, KeyRound, X } from 'lucide-react';

export type LobbyIntent = 'create' | 'join' | 'local';

interface LobbyModalProps {
  initialMode: 'create' | 'join';
  isFirebaseReady: boolean;
  onClose: () => void;
  onProceedCreate: () => void;
  onProceedJoin: (roomCode: string) => void;
  onProceedLocalPreview: (withCompanion: boolean) => void;
  onOpenFirebaseSettings: () => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  initialMode,
  isFirebaseReady,
  onClose,
  onProceedCreate,
  onProceedJoin,
  onProceedLocalPreview,
  onOpenFirebaseSettings,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>(initialMode);
  const [joinCode, setJoinCode] = useState('');
  const [withCompanion, setWithCompanion] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length !== 6) {
      setLocalError('Room code must be 6 characters (e.g. A7K9P2).');
      return;
    }
    setLocalError(null);
    onProceedJoin(clean);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/12 bg-[#1B161C] p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl font-semibold text-[#FAF6F0]">
            Private Session
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#FAF6F0]/60 hover:text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#120E13] p-1">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'create' ? 'bg-[#2B222C] text-[#F2D091]' : 'text-[#FAF6F0]/60 hover:text-[#FAF6F0]'
            }`}
          >
            Create Room
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
              tab === 'join' ? 'bg-[#2B222C] text-[#F2D091]' : 'text-[#FAF6F0]/60 hover:text-[#FAF6F0]'
            }`}
          >
            Join a Friend
          </button>
        </div>

        {!isFirebaseReady ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#D4A55D]/35 bg-[#D4A55D]/10 p-4 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#F2D091] shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-[#FAF6F0]/85 leading-relaxed">
                  <p className="font-semibold text-[#F2D091]">
                    Firebase Realtime Database is not configured yet
                  </p>
                  <p>
                    Online 2-player rooms require your Firebase Web Config (Realtime Database + Anonymous Auth). You can add it in Settings or explore offline now.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenFirebaseSettings}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4A55D]/40 bg-[#1B161C] px-3 py-1.5 text-xs font-medium text-[#F2D091] hover:bg-[#272028] cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Connect Firebase Now
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#120E13] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#FAF6F0]">Local Preview Mode (Offline)</p>
                  <p className="text-xs text-[#FAF6F0]/55">Not online multiplayer — single-device exploration</p>
                </div>
                <Eye className="w-4 h-4 text-[#C86475]" />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-[#FAF6F0]/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withCompanion}
                  onChange={(e) => setWithCompanion(e.target.checked)}
                  className="accent-[#D4A55D] w-4 h-4"
                />
                Include offline preview companion to test interactions
              </label>

              <button
                type="button"
                onClick={() => onProceedLocalPreview(withCompanion)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C86475] to-[#D4A55D] py-2.5 text-sm font-semibold text-[#141115] hover:brightness-105 cursor-pointer"
              >
                Enter Local Preview
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : tab === 'create' ? (
          <div className="space-y-4">
            <p className="text-xs text-[#FAF6F0]/75 leading-relaxed">
              Create an invite-only 2-player room. You will receive a private 6-character code to share with your partner.
            </p>
            <button
              type="button"
              onClick={onProceedCreate}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C86475] to-[#D4A55D] py-3 text-sm font-semibold text-[#141115] hover:brightness-105 cursor-pointer"
            >
              Choose Character & Create Room
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#FAF6F0]/75 mb-1.5">
                Enter 6-Character Room Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A7K9P2"
                className="w-full rounded-xl border border-white/15 bg-[#120E13] px-4 py-3 text-center text-lg font-semibold tracking-[0.25em] text-[#F2D091] uppercase outline-none focus:border-[#D4A55D]"
              />
            </div>
            {localError && <p className="text-xs text-[#F4C7D0]">{localError}</p>}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C86475] to-[#D4A55D] py-3 text-sm font-semibold text-[#141115] hover:brightness-105 cursor-pointer"
            >
              Choose Character & Join
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
