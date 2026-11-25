export type CharacterGender = 'boy' | 'girl';

export type HairStyleId =
  | 'soft_waves'
  | 'classic_part'
  | 'tousled_crop'
  | 'low_bun'
  | 'shoulder_bob';

export type OutfitId = 'blazer' | 'sweater' | 'evening' | 'coat';

export interface CharacterAppearance {
  gender: CharacterGender;
  hairStyle: HairStyleId;
  hairColor: string;
  skinTone: string;
  outfit: OutfitId;
  outfitColor: string;
}

export type AnimationState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'land'
  | 'interact'
  | 'kiss'
  | 'propose_kneel'
  | 'propose_partner';

export interface PlayerSyncState {
  uid: string;
  name: string;
  appearance: CharacterAppearance;
  x: number;
  y: number;
  z: number;
  ry: number;
  anim: AnimationState;
  speed: number;
  online: boolean;
  lastSeen: number;
}

export type RoomId =
  | 'entrance'
  | 'living'
  | 'library'
  | 'music'
  | 'garden'
  | 'bedroom'
  | 'cinema'
  | 'balcony'
  | 'memory'
  | 'secret';

export interface RoomDefinition {
  id: RoomId;
  name: string;
  subtitle: string;
  hiddenFromMap?: boolean;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  ambientColor: number;
  lightIntensity: number;
}

export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  ts: number;
}

export interface SpeechBubbleState {
  uid: string;
  name: string;
  text: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  opacity: number;
}

export interface NameplateState {
  uid: string;
  name: string;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export type KissStatus = 'idle' | 'pending' | 'accepted' | 'declined';

export interface KissState {
  status: KissStatus;
  initiatorUid: string;
  targetUid: string;
  ts: number;
}

export type ProposalResponse = 'none' | 'yes' | 'no';

export interface ProposalState {
  unlocked: boolean;
  triggered: boolean;
  response: ProposalResponse;
  herName: string;
}

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  cameraSensitivity: number;
  graphicsQuality: GraphicsQuality;
  shadowsEnabled: boolean;
  particlesEnabled: boolean;
  showFps: boolean;
  showControls: boolean;
  herName: string;
  proposalMessage: string;
}

export type ConnectionMode = 'unconfigured' | 'local_preview' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export type GameScreen = 'start' | 'setup' | 'playing';

export interface InteractionPrompt {
  id: string;
  label: string;
  type: 'door' | 'object' | 'secret_trigger';
  active?: boolean;
}

export interface InspectModalData {
  title: string;
  body: string;
  clue?: string;
}
