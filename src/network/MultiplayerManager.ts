import { signInAnonymously } from 'firebase/auth';
import {
  DatabaseReference,
  get,
  off,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase/config';
import {
  AnimationState,
  CharacterAppearance,
  ChatMessage,
  ConnectionMode,
  KissState,
  PlayerSyncState,
  ProposalResponse,
  ProposalState,
} from '../types/game';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function sanitizeChatText(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 200);
}

export interface MultiplayerCallbacks {
  onStatusChange: (mode: ConnectionMode, errorMsg?: string) => void;
  onRemotePlayerUpdate: (player: PlayerSyncState | null) => void;
  onChatMessages: (messages: ChatMessage[]) => void;
  onDoorsUpdate: (doors: Record<string, boolean>) => void;
  onInteractionsUpdate: (interactions: Record<string, boolean>) => void;
  onKissUpdate: (kiss: KissState) => void;
  onProposalUpdate: (proposal: ProposalState) => void;
}

export interface FirebasePermissionDiagnostic {
  operation: 'read' | 'write' | 'update' | 'transaction' | 'listen' | 'remove';
  path: string;
  uid: string | null;
  databaseURL?: string;
  projectId?: string;
  rawError: string;
}

function logPermissionDeniedDiagnostic(
  err: unknown,
  operation: FirebasePermissionDiagnostic['operation'],
  path: string,
  uid: string | null
): void {
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();
  if (!lower.includes('permission_denied') && !lower.includes('permission denied')) {
    return;
  }
  const services = getFirebaseServices();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const resolvedUid = uid ?? services?.auth.currentUser?.uid ?? null;
  const details: FirebasePermissionDiagnostic = {
    operation,
    path: normalizedPath,
    uid: resolvedUid,
    databaseURL: services?.app.options.databaseURL,
    projectId: services?.app.options.projectId,
    rawError: raw,
  };
  console.error(
    `[Firebase Diagnostic] permission_denied during ${operation.toUpperCase()} at "${normalizedPath}" | auth.uid=${resolvedUid ?? 'null'}`,
    details
  );
}

function formatFirebaseError(
  err: unknown,
  stage: string,
  operation: FirebasePermissionDiagnostic['operation'] = 'write',
  path = stage,
  uid: string | null = null
): string {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown Firebase error');
  const lower = raw.toLowerCase();
  if (lower.includes('auth/operation-not-allowed')) {
    return 'Anonymous sign-in is disabled. Enable Anonymous under Firebase Console → Authentication → Sign-in method.';
  }
  if (lower.includes('auth/invalid-api-key') || lower.includes('api-key-not-valid')) {
    return 'Invalid Firebase API Key. Double-check your firebaseConfig in Settings or .env.';
  }
  if (lower.includes('permission_denied') || lower.includes('permission denied')) {
    logPermissionDeniedDiagnostic(err, operation, path, uid);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `Firebase Realtime Database permission denied (${stage} at ${normalizedPath}, uid=${uid ?? 'unknown'}). Paste the latest database.rules.json into Firebase Console → Realtime Database → Rules and click Publish.`;
  }
  return raw;
}

export async function testFirebaseConnection(): Promise<{ ok: boolean; details: string }> {
  const services = getFirebaseServices();
  if (!services) {
    return { ok: false, details: 'Firebase config is missing or incomplete.' };
  }

  let testCode = '';
  let uid = '';
  try {
    const cred = await signInAnonymously(services.auth);
    uid = cred.user.uid;
    await cred.user.getIdToken();
    console.info('[Firebase Diagnostic] Authenticated anonymously', {
      uid,
      databaseURL: services.app.options.databaseURL,
      projectId: services.app.options.projectId,
    });
  } catch (err) {
    return { ok: false, details: formatFirebaseError(err, 'Anonymous Auth', 'read', '/auth', null) };
  }

  let currentPath = '';
  let currentOp: FirebasePermissionDiagnostic['operation'] = 'read';
  let currentStage = 'Read /rooms';

  try {
    testCode = `T${generateRoomCode().slice(0, 5)}`;
    currentPath = `/rooms/${testCode}/meta`;
    currentOp = 'read';
    currentStage = 'Read room slot';
    const existing = await get(ref(services.db, `rooms/${testCode}/meta`));
    if (existing.exists()) {
      testCode = `Z${generateRoomCode().slice(0, 5)}`;
      currentPath = `/rooms/${testCode}/meta`;
      await get(ref(services.db, `rooms/${testCode}/meta`));
    }
  } catch (err) {
    return { ok: false, details: formatFirebaseError(err, currentStage, currentOp, currentPath, uid) };
  }

  const playerPath = `/rooms/${testCode}/players/${uid}`;
  const metaPath = `/rooms/${testCode}/meta`;
  const kissPath = `/rooms/${testCode}/kiss`;
  const propPath = `/rooms/${testCode}/proposal`;
  const doorPath = `/rooms/${testCode}/doors/diag_door`;
  const interactionPath = `/rooms/${testCode}/interactions/diag_obj`;
  const chatPath = `/rooms/${testCode}/chat`;

  const playerRef = ref(services.db, playerPath.slice(1));
  const metaRef = ref(services.db, metaPath.slice(1));
  const kissRef = ref(services.db, kissPath.slice(1));
  const propRef = ref(services.db, propPath.slice(1));
  const doorRef = ref(services.db, doorPath.slice(1));
  const interactionRef = ref(services.db, interactionPath.slice(1));
  const chatRef = ref(services.db, chatPath.slice(1));
  const roomRef = ref(services.db, `rooms/${testCode}`);

  try {
    currentOp = 'write';
    currentPath = playerPath;
    currentStage = 'Write player node';
    await set(playerRef, {
      uid,
      name: 'ConnectionTest',
      x: 0,
      y: 0,
      z: 0,
      ry: 0,
      anim: 'idle',
      speed: 0,
      online: true,
      lastSeen: Date.now(),
    });

    currentPath = metaPath;
    currentStage = 'Write room metadata';
    await set(metaRef, {
      hostUid: uid,
      createdAt: serverTimestamp(),
      playerCount: 1,
    });

    currentPath = kissPath;
    currentStage = 'Write kiss state';
    await set(kissRef, {
      status: 'idle',
      initiatorUid: '',
      targetUid: '',
      ts: Date.now(),
    });

    currentPath = propPath;
    currentStage = 'Write proposal state';
    await set(propRef, {
      unlocked: false,
      triggered: false,
      response: 'none',
      herName: 'TEST',
    });

    currentPath = doorPath;
    currentStage = 'Write door state';
    await set(doorRef, {
      open: true,
      updatedBy: uid,
    });

    currentPath = interactionPath;
    currentStage = 'Write interaction state';
    await set(interactionRef, {
      active: true,
      updatedBy: uid,
    });

    const msgRef = push(chatRef);
    currentPath = `${chatPath}/${msgRef.key || 'diag_msg'}`;
    currentStage = 'Write chat message';
    await set(msgRef, {
      uid,
      name: 'ConnectionTest',
      text: 'Diagnostic check',
      ts: Date.now(),
    });

    console.info('[Firebase Diagnostic] All room hierarchy paths verified', {
      uid,
      roomCode: testCode,
      pathsChecked: [
        playerPath,
        metaPath,
        kissPath,
        propPath,
        doorPath,
        interactionPath,
        currentPath,
      ],
    });

    // Clean up test room
    await remove(roomRef).catch(async () => {
      await remove(playerRef).catch(() => {});
    });

    return {
      ok: true,
      details: `All room paths verified for uid=${uid}! Ready for 2-player rooms.`,
    };
  } catch (err) {
    await remove(roomRef).catch(async () => {
      await remove(playerRef).catch(() => {});
    });
    return {
      ok: false,
      details: formatFirebaseError(err, currentStage, currentOp, currentPath, uid),
    };
  }
}

export class MultiplayerManager {
  private roomCode: string | null = null;
  private localUid = 'local_player';
  private isHost = false;
  private mode: ConnectionMode = isFirebaseConfigured() ? 'disconnected' : 'unconfigured';
  private callbacks: MultiplayerCallbacks;
  private unsubscribers: Array<() => void> = [];
  private lastTransformPush = 0;
  private lastSentState: { x: number; y: number; z: number; ry: number; anim: AnimationState } | null = null;
  private lastChatSentAt = 0;

  // Local preview state (only active in explicit Local Preview Mode)
  private localPartnerEnabled = false;
  private localPartnerState: PlayerSyncState | null = null;
  private localDoors: Record<string, boolean> = {};
  private localInteractions: Record<string, boolean> = {};
  private localChat: ChatMessage[] = [];
  private localKiss: KissState = { status: 'idle', initiatorUid: '', targetUid: '', ts: 0 };
  private localProposal: ProposalState = {
    unlocked: false,
    triggered: false,
    response: 'none',
    herName: 'MY LOVE',
  };

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public getUid(): string {
    return this.localUid;
  }

  public getRoomCode(): string | null {
    return this.roomCode;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  public getMode(): ConnectionMode {
    return this.mode;
  }

  public isLocalPreview(): boolean {
    return this.mode === 'local_preview';
  }

  private setMode(mode: ConnectionMode, err?: string): void {
    this.mode = mode;
    this.callbacks.onStatusChange(mode, err);
  }

  public startLocalPreview(
    name: string,
    appearance: CharacterAppearance,
    herName: string,
    withPreviewCompanion: boolean
  ): void {
    this.cleanupListeners();
    this.localUid = 'local_preview_user';
    this.roomCode = 'LOCAL';
    this.isHost = true;
    this.localPartnerEnabled = withPreviewCompanion;
    this.localDoors = {};
    this.localInteractions = {};
    this.localChat = [];
    this.localKiss = { status: 'idle', initiatorUid: '', targetUid: '', ts: 0 };
    this.localProposal = { unlocked: false, triggered: false, response: 'none', herName };

    if (withPreviewCompanion) {
      this.localPartnerState = {
        uid: 'local_preview_partner',
        name: appearance.gender === 'boy' ? 'Elena (Preview)' : 'Julian (Preview)',
        appearance: {
          gender: appearance.gender === 'boy' ? 'girl' : 'boy',
          hairStyle: appearance.gender === 'boy' ? 'soft_waves' : 'classic_part',
          hairColor: '#5A3828',
          skinTone: '#E8BC9F',
          outfit: 'evening',
          outfitColor: '#9D2A3F',
        },
        x: 1.35,
        y: 0,
        z: 7.4,
        ry: Math.PI,
        anim: 'idle',
        speed: 0,
        online: true,
        lastSeen: Date.now(),
      };
      this.callbacks.onRemotePlayerUpdate(this.localPartnerState);
    } else {
      this.localPartnerState = null;
      this.callbacks.onRemotePlayerUpdate(null);
    }

    this.callbacks.onDoorsUpdate({});
    this.callbacks.onInteractionsUpdate({});
    this.callbacks.onChatMessages([]);
    this.callbacks.onKissUpdate(this.localKiss);
    this.callbacks.onProposalUpdate(this.localProposal);
    this.setMode('local_preview');

    // Greet in local preview
    if (name) {
      this.localChat = [
        {
          id: 'welcome_local',
          uid: 'system',
          name: 'Mansion',
          text: withPreviewCompanion
            ? 'Local Preview Mode active (Offline). Your preview companion is beside you to test interactions.'
            : 'Local Preview Mode active (Offline). Explore all rooms at your own pace.',
          ts: Date.now(),
        },
      ];
      this.callbacks.onChatMessages(this.localChat);
    }
  }

  public updateLocalPreviewCompanionPosition(x: number, y: number, z: number, ry: number): void {
    if (!this.isLocalPreview() || !this.localPartnerEnabled || !this.localPartnerState) return;
    this.localPartnerState = {
      ...this.localPartnerState,
      x,
      y,
      z,
      ry,
      lastSeen: Date.now(),
    };
    this.callbacks.onRemotePlayerUpdate(this.localPartnerState);
  }

  public async createOnlineRoom(
    name: string,
    appearance: CharacterAppearance,
    herName: string
  ): Promise<string> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase is not configured. Configure Firebase credentials or launch Local Preview Mode.');
    }

    this.setMode('connecting');
    let stage = 'Anonymous Auth';
    let currentOp: FirebasePermissionDiagnostic['operation'] = 'read';
    let currentPath = '/auth';
    try {
      const cred = await signInAnonymously(services.auth);
      await cred.user.getIdToken();
      this.localUid = cred.user.uid;

      stage = 'Room code lookup';
      currentOp = 'read';
      let code = generateRoomCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        currentPath = `/rooms/${code}/meta`;
        const existing = await get(ref(services.db, `rooms/${code}/meta`));
        if (!existing.exists()) break;
        code = generateRoomCode();
      }

      const initialPlayer: PlayerSyncState = {
        uid: this.localUid,
        name: name.trim().slice(0, 24) || 'Player 1',
        appearance,
        x: -1.35,
        y: 0,
        z: 7.4,
        ry: Math.PI,
        anim: 'idle',
        speed: 0,
        online: true,
        lastSeen: Date.now(),
      };

      const playerRef = ref(services.db, `rooms/${code}/players/${this.localUid}`);
      const metaRef = ref(services.db, `rooms/${code}/meta`);
      const kissRef = ref(services.db, `rooms/${code}/kiss`);
      const proposalRef = ref(services.db, `rooms/${code}/proposal`);

      // Ordered child writes satisfy both granular rules and strict parent-existence checks
      currentOp = 'write';
      currentPath = `/rooms/${code}/players/${this.localUid}`;
      stage = 'Create player slot';
      await set(playerRef, initialPlayer);

      try {
        currentPath = `/rooms/${code}/meta`;
        stage = 'Create room metadata';
        await set(metaRef, {
          hostUid: this.localUid,
          createdAt: serverTimestamp(),
          playerCount: 1,
        });

        currentPath = `/rooms/${code}/kiss`;
        stage = 'Initialize kiss state';
        await set(kissRef, {
          status: 'idle',
          initiatorUid: '',
          targetUid: '',
          ts: Date.now(),
        });

        currentPath = `/rooms/${code}/proposal`;
        stage = 'Initialize proposal state';
        await set(proposalRef, {
          unlocked: false,
          triggered: false,
          response: 'none',
          herName: herName.trim().slice(0, 32) || 'MY LOVE',
        });
      } catch (childErr) {
        await remove(playerRef).catch(() => {});
        throw childErr;
      }

      this.roomCode = code;
      this.isHost = true;
      this.attachRoomListeners(code);
      this.setMode('connected');
      return code;
    } catch (err) {
      const msg = formatFirebaseError(err, stage, currentOp, currentPath, this.localUid);
      this.setMode('error', msg);
      throw new Error(msg);
    }
  }

  public async joinOnlineRoom(
    rawCode: string,
    name: string,
    appearance: CharacterAppearance
  ): Promise<string> {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase is not configured. Configure Firebase credentials or launch Local Preview Mode.');
    }

    const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) {
      throw new Error('Please enter a valid 6-character room code.');
    }

    this.setMode('connecting');
    let stage = 'Anonymous Auth';
    let currentOp: FirebasePermissionDiagnostic['operation'] = 'read';
    let currentPath = '/auth';
    try {
      const cred = await signInAnonymously(services.auth);
      await cred.user.getIdToken();
      this.localUid = cred.user.uid;

      currentOp = 'read';
      currentPath = `/rooms/${code}/meta`;
      stage = 'Read room metadata';
      const metaRef = ref(services.db, `rooms/${code}/meta`);
      const metaSnap = await get(metaRef);
      if (!metaSnap.exists()) {
        throw new Error(`Room "${code}" does not exist or has expired.`);
      }

      currentPath = `/rooms/${code}/players`;
      stage = 'Read room players';
      const playersSnap = await get(ref(services.db, `rooms/${code}/players`));
      const existingPlayers = (playersSnap.val() || {}) as Record<string, PlayerSyncState>;
      const alreadyInRoom = Boolean(existingPlayers[this.localUid]);
      const otherIds = Object.keys(existingPlayers).filter((id) => id !== this.localUid);

      if (!alreadyInRoom && otherIds.length >= 2) {
        throw new Error('This private room already has 2 players.');
      }

      const spawnX = otherIds.length > 0 ? 1.35 : -1.35;
      const playerState: PlayerSyncState = {
        uid: this.localUid,
        name: name.trim().slice(0, 24) || 'Player 2',
        appearance,
        x: spawnX,
        y: 0,
        z: 7.4,
        ry: Math.PI,
        anim: 'idle',
        speed: 0,
        online: true,
        lastSeen: Date.now(),
      };

      currentOp = 'write';
      currentPath = `/rooms/${code}/players/${this.localUid}`;
      stage = 'Write player slot';
      const playerRef = ref(services.db, `rooms/${code}/players/${this.localUid}`);
      await set(playerRef, playerState);

      if (!alreadyInRoom) {
        currentOp = 'transaction';
        currentPath = `/rooms/${code}/meta/playerCount`;
        stage = 'Update player count';
        const txResult = await runTransaction(ref(services.db, `rooms/${code}/meta/playerCount`), (current) => {
          const count = typeof current === 'number' ? current : 0;
          if (count >= 2) return undefined; // abort
          return count + 1;
        });
        if (!txResult.committed) {
          await remove(playerRef).catch(() => {});
          throw new Error('This private room is already full (2/2 players).');
        }
      }

      const metaVal = metaSnap.val() as { hostUid?: string };
      this.roomCode = code;
      this.isHost = metaVal.hostUid === this.localUid;
      this.attachRoomListeners(code);
      this.setMode('connected');
      return code;
    } catch (err) {
      const msg = formatFirebaseError(err, stage, currentOp, currentPath, this.localUid);
      this.setMode('error', msg);
      throw new Error(msg);
    }
  }

  private attachRoomListeners(code: string): void {
    this.cleanupListeners();
    const services = getFirebaseServices();
    if (!services) return;
    const { db } = services;

    const handleListenerErr = (listenPath: string) => (err: Error) => {
      this.setMode('error', formatFirebaseError(err, 'Room listener', 'listen', listenPath, this.localUid));
    };

    // Presence & reconnect handler
    const connectedRef = ref(db, '.info/connected');
    const playerPath = `/rooms/${code}/players/${this.localUid}`;
    const playerRef = ref(db, playerPath.slice(1));
    const unsubConn = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(playerRef)
          .update({ online: false, lastSeen: Date.now() })
          .catch((err) => logPermissionDeniedDiagnostic(err, 'update', playerPath, this.localUid));
        update(playerRef, { online: true, lastSeen: Date.now() }).catch((err) =>
          logPermissionDeniedDiagnostic(err, 'update', playerPath, this.localUid)
        );
        this.setMode('connected');
      } else if (this.roomCode) {
        this.setMode('reconnecting');
      }
    });
    this.unsubscribers.push(() => off(connectedRef, 'value', unsubConn));

    // Players listener
    const playersRef = ref(db, `rooms/${code}/players`);
    const unsubPlayers = onValue(
      playersRef,
      (snap) => {
        const data = (snap.val() || {}) as Record<string, PlayerSyncState>;
        const remoteEntry = Object.values(data).find((p) => p.uid !== this.localUid) || null;
        this.callbacks.onRemotePlayerUpdate(remoteEntry);
      },
      handleListenerErr(`/rooms/${code}/players`)
    );
    this.unsubscribers.push(() => off(playersRef, 'value', unsubPlayers));

    // Doors listener
    const doorsRef = ref(db, `rooms/${code}/doors`);
    const unsubDoors = onValue(
      doorsRef,
      (snap) => {
        const val = (snap.val() || {}) as Record<string, { open: boolean }>;
        const mapped: Record<string, boolean> = {};
        Object.entries(val).forEach(([k, v]) => {
          mapped[k] = Boolean(v?.open);
        });
        this.callbacks.onDoorsUpdate(mapped);
      },
      handleListenerErr(`/rooms/${code}/doors`)
    );
    this.unsubscribers.push(() => off(doorsRef, 'value', unsubDoors));

    // Interactions listener
    const intRef = ref(db, `rooms/${code}/interactions`);
    const unsubInt = onValue(
      intRef,
      (snap) => {
        const val = (snap.val() || {}) as Record<string, { active: boolean }>;
        const mapped: Record<string, boolean> = {};
        Object.entries(val).forEach(([k, v]) => {
          mapped[k] = Boolean(v?.active);
        });
        this.callbacks.onInteractionsUpdate(mapped);
      },
      handleListenerErr(`/rooms/${code}/interactions`)
    );
    this.unsubscribers.push(() => off(intRef, 'value', unsubInt));

    // Chat listener
    const chatRef = ref(db, `rooms/${code}/chat`);
    const unsubChat = onValue(
      chatRef,
      (snap) => {
        const val = (snap.val() || {}) as Record<string, Omit<ChatMessage, 'id'>>;
        const list: ChatMessage[] = Object.entries(val)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => a.ts - b.ts)
          .slice(-40);
        this.callbacks.onChatMessages(list);
      },
      handleListenerErr(`/rooms/${code}/chat`)
    );
    this.unsubscribers.push(() => off(chatRef, 'value', unsubChat));

    // Kiss listener
    const kissRef = ref(db, `rooms/${code}/kiss`);
    const unsubKiss = onValue(
      kissRef,
      (snap) => {
        const val = snap.val() as KissState | null;
        if (val) this.callbacks.onKissUpdate(val);
      },
      handleListenerErr(`/rooms/${code}/kiss`)
    );
    this.unsubscribers.push(() => off(kissRef, 'value', unsubKiss));

    // Proposal listener
    const propRef = ref(db, `rooms/${code}/proposal`);
    const unsubProp = onValue(
      propRef,
      (snap) => {
        const val = snap.val() as ProposalState | null;
        if (val) this.callbacks.onProposalUpdate(val);
      },
      handleListenerErr(`/rooms/${code}/proposal`)
    );
    this.unsubscribers.push(() => off(propRef, 'value', unsubProp));
  }

  public sendPlayerTransform(
    x: number,
    y: number,
    z: number,
    ry: number,
    anim: AnimationState,
    speed: number
  ): void {
    if (this.isLocalPreview() || !this.roomCode) return;
    const now = performance.now();
    if (now - this.lastTransformPush < 70) return;

    const prev = this.lastSentState;
    if (
      prev &&
      Math.abs(prev.x - x) < 0.012 &&
      Math.abs(prev.y - y) < 0.012 &&
      Math.abs(prev.z - z) < 0.012 &&
      Math.abs(prev.ry - ry) < 0.025 &&
      prev.anim === anim
    ) {
      return;
    }

    const services = getFirebaseServices();
    if (!services) return;
    this.lastTransformPush = now;
    this.lastSentState = { x, y, z, ry, anim };

    const playerPath = `/rooms/${this.roomCode}/players/${this.localUid}`;
    const playerRef = ref(services.db, playerPath.slice(1));
    update(playerRef, {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      z: Number(z.toFixed(3)),
      ry: Number(ry.toFixed(3)),
      anim,
      speed: Number(speed.toFixed(2)),
      online: true,
      lastSeen: Date.now(),
    }).catch((err) => logPermissionDeniedDiagnostic(err, 'update', playerPath, this.localUid));
  }

  public async sendChatMessage(name: string, rawText: string): Promise<ChatMessage | null> {
    const clean = sanitizeChatText(rawText);
    if (!clean) return null;
    const now = Date.now();
    if (now - this.lastChatSentAt < 650) return null; // spam cooldown
    this.lastChatSentAt = now;

    const safeName = name.trim().slice(0, 24) || 'Player';

    if (this.isLocalPreview()) {
      const msg: ChatMessage = {
        id: `msg_${now}`,
        uid: this.localUid,
        name: safeName,
        text: clean,
        ts: now,
      };
      this.localChat = [...this.localChat.slice(-39), msg];
      this.callbacks.onChatMessages(this.localChat);
      return msg;
    }

    const services = getFirebaseServices();
    if (!services || !this.roomCode) return null;

    const chatRef: DatabaseReference = ref(services.db, `rooms/${this.roomCode}/chat`);
    const newRef = push(chatRef);
    const msgPath = `/rooms/${this.roomCode}/chat/${newRef.key || 'unknown'}`;
    const payload = {
      uid: this.localUid,
      name: safeName,
      text: clean,
      ts: now,
    };
    try {
      await set(newRef, payload);
    } catch (err) {
      logPermissionDeniedDiagnostic(err, 'write', msgPath, this.localUid);
      throw err;
    }
    return { id: newRef.key || String(now), ...payload };
  }

  public setDoorState(doorId: string, open: boolean): void {
    if (this.isLocalPreview()) {
      this.localDoors = { ...this.localDoors, [doorId]: open };
      this.callbacks.onDoorsUpdate(this.localDoors);
      return;
    }
    const services = getFirebaseServices();
    if (!services || !this.roomCode) return;
    const path = `/rooms/${this.roomCode}/doors/${doorId}`;
    set(ref(services.db, path.slice(1)), {
      open,
      updatedBy: this.localUid,
    }).catch((err) => logPermissionDeniedDiagnostic(err, 'write', path, this.localUid));
  }

  public setInteractionState(objId: string, active: boolean): void {
    if (this.isLocalPreview()) {
      this.localInteractions = { ...this.localInteractions, [objId]: active };
      this.callbacks.onInteractionsUpdate(this.localInteractions);
      return;
    }
    const services = getFirebaseServices();
    if (!services || !this.roomCode) return;
    const path = `/rooms/${this.roomCode}/interactions/${objId}`;
    set(ref(services.db, path.slice(1)), {
      active,
      updatedBy: this.localUid,
    }).catch((err) => logPermissionDeniedDiagnostic(err, 'write', path, this.localUid));
  }

  public initiateKiss(targetUid: string): void {
    const payload: KissState = {
      status: 'pending',
      initiatorUid: this.localUid,
      targetUid,
      ts: Date.now(),
    };
    if (this.isLocalPreview()) {
      this.localKiss = { ...payload, status: 'accepted' };
      this.callbacks.onKissUpdate(this.localKiss);
      return;
    }
    const services = getFirebaseServices();
    if (!services || !this.roomCode) return;
    const path = `/rooms/${this.roomCode}/kiss`;
    set(ref(services.db, path.slice(1)), payload).catch((err) =>
      logPermissionDeniedDiagnostic(err, 'write', path, this.localUid)
    );
  }

  public respondToKiss(accept: boolean): void {
    if (this.isLocalPreview()) {
      this.localKiss = { ...this.localKiss, status: accept ? 'accepted' : 'declined', ts: Date.now() };
      this.callbacks.onKissUpdate(this.localKiss);
      return;
    }
    const services = getFirebaseServices();
    if (!services || !this.roomCode) return;
    const path = `/rooms/${this.roomCode}/kiss`;
    update(ref(services.db, path.slice(1)), {
      status: accept ? 'accepted' : 'declined',
      ts: Date.now(),
    }).catch((err) => logPermissionDeniedDiagnostic(err, 'update', path, this.localUid));
  }

  public clearKiss(): void {
    if (this.isLocalPreview()) {
      this.localKiss = { status: 'idle', initiatorUid: '', targetUid: '', ts: Date.now() };
      this.callbacks.onKissUpdate(this.localKiss);
      return;
    }
    const services = getFirebaseServices();
    if (!services || !this.roomCode) return;
    const path = `/rooms/${this.roomCode}/kiss`;
    update(ref(services.db, path.slice(1)), {
      status: 'idle',
      ts: Date.now(),
    }).catch((err) => logPermissionDeniedDiagnostic(err, 'update', path, this.localUid));
  }

  public unlockSecretRoom(): void {
    if (this.isLocalPreview()) {
      this.localProposal = { ...this.localProposal, unlocked: true };
      this.callbacks.onProposalUpdate(this.localProposal);
      return;
    }
    const services = getFirebaseServices();
    if (!services || !this.roomCode) return;
    const path = `/rooms/${this.roomCode}/proposal`;
    update(ref(services.db, path.slice(1)), { unlocked: true }).catch((err) =>
      logPermissionDeniedDiagnostic(err, 'update', path, this.localUid)
    );
  }

  public triggerProposal(herName: string): void {
    if (this.isLocalPreview()) {
      this.localProposal = { ...this.localProposal, unlocked: true, triggered: true, herName };
      this.callbacks.onProposalUpdate(this.localProposal);
      return;
    }
    const services = getFirebaseServices();
    if (!services || !this.roomCode) return;
    const path = `/rooms/${this.roomCode}/proposal`;
    update(ref(services.db, path.slice(1)), {
      unlocked: true,
      triggered: true,
      herName: herName.slice(0, 32),
    }).catch((err) => logPermissionDeniedDiagnostic(err, 'update', path, this.localUid));
  }

  public setProposalResponse(response: ProposalResponse): void {
    if (this.isLocalPreview()) {
      this.localProposal = { ...this.localProposal, response };
      this.callbacks.onProposalUpdate(this.localProposal);
      return;
    }
    const services = getFirebaseServices();
    if (!services || !this.roomCode) return;
    const path = `/rooms/${this.roomCode}/proposal`;
    update(ref(services.db, path.slice(1)), { response }).catch((err) =>
      logPermissionDeniedDiagnostic(err, 'update', path, this.localUid)
    );
  }

  private cleanupListeners(): void {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
  }

  public async leaveRoom(): Promise<void> {
    this.cleanupListeners();
    if (!this.isLocalPreview() && this.roomCode) {
      const services = getFirebaseServices();
      if (services) {
        const playerPath = `/rooms/${this.roomCode}/players/${this.localUid}`;
        const countPath = `/rooms/${this.roomCode}/meta/playerCount`;
        try {
          const playerRef = ref(services.db, playerPath.slice(1));
          await onDisconnect(playerRef).cancel().catch(() => {});
          await runTransaction(ref(services.db, countPath.slice(1)), (current) => {
            const count = typeof current === 'number' ? current : 1;
            return Math.max(0, count - 1);
          }).catch((err) => logPermissionDeniedDiagnostic(err, 'transaction', countPath, this.localUid));
          await remove(playerRef).catch((err) =>
            logPermissionDeniedDiagnostic(err, 'remove', playerPath, this.localUid)
          );
        } catch (err) {
          logPermissionDeniedDiagnostic(err, 'remove', playerPath, this.localUid);
        }
      }
    }
    this.roomCode = null;
    this.lastSentState = null;
    this.setMode(isFirebaseConfigured() ? 'disconnected' : 'unconfigured');
  }
}
