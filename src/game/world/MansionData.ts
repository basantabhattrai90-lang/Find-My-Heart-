import { InspectModalData, RoomDefinition, RoomId } from '../../types/game';

export interface Box2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  tag?: string;
}

export interface DoorDefinition {
  id: string;
  label: string;
  axis: 'x' | 'z'; // 'x' = wall runs along X (door blocks Z), 'z' = wall runs along Z (door blocks X)
  x: number;
  z: number;
  width: number;
  hingeSide: 1 | -1;
  defaultOpen: boolean;
  isSecret?: boolean;
  collider: Box2D;
}

export interface InteractiveDef {
  id: string;
  roomId: RoomId;
  x: number;
  y: number;
  z: number;
  radius: number;
  label: string;
  activeLabel?: string;
  kind: 'toggle_light' | 'inspect' | 'piano' | 'fountain' | 'cinema' | 'stargaze' | 'secret_pedestal';
  inspectData?: InspectModalData;
}

export const WALL_HEIGHT = 4.2;
export const WALL_THICKNESS = 0.32;

export const ROOMS: RoomDefinition[] = [
  {
    id: 'entrance',
    name: 'Entrance Hall',
    subtitle: 'Where our evening begins',
    minX: -5,
    maxX: 5,
    minZ: 2,
    maxZ: 12,
    ambientColor: 0xfff0dd,
    lightIntensity: 1.0,
  },
  {
    id: 'living',
    name: 'Living Room',
    subtitle: 'Warm hearth & quiet evenings',
    minX: -14,
    maxX: -5,
    minZ: 2,
    maxZ: 12,
    ambientColor: 0xffdfba,
    lightIntensity: 0.9,
  },
  {
    id: 'library',
    name: 'Library',
    subtitle: 'Stories tucked between shelves',
    minX: 5,
    maxX: 14,
    minZ: 2,
    maxZ: 12,
    ambientColor: 0xf7dec0,
    lightIntensity: 0.85,
  },
  {
    id: 'music',
    name: 'Music Room',
    subtitle: 'Notes lingering in the air',
    minX: -5,
    maxX: 5,
    minZ: -8,
    maxZ: 2,
    ambientColor: 0xfbe6d4,
    lightIntensity: 0.95,
  },
  {
    id: 'garden',
    name: 'Indoor Garden',
    subtitle: 'Sunlit conservatory & blossoms',
    minX: -14,
    maxX: -5,
    minZ: -8,
    maxZ: 2,
    ambientColor: 0xf2f7e4,
    lightIntensity: 1.1,
  },
  {
    id: 'bedroom',
    name: 'Cozy Bedroom',
    subtitle: 'Soft linen & moonlight',
    minX: 5,
    maxX: 14,
    minZ: -8,
    maxZ: 2,
    ambientColor: 0xffe4d6,
    lightIntensity: 0.85,
  },
  {
    id: 'cinema',
    name: 'Cinema Room',
    subtitle: 'Private screening for two',
    minX: -5,
    maxX: 5,
    minZ: -17,
    maxZ: -8,
    ambientColor: 0xd9cef0,
    lightIntensity: 0.65,
  },
  {
    id: 'balcony',
    name: 'Glass Balcony',
    subtitle: 'Evening breeze & horizon lights',
    minX: -14,
    maxX: -5,
    minZ: -17,
    maxZ: -8,
    ambientColor: 0xffd2b8,
    lightIntensity: 1.0,
  },
  {
    id: 'memory',
    name: 'Memory Room',
    subtitle: 'Moments kept close',
    minX: 5,
    maxX: 14,
    minZ: -17,
    maxZ: -8,
    ambientColor: 0xe6d4e8,
    lightIntensity: 0.8,
  },
  {
    id: 'secret',
    name: 'The Rose Sanctuary',
    subtitle: 'A hidden place made just for you',
    hiddenFromMap: true,
    minX: 5,
    maxX: 14,
    minZ: -27,
    maxZ: -17,
    ambientColor: 0xffd9b3,
    lightIntensity: 1.15,
  },
];

export function getRoomAt(x: number, z: number): RoomDefinition {
  for (const r of ROOMS) {
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
      return r;
    }
  }
  return ROOMS[0];
}

export const DOORS: DoorDefinition[] = [
  {
    id: 'door_hall_living',
    label: 'Living Room Door',
    axis: 'z',
    x: -5,
    z: 7,
    width: 1.8,
    hingeSide: -1,
    defaultOpen: true,
    collider: { minX: -5.2, maxX: -4.8, minZ: 6.1, maxZ: 7.9 },
  },
  {
    id: 'door_hall_library',
    label: 'Library Door',
    axis: 'z',
    x: 5,
    z: 7,
    width: 1.8,
    hingeSide: 1,
    defaultOpen: true,
    collider: { minX: 4.8, maxX: 5.2, minZ: 6.1, maxZ: 7.9 },
  },
  {
    id: 'door_living_garden',
    label: 'Conservatory Door',
    axis: 'x',
    x: -9.5,
    z: 2,
    width: 1.8,
    hingeSide: -1,
    defaultOpen: false,
    collider: { minX: -10.4, maxX: -8.6, minZ: 1.8, maxZ: 2.2 },
  },
  {
    id: 'door_library_bedroom',
    label: 'Bedroom Door',
    axis: 'x',
    x: 9.5,
    z: 2,
    width: 1.8,
    hingeSide: 1,
    defaultOpen: false,
    collider: { minX: 8.6, maxX: 10.4, minZ: 1.8, maxZ: 2.2 },
  },
  {
    id: 'door_music_garden',
    label: 'Garden Arch Door',
    axis: 'z',
    x: -5,
    z: -3,
    width: 1.8,
    hingeSide: -1,
    defaultOpen: true,
    collider: { minX: -5.2, maxX: -4.8, minZ: -3.9, maxZ: -2.1 },
  },
  {
    id: 'door_music_bedroom',
    label: 'Bedroom Side Door',
    axis: 'z',
    x: 5,
    z: -3,
    width: 1.8,
    hingeSide: 1,
    defaultOpen: false,
    collider: { minX: 4.8, maxX: 5.2, minZ: -3.9, maxZ: -2.1 },
  },
  {
    id: 'door_music_cinema',
    label: 'Cinema Door',
    axis: 'x',
    x: 0,
    z: -8,
    width: 2.0,
    hingeSide: -1,
    defaultOpen: false,
    collider: { minX: -1.0, maxX: 1.0, minZ: -8.2, maxZ: -7.8 },
  },
  {
    id: 'door_garden_balcony',
    label: 'Balcony Glass Door',
    axis: 'x',
    x: -9.5,
    z: -8,
    width: 1.8,
    hingeSide: -1,
    defaultOpen: true,
    collider: { minX: -10.4, maxX: -8.6, minZ: -8.2, maxZ: -7.8 },
  },
  {
    id: 'door_cinema_balcony',
    label: 'Terrace Door',
    axis: 'z',
    x: -5,
    z: -12.5,
    width: 1.8,
    hingeSide: -1,
    defaultOpen: false,
    collider: { minX: -5.2, maxX: -4.8, minZ: -13.4, maxZ: -11.6 },
  },
  {
    id: 'door_cinema_memory',
    label: 'Memory Room Door',
    axis: 'z',
    x: 5,
    z: -12.5,
    width: 1.8,
    hingeSide: 1,
    defaultOpen: false,
    collider: { minX: 4.8, maxX: 5.2, minZ: -13.4, maxZ: -11.6 },
  },
  {
    id: 'door_bedroom_memory',
    label: 'Gallery Door',
    axis: 'x',
    x: 9.5,
    z: -8,
    width: 1.8,
    hingeSide: 1,
    defaultOpen: true,
    collider: { minX: 8.6, maxX: 10.4, minZ: -8.2, maxZ: -7.8 },
  },
  {
    id: 'door_secret_sanctuary',
    label: 'Secret Panel Door',
    axis: 'x',
    x: 9.5,
    z: -17,
    width: 2.0,
    hingeSide: 1,
    defaultOpen: false,
    isSecret: true,
    collider: { minX: 8.5, maxX: 10.5, minZ: -17.22, maxZ: -16.78 },
  },
];

// Wall segments & static furniture colliders (kept spacious so movement feels smooth!)
export const STATIC_COLLIDERS: Box2D[] = [
  // Exterior Perimeter
  { minX: -14.3, maxX: 14.3, minZ: 11.84, maxZ: 12.2 }, // South wall
  { minX: -14.3, maxX: -13.84, minZ: -17.2, maxZ: 12.2 }, // West perimeter + balcony glass railing
  { minX: 13.84, maxX: 14.3, minZ: -27.2, maxZ: 12.2 }, // East perimeter
  { minX: -14.2, maxX: 5.2, minZ: -17.2, maxZ: -16.84 }, // North Balcony railing + Cinema north wall
  // Room 10 perimeter
  { minX: 4.84, maxX: 5.2, minZ: -27.2, maxZ: -17.0 },
  { minX: 4.8, maxX: 14.2, minZ: -27.2, maxZ: -26.84 },

  // Interior Dividing Walls (split cleanly around doorway gaps)
  // Wall x = -5: [2..12] door at z=7 (6.1..7.9)
  { minX: -5.18, maxX: -4.82, minZ: 7.9, maxZ: 12.0 },
  { minX: -5.18, maxX: -4.82, minZ: 2.0, maxZ: 6.1 },
  // Wall x = -5: [-8..2] door at z=-3 (-3.9..-2.1)
  { minX: -5.18, maxX: -4.82, minZ: -2.1, maxZ: 2.0 },
  { minX: -5.18, maxX: -4.82, minZ: -8.0, maxZ: -3.9 },
  // Wall x = -5: [-17..-8] door at z=-12.5 (-13.4..-11.6)
  { minX: -5.18, maxX: -4.82, minZ: -11.6, maxZ: -8.0 },
  { minX: -5.18, maxX: -4.82, minZ: -17.0, maxZ: -13.4 },

  // Wall x = 5: [2..12] door at z=7 (6.1..7.9)
  { minX: 4.82, maxX: 5.18, minZ: 7.9, maxZ: 12.0 },
  { minX: 4.82, maxX: 5.18, minZ: 2.0, maxZ: 6.1 },
  // Wall x = 5: [-8..2] door at z=-3 (-3.9..-2.1)
  { minX: 4.82, maxX: 5.18, minZ: -2.1, maxZ: 2.0 },
  { minX: 4.82, maxX: 5.18, minZ: -8.0, maxZ: -3.9 },
  // Wall x = 5: [-17..-8] door at z=-12.5 (-13.4..-11.6)
  { minX: 4.82, maxX: 5.18, minZ: -11.6, maxZ: -8.0 },
  { minX: 4.82, maxX: 5.18, minZ: -17.0, maxZ: -13.4 },

  // Wall z = 2:
  // [-14..-5] door at x=-9.5 (-10.4..-8.6)
  { minX: -14.0, maxX: -10.4, minZ: 1.82, maxZ: 2.18 },
  { minX: -8.6, maxX: -5.0, minZ: 1.82, maxZ: 2.18 },
  // [-5..5] wide arch at x=0 (-1.4..1.4)
  { minX: -5.0, maxX: -1.4, minZ: 1.82, maxZ: 2.18 },
  { minX: 1.4, maxX: 5.0, minZ: 1.82, maxZ: 2.18 },
  // [5..14] door at x=9.5 (8.6..10.4)
  { minX: 5.0, maxX: 8.6, minZ: 1.82, maxZ: 2.18 },
  { minX: 10.4, maxX: 14.0, minZ: 1.82, maxZ: 2.18 },

  // Wall z = -8:
  // [-14..-5] door at x=-9.5 (-10.4..-8.6)
  { minX: -14.0, maxX: -10.4, minZ: -8.18, maxZ: -7.82 },
  { minX: -8.6, maxX: -5.0, minZ: -8.18, maxZ: -7.82 },
  // [-5..5] door at x=0 (-1.0..1.0)
  { minX: -5.0, maxX: -1.0, minZ: -8.18, maxZ: -7.82 },
  { minX: 1.0, maxX: 5.0, minZ: -8.18, maxZ: -7.82 },
  // [5..14] door at x=9.5 (8.6..10.4)
  { minX: 5.0, maxX: 8.6, minZ: -8.18, maxZ: -7.82 },
  { minX: 10.4, maxX: 14.0, minZ: -8.18, maxZ: -7.82 },

  // Wall z = -17 (Memory Room -> Secret Room) door at x=9.5 (8.5..10.5)
  { minX: 5.0, maxX: 8.5, minZ: -17.18, maxZ: -16.82 },
  { minX: 10.5, maxX: 14.0, minZ: -17.18, maxZ: -16.82 },

  // Furniture Colliders
  // Room 1 Entrance Hall: Round centerpiece table & side staircase
  { minX: -0.75, maxX: 0.75, minZ: 5.1, maxZ: 6.5, tag: 'furniture' },
  { minX: 2.4, maxX: 4.8, minZ: 2.3, maxZ: 4.9 }, // Decorative staircase landing
  // Room 2 Living Room: Sofa, Coffee Table, Fireplace
  { minX: -12.6, maxX: -9.8, minZ: 5.4, maxZ: 8.8, tag: 'furniture' },
  { minX: -9.2, maxX: -7.8, minZ: 6.2, maxZ: 8.2, tag: 'furniture' },
  { minX: -13.9, maxX: -12.9, minZ: 5.6, maxZ: 8.4, tag: 'furniture' },
  // Room 3 Library: Bookshelves & Reading Desk
  { minX: 12.8, maxX: 13.9, minZ: 3.0, maxZ: 11.2 },
  { minX: 8.2, maxX: 10.4, minZ: 6.2, maxZ: 7.8, tag: 'furniture' },
  // Room 4 Music Room: Grand Piano & Bench
  { minX: -1.6, maxX: 1.2, minZ: -4.8, maxZ: -1.75, tag: 'furniture' },
  // Room 5 Indoor Garden: Center Fountain
  { minX: -10.8, maxX: -8.2, minZ: -4.3, maxZ: -1.7, tag: 'furniture' },
  // Room 6 Bedroom: Cozy Bed
  { minX: 9.8, maxX: 13.4, minZ: -4.6, maxZ: -1.4, tag: 'furniture' },
  // Room 7 Cinema: Loveseat Row & Screen Console
  { minX: -2.2, maxX: 2.2, minZ: -12.2, maxZ: -10.6, tag: 'furniture' },
  { minX: -3.5, maxX: 3.5, minZ: -16.7, maxZ: -15.8 },
  // Room 8 Balcony: Bistro Table
  { minX: -10.2, maxX: -8.8, minZ: -13.4, maxZ: -12.0, tag: 'furniture' },
  // Room 9 Memory Room: Center Pedestal
  { minX: 8.9, maxX: 10.1, minZ: -13.1, maxZ: -11.9, tag: 'furniture' },
];

export const INTERACTIVE_OBJECTS: InteractiveDef[] = [
  {
    id: 'obj_entrance_guestbook',
    roomId: 'entrance',
    x: 0,
    y: 1.0,
    z: 5.8,
    radius: 2.2,
    label: 'Read Welcome Note',
    kind: 'inspect',
    inspectData: {
      title: 'Welcome Home',
      body: 'Tonight, this quiet house belongs only to the two of us. Wander every room, linger by the fire, and keep an eye out for little clues tucked along the way.',
      clue: 'Hint: Three whispered notes are hidden in the Library, Bedroom, and Memory Room.',
    },
  },
  {
    id: 'obj_living_lamp',
    roomId: 'living',
    x: -12.2,
    y: 1.1,
    z: 9.6,
    radius: 2.3,
    label: 'Toggle Hearth & Lamp',
    activeLabel: 'Dim Hearth & Lamp',
    kind: 'toggle_light',
  },
  {
    id: 'obj_library_book',
    roomId: 'library',
    x: 9.3,
    y: 1.0,
    z: 7.0,
    radius: 2.3,
    label: 'Open Handwritten Journal',
    kind: 'inspect',
    inspectData: {
      title: 'A Folded Page',
      body: 'Between chapters of poetry sits a ribbon-tied note: "Every room holds a piece of how much you mean to me—from quiet evenings on the sofa to midnight music."',
      clue: 'Clue I: Seek the keepsake pedestal in the far northeast Memory Room.',
    },
  },
  {
    id: 'obj_music_piano',
    roomId: 'music',
    x: -0.2,
    y: 1.1,
    z: -3.5,
    radius: 2.5,
    label: 'Play Grand Piano',
    kind: 'piano',
  },
  {
    id: 'obj_garden_fountain',
    roomId: 'garden',
    x: -9.5,
    y: 1.0,
    z: -3.0,
    radius: 2.5,
    label: 'Make a Wish at Fountain',
    kind: 'fountain',
  },
  {
    id: 'obj_bedroom_lamp',
    roomId: 'bedroom',
    x: 11.4,
    y: 1.0,
    z: -5.2,
    radius: 2.3,
    label: 'Toggle Bedside Glow',
    activeLabel: 'Soften Bedside Glow',
    kind: 'toggle_light',
  },
  {
    id: 'obj_bedroom_note',
    roomId: 'bedroom',
    x: 7.2,
    y: 1.0,
    z: -3.2,
    radius: 2.2,
    label: 'Inspect Velvet Jewelry Box',
    kind: 'inspect',
    inspectData: {
      title: 'Velvet Keepsake Box',
      body: 'Inside lies an engraved brass key charm and a small card: "You make ordinary days feel golden."',
      clue: 'Clue II: North of this bedroom lies the Memory Room.',
    },
  },
  {
    id: 'obj_cinema_screen',
    roomId: 'cinema',
    x: 0,
    y: 1.1,
    z: -11.4,
    radius: 2.6,
    label: 'Start Private Screening',
    activeLabel: 'Pause Screening',
    kind: 'cinema',
  },
  {
    id: 'obj_balcony_telescope',
    roomId: 'balcony',
    x: -12.4,
    y: 1.2,
    z: -15.4,
    radius: 2.4,
    label: 'Stargaze Together',
    kind: 'stargaze',
  },
  {
    id: 'obj_memory_frames',
    roomId: 'memory',
    x: 13.0,
    y: 1.4,
    z: -12.5,
    radius: 2.4,
    label: 'View Memory Gallery',
    kind: 'inspect',
    inspectData: {
      title: 'Our Favorite Moments',
      body: 'Four framed evenings glow softly along the wall—laughter over coffee, rain on glass, golden-hour walks, and every quiet moment in between.',
      clue: 'Clue III: Touch the glowing Heart Keepsake at the center of this room to reveal what is hidden behind the north wall.',
    },
  },
  {
    id: 'obj_memory_pedestal',
    roomId: 'memory',
    x: 9.5,
    y: 1.1,
    z: -12.5,
    radius: 2.4,
    label: 'Unlock Hidden Sanctuary',
    activeLabel: 'Sanctuary Revealed',
    kind: 'secret_pedestal',
  },
];

export const PROPOSAL_TRIGGER = {
  x: 9.5,
  z: -22.2,
  radius: 2.4,
};
