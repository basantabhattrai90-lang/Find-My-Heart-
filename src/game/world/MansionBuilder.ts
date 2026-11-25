import * as THREE from 'three';
import { MansionTexturePack } from '../textures/ProceduralTextures';
import { DOORS, DoorDefinition, ROOMS, WALL_HEIGHT, WALL_THICKNESS } from './MansionData';

export interface DoorVisual {
  def: DoorDefinition;
  pivot: THREE.Group;
  isOpen: boolean;
  currentAngle: number;
  slideOffset: number;
}

export interface MansionBuildResult {
  group: THREE.Group;
  doors: Map<string, DoorVisual>;
  update: (
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    particlesEnabled: boolean,
    proposalActive: boolean
  ) => void;
  setDoorOpen: (id: string, open: boolean) => void;
  setInteractionActive: (id: string, active: boolean) => void;
  triggerPianoBurst: () => void;
  triggerFountainBurst: () => void;
  triggerKissHearts: (center: THREE.Vector3) => void;
  triggerCelebration: () => void;
  resetState: () => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function buildMansionWorld(
  tex: MansionTexturePack,
  isSoftwareGl: boolean
): MansionBuildResult {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Shared PBR Materials
  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.plasterWall,
      roughness: 0.85,
      metalness: 0.02,
    })
  );
  const darkWoodMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.darkWood,
      roughness: 0.45,
      metalness: 0.06,
    })
  );
  const oakFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.oakParquet,
      roughness: 0.42,
      metalness: 0.05,
    })
  );
  const marbleFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.marbleTile,
      roughness: 0.24,
      metalness: 0.08,
    })
  );
  const stoneFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.gardenStone,
      roughness: 0.82,
      metalness: 0.02,
    })
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#D4A55D',
      roughness: 0.22,
      metalness: 0.88,
    })
  );
  const creamTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#F2EAE0',
      roughness: 0.6,
      metalness: 0.03,
    })
  );
  const velvetRoseMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#7E2A3B',
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const velvetNavyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#253144',
      roughness: 0.86,
      metalness: 0.03,
    })
  );
  const rugMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.persianRug,
      roughness: 0.92,
      metalness: 0.0,
    })
  );
  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#DCEAF2',
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: isSoftwareGl ? 0.32 : 0.42,
      depthWrite: false,
    })
  );
  const ceilingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#E8DFD3',
      roughness: 0.9,
      metalness: 0.0,
    })
  );
  const memoryWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#2B2233',
      roughness: 0.85,
      metalness: 0.04,
    })
  );

  // Helper to place a wall box
  const addWall = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    h = WALL_HEIGHT,
    yBase = 0,
    mat: THREE.Material = wallMat
  ) => {
    const w = Math.abs(x2 - x1);
    const d = Math.abs(z2 - z1);
    if (w < 0.01 || d < 0.01) return;
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set((x1 + x2) / 2, yBase + h / 2, (z1 + z2) / 2);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    root.add(mesh);
  };

  // Helper for doorway header lintel
  const addLintel = (axis: 'x' | 'z', x: number, z: number, width: number) => {
    const h = WALL_HEIGHT - 2.75;
    const geo =
      axis === 'x'
        ? trackGeo(new THREE.BoxGeometry(width, h, WALL_THICKNESS))
        : trackGeo(new THREE.BoxGeometry(WALL_THICKNESS, h, width));
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, 2.75 + h / 2, z);
    mesh.receiveShadow = true;
    root.add(mesh);
  };

  // 1. FLOORS & CEILINGS FOR ALL 10 ROOMS
  ROOMS.forEach((r) => {
    const w = r.maxX - r.minX;
    const d = r.maxZ - r.minZ;
    const cx = (r.minX + r.maxX) / 2;
    const cz = (r.minZ + r.maxZ) / 2;

    let fMat: THREE.Material = oakFloorMat;
    if (r.id === 'entrance' || r.id === 'secret') fMat = marbleFloorMat;
    else if (r.id === 'garden' || r.id === 'balcony') fMat = stoneFloorMat;

    const floor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(w, d)), fMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = true;
    root.add(floor);

    if (r.id !== 'balcony' && r.id !== 'garden' && r.id !== 'secret') {
      const ceil = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(w, d)), ceilingMat);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(cx, WALL_HEIGHT, cz);
      root.add(ceil);
    }
  });

  // 2. EXTERIOR LANDSCAPE AROUND BALCONY & MANSION (No floating void!)
  const terrainMat = trackMat(new THREE.MeshStandardMaterial({ color: '#26342A', roughness: 0.95 }));
  const groundSurrounding = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(95, 36)), terrainMat);
  groundSurrounding.rotation.x = -Math.PI / 2;
  groundSurrounding.position.set(0, -0.35, -6);
  groundSurrounding.receiveShadow = true;
  root.add(groundSurrounding);

  // Exterior twilight cypress trees (InstancedMesh)
  const treeCount = 34;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 8));
  const crownGeo = trackGeo(new THREE.ConeGeometry(1.1, 4.2, 10));
  const trunkMat = trackMat(new THREE.MeshStandardMaterial({ color: '#3E2B20', roughness: 0.9 }));
  const crownMat = trackMat(new THREE.MeshStandardMaterial({ color: '#243C2E', roughness: 0.85 }));
  const instTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const instCrowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    const rad = 26 + (i % 5) * 4.5;
    const tx = Math.cos(angle) * rad;
    const tz = -6 + Math.sin(angle) * rad;
    const sc = 0.85 + (i % 4) * 0.14;
    _dummy.position.set(tx, 0.75, tz);
    _dummy.scale.set(sc, sc, sc);
    _dummy.updateMatrix();
    instTrunks.setMatrixAt(i, _dummy.matrix);
    _dummy.position.set(tx, 3.2 * sc, tz);
    _dummy.updateMatrix();
    instCrowns.setMatrixAt(i, _dummy.matrix);
    _color.setHSL(0.38, 0.28, 0.18 + (i % 3) * 0.03);
    instCrowns.setColorAt(i, _color);
  }
  instTrunks.computeBoundingSphere();
  instCrowns.computeBoundingSphere();
  root.add(instTrunks, instCrowns);

  // 3. ARCHITECTURAL WALLS (matching exact MansionData bounds)
  const ht = WALL_THICKNESS / 2;
  // South Exterior Wall (z = 12)
  addWall(-14.16, 12 - ht, 14.16, 12 + ht);
  // West Exterior Wall: Living & Garden solid (-8..12), Balcony railing (-17..-8)
  addWall(-14 - ht, -8, -14 + ht, 12.16);
  // Balcony Glass Railings (West & North)
  const railPostGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 8));
  for (let z = -16.8; z <= -8.2; z += 2.1) {
    const post = new THREE.Mesh(railPostGeo, brassMat);
    post.position.set(-13.9, 0.575, z);
    root.add(post);
  }
  for (let x = -13.8; x <= -5.2; x += 2.1) {
    const post = new THREE.Mesh(railPostGeo, brassMat);
    post.position.set(x, 0.575, -16.9);
    root.add(post);
  }
  const westGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 1.05, 8.9)), glassMat);
  westGlass.position.set(-13.9, 0.55, -12.5);
  root.add(westGlass);
  const northGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.9, 1.05, 0.06)), glassMat);
  northGlass.position.set(-9.5, 0.55, -16.9);
  root.add(northGlass);

  // East Exterior Wall (x = 14, -27..12)
  addWall(14 - ht, -27.16, 14 + ht, 12.16);
  // Cinema North Wall (z = -17, -5..5)
  addWall(-5.16, -17 - ht, 5.16, -17 + ht);
  // Secret Room West & North Walls
  addWall(5 - ht, -27.16, 5 + ht, -17);
  addWall(5 - ht, -27 - ht, 14 + ht, -27 + ht);

  // Interior Dividing Walls + Door Lintels
  // x = -5
  addWall(-5 - ht, 7.9, -5 + ht, 12);
  addWall(-5 - ht, 2, -5 + ht, 6.1);
  addLintel('z', -5, 7, 1.8);

  addWall(-5 - ht, -2.1, -5 + ht, 2);
  addWall(-5 - ht, -8, -5 + ht, -3.9);
  addLintel('z', -5, -3, 1.8);

  addWall(-5 - ht, -11.6, -5 + ht, -8);
  addWall(-5 - ht, -17, -5 + ht, -13.4);
  addLintel('z', -5, -12.5, 1.8);

  // x = 5
  addWall(5 - ht, 7.9, 5 + ht, 12);
  addWall(5 - ht, 2, 5 + ht, 6.1);
  addLintel('z', 5, 7, 1.8);

  addWall(5 - ht, -2.1, 5 + ht, 2);
  addWall(5 - ht, -8, 5 + ht, -3.9);
  addLintel('z', 5, -3, 1.8);

  addWall(5 - ht, -11.6, 5 + ht, -8);
  addWall(5 - ht, -17, 5 + ht, -13.4);
  addLintel('z', 5, -12.5, 1.8);

  // z = 2
  addWall(-14, 2 - ht, -10.4, 2 + ht);
  addWall(-8.6, 2 - ht, -5, 2 + ht);
  addLintel('x', -9.5, 2, 1.8);

  addWall(-5, 2 - ht, -1.4, 2 + ht);
  addWall(1.4, 2 - ht, 5, 2 + ht);
  addLintel('x', 0, 2, 2.8);

  addWall(5, 2 - ht, 8.6, 2 + ht);
  addWall(10.4, 2 - ht, 14, 2 + ht);
  addLintel('x', 9.5, 2, 1.8);

  // z = -8
  addWall(-14, -8 - ht, -10.4, -8 + ht);
  addWall(-8.6, -8 - ht, -5, -8 + ht);
  addLintel('x', -9.5, -8, 1.8);

  addWall(-5, -8 - ht, -1.0, -8 + ht);
  addWall(1.0, -8 - ht, 5, -8 + ht);
  addLintel('x', 0, -8, 2.0);

  addWall(5, -8 - ht, 8.6, -8 + ht);
  addWall(10.4, -8 - ht, 14, -8 + ht);
  addLintel('x', 9.5, -8, 1.8);

  // z = -17 (Memory Room -> Secret Room, camouflaged in dark wood paneling)
  addWall(5, -17 - ht, 8.5, -17 + ht, WALL_HEIGHT, 0, memoryWallMat);
  addWall(10.5, -17 - ht, 14, -17 + ht, WALL_HEIGHT, 0, memoryWallMat);
  addLintel('x', 9.5, -17, 2.0);

  // 4. INTERACTIVE HINGED DOORS + SECRET SLIDING DOOR
  const doors = new Map<string, DoorVisual>();
  DOORS.forEach((def) => {
    const pivot = new THREE.Group();
    if (def.isSecret) {
      pivot.position.set(def.x, 0, def.z);
      const panel = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(def.width, 2.75, 0.24)),
        memoryWallMat
      );
      panel.position.set(0, 1.375, 0);
      panel.castShadow = true;
      pivot.add(panel);
      // Decorative gold molding trim on secret panel
      const trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(def.width - 0.3, 2.3, 0.26)), brassMat);
      trim.position.set(0, 1.375, 0);
      trim.scale.set(0.92, 0.92, 1);
      pivot.add(trim);
    } else {
      const hingeOffset = (def.width / 2) * def.hingeSide;
      if (def.axis === 'x') {
        pivot.position.set(def.x + hingeOffset, 0, def.z);
      } else {
        pivot.position.set(def.x, 0, def.z + hingeOffset);
      }

      const leafW = def.axis === 'x' ? def.width : 0.09;
      const leafD = def.axis === 'x' ? 0.09 : def.width;
      const leaf = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(leafW, 2.72, leafD)), darkWoodMat);
      if (def.axis === 'x') {
        leaf.position.set(-hingeOffset, 1.36, 0);
      } else {
        leaf.position.set(0, 1.36, -hingeOffset);
      }
      leaf.castShadow = true;
      pivot.add(leaf);

      // Brass door handle
      const handle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 10, 8)), brassMat);
      if (def.axis === 'x') {
        handle.position.set(-hingeOffset * 1.72, 1.05, 0.07);
      } else {
        handle.position.set(0.07, 1.05, -hingeOffset * 1.72);
      }
      pivot.add(handle);
    }

    const startAngle = def.defaultOpen ? (Math.PI / 2) * 0.92 : 0;
    if (!def.isSecret) pivot.rotation.y = startAngle;
    root.add(pivot);
    doors.set(def.id, {
      def,
      pivot,
      isOpen: def.defaultOpen,
      currentAngle: startAngle,
      slideOffset: 0,
    });
  });

  // 5. COMPOSITE FURNITURE & INTERACTIVE OBJECTS PER ROOM
  const toggleLights: Record<string, THREE.PointLight[]> = {};
  const toggleMeshes: Record<string, THREE.Mesh[]> = {};

  const addSconce = (x: number, y: number, z: number, color = 0xffcf96, intensity = 1.4, dist = 10) => {
    const sconce = new THREE.Group();
    sconce.position.set(x, y, z);
    const backplate = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12)), brassMat);
    backplate.rotation.x = Math.PI / 2;
    sconce.add(backplate);
    const shade = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.09, 0.16, 0.24, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#FFF5E0', emissive: '#FFCC88', emissiveIntensity: 0.75, roughness: 0.4 }))
    );
    shade.position.set(0, 0.14, 0.12);
    sconce.add(shade);
    root.add(sconce);

    const light = new THREE.PointLight(color, intensity, dist, 1.6);
    light.position.set(x, y + 0.15, z + 0.15);
    root.add(light);
    return light;
  };

  // --- ROOM 1: Entrance Hall ---
  // Grand exterior double doors (South wall z=11.8)
  const mainDoorFrame = new THREE.Group();
  mainDoorFrame.position.set(0, 0, 11.78);
  const doorSlab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 3.0, 0.14)), darkWoodMat);
  doorSlab.position.y = 1.5;
  mainDoorFrame.add(doorSlab);
  const brassSeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 2.9, 0.16)), brassMat);
  brassSeam.position.y = 1.45;
  mainDoorFrame.add(brassSeam);
  root.add(mainDoorFrame);

  // Decorative Entrance Staircase (right corner of Hall)
  const stairGroup = new THREE.Group();
  stairGroup.position.set(3.6, 0, 3.6);
  for (let s = 0; s < 8; s++) {
    const step = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.22, 0.36)), darkWoodMat);
    step.position.set(0, 0.11 + s * 0.22, 1.1 - s * 0.32);
    step.receiveShadow = true;
    stairGroup.add(step);
  }
  const railBar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 10)), brassMat);
  railBar.position.set(-0.95, 1.4, 0);
  railBar.rotation.x = -0.62;
  stairGroup.add(railBar);
  root.add(stairGroup);

  // Round Centerpiece Table + Floral Vase + Welcome Book
  const hallTable = new THREE.Group();
  hallTable.position.set(0, 0, 5.8);
  const tBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.36, 0.78, 16)), darkWoodMat);
  tBase.position.y = 0.39;
  hallTable.add(tBase);
  const tTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 24)), darkWoodMat);
  tTop.position.y = 0.81;
  tTop.castShadow = true;
  hallTable.add(tTop);
  const vase = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry([new THREE.Vector2(0.07, 0), new THREE.Vector2(0.13, 0.16), new THREE.Vector2(0.06, 0.32)], 14)),
    creamTrimMat
  );
  vase.position.y = 0.84;
  hallTable.add(vase);
  const welcomeBook = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.04, 0.24)), velvetRoseMat);
  welcomeBook.position.set(0.28, 0.86, 0.2);
  welcomeBook.rotation.y = 0.4;
  hallTable.add(welcomeBook);
  root.add(hallTable);

  // Entrance Rug (offset Y >= 0.02 to prevent Z-fighting)
  const hallRug = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(4.2, 5.2)), rugMat);
  hallRug.rotation.x = -Math.PI / 2;
  hallRug.position.set(0, 0.022, 6.2);
  hallRug.receiveShadow = true;
  root.add(hallRug);

  addSconce(-3.2, 2.4, 11.7, 0xffd29e, 1.8, 12);
  addSconce(3.2, 2.4, 11.7, 0xffd29e, 1.8, 12);

  // --- ROOM 2: Living Room ---
  // Velvet Sofa
  const sofa = new THREE.Group();
  sofa.position.set(-11.2, 0, 7.1);
  const sofaBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.42, 3.1)), velvetRoseMat);
  sofaBase.position.y = 0.26;
  sofaBase.castShadow = true;
  sofa.add(sofaBase);
  const sofaBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.88, 3.1)), velvetRoseMat);
  sofaBack.position.set(-0.42, 0.56, 0);
  sofa.add(sofaBack);
  for (const az of [-1.42, 1.42]) {
    const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.08, 0.62, 0.24)), velvetRoseMat);
    arm.position.set(0, 0.38, az);
    sofa.add(arm);
  }
  root.add(sofa);

  // Coffee Table
  const cTable = new THREE.Group();
  cTable.position.set(-8.5, 0, 7.2);
  const cTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.07, 1.8)), darkWoodMat);
  cTop.position.y = 0.44;
  cTable.add(cTop);
  for (const lx of [-0.45, 0.45]) {
    for (const lz of [-0.75, 0.75]) {
      const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.02, 0.44, 8)), brassMat);
      leg.position.set(lx, 0.22, lz);
      cTable.add(leg);
    }
  }
  root.add(cTable);

  // Fireplace & Hearth Glow
  const fireplace = new THREE.Group();
  fireplace.position.set(-13.45, 0, 7.0);
  const mantle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.75, 1.6, 2.5)), creamTrimMat);
  mantle.position.y = 0.8;
  fireplace.add(mantle);
  const firebox = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.38, 0.85, 1.4)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#1A1312', roughness: 0.9 }))
  );
  firebox.position.set(0.22, 0.45, 0);
  fireplace.add(firebox);
  const emberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FF7B29',
      emissive: '#FF5511',
      emissiveIntensity: 1.8,
      roughness: 0.5,
    })
  );
  const embers = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.32, 12, 8)), emberMat);
  embers.scale.set(0.7, 0.45, 1.4);
  embers.position.set(0.24, 0.2, 0);
  fireplace.add(embers);
  root.add(fireplace);

  // Living Room Interactive Floor Lamp
  const floorLamp = new THREE.Group();
  floorLamp.position.set(-12.2, 0, 9.6);
  const lampPole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.04, 1.65, 10)), brassMat);
  lampPole.position.y = 0.825;
  floorLamp.add(lampPole);
  const lampShadeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#FFF0D4', emissive: '#FFB86B', emissiveIntensity: 1.1, roughness: 0.5 })
  );
  const lampShade = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.3, 0.34, 14)), lampShadeMat);
  lampShade.position.y = 1.68;
  floorLamp.add(lampShade);
  root.add(floorLamp);

  const livingLight = new THREE.PointLight(0xffb46b, 2.1, 13, 1.5);
  livingLight.position.set(-11.5, 2.1, 8.2);
  root.add(livingLight);
  toggleLights['obj_living_lamp'] = [livingLight];
  toggleMeshes['obj_living_lamp'] = [lampShade, embers];

  // --- ROOM 3: Library ---
  // Tall Bookshelf Wall + Instanced Books
  const shelfFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.7, 3.1, 7.6)), darkWoodMat);
  shelfFrame.position.set(13.45, 1.55, 7.1);
  shelfFrame.castShadow = true;
  root.add(shelfFrame);

  const bookCount = 96;
  const bookGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.34, 0.09));
  const bookMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.72 }));
  const instBooks = new THREE.InstancedMesh(bookGeo, bookMat, bookCount);
  const bookPalette = ['#7D2E3A', '#2B4257', '#4B5D43', '#8C6239', '#5E445A', '#A17449'];
  for (let i = 0; i < bookCount; i++) {
    const shelfRow = Math.floor(i / 24);
    const idxInRow = i % 24;
    const bz = 3.6 + idxInRow * 0.29;
    const by = 0.55 + shelfRow * 0.65;
    _dummy.position.set(13.15, by, bz);
    _dummy.scale.set(1, 0.88 + (i % 3) * 0.12, 1);
    _dummy.updateMatrix();
    instBooks.setMatrixAt(i, _dummy.matrix);
    _color.set(bookPalette[i % bookPalette.length]);
    instBooks.setColorAt(i, _color);
  }
  instBooks.computeBoundingSphere();
  root.add(instBooks);

  // Reading Desk + Open Journal
  const libDesk = new THREE.Group();
  libDesk.position.set(9.3, 0, 7.0);
  const dTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.7, 0.08, 1.0)), darkWoodMat);
  dTop.position.y = 0.78;
  libDesk.add(dTop);
  for (const dx of [-0.72, 0.72]) {
    for (const dz of [-0.38, 0.38]) {
      const leg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.78, 0.08)), darkWoodMat);
      leg.position.set(dx, 0.39, dz);
      libDesk.add(leg);
    }
  }
  const openJournal = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.03, 0.3)), creamTrimMat);
  openJournal.position.set(0, 0.84, 0.1);
  libDesk.add(openJournal);
  root.add(libDesk);
  addSconce(11.8, 2.4, 11.7, 0xffd29e, 1.6, 12);

  // --- ROOM 4: Music Room (Grand Piano) ---
  const piano = new THREE.Group();
  piano.position.set(-0.2, 0, -3.5);
  const pianoMat = trackMat(new THREE.MeshPhysicalMaterial({ color: '#141216', roughness: 0.16, metalness: 0.15, clearcoat: 0.9 }));
  const pBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.75, 0.28, 2.05)), pianoMat);
  pBody.position.y = 0.88;
  pBody.castShadow = true;
  piano.add(pBody);
  const pLid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.7, 0.05, 1.55)), pianoMat);
  pLid.position.set(-0.2, 1.28, -0.2);
  pLid.rotation.z = 0.35;
  piano.add(pLid);
  const keybed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.06, 0.26)), creamTrimMat);
  keybed.position.set(0, 0.82, 1.05);
  piano.add(keybed);
  for (const px of [-0.7, 0.7]) {
    for (const pz of [-0.82, 0.82]) {
      const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.035, 0.78, 10)), pianoMat);
      leg.position.set(px, 0.39, pz);
      piano.add(leg);
    }
  }
  const bench = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.0, 0.48, 0.42)), pianoMat);
  bench.position.set(0, 0.24, 1.55);
  piano.add(bench);
  root.add(piano);
  addSconce(-3.2, 2.5, -7.7, 0xffe0b2, 1.6, 12);

  // --- ROOM 5: Indoor Garden (Fountain + Swaying Flowers + Skylight + Butterflies) ---
  // Skylight ceiling beams
  for (let bx = -13; bx <= -6; bx += 2.3) {
    const beam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.22, 9.8)), darkWoodMat);
    beam.position.set(bx, WALL_HEIGHT, -3);
    root.add(beam);
  }
  const skylightGlass = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(8.8, 9.8)), glassMat);
  skylightGlass.rotation.x = Math.PI / 2;
  skylightGlass.position.set(-9.5, WALL_HEIGHT + 0.05, -3);
  root.add(skylightGlass);

  // Stone Fountain
  const fountain = new THREE.Group();
  fountain.position.set(-9.5, 0, -3.0);
  const basin = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.15, 1.25, 0.46, 20)), creamTrimMat);
  basin.position.y = 0.23;
  fountain.add(basin);
  const waterMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#6FB8C9', roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.85 })
  );
  const waterDisc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.02, 1.02, 0.05, 20)), waterMat);
  waterDisc.position.y = 0.44;
  fountain.add(waterDisc);
  const spire = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.22, 1.15, 14)), creamTrimMat);
  spire.position.y = 0.72;
  fountain.add(spire);
  root.add(fountain);

  // Instanced Garden Flowers (sway gently when player walks near!)
  const flowerCount = 48;
  const flowerStemGeo = trackGeo(new THREE.CylinderGeometry(0.025, 0.03, 0.45, 6));
  const flowerHeadGeo = trackGeo(new THREE.DodecahedronGeometry(0.11, 0));
  const stemMat = trackMat(new THREE.MeshStandardMaterial({ color: '#39633B', roughness: 0.8 }));
  const flowerHeadMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }));
  const instStems = new THREE.InstancedMesh(flowerStemGeo, stemMat, flowerCount);
  const instHeads = new THREE.InstancedMesh(flowerHeadGeo, flowerHeadMat, flowerCount);
  const flowerPositions: Array<{ x: number; z: number; phase: number; sway: number }> = [];
  const flowerColors = ['#E57C90', '#F5B8C4', '#F2D091', '#D95B72'];
  for (let i = 0; i < flowerCount; i++) {
    const angle = (i / flowerCount) * Math.PI * 2;
    const ring = i % 2 === 0 ? 1.85 : 3.2;
    const fx = -9.5 + Math.cos(angle) * ring + Math.sin(i * 3) * 0.35;
    const fz = -3.0 + Math.sin(angle) * ring + Math.cos(i * 2) * 0.35;
    flowerPositions.push({ x: fx, z: fz, phase: i * 0.6, sway: 0 });
    _color.set(flowerColors[i % flowerColors.length]);
    instHeads.setColorAt(i, _color);
  }
  instStems.frustumCulled = false;
  instHeads.frustumCulled = false;
  root.add(instStems, instHeads);

  const gardenLight = new THREE.PointLight(0xfff5db, 2.0, 14, 1.4);
  gardenLight.position.set(-9.5, 3.6, -3.0);
  root.add(gardenLight);

  // --- ROOM 6: Cozy Bedroom ---
  const bed = new THREE.Group();
  bed.position.set(11.6, 0, -3.0);
  const bedFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.42, 2.8)), darkWoodMat);
  bedFrame.position.y = 0.21;
  bed.add(bedFrame);
  const mattress = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 0.32, 2.6)), creamTrimMat);
  mattress.position.y = 0.56;
  bed.add(mattress);
  const quilt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.44, 0.22, 1.8)), velvetRoseMat);
  quilt.position.set(0, 0.64, -0.35);
  bed.add(quilt);
  const headboard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 1.55, 0.16)), darkWoodMat);
  headboard.position.set(0, 0.78, 1.35);
  bed.add(headboard);
  root.add(bed);

  const nightstand = new THREE.Group();
  nightstand.position.set(11.4, 0, -5.2);
  const nsBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 0.62, 0.55)), darkWoodMat);
  nsBox.position.y = 0.31;
  nightstand.add(nsBox);
  const nsShade = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.14, 0.22, 0.26, 12)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#FFF0D8', emissive: '#FFB36B', emissiveIntensity: 1.0 }))
  );
  nsShade.position.y = 0.82;
  nightstand.add(nsShade);
  root.add(nightstand);

  const jewelryTable = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.85, 0.78, 0.55)), darkWoodMat);
  jewelryTable.position.set(7.2, 0.39, -3.2);
  root.add(jewelryTable);
  const jBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.1, 0.18)), velvetRoseMat);
  jBox.position.set(7.2, 0.83, -3.2);
  root.add(jBox);

  const bedroomLight = new THREE.PointLight(0xffcb99, 1.8, 12, 1.5);
  bedroomLight.position.set(11.2, 1.6, -4.6);
  root.add(bedroomLight);
  toggleLights['obj_bedroom_lamp'] = [bedroomLight];
  toggleMeshes['obj_bedroom_lamp'] = [nsShade];

  // --- ROOM 7: Cinema Room ---
  const cinemaSeat = new THREE.Group();
  cinemaSeat.position.set(0, 0, -11.4);
  const seatBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.45, 1.05)), velvetNavyMat);
  seatBase.position.y = 0.25;
  cinemaSeat.add(seatBase);
  const seatBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.4, 0.85, 0.25)), velvetNavyMat);
  seatBack.position.set(0, 0.65, 0.4);
  cinemaSeat.add(seatBack);
  root.add(cinemaSeat);

  const screenMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.cinemaScreenOff,
      emissiveMap: tex.cinemaScreenOn,
      emissive: '#FFFFFF',
      emissiveIntensity: 0,
      roughness: 0.4,
    })
  );
  const screenFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6.2, 2.9, 0.18)), darkWoodMat);
  screenFrame.position.set(0, 2.05, -16.65);
  root.add(screenFrame);
  const screenMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(5.8, 2.5)), screenMat);
  screenMesh.position.set(0, 2.05, -16.54);
  root.add(screenMesh);

  const cinemaLight = new THREE.PointLight(0xd8c8ff, 1.2, 12, 1.5);
  cinemaLight.position.set(0, 3.2, -12.5);
  root.add(cinemaLight);

  // --- ROOM 8: Glass Balcony ---
  const bistro = new THREE.Group();
  bistro.position.set(-9.5, 0, -12.7);
  const bPole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.25, 0.76, 12)), brassMat);
  bPole.position.y = 0.38;
  bistro.add(bPole);
  const bTop = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 18)), creamTrimMat);
  bTop.position.y = 0.78;
  bistro.add(bTop);
  const lantern = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 8)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#FFE8B8', emissive: '#FFBB66', emissiveIntensity: 1.2 }))
  );
  lantern.position.y = 0.91;
  bistro.add(lantern);
  root.add(bistro);

  // Brass Telescope on North-West Corner
  const telescope = new THREE.Group();
  telescope.position.set(-12.6, 0, -15.6);
  const tri = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.32, 1.05, 3)), darkWoodMat);
  tri.position.y = 0.525;
  telescope.add(tri);
  const tube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 12)), brassMat);
  tube.position.set(0, 1.15, 0);
  tube.rotation.x = 1.15;
  tube.rotation.z = -0.45;
  telescope.add(tube);
  root.add(telescope);

  // --- ROOM 9: Memory Room ---
  // 4 Framed Memory Portraits along East wall
  tex.memoryTextures.forEach((mTex, i) => {
    const frameGroup = new THREE.Group();
    frameGroup.position.set(13.78, 1.9, -15.0 + i * 1.65);
    const frameBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 1.32, 1.06)), brassMat);
    frameGroup.add(frameBox);
    const canvasPlane = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.92, 1.18)),
      trackMat(new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.45 }))
    );
    canvasPlane.rotation.y = -Math.PI / 2;
    canvasPlane.position.x = -0.05;
    frameGroup.add(canvasPlane);
    root.add(frameGroup);
  });

  // Central Keepsake Pedestal (Secret Door Trigger!)
  const pedestal = new THREE.Group();
  pedestal.position.set(9.5, 0, -12.5);
  const pedBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.46, 1.05, 16)), creamTrimMat);
  pedBase.position.y = 0.525;
  pedestal.add(pedBase);
  const heartGemMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#E55E7B',
      emissive: '#D44868',
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.2,
    })
  );
  const heartGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.2, 0)), heartGemMat);
  heartGem.position.y = 1.32;
  pedestal.add(heartGem);
  root.add(pedestal);
  const memLight = new THREE.PointLight(0xffb5c8, 1.4, 10, 1.5);
  memLight.position.set(9.5, 2.2, -12.5);
  root.add(memLight);

  // --- ROOM 10: SECRET PROPOSAL SANCTUARY ---
  // Warm golden rose gazebo arch + flower-lined aisle + warm glowing lights
  const gazebo = new THREE.Group();
  gazebo.position.set(9.5, 0, -24.2);
  for (const gx of [-1.7, 1.7]) {
    const col = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 3.3, 14)), creamTrimMat);
    col.position.set(gx, 1.65, 0);
    gazebo.add(col);
  }
  const arch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.7, 0.14, 10, 28, Math.PI)),
    brassMat
  );
  arch.position.set(0, 3.25, 0);
  gazebo.add(arch);
  root.add(gazebo);

  // Rose pillars along aisle (InstancedMesh)
  const roseCount = 36;
  const roseGeo = trackGeo(new THREE.DodecahedronGeometry(0.16, 1));
  const roseMat = trackMat(new THREE.MeshStandardMaterial({ color: '#D14563', roughness: 0.55 }));
  const instRoses = new THREE.InstancedMesh(roseGeo, roseMat, roseCount);
  for (let i = 0; i < roseCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const row = Math.floor(i / 2);
    const rx = 9.5 + side * 2.1 + Math.sin(i) * 0.25;
    const rz = -18.4 - row * 0.45;
    const ry = 0.25 + (i % 3) * 0.22;
    _dummy.position.set(rx, ry, rz);
    _dummy.scale.setScalar(0.85 + (i % 3) * 0.2);
    _dummy.updateMatrix();
    instRoses.setMatrixAt(i, _dummy.matrix);
    _color.set(i % 3 === 0 ? '#E87088' : '#C93856');
    instRoses.setColorAt(i, _color);
  }
  instRoses.computeBoundingSphere();
  root.add(instRoses);

  const proposalLight = new THREE.PointLight(0xffc987, 2.8, 16, 1.3);
  proposalLight.position.set(9.5, 3.2, -22.2);
  root.add(proposalLight);

  // 6. AMBIENT & EVENT PARTICLE SYSTEMS (Zero GC in update)
  const MAX_PETALS = 90;
  const petalPositions = new Float32Array(MAX_PETALS * 3);
  const petalVel = new Float32Array(MAX_PETALS * 3);
  for (let i = 0; i < MAX_PETALS; i++) {
    petalPositions[i * 3] = 9.5 + (Math.random() - 0.5) * 7.5;
    petalPositions[i * 3 + 1] = Math.random() * 4.2;
    petalPositions[i * 3 + 2] = -22.2 + (Math.random() - 0.5) * 8.0;
    petalVel[i * 3] = (Math.random() - 0.5) * 0.25;
    petalVel[i * 3 + 1] = -0.35 - Math.random() * 0.35;
    petalVel[i * 3 + 2] = (Math.random() - 0.5) * 0.25;
  }
  const petalGeo = trackGeo(new THREE.BufferGeometry());
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));
  const petalPointsMat = trackMat(
    new THREE.PointsMaterial({
      map: tex.petalTex,
      size: 0.22,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    })
  );
  const petalPoints = new THREE.Points(petalGeo, petalPointsMat);
  petalPoints.frustumCulled = false;
  root.add(petalPoints);

  // Garden Butterflies / Fireflies (Room 5 & Room 8)
  const MAX_FLIES = 28;
  const flyPos = new Float32Array(MAX_FLIES * 3);
  for (let i = 0; i < MAX_FLIES; i++) {
    const inBalcony = i >= 16;
    flyPos[i * 3] = inBalcony ? -9.5 + (Math.random() - 0.5) * 7 : -9.5 + (Math.random() - 0.5) * 6.5;
    flyPos[i * 3 + 1] = 0.8 + Math.random() * 2.1;
    flyPos[i * 3 + 2] = inBalcony ? -12.5 + (Math.random() - 0.5) * 6 : -3.0 + (Math.random() - 0.5) * 6.5;
  }
  const flyGeo = trackGeo(new THREE.BufferGeometry());
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flyMat = trackMat(
    new THREE.PointsMaterial({
      map: tex.particleSoft,
      color: '#FFE6A8',
      size: 0.2,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const flyPoints = new THREE.Points(flyGeo, flyMat);
  flyPoints.frustumCulled = false;
  root.add(flyPoints);

  // Burst particles (Piano notes, Fountain sparkles, Kiss hearts, Proposal celebration)
  const MAX_BURST = 48;
  const burstPos = new Float32Array(MAX_BURST * 3);
  const burstVel = new Float32Array(MAX_BURST * 3);
  const burstLife = new Float32Array(MAX_BURST);
  const burstGeo = trackGeo(new THREE.BufferGeometry());
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  const burstMat = trackMat(
    new THREE.PointsMaterial({
      map: tex.particleSoft,
      color: '#FF9AB0',
      size: 0.28,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const burstPoints = new THREE.Points(burstGeo, burstMat);
  burstPoints.frustumCulled = false;
  root.add(burstPoints);

  const spawnBurst = (cx: number, cy: number, cz: number, count: number, colorHex: string, spread = 1.6) => {
    burstMat.color.set(colorHex);
    let spawned = 0;
    for (let i = 0; i < MAX_BURST && spawned < count; i++) {
      if (burstLife[i] <= 0) {
        burstPos[i * 3] = cx + (Math.random() - 0.5) * 0.6;
        burstPos[i * 3 + 1] = cy + Math.random() * 0.4;
        burstPos[i * 3 + 2] = cz + (Math.random() - 0.5) * 0.6;
        burstVel[i * 3] = (Math.random() - 0.5) * spread;
        burstVel[i * 3 + 1] = 0.8 + Math.random() * 1.4;
        burstVel[i * 3 + 2] = (Math.random() - 0.5) * spread;
        burstLife[i] = 1.6 + Math.random() * 1.0;
        spawned++;
      }
    }
  };

  let cinemaOn = false;
  let celebrationMode = false;

  return {
    group: root,
    doors,
    setDoorOpen: (id, open) => {
      const d = doors.get(id);
      if (d) d.isOpen = open;
    },
    setInteractionActive: (id, active) => {
      if (id === 'obj_cinema_screen') {
        cinemaOn = active;
        screenMat.map = active ? tex.cinemaScreenOn : tex.cinemaScreenOff;
        screenMat.emissiveIntensity = active ? 0.95 : 0;
        screenMat.needsUpdate = true;
        cinemaLight.intensity = active ? 0.35 : 1.2;
      }
      const lights = toggleLights[id];
      if (lights) {
        lights.forEach((l) => {
          l.intensity = active ? 0.45 : 2.0;
        });
      }
      const meshes = toggleMeshes[id];
      if (meshes) {
        meshes.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && 'emissiveIntensity' in mat) {
            mat.emissiveIntensity = active ? 0.2 : 1.2;
          }
        });
      }
    },
    triggerPianoBurst: () => {
      spawnBurst(-0.2, 1.35, -3.5, 20, '#F5D68E', 1.8);
    },
    triggerFountainBurst: () => {
      spawnBurst(-9.5, 1.2, -3.0, 26, '#A6E6FF', 2.1);
    },
    triggerKissHearts: (center) => {
      spawnBurst(center.x, center.y + 1.5, center.z, 26, '#FF7597', 1.4);
    },
    triggerCelebration: () => {
      celebrationMode = true;
      spawnBurst(9.5, 1.4, -22.2, 42, '#FFD27D', 3.2);
    },
    resetState: () => {
      celebrationMode = false;
      cinemaOn = false;
      screenMat.map = tex.cinemaScreenOff;
      screenMat.emissiveIntensity = 0;
      screenMat.needsUpdate = true;
      cinemaLight.intensity = 1.2;
      Object.values(toggleLights).forEach((lights) => {
        lights.forEach((l) => {
          l.intensity = 2.0;
        });
      });
      Object.values(toggleMeshes).forEach((meshes) => {
        meshes.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat && 'emissiveIntensity' in mat) {
            mat.emissiveIntensity = 1.2;
          }
        });
      });
      doors.forEach((d) => {
        d.isOpen = d.def.defaultOpen;
        if (d.def.isSecret) {
          d.slideOffset = 0;
          d.pivot.position.x = d.def.x;
        } else {
          d.currentAngle = d.def.defaultOpen ? (Math.PI / 2) * 0.92 : 0;
          d.pivot.rotation.y = d.currentAngle;
        }
      });
    },
    update: (dt, elapsed, playerPos, particlesEnabled, proposalActive) => {
      // Animate doors smoothly
      doors.forEach((d) => {
        if (d.def.isSecret) {
          const targetSlide = d.isOpen ? 2.1 : 0;
          d.slideOffset = THREE.MathUtils.lerp(d.slideOffset, targetSlide, 1 - Math.exp(-5 * dt));
          d.pivot.position.x = d.def.x + d.slideOffset;
        } else {
          const targetAngle = d.isOpen ? (Math.PI / 2) * 0.92 : 0;
          d.currentAngle = THREE.MathUtils.lerp(d.currentAngle, targetAngle, 1 - Math.exp(-8 * dt));
          d.pivot.rotation.y = d.currentAngle;
        }
      });

      // Heart keepsake gem rotation in Memory Room
      heartGem.rotation.y = elapsed * 1.1;
      heartGem.position.y = 1.32 + Math.sin(elapsed * 2.2) * 0.06;

      // Living room hearth warmth flicker
      embers.scale.y = 0.42 + Math.sin(elapsed * 7.5) * 0.06;

      // Garden flowers sway when player walks near
      for (let i = 0; i < flowerCount; i++) {
        const fp = flowerPositions[i];
        const dx = playerPos.x - fp.x;
        const dz = playerPos.z - fp.z;
        const distSq = dx * dx + dz * dz;
        const targetSway = distSq < 2.2 ? (1 - distSq / 2.2) * 0.35 : 0;
        fp.sway = THREE.MathUtils.lerp(fp.sway, targetSway, 1 - Math.exp(-8 * dt));
        const idleWind = Math.sin(elapsed * 1.8 + fp.phase) * 0.06;
        const tilt = idleWind + fp.sway;

        _dummy.position.set(fp.x, 0.22, fp.z);
        _dummy.rotation.set(tilt, fp.phase, tilt * 0.5);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        instStems.setMatrixAt(i, _dummy.matrix);

        _dummy.position.set(fp.x + tilt * 0.25, 0.45, fp.z);
        _dummy.updateMatrix();
        instHeads.setMatrixAt(i, _dummy.matrix);
      }
      instStems.instanceMatrix.needsUpdate = true;
      instHeads.instanceMatrix.needsUpdate = true;

      // Cinema subtle shimmer when active
      if (cinemaOn) {
        screenMat.emissiveIntensity = 0.88 + Math.sin(elapsed * 2.4) * 0.1;
      }

      // Particles visibility & updates
      petalPoints.visible = particlesEnabled;
      flyPoints.visible = particlesEnabled;
      burstPoints.visible = particlesEnabled;
      if (!particlesEnabled) return;

      const petalSpeedMult = proposalActive || celebrationMode ? 1.35 : 0.75;
      for (let i = 0; i < MAX_PETALS; i++) {
        petalPositions[i * 3] += (petalVel[i * 3] + Math.sin(elapsed + i) * 0.14) * dt;
        petalPositions[i * 3 + 1] += petalVel[i * 3 + 1] * dt * petalSpeedMult;
        petalPositions[i * 3 + 2] += petalVel[i * 3 + 2] * dt;
        if (petalPositions[i * 3 + 1] < 0.05) {
          petalPositions[i * 3 + 1] = 4.1;
          petalPositions[i * 3] = 9.5 + (Math.random() - 0.5) * 7.5;
          petalPositions[i * 3 + 2] = -22.2 + (Math.random() - 0.5) * 8.0;
        }
      }
      petalGeo.attributes.position.needsUpdate = true;

      for (let i = 0; i < MAX_FLIES; i++) {
        flyPos[i * 3] += Math.sin(elapsed * 1.4 + i) * 0.22 * dt;
        flyPos[i * 3 + 1] += Math.cos(elapsed * 2.1 + i * 1.3) * 0.18 * dt;
        flyPos[i * 3 + 2] += Math.cos(elapsed * 1.2 + i * 0.7) * 0.22 * dt;
      }
      flyGeo.attributes.position.needsUpdate = true;

      let anyBurst = false;
      for (let i = 0; i < MAX_BURST; i++) {
        if (burstLife[i] > 0) {
          anyBurst = true;
          burstLife[i] -= dt;
          burstPos[i * 3] += burstVel[i * 3] * dt;
          burstPos[i * 3 + 1] += burstVel[i * 3 + 1] * dt;
          burstPos[i * 3 + 2] += burstVel[i * 3 + 2] * dt;
          if (burstLife[i] <= 0) {
            burstPos[i * 3 + 1] = -999;
          }
        }
      }
      if (anyBurst) {
        burstGeo.attributes.position.needsUpdate = true;
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
