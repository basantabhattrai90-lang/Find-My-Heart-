import * as THREE from 'three';
import { CharacterAppearance } from '../../types/game';

export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  ringBox: THREE.Group;
  dispose: () => void;
}

function createFaceTexture(skinHex: string, isGirl: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = skinHex;
  ctx.fillRect(0, 0, 256, 256);

  // Soft natural cheek warmth
  const cheekGradL = ctx.createRadialGradient(84, 148, 2, 84, 148, 24);
  cheekGradL.addColorStop(0, 'rgba(205, 105, 105, 0.24)');
  cheekGradL.addColorStop(1, 'rgba(205, 105, 105, 0)');
  ctx.fillStyle = cheekGradL;
  ctx.fillRect(56, 120, 56, 56);

  const cheekGradR = ctx.createRadialGradient(172, 148, 2, 172, 148, 24);
  cheekGradR.addColorStop(0, 'rgba(205, 105, 105, 0.24)');
  cheekGradR.addColorStop(1, 'rgba(205, 105, 105, 0)');
  ctx.fillStyle = cheekGradR;
  ctx.fillRect(144, 120, 56, 56);

  // Subtle eyebrows
  ctx.strokeStyle = '#33221A';
  ctx.lineWidth = isGirl ? 3 : 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(86, 108);
  ctx.quadraticCurveTo(100, 102, 114, 107);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(142, 107);
  ctx.quadraticCurveTo(156, 102, 170, 108);
  ctx.stroke();

  // Natural stylized eyes (sclera + warm iris + pupil + highlight)
  const drawEye = (cx: number) => {
    ctx.fillStyle = '#F7F4F0';
    ctx.beginPath();
    ctx.ellipse(cx, 124, 11, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4A3122';
    ctx.beginPath();
    ctx.arc(cx, 124, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#18110E';
    ctx.beginPath();
    ctx.arc(cx, 124, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx + 1.8, 122.2, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // subtle upper lash line
    ctx.strokeStyle = '#251812';
    ctx.lineWidth = isGirl ? 2.4 : 1.7;
    ctx.beginPath();
    ctx.ellipse(cx, 123, 11.5, 6.5, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  };
  drawEye(101);
  drawEye(155);

  // Soft lips / gentle smile
  ctx.strokeStyle = isGirl ? '#B55B67' : '#9E615B';
  ctx.lineWidth = isGirl ? 3.2 : 2.5;
  ctx.beginPath();
  ctx.moveTo(116, 168);
  ctx.quadraticCurveTo(128, 174, 140, 168);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildStylizedCharacter(
  appearance: CharacterAppearance,
  contactShadowTex?: THREE.Texture
): CharacterRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const isGirl = appearance.gender === 'girl';

  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: appearance.skinTone,
      roughness: 0.58,
      metalness: 0.02,
    })
  );

  const faceTex = createFaceTexture(appearance.skinTone, isGirl);
  textures.push(faceTex);
  const faceMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.56,
      metalness: 0.02,
    })
  );

  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: appearance.hairColor,
      roughness: 0.48,
      metalness: 0.06,
    })
  );

  const outfitPrimary = trackMat(
    new THREE.MeshStandardMaterial({
      color: appearance.outfitColor,
      roughness: appearance.outfit === 'evening' ? 0.38 : 0.72,
      metalness: appearance.outfit === 'evening' ? 0.08 : 0.02,
    })
  );

  const outfitSecondary = trackMat(
    new THREE.MeshStandardMaterial({
      color: appearance.outfit === 'blazer' ? '#EFE9DF' : '#262429',
      roughness: 0.78,
      metalness: 0.02,
    })
  );

  const shoeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#231A17',
      roughness: 0.35,
      metalness: 0.15,
    })
  );

  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#E5BD73',
      roughness: 0.2,
      metalness: 0.9,
    })
  );

  const root = new THREE.Group();

  // Soft grounded contact shadow
  if (contactShadowTex) {
    const shadGeo = trackGeo(new THREE.PlaneGeometry(0.95, 0.95));
    const shadMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    const shad = new THREE.Mesh(shadGeo, shadMat);
    shad.rotation.x = -Math.PI / 2;
    shad.position.y = 0.012;
    root.add(shad);
  }

  // Hips at pelvis height (~0.88m)
  const hips = new THREE.Group();
  hips.position.y = 0.88;
  root.add(hips);

  const pelvisGeo = trackGeo(new THREE.CylinderGeometry(isGirl ? 0.145 : 0.155, isGirl ? 0.16 : 0.15, 0.16, 16));
  const pelvis = new THREE.Mesh(pelvisGeo, appearance.outfit === 'evening' && isGirl ? outfitPrimary : outfitSecondary);
  pelvis.castShadow = true;
  hips.add(pelvis);

  // Torso sculpted with LatheGeometry for natural realistic silhouette
  const torso = new THREE.Group();
  torso.position.y = 0.08;
  hips.add(torso);

  const torsoPts = isGirl
    ? [
        new THREE.Vector2(0.135, 0),
        new THREE.Vector2(0.115, 0.16),
        new THREE.Vector2(0.148, 0.34),
        new THREE.Vector2(0.155, 0.45),
        new THREE.Vector2(0.06, 0.52),
      ]
    : [
        new THREE.Vector2(0.145, 0),
        new THREE.Vector2(0.14, 0.18),
        new THREE.Vector2(0.175, 0.38),
        new THREE.Vector2(0.18, 0.47),
        new THREE.Vector2(0.068, 0.54),
      ];
  const torsoGeo = trackGeo(new THREE.LatheGeometry(torsoPts, 18));
  const torsoMesh = new THREE.Mesh(torsoGeo, outfitPrimary);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torso.add(torsoMesh);

  // Outfit collar / lapel / belt accent
  const lapelGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.115, 0.11, 14));
  const lapel = new THREE.Mesh(lapelGeo, outfitSecondary);
  lapel.position.set(0, 0.45, 0.015);
  torso.add(lapel);

  if (appearance.outfit === 'evening' && isGirl) {
    // Flowing A-line skirt silhouette
    const skirtPts = [
      new THREE.Vector2(0.135, 0.02),
      new THREE.Vector2(0.21, -0.22),
      new THREE.Vector2(0.27, -0.52),
    ];
    const skirtGeo = trackGeo(new THREE.LatheGeometry(skirtPts, 20));
    const skirtMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: appearance.outfitColor,
        roughness: 0.42,
        metalness: 0.05,
        side: THREE.DoubleSide,
      })
    );
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.castShadow = true;
    hips.add(skirt);
  } else if (appearance.outfit === 'coat') {
    const beltGeo = trackGeo(new THREE.CylinderGeometry(0.142, 0.142, 0.045, 16));
    const belt = new THREE.Mesh(beltGeo, goldMat);
    belt.position.y = 0.09;
    torso.add(belt);
  }

  // Neck + Head
  const neckGeo = trackGeo(new THREE.CylinderGeometry(0.046, 0.055, 0.11, 12));
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 0.55;
  torso.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.69;
  torso.add(head);

  const headGeo = trackGeo(new THREE.SphereGeometry(0.122, 22, 18));
  const headMesh = new THREE.Mesh(headGeo, faceMat);
  headMesh.scale.set(0.92, 1.08, 0.96);
  // Rotate so UV front faces +Z
  headMesh.rotation.y = -Math.PI / 2;
  headMesh.castShadow = true;
  head.add(headMesh);

  // Subtle nose bridge
  const noseGeo = trackGeo(new THREE.ConeGeometry(0.016, 0.042, 8));
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, -0.008, 0.116);
  head.add(nose);

  // Hair styles (composite sculpted hair parts)
  const hairGroup = new THREE.Group();
  head.add(hairGroup);

  const capGeo = trackGeo(new THREE.SphereGeometry(0.128, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62));
  const cap = new THREE.Mesh(capGeo, hairMat);
  cap.scale.set(0.95, 1.07, 1.0);
  cap.position.set(0, 0.016, -0.012);
  cap.rotation.x = -0.25;
  cap.castShadow = true;
  hairGroup.add(cap);

  if (appearance.hairStyle === 'soft_waves') {
    for (const side of [-1, 1]) {
      const waveGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.025, 0.34, 10));
      const wave = new THREE.Mesh(waveGeo, hairMat);
      wave.position.set(side * 0.105, -0.08, -0.015);
      wave.rotation.z = side * -0.14;
      hairGroup.add(wave);
    }
    const backGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.125, 0.34, 14));
    const back = new THREE.Mesh(backGeo, hairMat);
    back.position.set(0, -0.11, -0.065);
    hairGroup.add(back);
  } else if (appearance.hairStyle === 'shoulder_bob') {
    for (const side of [-1, 1]) {
      const bobGeo = trackGeo(new THREE.CylinderGeometry(0.038, 0.032, 0.22, 10));
      const bob = new THREE.Mesh(bobGeo, hairMat);
      bob.position.set(side * 0.105, -0.03, -0.01);
      bob.rotation.z = side * -0.12;
      hairGroup.add(bob);
    }
    const backGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.115, 0.21, 14));
    const back = new THREE.Mesh(backGeo, hairMat);
    back.position.set(0, -0.05, -0.06);
    hairGroup.add(back);
  } else if (appearance.hairStyle === 'low_bun') {
    const bunGeo = trackGeo(new THREE.SphereGeometry(0.062, 14, 12));
    const bun = new THREE.Mesh(bunGeo, hairMat);
    bun.position.set(0, -0.02, -0.135);
    hairGroup.add(bun);
  } else if (appearance.hairStyle === 'tousled_crop') {
    for (let i = -2; i <= 2; i++) {
      const tuftGeo = trackGeo(new THREE.SphereGeometry(0.046, 10, 8));
      const tuft = new THREE.Mesh(tuftGeo, hairMat);
      tuft.scale.set(1.2, 0.75, 1.3);
      tuft.position.set(i * 0.036, 0.115, 0.045 - Math.abs(i) * 0.015);
      hairGroup.add(tuft);
    }
  } else {
    // classic_part
    const sideSweepGeo = trackGeo(new THREE.SphereGeometry(0.075, 12, 10));
    const sweep = new THREE.Mesh(sideSweepGeo, hairMat);
    sweep.scale.set(1.3, 0.55, 1.1);
    sweep.position.set(-0.025, 0.105, 0.035);
    hairGroup.add(sweep);
  }

  // Arms
  const shoulderOffsetX = isGirl ? 0.175 : 0.205;
  const makeArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderOffsetX, 0.44, 0);
    torso.add(shoulder);

    const upperGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.036, 0.26, 10));
    const upper = new THREE.Mesh(upperGeo, outfitPrimary);
    upper.position.y = -0.12;
    upper.castShadow = true;
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.25;
    shoulder.add(elbow);

    const foreGeo = trackGeo(new THREE.CylinderGeometry(0.034, 0.028, 0.24, 10));
    const fore = new THREE.Mesh(foreGeo, appearance.outfit === 'evening' && isGirl ? skinMat : outfitPrimary);
    fore.position.y = -0.11;
    fore.castShadow = true;
    elbow.add(fore);

    const handGeo = trackGeo(new THREE.SphereGeometry(0.032, 10, 8));
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.scale.set(0.85, 1.15, 0.65);
    hand.position.y = -0.245;
    elbow.add(hand);

    return { shoulder, elbow };
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Velvet Ring Box (hidden unless kneeling proposal)
  const ringBox = new THREE.Group();
  ringBox.visible = false;
  ringBox.position.set(0, -0.26, 0.05);
  rightArm.elbow.add(ringBox);

  const boxBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.07, 0.035, 0.07)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#5A1625', roughness: 0.85 }))
  );
  ringBox.add(boxBase);

  const boxLid = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.07, 0.015, 0.065)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#5A1625', roughness: 0.85 }))
  );
  boxLid.position.set(0, 0.035, -0.025);
  boxLid.rotation.x = -1.1;
  ringBox.add(boxLid);

  const ringBand = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.016, 0.004, 8, 16)), goldMat);
  ringBand.position.set(0, 0.024, 0);
  ringBox.add(ringBand);

  const diamond = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.012, 0)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        emissive: '#FFF4D6',
        emissiveIntensity: 0.55,
        roughness: 0.05,
        metalness: 0.2,
      })
    )
  );
  diamond.position.set(0, 0.04, 0);
  ringBox.add(diamond);

  // Legs
  const hipOffsetX = isGirl ? 0.078 : 0.088;
  const makeLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * hipOffsetX, -0.04, 0);
    hips.add(hip);

    const thighGeo = trackGeo(new THREE.CylinderGeometry(0.056, 0.046, 0.42, 12));
    const thigh = new THREE.Mesh(thighGeo, outfitSecondary);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.42;
    hip.add(knee);

    const shinGeo = trackGeo(new THREE.CylinderGeometry(0.044, 0.033, 0.4, 12));
    const shin = new THREE.Mesh(shinGeo, outfitSecondary);
    shin.position.y = -0.2;
    shin.castShadow = true;
    knee.add(shin);

    const footGeo = trackGeo(new THREE.BoxGeometry(0.076, 0.055, 0.165));
    const foot = new THREE.Mesh(footGeo, shoeMat);
    foot.position.set(0, -0.405, 0.038);
    foot.castShadow = true;
    knee.add(foot);

    return { hip, knee };
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  return {
    root,
    hips,
    torso,
    head,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    ringBox,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
