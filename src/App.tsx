import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SoundEngine } from './audio/SoundEngine';
import { CharacterSetup } from './components/CharacterSetup';
import { GameHUD } from './components/GameHUD';
import { LoadingScreen } from './components/LoadingScreen';
import { LobbyModal } from './components/LobbyModal';
import { MobileControls } from './components/MobileControls';
import { ProposalOverlay } from './components/ProposalOverlay';
import { SettingsModal } from './components/SettingsModal';
import { StartScreen } from './components/StartScreen';
import { isFirebaseConfigured } from './firebase/config';
import { GameEngine } from './game/GameEngine';
import { ROOMS } from './game/world/MansionData';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { MultiplayerManager } from './network/MultiplayerManager';
import {
  ChatMessage,
  ConnectionMode,
  GameScreen,
  GameSettings,
  InspectModalData,
  InteractionPrompt,
  KissState,
  NameplateState,
  PlayerSyncState,
  ProposalState,
  RoomDefinition,
  SpeechBubbleState,
} from './types/game';
import {
  loadPlayerProfile,
  loadSettings,
  PlayerProfile,
  resetSettings,
  savePlayerProfile,
  saveSettings,
} from './utils/settings';

type SessionIntent =
  | { type: 'quick' }
  | { type: 'create' }
  | { type: 'join'; code: string }
  | { type: 'local_preview'; withCompanion: boolean };

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const soundRef = useRef<SoundEngine | null>(null);
  const mpRef = useRef<MultiplayerManager | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [profile, setProfile] = useState<PlayerProfile>(() => loadPlayerProfile());
  const [firebaseReady, setFirebaseReady] = useState<boolean>(() => isFirebaseConfigured());

  const [loadProgress, setLoadProgress] = useState(5);
  const [loadStage, setLoadStage] = useState('Preparing mansion...');
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [bootNonce, setBootNonce] = useState(0);

  const [screen, setScreen] = useState<GameScreen>('start');
  const [lobbyMode, setLobbyMode] = useState<'create' | 'join' | null>(null);
  const [intent, setIntent] = useState<SessionIntent>({ type: 'quick' });
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Gameplay HUD states
  const [currentRoom, setCurrentRoom] = useState<RoomDefinition>(ROOMS[0]);
  const [nearestPrompt, setNearestPrompt] = useState<InteractionPrompt | null>(null);
  const [partnerNearForKiss, setPartnerNearForKiss] = useState(false);
  const [fps, setFps] = useState(60);
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubbleState[]>([]);
  const [partnerNameplate, setPartnerNameplate] = useState<NameplateState | null>(null);
  const [inspectModal, setInspectModal] = useState<InspectModalData | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(
    isFirebaseConfigured() ? 'disconnected' : 'unconfigured'
  );
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [remotePlayer, setRemotePlayer] = useState<PlayerSyncState | null>(null);
  const [kissState, setKissState] = useState<KissState>({
    status: 'idle',
    initiatorUid: '',
    targetUid: '',
    ts: 0,
  });
  const [kissNotice, setKissNotice] = useState<string | null>(null);
  const [kissCooldownUntil, setKissCooldownUntil] = useState(0);
  const [proposalState, setProposalState] = useState<ProposalState>({
    unlocked: false,
    triggered: false,
    response: 'none',
    herName: settings.herName,
  });
  const [proposalOverlayVisible, setProposalOverlayVisible] = useState(false);

  const isOnline = useOnlineStatus();

  // Stable refs for callbacks inside engine/multiplayer
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const partnerNearRef = useRef(partnerNearForKiss);
  partnerNearRef.current = partnerNearForKiss;
  const kissCooldownRef = useRef(kissCooldownUntil);
  kissCooldownRef.current = kissCooldownUntil;
  const seenChatIdsRef = useRef<Set<string>>(new Set());
  const noticeTimeoutRef = useRef<number | null>(null);
  const kissCooldownTimerRef = useRef<number | null>(null);

  const showNotice = useCallback((msg: string) => {
    setKissNotice(msg);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = window.setTimeout(() => setKissNotice(null), 3000);
  }, []);

  // Initialize Sound, Multiplayer, and Three.js Engine once
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const sound = new SoundEngine();
    sound.setVolumes(settingsRef.current.musicVolume, settingsRef.current.sfxVolume);
    soundRef.current = sound;

    const mp = new MultiplayerManager({
      onStatusChange: (mode, errMsg) => {
        setConnectionMode(mode);
        if (errMsg && mode === 'error') {
          setSetupError(errMsg);
        }
      },
      onRemotePlayerUpdate: (p) => {
        setRemotePlayer(p);
        engineRef.current?.syncRemotePlayer(p);
      },
      onChatMessages: (msgs) => {
        setChatMessages(msgs);
        // Trigger speech bubbles for newly arrived messages (skip initial system banner)
        msgs.forEach((m) => {
          if (!seenChatIdsRef.current.has(m.id)) {
            seenChatIdsRef.current.add(m.id);
            if (m.uid !== 'system' && Date.now() - m.ts < 8000) {
              engineRef.current?.addSpeechBubble(m.uid, m.name, m.text);
            }
          }
        });
      },
      onDoorsUpdate: (doors) => {
        engineRef.current?.syncDoors(doors);
      },
      onInteractionsUpdate: (ints) => {
        engineRef.current?.syncInteractions(ints);
      },
      onKissUpdate: (kiss) => {
        setKissState(kiss);
        engineRef.current?.syncKiss(kiss);
        if (kiss.status === 'declined' && kiss.initiatorUid === mp.getUid()) {
          showNotice('Maybe in a moment.');
          setTimeout(() => mp.clearKiss(), 900);
        }
      },
      onProposalUpdate: (prop) => {
        setProposalState(prop);
        engineRef.current?.syncProposal(prop);
        if (prop.triggered) {
          setProposalOverlayVisible(true);
        }
      },
    });
    mpRef.current = mp;

    const engine = new GameEngine(container, settingsRef.current, sound, {
      onLoadProgress: (p, stage) => {
        setLoadProgress(p);
        setLoadStage(stage);
      },
      onReady: () => {
        setEngineReady(true);
        setEngineError(null);
      },
      onError: (msg) => {
        setEngineError(msg);
      },
      onRoomChange: (room) => {
        setCurrentRoom(room);
      },
      onNearestPrompt: (prompt) => {
        setNearestPrompt(prompt);
      },
      onPartnerProximity: (near) => {
        setPartnerNearForKiss(near);
      },
      onFpsUpdate: (val) => {
        setFps(val);
      },
      onScreenProjections: (bubbles, nameplate) => {
        setSpeechBubbles(bubbles);
        setPartnerNameplate(nameplate);
      },
      onTransformEmit: (x, y, z, ry, anim, speed) => {
        mpRef.current?.sendPlayerTransform(x, y, z, ry, anim, speed);
      },
      onTriggerProposalLocal: () => {
        mpRef.current?.triggerProposal(settingsRef.current.herName);
      },
      onKissFinished: () => {
        mpRef.current?.clearKiss();
      },
      onInspectObject: (def) => {
        if (def.inspectData) {
          setInspectModal(def.inspectData);
        }
      },
      onDoorToggle: (doorId, open) => {
        mpRef.current?.setDoorState(doorId, open);
      },
      onObjectInteract: (objId, active) => {
        mpRef.current?.setInteractionState(objId, active);
      },
      onUnlockSecret: () => {
        mpRef.current?.unlockSecretRoom();
        showNotice('A hidden passage has opened behind the north wall...');
      },
      onLocalPartnerFollow: (x, y, z, ry) => {
        mpRef.current?.updateLocalPreviewCompanionPosition(x, y, z, ry);
      },
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      mp.leaveRoom();
      sound.dispose();
      engineRef.current = null;
      mpRef.current = null;
      soundRef.current = null;
    };
  }, [bootNonce, showNotice]);

  // Sync settings updates into SoundEngine & GameEngine
  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    soundRef.current?.setVolumes(next.musicVolume, next.sfxVolume);
    engineRef.current?.updateSettings(next);
  }, []);

  const handleResetSettings = useCallback(() => {
    const fresh = resetSettings();
    handleUpdateSettings(fresh);
  }, [handleUpdateSettings]);

  const handleKissRequest = useCallback(() => {
    const mp = mpRef.current;
    const engine = engineRef.current;
    if (!mp || !engine) return;

    if (Date.now() < kissCooldownRef.current) {
      showNotice('Wait a brief moment before initiating again.');
      return;
    }

    const remoteUid = engine.getRemoteUid();
    if (!remoteUid) {
      showNotice('No partner in the mansion yet.');
      return;
    }

    if (!partnerNearRef.current) {
      showNotice('Move closer to your partner to share a kiss.');
      return;
    }

    setKissCooldownUntil(Date.now() + 6000);
    if (kissCooldownTimerRef.current) clearTimeout(kissCooldownTimerRef.current);
    kissCooldownTimerRef.current = window.setTimeout(() => {
      setKissCooldownUntil(0);
    }, 6050);
    mp.initiateKiss(remoteUid);
  }, [showNotice]);

  // Desktop keyboard shortcuts (K for Kiss, Enter for Chat, Esc for Settings)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.code === 'Escape') {
          setChatOpen(false);
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.code === 'Escape') {
        if (inspectModal) setInspectModal(null);
        else if (chatOpen) setChatOpen(false);
        else setSettingsOpen((o) => !o);
      } else if (screen === 'playing' && !proposalOverlayVisible) {
        if (e.code === 'KeyK') {
          handleKissRequest();
        } else if (e.code === 'Enter') {
          e.preventDefault();
          setChatOpen((o) => !o);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, proposalOverlayVisible, inspectModal, chatOpen, handleKissRequest]);

  // Confirm Character Setup -> Enter Game
  const handleConfirmCharacter = async (confirmedProfile: PlayerProfile) => {
    soundRef.current?.unlock();
    setProfile(confirmedProfile);
    savePlayerProfile(confirmedProfile);
    setSetupError(null);
    seenChatIdsRef.current.clear();

    const mp = mpRef.current;
    const engine = engineRef.current;
    if (!mp || !engine) return;

    try {
      if (intent.type === 'create') {
        setSetupBusy(true);
        const code = await mp.createOnlineRoom(
          confirmedProfile.name,
          confirmedProfile.appearance,
          settings.herName
        );
        setRoomCode(code);
        engine.setLocalPlayer(confirmedProfile.name, confirmedProfile.appearance);
        engine.startPlaying(false);
        setScreen('playing');
      } else if (intent.type === 'join') {
        setSetupBusy(true);
        const code = await mp.joinOnlineRoom(
          intent.code,
          confirmedProfile.name,
          confirmedProfile.appearance
        );
        setRoomCode(code);
        engine.setLocalPlayer(confirmedProfile.name, confirmedProfile.appearance);
        engine.startPlaying(true);
        setScreen('playing');
      } else {
        // Quick Start or explicit Local Preview
        const withCompanion = intent.type === 'local_preview' ? intent.withCompanion : true;
        mp.startLocalPreview(
          confirmedProfile.name,
          confirmedProfile.appearance,
          settings.herName,
          withCompanion
        );
        setRoomCode('LOCAL');
        engine.setLocalPlayer(confirmedProfile.name, confirmedProfile.appearance);
        engine.startPlaying(false);
        setScreen('playing');
      }
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Unable to enter session.');
    } finally {
      setSetupBusy(false);
    }
  };

  const handleLeaveSession = async () => {
    engineRef.current?.stopPlaying();
    await mpRef.current?.leaveRoom();
    setRoomCode(null);
    setRemotePlayer(null);
    setProposalOverlayVisible(false);
    setProposalState({ unlocked: false, triggered: false, response: 'none', herName: settings.herName });
    setKissState({ status: 'idle', initiatorUid: '', targetUid: '', ts: 0 });
    setKissNotice(null);
    if (kissCooldownTimerRef.current) {
      clearTimeout(kissCooldownTimerRef.current);
      kissCooldownTimerRef.current = null;
    }
    setKissCooldownUntil(0);
    setChatMessages([]);
    setNearestPrompt(null);
    setPartnerNearForKiss(false);
    setInspectModal(null);
    setChatOpen(false);
    setScreen('start');
  };

  const setupModeLabel =
    intent.type === 'create'
      ? 'Hosting Private Room'
      : intent.type === 'join'
      ? `Joining ${intent.code}`
      : 'Local Preview (Offline)';

  const setupSubmitLabel =
    intent.type === 'create'
      ? 'Create Private Room'
      : intent.type === 'join'
      ? 'Join Room'
      : 'Enter Mansion';

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#141115]">
      {/* Isolated WebGL Viewport */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Offline Browser Banner */}
      {!isOnline && (
        <div className="fixed bottom-3 left-3 z-50 rounded-xl border border-amber-400/35 bg-[#1B161C]/92 px-3 py-1.5 text-xs text-amber-200 shadow-lg">
          Offline — Cached assets active
        </div>
      )}

      {/* Initial Loading Screen */}
      {(!engineReady || engineError) && (
        <LoadingScreen
          progress={loadProgress}
          stage={loadStage}
          error={engineError}
          onRetry={() => {
            setEngineError(null);
            setEngineReady(false);
            setBootNonce((n) => n + 1);
          }}
        />
      )}

      {/* Start Screen */}
      {engineReady && !engineError && screen === 'start' && (
        <StartScreen
          isFirebaseReady={firebaseReady}
          onStartQuick={() => {
            soundRef.current?.unlock();
            if (firebaseReady) {
              setLobbyMode('create');
            } else {
              setIntent({ type: 'local_preview', withCompanion: true });
              setSetupError(null);
              setScreen('setup');
            }
          }}
          onCreateRoom={() => {
            soundRef.current?.unlock();
            setLobbyMode('create');
          }}
          onJoinRoom={() => {
            soundRef.current?.unlock();
            setLobbyMode('join');
          }}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* Private Room Lobby Modal */}
      {lobbyMode && (
        <LobbyModal
          initialMode={lobbyMode}
          isFirebaseReady={firebaseReady}
          onClose={() => setLobbyMode(null)}
          onProceedCreate={() => {
            setLobbyMode(null);
            setIntent({ type: 'create' });
            setSetupError(null);
            setScreen('setup');
          }}
          onProceedJoin={(code) => {
            setLobbyMode(null);
            setIntent({ type: 'join', code });
            setSetupError(null);
            setScreen('setup');
          }}
          onProceedLocalPreview={(withCompanion) => {
            setLobbyMode(null);
            setIntent({ type: 'local_preview', withCompanion });
            setSetupError(null);
            setScreen('setup');
          }}
          onOpenFirebaseSettings={() => {
            setLobbyMode(null);
            setSettingsOpen(true);
          }}
        />
      )}

      {/* Character Setup Screen */}
      {engineReady && screen === 'setup' && (
        <CharacterSetup
          initialProfile={profile}
          modeLabel={setupModeLabel}
          submitLabel={setupSubmitLabel}
          isBusy={setupBusy}
          errorMsg={setupError}
          onBack={() => setScreen('start')}
          onConfirm={handleConfirmCharacter}
        />
      )}

      {/* In-Game HUD & Multitouch Controls */}
      {engineReady && screen === 'playing' && (
        <>
          {!proposalOverlayVisible && (
            <MobileControls
              visible={settings.showControls && !chatOpen && !inspectModal && !settingsOpen}
              nearestPrompt={nearestPrompt}
              partnerNearForKiss={partnerNearForKiss}
              kissOnCooldown={Date.now() < kissCooldownUntil}
              onJoystickMove={(x, y) => engineRef.current?.setJoystick(x, y)}
              onCameraDrag={(dx, dy) => engineRef.current?.rotateCamera(dx, dy)}
              onJump={() => engineRef.current?.triggerJump()}
              onInteract={() => engineRef.current?.triggerInteract()}
              onKiss={handleKissRequest}
              onToggleChat={() => setChatOpen((o) => !o)}
            />
          )}

          {!proposalOverlayVisible && (
            <GameHUD
              currentRoom={currentRoom}
              secretUnlocked={proposalState.unlocked}
              connectionMode={connectionMode}
              roomCode={roomCode}
              partnerOnline={Boolean(remotePlayer?.online)}
              partnerName={remotePlayer?.name || null}
              localUid={mpRef.current?.getUid() || 'local'}
              fps={fps}
              showFps={settings.showFps}
              nearestPrompt={nearestPrompt}
              speechBubbles={speechBubbles}
              partnerNameplate={partnerNameplate}
              chatMessages={chatMessages}
              chatOpen={chatOpen}
              kissState={kissState}
              kissNotice={kissNotice}
              inspectModal={inspectModal}
              onCloseChat={() => setChatOpen(false)}
              onSendChat={(text) => {
                mpRef.current?.sendChatMessage(profileRef.current.name, text);
              }}
              onRespondKiss={(accept) => {
                mpRef.current?.respondToKiss(accept);
              }}
              onCancelKiss={() => {
                mpRef.current?.clearKiss();
              }}
              onCloseInspect={() => setInspectModal(null)}
              onInteract={() => engineRef.current?.triggerInteract()}
              onOpenSettings={() => setSettingsOpen(true)}
              onLeave={handleLeaveSession}
            />
          )}

          {proposalOverlayVisible && (
            <ProposalOverlay
              herName={proposalState.herName || settings.herName}
              customCelebrationMessage={settings.proposalMessage}
              response={proposalState.response}
              onRespond={(choice) => {
                mpRef.current?.setProposalResponse(choice);
              }}
              onCloseToExplore={() => {
                setProposalOverlayVisible(false);
                engineRef.current?.dismissProposalUI();
              }}
            />
          )}
        </>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          isFirebaseReady={firebaseReady}
          onUpdate={handleUpdateSettings}
          onReset={handleResetSettings}
          onFirebaseUpdated={() => setFirebaseReady(isFirebaseConfigured())}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
