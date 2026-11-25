import React, { useState } from 'react';
import { Activity, Check, Copy, KeyRound, Maximize2, RotateCcw, X } from 'lucide-react';
import { GameSettings, GraphicsQuality } from '../types/game';
import {
  FirebaseWebConfig,
  loadStoredFirebaseConfig,
  saveStoredFirebaseConfig,
} from '../utils/settings';
import { FIREBASE_DATABASE_RULES_JSON, resetFirebaseCache } from '../firebase/config';
import { testFirebaseConnection } from '../network/MultiplayerManager';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  settings: GameSettings;
  isFirebaseReady: boolean;
  onUpdate: (next: GameSettings) => void;
  onReset: () => void;
  onFirebaseUpdated: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isFirebaseReady,
  onUpdate,
  onReset,
  onFirebaseUpdated,
  onClose,
}) => {
  const [showFirebaseForm, setShowFirebaseForm] = useState(false);
  const existing = loadStoredFirebaseConfig();
  const [fbJson, setFbJson] = useState(existing ? JSON.stringify(existing, null, 2) : '');
  const [fbError, setFbError] = useState<string | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<{ ok: boolean; details: string } | null>(null);
  const [rulesCopied, setRulesCopied] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleSaveFirebase = () => {
    try {
      const parsed = JSON.parse(fbJson) as Partial<FirebaseWebConfig>;
      if (!parsed.apiKey || !parsed.databaseURL || !parsed.projectId || !parsed.appId) {
        setFbError('Config JSON must include apiKey, databaseURL, projectId, and appId.');
        return;
      }
      saveStoredFirebaseConfig({
        apiKey: parsed.apiKey,
        authDomain: parsed.authDomain || `${parsed.projectId}.firebaseapp.com`,
        databaseURL: parsed.databaseURL,
        projectId: parsed.projectId,
        storageBucket: parsed.storageBucket || '',
        messagingSenderId: parsed.messagingSenderId || '',
        appId: parsed.appId,
      });
      resetFirebaseCache();
      setFbError(null);
      setShowFirebaseForm(false);
      onFirebaseUpdated();
    } catch {
      setFbError('Invalid JSON format. Paste the firebaseConfig object from Firebase Console.');
    }
  };

  const handleClearFirebase = () => {
    saveStoredFirebaseConfig(null);
    resetFirebaseCache();
    setFbJson('');
    setDiagResult(null);
    onFirebaseUpdated();
  };

  const handleTestFirebase = async () => {
    setDiagRunning(true);
    setDiagResult(null);
    const res = await testFirebaseConnection();
    setDiagResult(res);
    setDiagRunning(false);
  };

  const handleCopyRules = () => {
    navigator.clipboard?.writeText(FIREBASE_DATABASE_RULES_JSON).catch(() => {});
    setRulesCopied(true);
    setTimeout(() => setRulesCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-white/12 bg-[#1B161C] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-display text-2xl font-semibold text-[#FAF6F0]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#FAF6F0]/60 hover:text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-5 text-sm">
          {/* Audio */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E9C992]">Audio</h3>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-[#FAF6F0]/80">
                <span>Music Volume</span>
                <span className="tabular-nums">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) => onUpdate({ ...settings, musicVolume: Number(e.target.value) })}
                className="w-full accent-[#D4A55D]"
              />
            </label>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-[#FAF6F0]/80">
                <span>Sound Effects</span>
                <span className="tabular-nums">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) => onUpdate({ ...settings, sfxVolume: Number(e.target.value) })}
                className="w-full accent-[#D4A55D]"
              />
            </label>
          </div>

          {/* Camera & Controls */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E9C992]">Controls & Camera</h3>
            <label className="block space-y-1">
              <div className="flex justify-between text-xs text-[#FAF6F0]/80">
                <span>Camera Sensitivity</span>
                <span className="tabular-nums">{settings.cameraSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.4}
                max={2.4}
                step={0.1}
                value={settings.cameraSensitivity}
                onChange={(e) =>
                  onUpdate({ ...settings, cameraSensitivity: Number(e.target.value) })
                }
                className="w-full accent-[#D4A55D]"
              />
            </label>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#FAF6F0]/85">Show On-Screen Controls</span>
              <input
                type="checkbox"
                checked={settings.showControls}
                onChange={(e) => onUpdate({ ...settings, showControls: e.target.checked })}
                className="accent-[#D4A55D] w-4 h-4"
              />
            </div>
          </div>

          {/* Graphics & Performance */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E9C992]">Graphics & Performance</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onUpdate({ ...settings, graphicsQuality: q })}
                  className={`rounded-xl py-2 text-xs font-medium capitalize border transition-colors cursor-pointer ${
                    settings.graphicsQuality === q
                      ? 'border-[#D4A55D] bg-[#D4A55D]/20 text-[#F2D091]'
                      : 'border-white/10 bg-[#120E13] text-[#FAF6F0]/70'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#FAF6F0]/85">Real-Time Shadows</span>
              <input
                type="checkbox"
                checked={settings.shadowsEnabled}
                onChange={(e) => onUpdate({ ...settings, shadowsEnabled: e.target.checked })}
                className="accent-[#D4A55D] w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#FAF6F0]/85">Ambient Particles</span>
              <input
                type="checkbox"
                checked={settings.particlesEnabled}
                onChange={(e) => onUpdate({ ...settings, particlesEnabled: e.target.checked })}
                className="accent-[#D4A55D] w-4 h-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#FAF6F0]/85">FPS Counter</span>
              <input
                type="checkbox"
                checked={settings.showFps}
                onChange={(e) => onUpdate({ ...settings, showFps: e.target.checked })}
                className="accent-[#D4A55D] w-4 h-4"
              />
            </div>
          </div>

          {/* Personalization (kept quietly inside Settings) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#E9C992]">Personalization</h3>
            <div>
              <label className="block text-xs text-[#FAF6F0]/75 mb-1">Partner’s Name</label>
              <input
                type="text"
                maxLength={32}
                value={settings.herName}
                onChange={(e) => onUpdate({ ...settings, herName: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-[#120E13] px-3 py-2 text-xs text-[#FAF6F0] outline-none focus:border-[#D4A55D]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#FAF6F0]/75 mb-1">Keepsake Note</label>
              <textarea
                rows={2}
                maxLength={240}
                value={settings.proposalMessage}
                onChange={(e) => onUpdate({ ...settings, proposalMessage: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-[#120E13] px-3 py-2 text-xs text-[#FAF6F0] outline-none focus:border-[#D4A55D]"
              />
            </div>
          </div>

          {/* Online Multiplayer / Firebase Config */}
          <div className="space-y-2.5 rounded-2xl border border-white/10 bg-[#120E13] p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#FAF6F0]">Firebase Realtime Database</p>
                <p className="text-[11px] text-[#FAF6F0]/55">
                  {isFirebaseReady ? 'Connected configuration detected' : 'Not configured (Local Preview only)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFirebaseForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4A55D]/40 px-2.5 py-1.5 text-xs text-[#F2D091] hover:bg-white/5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {showFirebaseForm ? 'Hide' : 'Configure'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isFirebaseReady && (
                <button
                  type="button"
                  onClick={handleTestFirebase}
                  disabled={diagRunning}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-[#FAF6F0]/90 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-[#D4A55D]" />
                  {diagRunning ? 'Testing...' : 'Test Connection'}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyRules}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-[#FAF6F0]/85 hover:bg-white/10 cursor-pointer"
              >
                {rulesCopied ? <Check className="w-3.5 h-3.5 text-[#7BD39A]" /> : <Copy className="w-3.5 h-3.5 text-[#D4A55D]" />}
                {rulesCopied ? 'Rules Copied' : 'Copy Rules JSON'}
              </button>
            </div>

            {diagResult && (
              <div
                className={`rounded-xl border p-2.5 text-[11px] leading-relaxed ${
                  diagResult.ok
                    ? 'border-[#7BD39A]/40 bg-[#7BD39A]/10 text-[#C8F5D8]'
                    : 'border-[#E17A8C]/40 bg-[#E17A8C]/10 text-[#F4C7D0]'
                }`}
              >
                {diagResult.details}
              </div>
            )}

            {showFirebaseForm && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] text-[#FAF6F0]/70 leading-relaxed">
                  Paste your Firebase Web JSON config (with Anonymous Auth & Realtime Database enabled, and rules from <code>database.rules.json</code>).
                </p>
                <textarea
                  rows={4}
                  value={fbJson}
                  onChange={(e) => setFbJson(e.target.value)}
                  placeholder='{"apiKey":"...","authDomain":"...","databaseURL":"https://...-default-rtdb.firebaseio.com","projectId":"...","appId":"..."}'
                  className="w-full rounded-xl border border-white/15 bg-[#1B161C] p-2.5 font-mono text-[11px] text-[#FAF6F0] outline-none focus:border-[#D4A55D]"
                />
                {fbError && <p className="text-[11px] text-[#F4C7D0]">{fbError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveFirebase}
                    className="rounded-lg bg-[#D4A55D] px-3 py-1.5 text-xs font-semibold text-[#141115] cursor-pointer"
                  >
                    Save Config
                  </button>
                  {existing && (
                    <button
                      type="button"
                      onClick={handleClearFirebase}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-[#FAF6F0]/75 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Utility Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {document.fullscreenEnabled && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fullscreen
                </button>
              )}
              <PWAInstallButton compact />
            </div>

            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3.5 py-2 text-xs font-medium text-[#FAF6F0]/75 hover:text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
