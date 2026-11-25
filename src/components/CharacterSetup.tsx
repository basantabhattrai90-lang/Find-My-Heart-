import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ArrowLeft, Check } from 'lucide-react';
import { buildStylizedCharacter, CharacterRig } from '../game/character/CharacterBuilder';
import { CharacterAnimator } from '../game/character/CharacterAnimator';
import { CharacterAppearance, HairStyleId, OutfitId } from '../types/game';
import { HAIR_COLORS, OUTFIT_COLORS, PlayerProfile, SKIN_TONES } from '../utils/settings';

interface CharacterSetupProps {
  initialProfile: PlayerProfile;
  modeLabel: string;
  submitLabel: string;
  isBusy?: boolean;
  errorMsg?: string | null;
  onBack: () => void;
  onConfirm: (profile: PlayerProfile) => void;
}

const HAIR_STYLES: Array<{ id: HairStyleId; label: string }> = [
  { id: 'classic_part', label: 'Classic Part' },
  { id: 'tousled_crop', label: 'Tousled Crop' },
  { id: 'soft_waves', label: 'Soft Waves' },
  { id: 'shoulder_bob', label: 'Shoulder Bob' },
  { id: 'low_bun', label: 'Sleek Bun' },
];

const OUTFITS: Array<{ id: OutfitId; label: string }> = [
  { id: 'blazer', label: 'Tailored Blazer' },
  { id: 'evening', label: 'Evening Attire' },
  { id: 'sweater', label: 'Cozy Knit' },
  { id: 'coat', label: 'Classic Coat' },
];

export const CharacterSetup: React.FC<CharacterSetupProps> = ({
  initialProfile,
  modeLabel,
  submitLabel,
  isBusy = false,
  errorMsg = null,
  onBack,
  onConfirm,
}) => {
  const [name, setName] = useState(initialProfile.name);
  const [appearance, setAppearance] = useState<CharacterAppearance>(initialProfile.appearance);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      40,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.1,
      20
    );
    camera.position.set(0, 1.15, 3.05);
    camera.lookAt(0, 0.92, 0);

    scene.add(new THREE.HemisphereLight(0xf6eadc, 0x3b2d34, 1.0));
    const key = new THREE.DirectionalLight(0xffe0bd, 1.4);
    key.position.set(2.5, 4, 3.5);
    scene.add(key);

    // Subtle pedestal disc
    const pedGeo = new THREE.CylinderGeometry(0.65, 0.72, 0.08, 28);
    const pedMat = new THREE.MeshStandardMaterial({ color: '#2B2228', roughness: 0.4, metalness: 0.2 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.04;
    scene.add(ped);

    const animator = new CharacterAnimator();
    let frameId = 0;
    let last = performance.now();
    let elapsed = 0;

    const onResize = () => {
      if (!container) return;
      camera.aspect = Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      if (rigRef.current) {
        rigRef.current.root.rotation.y = elapsed * 0.55;
        animator.update(rigRef.current, 'idle', 0, dt, elapsed);
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      rigRef.current?.dispose();
      envTex.dispose();
      pedGeo.dispose();
      pedMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rigRef.current) {
      scene.remove(rigRef.current.root);
      rigRef.current.dispose();
    }
    const rig = buildStylizedCharacter(appearance);
    rigRef.current = rig;
    scene.add(rig.root);
  }, [appearance]);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      name: name.trim().slice(0, 24) || 'Traveler',
      appearance,
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#141115]/92 p-3 sm:p-6 safe-top safe-bottom">
      <div className="w-full max-w-4xl max-h-[94vh] overflow-hidden rounded-3xl border border-white/12 bg-[#1B161C] shadow-2xl flex flex-col md:flex-row">
        {/* Left: Live 3D Rotating Preview */}
        <div className="relative h-56 sm:h-64 md:h-auto md:w-5/12 bg-gradient-to-b from-[#271D25] to-[#161116] border-b md:border-b-0 md:border-r border-white/10">
          <div ref={previewRef} className="w-full h-full" />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#141115]/80 px-3 py-1.5 text-xs font-medium text-[#FAF6F0] hover:bg-[#231D24] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <span className="text-xs font-medium text-[#E9C992]">{modeLabel}</span>
          </div>
        </div>

        {/* Right: Customization Form */}
        <form
          onSubmit={handleConfirm}
          className="flex-1 overflow-y-auto custom-scroll p-5 sm:p-6 space-y-4"
        >
          <div className="space-y-1">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#FAF6F0]">
              Character Studio
            </h2>
            <p className="text-xs text-[#FAF6F0]/60">
              Either player can choose any character and style.
            </p>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-[#B85D6E]/50 bg-[#B85D6E]/15 px-3.5 py-2.5 text-xs text-[#F4C7D0]">
              {errorMsg}
            </div>
          )}

          {/* Name & Character Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#FAF6F0]/75 mb-1.5">Your Name</label>
              <input
                type="text"
                maxLength={24}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-white/15 bg-[#120E13] px-3.5 py-2.5 text-sm text-[#FAF6F0] outline-none focus:border-[#D4A55D]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#FAF6F0]/75 mb-1.5">Character</label>
              <div className="grid grid-cols-2 gap-2">
                {(['boy', 'girl'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setAppearance((a) => ({ ...a, gender: g }))}
                    className={`rounded-xl py-2.5 text-sm font-medium capitalize border transition-colors cursor-pointer ${
                      appearance.gender === g
                        ? 'border-[#D4A55D] bg-[#D4A55D]/20 text-[#F2D091]'
                        : 'border-white/12 bg-[#120E13] text-[#FAF6F0]/70 hover:text-[#FAF6F0]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hair Style */}
          <div>
            <label className="block text-xs font-medium text-[#FAF6F0]/75 mb-1.5">Hair Style</label>
            <div className="flex flex-wrap gap-2">
              {HAIR_STYLES.map((hs) => (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() => setAppearance((a) => ({ ...a, hairStyle: hs.id }))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                    appearance.hairStyle === hs.id
                      ? 'border-[#D4A55D] bg-[#D4A55D]/20 text-[#F2D091]'
                      : 'border-white/10 bg-[#120E13] text-[#FAF6F0]/70 hover:text-[#FAF6F0]'
                  }`}
                >
                  {hs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Color & Skin Tone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#FAF6F0]/75 mb-1.5">Hair Color</label>
              <div className="flex flex-wrap gap-2">
                {HAIR_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setAppearance((a) => ({ ...a, hairColor: c.hex }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                      appearance.hairColor === c.hex ? 'border-[#D4A55D] scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#FAF6F0]/75 mb-1.5">Skin Tone</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONES.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setAppearance((a) => ({ ...a, skinTone: c.hex }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                      appearance.skinTone === c.hex ? 'border-[#D4A55D] scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Outfit & Outfit Color */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#FAF6F0]/75 mb-1.5">Outfit</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OUTFITS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setAppearance((a) => ({ ...a, outfit: o.id }))}
                    className={`rounded-lg px-2.5 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                      appearance.outfit === o.id
                        ? 'border-[#D4A55D] bg-[#D4A55D]/20 text-[#F2D091]'
                        : 'border-white/10 bg-[#120E13] text-[#FAF6F0]/70 hover:text-[#FAF6F0]'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#FAF6F0]/75 mb-1.5">Outfit Color</label>
              <div className="flex flex-wrap gap-2">
                {OUTFIT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    onClick={() => setAppearance((a) => ({ ...a, outfitColor: c.hex }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                      appearance.outfitColor === c.hex ? 'border-[#D4A55D] scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#C86475] to-[#D4A55D] py-3 text-sm font-semibold text-[#141115] hover:brightness-105 disabled:opacity-60 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {isBusy ? 'Connecting...' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
};
