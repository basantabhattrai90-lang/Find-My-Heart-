import { deleteApp, FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { FirebaseWebConfig, loadStoredFirebaseConfig } from '../utils/settings';

/**
 * Placeholder configuration. Replace via Vite environment variables (.env)
 * OR via the in-app Firebase Connection drawer in Settings.
 */
export const PLACEHOLDER_FIREBASE_CONFIG: FirebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_FIREBASE_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

export const FIREBASE_DATABASE_RULES_JSON = `{
  "rules": {
    ".read": false,
    ".write": false,
    "rooms": {
      "$roomCode": {
        ".read": "auth != null && $roomCode.matches(/^[A-Z0-9]{6}$/) && (!data.exists() || data.child('players/' + auth.uid).exists() || data.child('meta/playerCount').val() < 2)",
        ".write": "auth != null && $roomCode.matches(/^[A-Z0-9]{6}$/) && ((!data.exists() && newData.child('meta/hostUid').val() === auth.uid && newData.child('meta/playerCount').val() === 1 && newData.child('players/' + auth.uid).exists()) || (data.exists() && !newData.exists() && data.child('meta/hostUid').val() === auth.uid && data.child('meta/playerCount').val() <= 1))",
        "meta": {
          ".write": "auth != null && $roomCode.matches(/^[A-Z0-9]{6}$/) && ((!data.exists() && newData.child('hostUid').val() === auth.uid) || data.parent().child('players/' + auth.uid).exists() || (data.exists() && data.child('playerCount').val() < 2 && newData.child('hostUid').val() === data.child('hostUid').val()))",
          ".validate": "newData.val() === null || (newData.hasChildren(['hostUid', 'createdAt', 'playerCount']) && newData.child('playerCount').isNumber() && newData.child('playerCount').val() >= 0 && newData.child('playerCount').val() <= 2)"
        },
        "players": {
          "$uid": {
            ".write": "auth != null && auth.uid === $uid && (data.exists() || !data.parent().parent().child('meta/playerCount').exists() || data.parent().parent().child('meta/playerCount').val() < 2)",
            ".validate": "newData.val() === null || (newData.hasChildren(['name', 'x', 'y', 'z', 'ry', 'anim', 'online']) && newData.child('name').isString() && newData.child('name').val().length >= 1 && newData.child('name').val().length <= 24)"
          }
        },
        "chat": {
          "$msgId": {
            ".write": "auth != null && data.parent().parent().child('players/' + auth.uid).exists()",
            ".validate": "newData.hasChildren(['uid', 'name', 'text', 'ts']) && newData.child('uid').val() === auth.uid && newData.child('text').isString() && newData.child('text').val().length >= 1 && newData.child('text').val().length <= 200"
          }
        },
        "doors": {
          "$doorId": {
            ".write": "auth != null && data.parent().parent().child('players/' + auth.uid).exists()",
            ".validate": "newData.hasChildren(['open', 'updatedBy']) && newData.child('open').isBoolean()"
          }
        },
        "interactions": {
          "$objId": {
            ".write": "auth != null && data.parent().parent().child('players/' + auth.uid).exists()",
            ".validate": "newData.hasChildren(['active', 'updatedBy']) && newData.child('active').isBoolean()"
          }
        },
        "kiss": {
          ".write": "auth != null && data.parent().child('players/' + auth.uid).exists()",
          ".validate": "newData.hasChildren(['status', 'initiatorUid', 'ts']) && (newData.child('status').val() === 'idle' || newData.child('status').val() === 'pending' || newData.child('status').val() === 'accepted' || newData.child('status').val() === 'declined')"
        },
        "proposal": {
          ".write": "auth != null && data.parent().child('players/' + auth.uid).exists()",
          ".validate": "newData.hasChildren(['unlocked', 'triggered', 'response'])"
        }
      }
    }
  }
}`;

function normalizeConfig(cfg: FirebaseWebConfig): FirebaseWebConfig {
  const projectId = cfg.projectId.trim();
  return {
    ...cfg,
    apiKey: cfg.apiKey.trim(),
    authDomain: (cfg.authDomain || `${projectId}.firebaseapp.com`).trim(),
    databaseURL: cfg.databaseURL.trim().replace(/\/+$/, ''),
    projectId,
    storageBucket: (cfg.storageBucket || '').trim(),
    messagingSenderId: (cfg.messagingSenderId || '').trim(),
    appId: cfg.appId.trim(),
  };
}

function isValidConfig(cfg: FirebaseWebConfig | null): cfg is FirebaseWebConfig {
  if (!cfg) return false;
  const values = [cfg.apiKey, cfg.databaseURL, cfg.projectId, cfg.appId];
  return (
    values.every(
      (v) =>
        typeof v === 'string' &&
        v.trim().length > 6 &&
        !v.includes('YOUR_') &&
        !v.includes('MY_') &&
        !v.includes('PLACEHOLDER')
    ) && cfg.databaseURL.trim().startsWith('https://')
  );
}

export function getActiveFirebaseConfig(): FirebaseWebConfig | null {
  const stored = loadStoredFirebaseConfig();
  if (isValidConfig(stored)) return normalizeConfig(stored);
  if (isValidConfig(PLACEHOLDER_FIREBASE_CONFIG)) return normalizeConfig(PLACEHOLDER_FIREBASE_CONFIG);
  return null;
}

export function isFirebaseConfigured(): boolean {
  return getActiveFirebaseConfig() !== null;
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Database | null = null;
let cachedKey: string | null = null;

export function getFirebaseServices(): { app: FirebaseApp; auth: Auth; db: Database } | null {
  const cfg = getActiveFirebaseConfig();
  if (!cfg) return null;

  const configKey = `${cfg.apiKey}|${cfg.projectId}|${cfg.databaseURL}|${cfg.appId}`;

  try {
    if (cachedApp && cachedKey !== configKey) {
      const oldApp = cachedApp;
      cachedApp = null;
      cachedAuth = null;
      cachedDb = null;
      deleteApp(oldApp).catch(() => {});
    }

    if (!cachedApp) {
      const existing = getApps();
      const matched = existing.find(
        (a) =>
          a.options.apiKey === cfg.apiKey &&
          a.options.databaseURL === cfg.databaseURL &&
          a.options.projectId === cfg.projectId
      );
      cachedApp = matched || initializeApp(cfg, existing.length > 0 ? `fmh_${Date.now()}` : undefined);
      cachedKey = configKey;
    }
    if (!cachedAuth) {
      cachedAuth = getAuth(cachedApp);
    }
    if (!cachedDb) {
      cachedDb = getDatabase(cachedApp, cfg.databaseURL);
    }
    return { app: cachedApp, auth: cachedAuth, db: cachedDb };
  } catch (err) {
    console.warn('Firebase initialization failed:', err);
    return null;
  }
}

export function resetFirebaseCache(): void {
  const oldApp = cachedApp;
  cachedApp = null;
  cachedAuth = null;
  cachedDb = null;
  cachedKey = null;
  if (oldApp) {
    deleteApp(oldApp).catch(() => {});
  }
}
