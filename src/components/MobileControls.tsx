import React, { useEffect, useRef, useState } from 'react';
import { Heart, Hand, ArrowUp, MessageCircle, RotateCw, X } from 'lucide-react';
import { InteractionPrompt } from '../types/game';

interface MobileControlsProps {
  visible: boolean;
  nearestPrompt: InteractionPrompt | null;
  partnerNearForKiss: boolean;
  kissOnCooldown: boolean;
  onJoystickMove: (x: number, y: number) => void;
  onCameraDrag: (dx: number, dy: number) => void;
  onJump: () => void;
  onInteract: () => void;
  onKiss: () => void;
  onToggleChat: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  visible,
  nearestPrompt,
  partnerNearForKiss,
  kissOnCooldown,
  onJoystickMove,
  onCameraDrag,
  onJump,
  onInteract,
  onKiss,
  onToggleChat,
}) => {
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const joyTouchId = useRef<number | null>(null);
  const joyMouseActive = useRef(false);
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number } | null>(null);
  const mouseLooking = useRef(false);
  const lastMouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isPortraitMobile, setIsPortraitMobile] = useState(false);
  const [rotateDismissed, setRotateDismissed] = useState(false);
  const [showMobilePad, setShowMobilePad] = useState(false);

  useEffect(() => {
    const check = () => {
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const narrow = window.innerWidth <= 920;
      setShowMobilePad(touch || narrow);
      setIsPortraitMobile(touch && window.innerHeight > window.innerWidth && window.innerWidth < 900);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const updateJoystick = (clientX: number, clientY: number) => {
    const base = joyBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.42;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    const nx = dx / maxR;
    const ny = -dy / maxR;
    const mag = Math.hypot(nx, ny);
    setKnobPos({ x: dx, y: dy });
    setIsRunning(mag > 0.85);
    if (mag < 0.08) {
      onJoystickMove(0, 0);
    } else {
      onJoystickMove(nx, ny);
    }
  };

  const resetJoystick = () => {
    joyTouchId.current = null;
    joyMouseActive.current = false;
    setKnobPos({ x: 0, y: 0 });
    setIsRunning(false);
    onJoystickMove(0, 0);
  };

  const handleLookTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (lookTouchId.current === null && t.identifier !== joyTouchId.current) {
        lookTouchId.current = t.identifier;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        break;
      }
    }
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === lookTouchId.current && lastLookPos.current) {
        const dx = t.clientX - lastLookPos.current.x;
        const dy = t.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: t.clientX, y: t.clientY };
        onCameraDrag(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lastLookPos.current = null;
        break;
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    mouseLooking.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (joyMouseActive.current) {
      updateJoystick(e.clientX, e.clientY);
      return;
    }
    if (!mouseLooking.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    onCameraDrag(dx, dy);
  };

  const handleMouseUp = () => {
    mouseLooking.current = false;
    if (joyMouseActive.current) {
      resetJoystick();
    }
  };

  return (
    <>
      {/* Fullscreen Camera Drag Layer behind HUD buttons */}
      <div
        className="fixed inset-0 z-10 touch-none"
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Non-blocking Portrait Orientation Guidance */}
      {isPortraitMobile && !rotateDismissed && (
        <div className="fixed top-24 sm:top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl border border-[#D4A55D]/40 bg-[#141115]/90 px-3 py-1.5 text-[11px] text-[#F2D091] shadow-lg">
          <RotateCw className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">Rotate to landscape for wider view</span>
          <button
            type="button"
            onClick={() => setRotateDismissed(true)}
            className="p-0.5 text-[#FAF6F0]/60 hover:text-[#FAF6F0] cursor-pointer"
            aria-label="Dismiss rotation tip"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {visible && (
        <div className="fixed inset-0 z-20 pointer-events-none safe-bottom safe-left safe-right">
          {/* Left: Spacious Virtual Joystick */}
          {showMobilePad && (
            <div
              ref={joyBaseRef}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (joyTouchId.current === null && e.changedTouches.length > 0) {
                  const t = e.changedTouches[0];
                  joyTouchId.current = t.identifier;
                  updateJoystick(t.clientX, t.clientY);
                }
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
                for (let i = 0; i < e.changedTouches.length; i++) {
                  const t = e.changedTouches[i];
                  if (t.identifier === joyTouchId.current) {
                    updateJoystick(t.clientX, t.clientY);
                    break;
                  }
                }
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                for (let i = 0; i < e.changedTouches.length; i++) {
                  if (e.changedTouches[i].identifier === joyTouchId.current) {
                    resetJoystick();
                    break;
                  }
                }
              }}
              onTouchCancel={(e) => {
                e.stopPropagation();
                resetJoystick();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                joyMouseActive.current = true;
                updateJoystick(e.clientX, e.clientY);
              }}
              className={`pointer-events-auto absolute bottom-5 left-5 w-28 h-28 rounded-full border transition-colors flex items-center justify-center touch-none ${
                isRunning
                  ? 'border-[#D4A55D]/70 bg-[#141115]/48'
                  : 'border-white/20 bg-[#141115]/36'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full border shadow-md transition-colors ${
                  isRunning
                    ? 'border-[#F2D091] bg-[#D4A55D]/55'
                    : 'border-[#D4A55D]/75 bg-[#D4A55D]/35'
                }`}
                style={{
                  transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
                }}
              />
            </div>
          )}

          {/* Right: Cleanly Spaced 2x2 Thumb Action Cluster (16px gap between every button) */}
          <div className="pointer-events-auto absolute bottom-5 right-5 grid grid-cols-2 gap-4 items-center justify-items-center">
            {/* Top-Left: Chat */}
            <button
              type="button"
              onClick={onToggleChat}
              className="w-12 h-12 rounded-2xl border border-white/18 bg-[#141115]/68 text-[#FAF6F0]/90 hover:bg-[#231D25] active:scale-95 transition-transform flex flex-col items-center justify-center gap-0.5 shadow-lg cursor-pointer"
              title="Chat (Enter)"
              aria-label="Open Chat"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none tracking-wide">Chat</span>
            </button>

            {/* Top-Right: Kiss */}
            <button
              type="button"
              onClick={onKiss}
              disabled={kissOnCooldown}
              className={`w-12 h-12 rounded-2xl border transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-lg cursor-pointer ${
                partnerNearForKiss && !kissOnCooldown
                  ? 'border-[#E17A8C] bg-[#B85D6E]/85 text-white'
                  : 'border-white/18 bg-[#141115]/68 text-[#FAF6F0]/75'
              } disabled:opacity-45`}
              title="Kiss (K)"
              aria-label="Kiss interaction"
            >
              <Heart className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none tracking-wide">Kiss</span>
            </button>

            {/* Bottom-Left: Interact / Use */}
            <button
              type="button"
              onClick={onInteract}
              className={`w-14 h-14 rounded-2xl border transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-lg cursor-pointer ${
                nearestPrompt
                  ? 'border-[#F2D091] bg-[#D4A55D]/90 text-[#141115]'
                  : 'border-white/18 bg-[#141115]/68 text-[#FAF6F0]/80'
              }`}
              title="Interact (E)"
              aria-label="Interact"
            >
              <Hand className="w-5 h-5" />
              <span className="text-[10px] font-semibold leading-none tracking-wide">Use</span>
            </button>

            {/* Bottom-Right: Jump (always on mobile/tablet, compact icon on desktop) */}
            {showMobilePad ? (
              <button
                type="button"
                onClick={onJump}
                className="w-14 h-14 rounded-2xl border border-white/22 bg-[#141115]/68 text-[#FAF6F0] active:scale-95 transition-transform flex flex-col items-center justify-center gap-0.5 shadow-lg cursor-pointer"
                aria-label="Jump"
              >
                <ArrowUp className="w-5 h-5" />
                <span className="text-[10px] font-semibold leading-none tracking-wide">Jump</span>
              </button>
            ) : (
              <div className="w-14 h-14 flex items-center justify-center text-[10px] text-[#FAF6F0]/45 text-center leading-tight pointer-events-none">
                Space
                <br />
                Jump
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
