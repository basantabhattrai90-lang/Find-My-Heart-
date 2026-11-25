import React from 'react';
import { Settings, Users, PlusCircle, Play } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface StartScreenProps {
  isFirebaseReady: boolean;
  onStartQuick: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onOpenSettings: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  isFirebaseReady,
  onStartQuick,
  onCreateRoom,
  onJoinRoom,
  onOpenSettings,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none safe-top safe-bottom safe-left safe-right p-5 sm:p-8">
      {/* Top quiet utility bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="text-xs text-[#FAF6F0]/75 tracking-wide">
          {isFirebaseReady ? 'Online Multiplayer Ready' : 'Local Preview Mode Available'}
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#141115]/80 px-3.5 py-2 text-xs font-medium text-[#FAF6F0] hover:bg-[#1E1920] transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-[#D4A55D]" />
            Settings
          </button>
        </div>
      </div>

      {/* Center-Left Cinematic Title & Primary Actions */}
      <div className="my-auto max-w-md pointer-events-auto">
        <div className="rounded-3xl border border-white/12 bg-[#141115]/78 p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-wide text-[#FAF6F0] leading-tight">
              FIND MY HEART
            </h1>
            <p className="font-display italic text-lg sm:text-xl text-[#E9C992]">
              “A little world for two.”
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onStartQuick}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#C86475] to-[#D4A55D] px-5 py-3.5 text-sm font-semibold text-[#141115] shadow-lg hover:brightness-105 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Start
            </button>

            <button
              type="button"
              onClick={onCreateRoom}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4A55D]/40 bg-[#231C22]/90 px-4 py-3 text-sm font-medium text-[#FAF6F0] hover:bg-[#2F252D] transition-colors cursor-pointer whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 text-[#D4A55D]" />
              Create Room
            </button>

            <button
              type="button"
              onClick={onJoinRoom}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#1D181E]/90 px-4 py-3 text-sm font-medium text-[#FAF6F0] hover:bg-[#2A222B] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Users className="w-4 h-4 text-[#E9C992]" />
              Join a Friend
            </button>
          </div>
        </div>
      </div>

      {/* Subtle bottom control hint */}
      <div className="flex items-center justify-center pointer-events-none">
        <p className="rounded-lg bg-[#141115]/70 px-3.5 py-1.5 text-xs text-[#FAF6F0]/65">
          WASD or Virtual Joystick to Move · Drag to Look · Space to Jump · E to Interact
        </p>
      </div>
    </div>
  );
};
