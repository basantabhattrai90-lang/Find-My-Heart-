import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Heart,
  LogOut,
  MessageSquare,
  Send,
  Settings,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import {
  ChatMessage,
  ConnectionMode,
  InspectModalData,
  InteractionPrompt,
  KissState,
  NameplateState,
  RoomDefinition,
  SpeechBubbleState,
} from '../types/game';

interface GameHUDProps {
  currentRoom: RoomDefinition;
  secretUnlocked: boolean;
  connectionMode: ConnectionMode;
  roomCode: string | null;
  partnerOnline: boolean;
  partnerName: string | null;
  localUid: string;
  fps: number;
  showFps: boolean;
  nearestPrompt: InteractionPrompt | null;
  speechBubbles: SpeechBubbleState[];
  partnerNameplate: NameplateState | null;
  chatMessages: ChatMessage[];
  chatOpen: boolean;
  kissState: KissState;
  kissNotice: string | null;
  inspectModal: InspectModalData | null;
  onCloseChat: () => void;
  onSendChat: (text: string) => void;
  onRespondKiss: (accept: boolean) => void;
  onCancelKiss: () => void;
  onCloseInspect: () => void;
  onInteract: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentRoom,
  secretUnlocked,
  connectionMode,
  roomCode,
  partnerOnline,
  partnerName,
  localUid,
  fps,
  showFps,
  nearestPrompt,
  speechBubbles,
  partnerNameplate,
  chatMessages,
  chatOpen,
  kissState,
  kissNotice,
  inspectModal,
  onCloseChat,
  onSendChat,
  onRespondKiss,
  onCancelKiss,
  onCloseInspect,
  onInteract,
  onOpenSettings,
  onLeave,
}) => {
  const [chatText, setChatText] = useState('');
  const [copied, setCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText);
    setChatText('');
  };

  // Never reveal Room 10 in HUD unless discovered & unlocked
  const visibleRoomName =
    currentRoom.hiddenFromMap && !secretUnlocked ? 'Upper Wing' : currentRoom.name;
  const visibleRoomSubtitle =
    currentRoom.hiddenFromMap && !secretUnlocked ? 'Exploring' : currentRoom.subtitle;

  const isLocalPreview = connectionMode === 'local_preview';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* 3D-Projected Partner Nameplate */}
      {partnerNameplate && partnerNameplate.visible && (
        <div
          className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
          style={{ left: partnerNameplate.screenX, top: partnerNameplate.screenY }}
        >
          <div className="rounded-lg bg-[#141115]/78 border border-white/15 px-2.5 py-0.5 text-[11px] font-medium text-[#F2D091] whitespace-nowrap">
            {partnerNameplate.name}
          </div>
        </div>
      )}

      {/* 3D-Projected Head-Up Speech Bubbles */}
      {speechBubbles.map(
        (b) =>
          b.visible && (
            <div
              key={b.uid}
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none max-w-[210px]"
              style={{
                left: b.screenX,
                top: b.screenY,
                opacity: b.opacity,
              }}
            >
              <div className="rounded-2xl border border-[#D4A55D]/40 bg-[#FAF6F0]/95 px-3 py-1.5 text-xs font-medium text-[#1A151B] shadow-lg text-center break-words">
                {b.text}
              </div>
            </div>
          )
      )}

      {/* Top Bar: Room Indicator (Left) & Status Cluster (Right) */}
      <div className="flex items-start justify-between gap-3 p-3 sm:p-5 safe-top safe-left safe-right">
        {/* Top-Left Room Indicator */}
        <div className="pointer-events-auto rounded-2xl border border-white/12 bg-[#141115]/80 px-4 py-2.5 shadow-lg">
          <div className="font-display text-lg sm:text-xl font-semibold text-[#FAF6F0] leading-tight">
            {visibleRoomName}
          </div>
          <div className="text-[11px] text-[#E9C992]/85">{visibleRoomSubtitle}</div>
        </div>

        {/* Top-Right Connection, Room Code, FPS, Settings */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {showFps && (
            <div className="rounded-xl border border-white/12 bg-[#141115]/80 px-2.5 py-1.5 text-xs font-mono tabular-nums text-[#E9C992]">
              {fps} FPS
            </div>
          )}

          {/* Connection & Room Code */}
          <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-[#141115]/82 px-3 py-1.5 text-xs">
            {isLocalPreview ? (
              <span className="text-[#E9C992] font-medium whitespace-nowrap">
                Local Preview (Offline)
              </span>
            ) : (
              <>
                {connectionMode === 'connected' ? (
                  <Wifi className="w-3.5 h-3.5 text-[#7BD39A]" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-[#E59866]" />
                )}
                <span className="text-[#FAF6F0]/80 whitespace-nowrap">
                  {connectionMode === 'reconnecting'
                    ? 'Reconnecting...'
                    : partnerOnline && partnerName
                    ? `${partnerName} nearby`
                    : 'Waiting for partner'}
                </span>
                {roomCode && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#F2D091] hover:bg-white/15 cursor-pointer"
                    title="Copy Room Code"
                  >
                    {roomCode}
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl border border-white/12 bg-[#141115]/82 text-[#FAF6F0] hover:bg-[#231D25] transition-colors cursor-pointer"
            aria-label="Settings"
            title="Settings (Esc)"
          >
            <Settings className="w-4 h-4 text-[#D4A55D]" />
          </button>

          <button
            type="button"
            onClick={onLeave}
            className="p-2.5 rounded-xl border border-white/12 bg-[#141115]/82 text-[#FAF6F0]/80 hover:text-[#F4C7D0] hover:bg-[#2A1B21] transition-colors cursor-pointer"
            aria-label="Leave Session"
            title="Leave Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kiss Request / Consent Banner */}
      {kissState.status === 'pending' && (
        <div className="pointer-events-auto fixed top-24 sm:top-20 left-1/2 -translate-x-1/2 z-30 w-[90vw] max-w-sm rounded-2xl border border-[#E17A8C]/50 bg-[#1B1419]/95 p-4 shadow-2xl">
          {kissState.initiatorUid === localUid ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-[#FAF6F0]">
                <Heart className="w-4 h-4 text-[#E17A8C]" />
                <span>Waiting for partner to accept...</span>
              </div>
              <button
                type="button"
                onClick={onCancelKiss}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-[#FAF6F0]/80 hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#FAF6F0]">
                <Heart className="w-4 h-4 text-[#E17A8C]" />
                <span>{partnerName || 'Your partner'} wants to share a kiss</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRespondKiss(true)}
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#C86475] to-[#D4A55D] py-2 text-xs font-semibold text-[#141115] cursor-pointer"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => onRespondKiss(false)}
                  className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2 text-xs font-medium text-[#FAF6F0]/80 hover:bg-white/10 cursor-pointer"
                >
                  Not Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ephemeral Kiss / Discovery Notice */}
      {kissNotice && (
        <div className="fixed top-24 sm:top-20 left-1/2 -translate-x-1/2 z-30 rounded-xl border border-[#D4A55D]/40 bg-[#141115]/90 px-4 py-2 text-xs font-medium text-[#F2D091] shadow-lg">
          {kissNotice}
        </div>
      )}

      {/* Interaction Prompt (Above thumb controls on portrait phones, bottom-center on wider screens) */}
      {nearestPrompt && !chatOpen && !inspectModal && (
        <div className="pointer-events-auto fixed bottom-44 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-[82vw]">
          <button
            type="button"
            onClick={onInteract}
            className="rounded-2xl border border-[#D4A55D]/50 bg-[#141115]/90 px-4 py-2 text-xs sm:text-sm font-medium text-[#FAF6F0] shadow-xl hover:bg-[#231C23] transition-colors cursor-pointer truncate max-w-full"
          >
            <span className="text-[#F2D091] font-semibold">Tap / E:</span>{' '}
            {nearestPrompt.label}
          </button>
        </div>
      )}

      {/* Inspect Clue / Memory Frame Modal */}
      {inspectModal && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#D4A55D]/35 bg-[#1B161C] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold text-[#F2D091]">
                {inspectModal.title}
              </h3>
              <button
                type="button"
                onClick={onCloseInspect}
                className="p-1.5 rounded-lg text-[#FAF6F0]/60 hover:text-[#FAF6F0] hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-[#FAF6F0]/88 leading-relaxed">{inspectModal.body}</p>
            {inspectModal.clue && (
              <p className="rounded-xl border border-[#D4A55D]/25 bg-[#D4A55D]/10 p-3 text-xs text-[#E9C992]">
                {inspectModal.clue}
              </p>
            )}
            <button
              type="button"
              onClick={onCloseInspect}
              className="w-full rounded-xl bg-[#D4A55D] py-2.5 text-sm font-semibold text-[#141115] hover:bg-[#E2B771] cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chat Drawer (Bottom-Left) */}
      {chatOpen && (
        <div className="pointer-events-auto fixed bottom-20 left-3 sm:left-5 z-30 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border border-white/15 bg-[#141115]/92 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F2D091]">
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </div>
            <button
              type="button"
              onClick={onCloseChat}
              className="p-1 rounded-lg text-[#FAF6F0]/60 hover:text-[#FAF6F0] cursor-pointer"
              aria-label="Close Chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-44 overflow-y-auto custom-scroll p-3 space-y-2 text-xs">
            {chatMessages.length === 0 ? (
              <p className="text-[#FAF6F0]/45 text-center py-8">
                Say hello—messages appear above your character!
              </p>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className="leading-relaxed">
                  <span
                    className={`font-semibold ${
                      m.uid === localUid ? 'text-[#F2D091]' : 'text-[#E17A8C]'
                    }`}
                  >
                    {m.name}:{' '}
                  </span>
                  <span className="text-[#FAF6F0]/90">{m.text}</span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 p-2.5 border-t border-white/10">
            <input
              type="text"
              maxLength={200}
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Write a sweet message..."
              autoFocus
              className="flex-1 rounded-xl border border-white/15 bg-[#1D181E] px-3 py-2 text-xs text-[#FAF6F0] outline-none focus:border-[#D4A55D]"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-[#D4A55D] text-[#141115] hover:bg-[#E2B771] cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
