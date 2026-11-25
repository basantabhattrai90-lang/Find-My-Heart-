import { CharacterAppearance, GameSettings, GraphicsQuality } from '../types/game';

const SETTINGS_KEY = 'fmh_settings_v1';
const PROFILE_KEY = 'fmh_player_profile_v1';
const FIREBASE_OVERRIDE_KEY = 'fmh_firebase_config_v1';

export interface PlayerProfile {
  name: string;
  appearance: CharacterAppearance;
}

export function detectDefaultQuality(): GraphicsQuality {
  if (typeof navigator === 'undefined') return 'medium';
  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isMobile) {
    return cores >= 6 ? 'medium' : 'low';
  }
  return cores >= 6 ? 'high' : 'medium';
}

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.45,
  sfxVolume: 0.65,
  cameraSensitivity: 1.0,
  graphicsQuality: detectDefaultQuality(),
  shadowsEnabled: !/android|iphone|ipad|ipod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
  particlesEnabled: true,
  showFps: false,
  showControls: true,
  herName: 'MY LOVE',
  proposalMessage: 'I made this little world for you. I hope it gave you a smile and a memory you can keep. ❤️',
};

export const DEFAULT_PROFILE: PlayerProfile = {
  name: 'Alex',
  appearance: {
    gender: 'boy',
    hairStyle: 'classic_part',
    hairColor: '#2B1F1B',
    skinTone: '#DFB395',
    outfit: 'blazer',
    outfitColor: '#2B3648',
  },
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      musicVolume: clampNum(parsed.musicVolume, 0, 1, DEFAULT_SETTINGS.musicVolume),
      sfxVolume: clampNum(parsed.sfxVolume, 0, 1, DEFAULT_SETTINGS.sfxVolume),
      cameraSensitivity: clampNum(parsed.cameraSensitivity, 0.3, 2.5, DEFAULT_SETTINGS.cameraSensitivity),
      herName: typeof parsed.herName === 'string' && parsed.herName.trim() ? parsed.herName.slice(0, 32) : DEFAULT_SETTINGS.herName,
      proposalMessage:
        typeof parsed.proposalMessage === 'string' && parsed.proposalMessage.trim()
          ? parsed.proposalMessage.slice(0, 260)
          : DEFAULT_SETTINGS.proposalMessage,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetSettings(): GameSettings {
  const fresh = { ...DEFAULT_SETTINGS };
  saveSettings(fresh);
  return fresh;
}

export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE, appearance: { ...DEFAULT_PROFILE.appearance } };
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.slice(0, 24) : DEFAULT_PROFILE.name,
      appearance: {
        ...DEFAULT_PROFILE.appearance,
        ...(parsed.appearance || {}),
      },
    };
  } catch {
    return { ...DEFAULT_PROFILE, appearance: { ...DEFAULT_PROFILE.appearance } };
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export function loadStoredFirebaseConfig(): FirebaseWebConfig | null {
  try {
    const raw = localStorage.getItem(FIREBASE_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirebaseWebConfig>;
    if (parsed.apiKey && parsed.databaseURL && parsed.projectId && parsed.appId) {
      return {
        apiKey: String(parsed.apiKey).trim(),
        authDomain: String(parsed.authDomain || `${parsed.projectId}.firebaseapp.com`).trim(),
        databaseURL: String(parsed.databaseURL).trim(),
        projectId: String(parsed.projectId).trim(),
        storageBucket: parsed.storageBucket ? String(parsed.storageBucket).trim() : '',
        messagingSenderId: parsed.messagingSenderId ? String(parsed.messagingSenderId).trim() : '',
        appId: String(parsed.appId).trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredFirebaseConfig(config: FirebaseWebConfig | null): void {
  try {
    if (!config) {
      localStorage.removeItem(FIREBASE_OVERRIDE_KEY);
    } else {
      localStorage.setItem(FIREBASE_OVERRIDE_KEY, JSON.stringify(config));
    }
  } catch {
    // Ignore
  }
}

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || Number.isNaN(val)) return fallback;
  return Math.min(max, Math.max(min, val));
}

export const HAIR_COLORS = [
  { name: 'Espresso', hex: '#2B1F1B' },
  { name: 'Chestnut', hex: '#5A3828' },
  { name: 'Golden', hex: '#C69958' },
  { name: 'Auburn', hex: '#7A3528' },
  { name: 'Raven', hex: '#17171B' },
  { name: 'Ash Silver', hex: '#9A969C' },
];

export const SKIN_TONES = [
  { name: 'Porcelain', hex: '#F3D2C1' },
  { name: 'Warm Ivory', hex: '#E8BC9F' },
  { name: 'Honey', hex: '#DFB395' },
  { name: 'Golden Olive', hex: '#C6916E' },
  { name: 'Caramel', hex: '#9E6B4B' },
  { name: 'Deep Umber', hex: '#68422E' },
];

export const OUTFIT_COLORS = [
  { name: 'Midnight Navy', hex: '#2B3648' },
  { name: 'Crimson Rose', hex: '#9D2A3F' },
  { name: 'Champagne Ivory', hex: '#E8DCCB' },
  { name: 'Sage Velvet', hex: '#4C6458' },
  { name: 'Charcoal', hex: '#29282C' },
  { name: 'Dusty Blush', hex: '#B97A82' },
];
