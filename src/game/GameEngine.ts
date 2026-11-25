import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from '../audio/SoundEngine';
import {
  AnimationState,
  CharacterAppearance,
  GameSettings,
  InteractionPrompt,
  KissState,
  NameplateState,
  PlayerSyncState,
  ProposalState,
  RoomDefinition,
  SpeechBubbleState,
} from '../types/game';
import { CharacterAnimator } from './character/CharacterAnimator';
import { buildStylizedCharacter, CharacterRig } from './character/CharacterBuilder';
import { CameraController } from './CameraController';
import { createProceduralTexturePack, MansionTexturePack } from './textures/ProceduralTextures';
import { buildMansionWorld, MansionBuildResult } from './world/MansionBuilder';
import {
  Box2D,
  DOORS,
  getRoomAt,
  INTERACTIVE_OBJECTS,
  InteractiveDef,
  PROPOSAL_TRIGGER,
  ROOMS,
  STATIC_COLLIDERS,
} from './world/MansionData';

const _vec3 = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

export interface EngineCallbacks {
  onLoadProgress: (progress: number, stage: string) => void;
  onReady: () => void;
  onError: (msg: string) => void;
  onRoomChange: (room: RoomDefinition) => void;
  onNearestPrompt: (prompt: InteractionPrompt | null) => void;
  onPartnerProximity: (nearForKiss: boolean) => void;
  onFpsUpdate: (fps: number) => void;
  onScreenProjections: (bubbles: SpeechBubbleState[], nameplate: NameplateState | null) => void;
  onTransformEmit: (x: number, y: number, z: number, ry: number, anim: AnimationState, speed: number) => void;
  onTriggerProposalLocal: () => void;
  onKissFinished: () => void;
  onInspectObject: (def: InteractiveDef) => void;
  onDoorToggle: (doorId: string, open: boolean) => void;
  onObjectInteract: (objId: string, active: boolean) => void;
  onUnlockSecret: () => void;
  onLocalPartnerFollow?: (x: number, y: number, z: number, ry: number) => void;
}

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private sound: SoundEngine;
  private isSoftwareGl = false;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private texPack!: MansionTexturePack;
  private mansion!: MansionBuildResult;
  private camCtrl = new CameraController();

  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private proposalWarmLight!: THREE.PointLight;

  private localRig: CharacterRig | null = null;
  private localAnimator = new CharacterAnimator();
  private localAppearance: CharacterAppearance | null = null;
  private localName = 'Player';

  private remoteRig: CharacterRig | null = null;
  private remoteAnimator = new CharacterAnimator();
  private remoteAppearanceKey = '';
  private remoteTarget = new THREE.Vector3(1.2, 0, 8.5);
  private remoteTargetRy = Math.PI;
  private remoteCurrentPos = new THREE.Vector3(1.2, 0, 8.5);
  private remoteCurrentRy = Math.PI;
  private remoteState: PlayerSyncState | null = null;

  // Physics & Input
  private playerPos = new THREE.Vector3(-1.1, 0, 8.5);
  private playerVelY = 0;
  private playerSpeed = 0;
  private playerRy = Math.PI;
  private grounded = true;
  private landTimer = 0;
  private interactTimer = 0;
  private footstepTimer = 0;

  private keysHeld: Record<string, boolean> = {};
  private joystickVec = { x: 0, y: 0 };
  private isPlaying = false;
  private settings: GameSettings;

  // World & Sync State
  private currentRoomId = 'entrance';
  private lastPromptKey = '';
  private lastPartnerNear = false;
  private doorStates: Record<string, boolean> = {};
  private interactionStates: Record<string, boolean> = {};
  private activeBubbles: Map<string, { uid: string; name: string; text: string; expiresAt: number }> = new Map();

  // Kiss & Proposal Sequences
  private kissTimer = 0;
  private kissActive = false;
  private proposalActive = false;
  private proposalModalDismissed = false;
  private stargazeTimer = 0;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private fpsFrames = 0;
  private fpsAccum = 0;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    sound: SoundEngine,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.settings = initialSettings;
    this.sound = sound;
    this.callbacks = callbacks;
    this.init();
  }

  private init(): void {
    try {
      this.callbacks.onLoadProgress(15, 'Initializing graphics pipeline...');
      this.isSoftwareGl = detectSoftwareGl();

      this.renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl && this.settings.graphicsQuality !== 'low',
        powerPreference: 'high-performance',
      });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.applyRendererQuality();

      const canvas = this.renderer.domElement;
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.callbacks.onError('Graphics context paused by device. Tap Retry to resume.');
      });
      this.container.appendChild(canvas);

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#19141C');
      this.scene.fog = new THREE.FogExp2('#19141C', 0.015);

      this.camera = new THREE.PerspectiveCamera(
        58,
        Math.max(1, this.container.clientWidth) / Math.max(1, this.container.clientHeight),
        0.1,
        140
      );

      // Studio PBR Environment reflection
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const roomEnv = new RoomEnvironment();
      this.scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
      roomEnv.dispose();
      pmrem.dispose();

      // Warm Key + Cool Fill Rig
      this.hemiLight = new THREE.HemisphereLight(0xc8d2eb, 0x4b352a, 0.85);
      this.scene.add(this.hemiLight);

      this.keyLight = new THREE.DirectionalLight(0xffdfb8, 1.15);
      this.keyLight.position.set(14, 24, 18);
      this.keyLight.castShadow = !this.isSoftwareGl && this.settings.shadowsEnabled;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.near = 1;
      this.keyLight.shadow.camera.far = 65;
      const d = 22;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
      this.scene.add(this.keyLight);

      this.proposalWarmLight = new THREE.PointLight(0xffb570, 0, 18, 1.2);
      this.proposalWarmLight.position.set(9.5, 3.0, -22.2);
      this.scene.add(this.proposalWarmLight);

      this.callbacks.onLoadProgress(45, 'Crafting mansion textures...');
      this.texPack = createProceduralTexturePack(this.renderer.capabilities.getMaxAnisotropy());

      this.callbacks.onLoadProgress(75, 'Constructing 10 mansion rooms...');
      this.mansion = buildMansionWorld(this.texPack, this.isSoftwareGl);
      this.scene.add(this.mansion.group);

      DOORS.forEach((door) => {
        this.doorStates[door.id] = door.defaultOpen;
      });

      this.callbacks.onLoadProgress(92, 'Warming shaders...');
      if (!this.isSoftwareGl) {
        this.renderer.compile(this.scene, this.camera);
      }

      window.addEventListener('resize', this.handleResize);
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
      this.handleResize();

      this.callbacks.onLoadProgress(100, 'Ready');
      this.callbacks.onReady();
      this.startLoop();
    } catch (err) {
      this.callbacks.onError(err instanceof Error ? err.message : 'Unable to initialize 3D engine.');
    }
  }

  private applyRendererQuality(): void {
    if (!this.renderer) return;
    const maxDpr = this.settings.graphicsQuality === 'high' ? 2 : this.settings.graphicsQuality === 'medium' ? 1.5 : 1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.shadowsEnabled && this.settings.graphicsQuality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camCtrl.sensitivity = this.settings.cameraSensitivity;
  }

  public updateSettings(next: GameSettings): void {
    this.settings = next;
    this.applyRendererQuality();
    if (this.keyLight) {
      this.keyLight.castShadow = !this.isSoftwareGl && next.shadowsEnabled && next.graphicsQuality !== 'low';
    }
  }

  public setLocalPlayer(name: string, appearance: CharacterAppearance): void {
    this.localName = name;
    this.localAppearance = appearance;
    if (this.localRig) {
      this.scene.remove(this.localRig.root);
      this.localRig.dispose();
    }
    this.localRig = buildStylizedCharacter(appearance, this.texPack.contactShadow);
    this.localRig.root.position.copy(this.playerPos);
    this.localRig.root.rotation.y = this.playerRy;
    this.scene.add(this.localRig.root);
  }

  private resetWorldSessionState(): void {
    this.doorStates = {};
    DOORS.forEach((door) => {
      this.doorStates[door.id] = door.defaultOpen;
    });
    this.interactionStates = {};
    this.activeBubbles.clear();
    this.currentRoomId = 'entrance';
    this.lastPromptKey = '';
    this.lastPartnerNear = false;
    this.stargazeTimer = 0;
    this.mansion?.resetState();
    this.sound.setRoom('entrance');
    this.callbacks.onRoomChange(ROOMS[0]);
    this.callbacks.onNearestPrompt(null);
    this.callbacks.onPartnerProximity(false);
  }

  public startPlaying(isGuest: boolean): void {
    this.isPlaying = true;
    this.proposalActive = false;
    this.proposalModalDismissed = false;
    this.kissActive = false;
    this.camCtrl.stopCinematic();
    this.resetWorldSessionState();
    this.playerPos.set(isGuest ? 1.35 : -1.35, 0, 7.4);
    this.playerVelY = 0;
    this.playerRy = Math.PI;
    this.camCtrl.yaw = 0;
    this.camCtrl.pitch = 0.28;
    this.camCtrl.snapToPlayer(this.playerPos);
    if (this.localRig) {
      this.localRig.root.position.copy(this.playerPos);
      this.localRig.root.rotation.y = this.playerRy;
    }
  }

  public stopPlaying(): void {
    this.isPlaying = false;
    this.proposalActive = false;
    this.kissActive = false;
    this.camCtrl.stopCinematic();
    this.sound.stopProposalMusic();
    this.resetWorldSessionState();
  }

  public setJoystick(x: number, y: number): void {
    this.joystickVec.x = x;
    this.joystickVec.y = y;
  }

  public rotateCamera(dx: number, dy: number): void {
    if (this.stargazeTimer > 0) {
      this.stargazeTimer = 0;
      this.camCtrl.stopCinematic();
    }
    this.camCtrl.rotate(dx, dy);
  }

  public triggerJump(): void {
    if (!this.isPlaying || this.proposalActive || this.kissActive) return;
    if (this.grounded) {
      this.playerVelY = 6.1;
      this.grounded = false;
      this.sound.playJump();
    }
  }

  public triggerInteract(): void {
    if (!this.isPlaying || this.proposalActive || this.kissActive) return;

    // Check nearest door first
    const nearestDoor = this.findNearestDoor();
    if (nearestDoor && (!nearestDoor.def.isSecret || this.doorStates[nearestDoor.def.id])) {
      const nextOpen = !this.doorStates[nearestDoor.def.id];
      this.doorStates[nearestDoor.def.id] = nextOpen;
      this.mansion.setDoorOpen(nearestDoor.def.id, nextOpen);
      this.sound.playDoor(nextOpen);
      this.interactTimer = 0.35;
      this.callbacks.onDoorToggle(nearestDoor.def.id, nextOpen);
      this.lastPromptKey = '';
      return;
    }

    // Check nearest interactive object
    const nearestObj = this.findNearestInteractive();
    if (!nearestObj) return;
    this.interactTimer = 0.4;

    if (nearestObj.kind === 'inspect') {
      this.sound.playInteract();
      this.callbacks.onInspectObject(nearestObj);
    } else if (nearestObj.kind === 'piano') {
      this.sound.playPianoPhrase();
      this.mansion.triggerPianoBurst();
    } else if (nearestObj.kind === 'fountain') {
      this.sound.playInteract();
      this.mansion.triggerFountainBurst();
    } else if (nearestObj.kind === 'stargaze') {
      this.sound.playInteract();
      this.stargazeTimer = 4.5;
      this.camCtrl.startCinematic(
        new THREE.Vector3(-12.2, 1.9, -14.4),
        new THREE.Vector3(-22, 3.6, -22),
        2.2
      );
    } else if (nearestObj.kind === 'secret_pedestal') {
      if (!this.doorStates['door_secret_sanctuary']) {
        this.doorStates['door_secret_sanctuary'] = true;
        this.mansion.setDoorOpen('door_secret_sanctuary', true);
        this.sound.playSecretUnlock();
        this.callbacks.onUnlockSecret();
      } else {
        this.sound.playInteract();
      }
    } else {
      const next = !this.interactionStates[nearestObj.id];
      this.interactionStates[nearestObj.id] = next;
      this.mansion.setInteractionActive(nearestObj.id, next);
      this.sound.playInteract();
      this.callbacks.onObjectInteract(nearestObj.id, next);
      this.lastPromptKey = '';
    }
  }

  public syncDoors(doors: Record<string, boolean>): void {
    Object.entries(doors).forEach(([id, open]) => {
      if (this.doorStates[id] !== open) {
        this.doorStates[id] = open;
        this.mansion.setDoorOpen(id, open);
      }
    });
  }

  public syncInteractions(interactions: Record<string, boolean>): void {
    Object.entries(interactions).forEach(([id, active]) => {
      if (this.interactionStates[id] !== active) {
        this.interactionStates[id] = active;
        this.mansion.setInteractionActive(id, active);
      }
    });
  }

  public syncRemotePlayer(player: PlayerSyncState | null): void {
    this.remoteState = player;
    if (!player) {
      if (this.remoteRig) {
        this.scene.remove(this.remoteRig.root);
        this.remoteRig.dispose();
        this.remoteRig = null;
        this.remoteAppearanceKey = '';
      }
      return;
    }

    const key = JSON.stringify(player.appearance);
    if (!this.remoteRig || key !== this.remoteAppearanceKey) {
      if (this.remoteRig) {
        this.scene.remove(this.remoteRig.root);
        this.remoteRig.dispose();
      }
      this.remoteRig = buildStylizedCharacter(player.appearance, this.texPack.contactShadow);
      this.remoteCurrentPos.set(player.x, player.y, player.z);
      this.remoteCurrentRy = player.ry;
      this.remoteRig.root.position.copy(this.remoteCurrentPos);
      this.remoteRig.root.rotation.y = this.remoteCurrentRy;
      this.scene.add(this.remoteRig.root);
      this.remoteAppearanceKey = key;
    }

    this.remoteRig.root.visible = player.online;
    this.remoteTarget.set(player.x, player.y, player.z);
    this.remoteTargetRy = player.ry;
  }

  public syncKiss(kiss: KissState): void {
    if (kiss.status === 'accepted' && !this.kissActive) {
      this.kissActive = true;
      this.kissTimer = 2.8;
      this.sound.playKissChime();
      if (this.remoteRig) {
        const mid = new THREE.Vector3().addVectors(this.playerPos, this.remoteCurrentPos).multiplyScalar(0.5);
        this.mansion.triggerKissHearts(mid);
      } else {
        this.mansion.triggerKissHearts(this.playerPos);
      }
    }
  }

  public syncProposal(proposal: ProposalState): void {
    if (proposal.unlocked && !this.doorStates['door_secret_sanctuary']) {
      this.doorStates['door_secret_sanctuary'] = true;
      this.mansion.setDoorOpen('door_secret_sanctuary', true);
    }
    if (proposal.triggered && !this.proposalActive && !this.proposalModalDismissed) {
      this.enterProposalSequence();
    }
    if (proposal.response === 'yes') {
      this.mansion.triggerCelebration();
    }
  }

  public dismissProposalUI(): void {
    this.proposalActive = false;
    this.proposalModalDismissed = true;
    this.camCtrl.stopCinematic();
    this.sound.stopProposalMusic();
  }

  public getRemoteUid(): string | null {
    return this.remoteState?.uid || null;
  }

  public addSpeechBubble(uid: string, name: string, text: string): void {
    this.activeBubbles.set(uid, {
      uid,
      name,
      text,
      expiresAt: performance.now() + 5200,
    });
  }

  private enterProposalSequence(): void {
    this.proposalActive = true;
    this.sound.startProposalMusic();
    this.mansion.triggerCelebration();

    // Smooth cinematic 3/4 view capturing both kneeling proposer and partner in Room 10
    this.camCtrl.startCinematic(
      new THREE.Vector3(6.6, 1.95, -20.2),
      new THREE.Vector3(9.5, 1.15, -22.35),
      1.8
    );
  }

  private handleResize = (): void => {
    if (!this.renderer || !this.camera || !this.container) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    this.keysHeld[e.code] = true;
    if (e.code === 'Space') {
      this.triggerJump();
    } else if (e.code === 'KeyE') {
      this.triggerInteract();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysHeld[e.code] = false;
  };

  private handleBlur = (): void => {
    this.keysHeld = {};
    this.joystickVec.x = 0;
    this.joystickVec.y = 0;
  };

  private startLoop(): void {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.elapsed += dt;

      this.stepSimulation(dt, now);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private stepSimulation(dt: number, nowMs: number): void {
    // FPS counter
    this.fpsFrames++;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 0.5) {
      this.callbacks.onFpsUpdate(Math.round(this.fpsFrames / this.fpsAccum));
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }

    if (!this.isPlaying) {
      this.camCtrl.setStartScreenOrbit(this.camera, this.elapsed);
      this.mansion.update(dt, this.elapsed, this.playerPos, this.settings.particlesEnabled, false);
      return;
    }

    if (this.stargazeTimer > 0) {
      this.stargazeTimer -= dt;
      if (this.stargazeTimer <= 0) {
        this.camCtrl.stopCinematic();
      }
    }

    let animState: AnimationState = 'idle';

    if (this.proposalActive) {
      // Smoothly arrange boy kneeling & partner standing facing him
      const localIsBoy = this.localAppearance?.gender === 'boy';
      const remoteIsBoy = this.remoteState?.appearance.gender === 'boy';
      const localKneels = localIsBoy || !remoteIsBoy;

      const kneelPosX = 9.5;
      const kneelPosZ = -21.55;
      const partnerPosX = 9.5;
      const partnerPosZ = -23.05;

      const kMove = 1 - Math.exp(-3.5 * dt);
      if (localKneels) {
        this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, kneelPosX, kMove);
        this.playerPos.z = THREE.MathUtils.lerp(this.playerPos.z, kneelPosZ, kMove);
        this.playerPos.y = 0;
        this.playerRy = lerpAngle(this.playerRy, Math.PI, kMove * 1.4);
        animState = 'propose_kneel';
        if (this.remoteRig) {
          this.remoteCurrentPos.x = THREE.MathUtils.lerp(this.remoteCurrentPos.x, partnerPosX, kMove);
          this.remoteCurrentPos.z = THREE.MathUtils.lerp(this.remoteCurrentPos.z, partnerPosZ, kMove);
          this.remoteCurrentRy = lerpAngle(this.remoteCurrentRy, 0, kMove * 1.4);
        }
      } else {
        this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, partnerPosX, kMove);
        this.playerPos.z = THREE.MathUtils.lerp(this.playerPos.z, partnerPosZ, kMove);
        this.playerPos.y = 0;
        this.playerRy = lerpAngle(this.playerRy, 0, kMove * 1.4);
        animState = 'propose_partner';
        if (this.remoteRig) {
          this.remoteCurrentPos.x = THREE.MathUtils.lerp(this.remoteCurrentPos.x, kneelPosX, kMove);
          this.remoteCurrentPos.z = THREE.MathUtils.lerp(this.remoteCurrentPos.z, kneelPosZ, kMove);
          this.remoteCurrentRy = lerpAngle(this.remoteCurrentRy, Math.PI, kMove * 1.4);
        }
      }
      this.proposalWarmLight.intensity = THREE.MathUtils.lerp(this.proposalWarmLight.intensity, 2.2, dt * 2);
    } else if (this.kissActive) {
      this.kissTimer -= dt;
      animState = 'kiss';
      if (this.remoteRig) {
        // Turn characters cleanly toward each other & step to 0.72m spacing
        const dx = this.remoteCurrentPos.x - this.playerPos.x;
        const dz = this.remoteCurrentPos.z - this.playerPos.z;
        const dist = Math.hypot(dx, dz) || 1;
        const angleToRemote = Math.atan2(dx, dz);
        this.playerRy = lerpAngle(this.playerRy, angleToRemote, 1 - Math.exp(-10 * dt));
        this.remoteCurrentRy = lerpAngle(this.remoteCurrentRy, angleToRemote + Math.PI, 1 - Math.exp(-10 * dt));

        if (dist > 0.76) {
          const midX = (this.playerPos.x + this.remoteCurrentPos.x) * 0.5;
          const midZ = (this.playerPos.z + this.remoteCurrentPos.z) * 0.5;
          const nx = dx / dist;
          const nz = dz / dist;
          this.playerPos.x = THREE.MathUtils.lerp(this.playerPos.x, midX - nx * 0.36, 1 - Math.exp(-6 * dt));
          this.playerPos.z = THREE.MathUtils.lerp(this.playerPos.z, midZ - nz * 0.36, 1 - Math.exp(-6 * dt));
        }
      }
      if (this.kissTimer <= 0) {
        this.kissActive = false;
        this.callbacks.onKissFinished();
      }
    } else {
      // Standard Gameplay Movement
      this.proposalWarmLight.intensity = THREE.MathUtils.lerp(this.proposalWarmLight.intensity, 0, dt * 3);
      let inX = 0;
      let inY = 0;
      if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) inY += 1;
      if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) inY -= 1;
      if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) inX -= 1;
      if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) inX += 1;

      inX += this.joystickVec.x;
      inY += this.joystickVec.y;
      const mag = Math.hypot(inX, inY);
      const clampedMag = Math.min(1, mag);
      if (mag > 0.05) {
        inX /= mag;
        inY /= mag;
      } else {
        inX = 0;
        inY = 0;
      }

      const wantsRun =
        Boolean(this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight']) || clampedMag > 0.85;
      const targetSpeed = mag > 0.05 ? (wantsRun ? 5.6 : 3.3) * clampedMag : 0;
      this.playerSpeed = THREE.MathUtils.lerp(this.playerSpeed, targetSpeed, 1 - Math.exp(-12 * dt));

      // Camera-relative horizontal basis
      _forward.set(-Math.sin(this.camCtrl.yaw), 0, -Math.cos(this.camCtrl.yaw));
      _right.set(Math.cos(this.camCtrl.yaw), 0, -Math.sin(this.camCtrl.yaw));

      _moveDir
        .set(0, 0, 0)
        .addScaledVector(_forward, inY)
        .addScaledVector(_right, inX);

      if (_moveDir.lengthSq() > 0.001) {
        _moveDir.normalize();
        const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
        this.playerRy = lerpAngle(this.playerRy, targetAngle, 1 - Math.exp(-14 * dt));
      }

      this.camCtrl.followMovement(inX, inY, this.playerRy, mag > 0.05, dt);

      const nextX = this.playerPos.x + _moveDir.x * this.playerSpeed * dt;
      const nextZ = this.playerPos.z + _moveDir.z * this.playerSpeed * dt;
      this.resolveCollisions(nextX, nextZ);

      // Vertical Jump & Gravity
      if (!this.grounded || this.playerVelY > 0) {
        this.playerVelY -= 18.5 * dt;
        this.playerPos.y += this.playerVelY * dt;
        if (this.playerPos.y <= 0) {
          this.playerPos.y = 0;
          this.playerVelY = 0;
          this.grounded = true;
          this.landTimer = 0.16;
          this.sound.playLand();
        }
      }

      if (this.landTimer > 0) this.landTimer -= dt;
      if (this.interactTimer > 0) this.interactTimer -= dt;

      if (!this.grounded) {
        animState = 'jump';
      } else if (this.landTimer > 0) {
        animState = 'land';
      } else if (this.interactTimer > 0) {
        animState = 'interact';
      } else if (this.playerSpeed > 4.2) {
        animState = 'run';
      } else if (this.playerSpeed > 0.35) {
        animState = 'walk';
      } else {
        animState = 'idle';
      }

      // Footsteps
      if (this.grounded && (animState === 'walk' || animState === 'run')) {
        this.footstepTimer -= dt;
        if (this.footstepTimer <= 0) {
          this.sound.playFootstep(animState === 'run');
          this.footstepTimer = animState === 'run' ? 0.31 : 0.46;
        }
      } else {
        this.footstepTimer = 0.05;
      }
    }

    // Update Local Character Rig
    if (this.localRig) {
      this.localRig.root.position.copy(this.playerPos);
      this.localRig.root.rotation.y = this.playerRy;
      this.localAnimator.update(this.localRig, animState, this.playerSpeed, dt, this.elapsed);
    }

    // Update Remote Character Interpolation (or gentle companion follow in Local Preview)
    if (this.remoteRig && this.remoteState) {
      let remoteAnim: AnimationState = this.remoteState.anim;
      let remoteSpeed = this.remoteState.speed;

      if (!this.proposalActive && !this.kissActive) {
        if (this.remoteState.uid === 'local_preview_partner') {
          const dx = this.playerPos.x - this.remoteCurrentPos.x;
          const dz = this.playerPos.z - this.remoteCurrentPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 1.75) {
            const followSpeed = Math.min(4.8, (dist - 1.55) * 2.4);
            const nx = dx / dist;
            const nz = dz / dist;
            const resolved = this.resolvePointCollisions(
              this.remoteCurrentPos.x + nx * followSpeed * dt,
              this.remoteCurrentPos.z + nz * followSpeed * dt
            );
            this.remoteCurrentPos.x = resolved.x;
            this.remoteCurrentPos.z = resolved.z;
            this.remoteCurrentRy = lerpAngle(this.remoteCurrentRy, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
            remoteAnim = followSpeed > 3.6 ? 'run' : 'walk';
            remoteSpeed = followSpeed;
            this.callbacks.onLocalPartnerFollow?.(
              this.remoteCurrentPos.x,
              this.remoteCurrentPos.y,
              this.remoteCurrentPos.z,
              this.remoteCurrentRy
            );
          } else {
            remoteAnim = 'idle';
            remoteSpeed = 0;
          }
        } else {
          const k = 1 - Math.exp(-12 * dt);
          this.remoteCurrentPos.lerp(this.remoteTarget, k);
          this.remoteCurrentRy = lerpAngle(this.remoteCurrentRy, this.remoteTargetRy, k);
        }
      }
      this.remoteRig.root.position.copy(this.remoteCurrentPos);
      this.remoteRig.root.rotation.y = this.remoteCurrentRy;
      if (this.proposalActive) {
        remoteAnim = this.localAppearance?.gender === 'boy' ? 'propose_partner' : 'propose_kneel';
      } else if (this.kissActive) {
        remoteAnim = 'kiss';
      }
      this.remoteAnimator.update(this.remoteRig, remoteAnim, remoteSpeed, dt, this.elapsed);
    }

    // Update Mansion Animations & Particles
    this.mansion.update(dt, this.elapsed, this.playerPos, this.settings.particlesEnabled, this.proposalActive);

    // Update Camera
    this.camCtrl.update(this.camera, this.playerPos, dt);

    // Room Detection + Audio Room Ambience
    const room = getRoomAt(this.playerPos.x, this.playerPos.z);
    if (room.id !== this.currentRoomId) {
      this.currentRoomId = room.id;
      this.sound.setRoom(room.id);
      this.callbacks.onRoomChange(room);
    }

    // Proposal Secret Trigger Detection in Room 10
    if (
      !this.proposalActive &&
      !this.proposalModalDismissed &&
      this.doorStates['door_secret_sanctuary']
    ) {
      const dx = this.playerPos.x - PROPOSAL_TRIGGER.x;
      const dz = this.playerPos.z - PROPOSAL_TRIGGER.z;
      if (dx * dx + dz * dz <= PROPOSAL_TRIGGER.radius * PROPOSAL_TRIGGER.radius) {
        this.callbacks.onTriggerProposalLocal();
      }
    }

    // Nearest Door / Object Prompt
    this.updatePromptAndProximity();

    // Emit network transform (throttled inside MultiplayerManager)
    this.callbacks.onTransformEmit(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      this.playerRy,
      animState,
      this.playerSpeed
    );

    // Project 3D speech bubbles & remote nameplate to screen
    this.emitScreenProjections(nowMs);
  }

  private resolveCollisions(targetX: number, targetZ: number): void {
    const resolved = this.resolvePointCollisions(targetX, targetZ);
    this.playerPos.x = resolved.x;
    this.playerPos.z = resolved.z;
  }

  private resolvePointCollisions(targetX: number, targetZ: number): { x: number; z: number } {
    const radius = 0.34;
    let x = targetX;
    let z = targetZ;

    const pushOut = (box: Box2D) => {
      const closestX = Math.max(box.minX, Math.min(x, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - closestX;
      const dz = z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = radius - dist;
          x += (dx / dist) * push;
          z += (dz / dist) * push;
        } else {
          // Inside box: push along smallest axis
          const penL = Math.abs(x - box.minX);
          const penR = Math.abs(box.maxX - x);
          const penT = Math.abs(z - box.minZ);
          const penB = Math.abs(box.maxZ - z);
          const minP = Math.min(penL, penR, penT, penB);
          if (minP === penL) x = box.minX - radius;
          else if (minP === penR) x = box.maxX + radius;
          else if (minP === penT) z = box.minZ - radius;
          else z = box.maxZ + radius;
        }
      }
    };

    for (let i = 0; i < STATIC_COLLIDERS.length; i++) {
      pushOut(STATIC_COLLIDERS[i]);
    }
    for (let i = 0; i < DOORS.length; i++) {
      const door = DOORS[i];
      if (!this.doorStates[door.id]) {
        pushOut(door.collider);
      }
    }

    return { x, z };
  }

  private findNearestDoor() {
    let best: { def: (typeof DOORS)[number]; dist: number } | null = null;
    for (const def of DOORS) {
      if (def.isSecret) continue;
      const dist = Math.hypot(this.playerPos.x - def.x, this.playerPos.z - def.z);
      if (dist < 2.25 && (!best || dist < best.dist)) {
        best = { def, dist };
      }
    }
    return best;
  }

  private findNearestInteractive(): InteractiveDef | null {
    let best: InteractiveDef | null = null;
    let bestDist = Infinity;
    for (const obj of INTERACTIVE_OBJECTS) {
      const d = Math.hypot(this.playerPos.x - obj.x, this.playerPos.z - obj.z);
      if (d <= obj.radius && d < bestDist) {
        best = obj;
        bestDist = d;
      }
    }
    return best;
  }

  private updatePromptAndProximity(): void {
    const door = this.findNearestDoor();
    const obj = this.findNearestInteractive();
    let nextPrompt: InteractionPrompt | null = null;

    if (door && (!obj || door.dist < 1.7)) {
      const open = Boolean(this.doorStates[door.def.id]);
      nextPrompt = {
        id: door.def.id,
        label: open ? `Close ${door.def.label}` : `Open ${door.def.label}`,
        type: 'door',
        active: open,
      };
    } else if (obj) {
      const active = Boolean(this.interactionStates[obj.id]);
      nextPrompt = {
        id: obj.id,
        label: active && obj.activeLabel ? obj.activeLabel : obj.label,
        type: obj.kind === 'secret_pedestal' ? 'secret_trigger' : 'object',
        active,
      };
    }

    const promptKey = nextPrompt ? `${nextPrompt.id}:${nextPrompt.label}` : '';
    if (promptKey !== this.lastPromptKey) {
      this.lastPromptKey = promptKey;
      this.callbacks.onNearestPrompt(nextPrompt);
    }

    const nearKiss = Boolean(
      this.remoteState &&
        this.remoteState.online &&
        Math.hypot(
          this.playerPos.x - this.remoteCurrentPos.x,
          this.playerPos.z - this.remoteCurrentPos.z
        ) <= 2.5
    );
    if (nearKiss !== this.lastPartnerNear) {
      this.lastPartnerNear = nearKiss;
      this.callbacks.onPartnerProximity(nearKiss);
    }
  }

  private emitScreenProjections(nowMs: number): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const bubbles: SpeechBubbleState[] = [];

    const projectHead = (worldPos: THREE.Vector3, yOffset: number) => {
      _projVec.set(worldPos.x, worldPos.y + yOffset, worldPos.z);
      _projVec.project(this.camera);
      const visible = _projVec.z >= -1 && _projVec.z <= 1;
      return {
        x: ((_projVec.x + 1) / 2) * w,
        y: ((-_projVec.y + 1) / 2) * h,
        visible,
      };
    };

    // Clean expired bubbles & project active ones
    this.activeBubbles.forEach((b, uid) => {
      const remaining = b.expiresAt - nowMs;
      if (remaining <= 0) {
        this.activeBubbles.delete(uid);
        return;
      }
      const isRemote = this.remoteState && uid === this.remoteState.uid;
      const anchor = isRemote ? this.remoteCurrentPos : this.playerPos;
      if (isRemote && !this.remoteState?.online) return;

      const screen = projectHead(anchor, 2.15);
      bubbles.push({
        uid: b.uid,
        name: b.name,
        text: b.text,
        screenX: screen.x,
        screenY: screen.y,
        visible: screen.visible,
        opacity: remaining < 800 ? remaining / 800 : 1,
      });
    });

    let nameplate: NameplateState | null = null;
    if (this.remoteState && this.remoteState.online) {
      const np = projectHead(this.remoteCurrentPos, 1.92);
      if (np.visible) {
        nameplate = {
          uid: this.remoteState.uid,
          name: this.remoteState.name,
          screenX: np.x,
          screenY: np.y,
          visible: true,
        };
      }
    }

    this.callbacks.onScreenProjections(bubbles, nameplate);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.localRig?.dispose();
    this.remoteRig?.dispose();
    this.mansion?.dispose();
    this.texPack?.dispose();
    this.scene?.environment?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
