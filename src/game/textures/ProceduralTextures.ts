import * as THREE from 'three';

export interface MansionTexturePack {
  oakParquet: THREE.CanvasTexture;
  marbleTile: THREE.CanvasTexture;
  plasterWall: THREE.CanvasTexture;
  darkWood: THREE.CanvasTexture;
  gardenStone: THREE.CanvasTexture;
  persianRug: THREE.CanvasTexture;
  cinemaScreenOff: THREE.CanvasTexture;
  cinemaScreenOn: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  particleSoft: THREE.CanvasTexture;
  petalTex: THREE.CanvasTexture;
  memoryTextures: THREE.CanvasTexture[];
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finalizeTex(
  canvas: HTMLCanvasElement,
  repeatX = 1,
  repeatY = 1,
  anisotropy = 4,
  srgb = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTexturePack(maxAnisotropy = 4): MansionTexturePack {
  const created: THREE.CanvasTexture[] = [];
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  // 1. Warm Oak Parquet
  const [cOak, ctxOak] = makeCanvas(512, 512);
  ctxOak.fillStyle = '#755136';
  ctxOak.fillRect(0, 0, 512, 512);
  const plankH = 64;
  const plankW = 128;
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * 64;
    for (let col = -1; col < 5; col++) {
      const shade = ((row * 7 + col * 13) % 18) - 9;
      ctxOak.fillStyle = `rgb(${120 + shade}, ${82 + Math.round(shade * 0.7)}, ${54 + Math.round(shade * 0.5)})`;
      ctxOak.fillRect(col * plankW + offset + 1, row * plankH + 1, plankW - 2, plankH - 2);
      // subtle wood grain lines
      ctxOak.strokeStyle = 'rgba(42, 24, 14, 0.16)';
      ctxOak.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        ctxOak.beginPath();
        const gy = row * plankH + 10 + g * 14;
        ctxOak.moveTo(col * plankW + offset + 4, gy);
        ctxOak.bezierCurveTo(
          col * plankW + offset + 40,
          gy + 3,
          col * plankW + offset + 85,
          gy - 3,
          col * plankW + offset + plankW - 4,
          gy
        );
        ctxOak.stroke();
      }
    }
  }
  const oakParquet = finalizeTex(cOak, 4, 4, aniso);
  created.push(oakParquet);

  // 2. Cream & Charcoal Veined Marble Tile
  const [cMarb, ctxMarb] = makeCanvas(512, 512);
  const tile = 256;
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      const light = (x + y) % 2 === 0;
      ctxMarb.fillStyle = light ? '#EAE2D6' : '#C9BFB4';
      ctxMarb.fillRect(x * tile, y * tile, tile, tile);
      // soft marble veins
      ctxMarb.strokeStyle = light ? 'rgba(155, 142, 128, 0.25)' : 'rgba(245, 238, 230, 0.22)';
      ctxMarb.lineWidth = 2;
      ctxMarb.beginPath();
      ctxMarb.moveTo(x * tile + 20, y * tile + 10);
      ctxMarb.bezierCurveTo(
        x * tile + 100,
        y * tile + 90,
        x * tile + 150,
        y * tile + 160,
        x * tile + 240,
        y * tile + 240
      );
      ctxMarb.stroke();
      ctxMarb.strokeStyle = 'rgba(80,70,64,0.18)';
      ctxMarb.strokeRect(x * tile, y * tile, tile, tile);
    }
  }
  const marbleTile = finalizeTex(cMarb, 3, 3, aniso);
  created.push(marbleTile);

  // 3. Warm Limestone Plaster Wall
  const [cWall, ctxWall] = makeCanvas(256, 256);
  ctxWall.fillStyle = '#EFE6D8';
  ctxWall.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctxWall.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(140,120,100,0.06)';
    ctxWall.fillRect(x, y, 3, 3);
  }
  const plasterWall = finalizeTex(cWall, 2, 1, aniso);
  created.push(plasterWall);

  // 4. Walnut / Mahogany Wood
  const [cWal, ctxWal] = makeCanvas(256, 256);
  ctxWal.fillStyle = '#4B2E20';
  ctxWal.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 6) {
    ctxWal.fillStyle = y % 12 === 0 ? 'rgba(30,15,8,0.22)' : 'rgba(110,68,45,0.15)';
    ctxWal.fillRect(0, y, 256, 3);
  }
  const darkWood = finalizeTex(cWal, 2, 2, aniso);
  created.push(darkWood);

  // 5. Conservatory Garden Stone
  const [cStone, ctxStone] = makeCanvas(512, 512);
  ctxStone.fillStyle = '#8E887E';
  ctxStone.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tone = 148 + ((r * 11 + c * 19) % 24) - 12;
      ctxStone.fillStyle = `rgb(${tone}, ${tone - 4}, ${tone - 12})`;
      ctxStone.fillRect(c * 128 + 4, r * 128 + 4, 120, 120);
    }
  }
  const gardenStone = finalizeTex(cStone, 3, 3, aniso);
  created.push(gardenStone);

  // 6. Persian / Woven Rug
  const [cRug, ctxRug] = makeCanvas(512, 512);
  ctxRug.fillStyle = '#6E2836';
  ctxRug.fillRect(0, 0, 512, 512);
  ctxRug.strokeStyle = '#D4A55D';
  ctxRug.lineWidth = 14;
  ctxRug.strokeRect(24, 24, 464, 464);
  ctxRug.strokeStyle = '#E8D5B7';
  ctxRug.lineWidth = 4;
  ctxRug.strokeRect(48, 48, 416, 416);
  ctxRug.fillStyle = '#4D1C26';
  ctxRug.beginPath();
  ctxRug.arc(256, 256, 110, 0, Math.PI * 2);
  ctxRug.fill();
  ctxRug.strokeStyle = '#D4A55D';
  ctxRug.lineWidth = 5;
  ctxRug.stroke();
  const persianRug = finalizeTex(cRug, 1, 1, aniso);
  created.push(persianRug);

  // 7. Cinema Screens (Off & On)
  const [cScrOff, ctxScrOff] = makeCanvas(512, 256);
  ctxScrOff.fillStyle = '#181A20';
  ctxScrOff.fillRect(0, 0, 512, 256);
  const cinemaScreenOff = finalizeTex(cScrOff, 1, 1, aniso);
  created.push(cinemaScreenOff);

  const [cScrOn, ctxScrOn] = makeCanvas(512, 256);
  const grad = ctxScrOn.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#19142B');
  grad.addColorStop(0.55, '#412548');
  grad.addColorStop(1, '#B35E6B');
  ctxScrOn.fillStyle = grad;
  ctxScrOn.fillRect(0, 0, 512, 256);
  // Starfield & twin silhouette glow
  ctxScrOn.fillStyle = '#FFF5E1';
  for (let i = 0; i < 65; i++) {
    const sx = (i * 79) % 512;
    const sy = (i * 43) % 180;
    ctxScrOn.beginPath();
    ctxScrOn.arc(sx, sy, (i % 3) + 0.8, 0, Math.PI * 2);
    ctxScrOn.fill();
  }
  ctxScrOn.fillStyle = 'rgba(242, 208, 145, 0.9)';
  ctxScrOn.font = 'italic 34px Georgia, serif';
  ctxScrOn.textAlign = 'center';
  ctxScrOn.fillText('Every star has a story...', 256, 134);
  const cinemaScreenOn = finalizeTex(cScrOn, 1, 1, aniso);
  created.push(cinemaScreenOn);

  // 8. Soft Radial Contact Shadow
  const [cShad, ctxShad] = makeCanvas(128, 128);
  const rGrad = ctxShad.createRadialGradient(64, 64, 6, 64, 64, 62);
  rGrad.addColorStop(0, 'rgba(10, 6, 8, 0.55)');
  rGrad.addColorStop(0.6, 'rgba(10, 6, 8, 0.22)');
  rGrad.addColorStop(1, 'rgba(10, 6, 8, 0.0)');
  ctxShad.fillStyle = rGrad;
  ctxShad.fillRect(0, 0, 128, 128);
  const contactShadow = finalizeTex(cShad, 1, 1, 1);
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;
  created.push(contactShadow);

  // 9. Soft Particle Glow
  const [cPart, ctxPart] = makeCanvas(64, 64);
  const pGrad = ctxPart.createRadialGradient(32, 32, 2, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255,255,255,1)');
  pGrad.addColorStop(0.45, 'rgba(255,240,220,0.65)');
  pGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctxPart.fillStyle = pGrad;
  ctxPart.fillRect(0, 0, 64, 64);
  const particleSoft = finalizeTex(cPart, 1, 1, 1);
  created.push(particleSoft);

  // 10. Rose Petal Texture
  const [cPet, ctxPet] = makeCanvas(64, 64);
  ctxPet.fillStyle = '#D64F6B';
  ctxPet.beginPath();
  ctxPet.ellipse(32, 32, 20, 26, 0.3, 0, Math.PI * 2);
  ctxPet.fill();
  ctxPet.fillStyle = 'rgba(255, 200, 210, 0.35)';
  ctxPet.beginPath();
  ctxPet.ellipse(27, 26, 8, 12, 0.3, 0, Math.PI * 2);
  ctxPet.fill();
  const petalTex = finalizeTex(cPet, 1, 1, 1);
  created.push(petalTex);

  // 11. 4 Warm Memory Painting Textures
  const memoryPalettes = [
    ['#2E223B', '#B86A77', '#F2D091', 'First Evening'],
    ['#1F323E', '#5D8AA8', '#F4DFC8', 'Quiet Rain'],
    ['#3B2624', '#C47D55', '#FAF0DC', 'Golden Hour'],
    ['#2A1E2E', '#9E4B63', '#F5D69E', 'Always Yours'],
  ];
  const memoryTextures = memoryPalettes.map(([top, mid, bot, caption]) => {
    const [cm, ctxm] = makeCanvas(256, 320);
    const mg = ctxm.createLinearGradient(0, 0, 0, 320);
    mg.addColorStop(0, top);
    mg.addColorStop(0.55, mid);
    mg.addColorStop(1, bot);
    ctxm.fillStyle = mg;
    ctxm.fillRect(0, 0, 256, 320);
    ctxm.fillStyle = 'rgba(255, 248, 236, 0.85)';
    ctxm.beginPath();
    ctxm.arc(128, 130, 36, 0, Math.PI * 2);
    ctxm.fill();
    ctxm.fillStyle = 'rgba(20, 14, 18, 0.5)';
    ctxm.fillRect(0, 250, 256, 70);
    ctxm.fillStyle = '#FAF6F0';
    ctxm.font = 'italic 22px Georgia, serif';
    ctxm.textAlign = 'center';
    ctxm.fillText(caption, 128, 292);
    const t = finalizeTex(cm, 1, 1, aniso);
    created.push(t);
    return t;
  });

  return {
    oakParquet,
    marbleTile,
    plasterWall,
    darkWood,
    gardenStone,
    persianRug,
    cinemaScreenOff,
    cinemaScreenOn,
    contactShadow,
    particleSoft,
    petalTex,
    memoryTextures,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}
