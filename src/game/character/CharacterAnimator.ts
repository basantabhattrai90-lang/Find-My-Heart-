import * as THREE from 'three';
import { AnimationState } from '../../types/game';
import { CharacterRig } from './CharacterBuilder';

export class CharacterAnimator {
  private phase = 0;
  private kissTimer = 0;

  public update(
    rig: CharacterRig,
    state: AnimationState,
    speed: number,
    dt: number,
    time: number
  ): void {
    const damp = 1 - Math.exp(-12 * dt);

    // Default target joint angles
    let hipsY = 0.88;
    let torsoRx = 0;
    let torsoRy = 0;
    let headRx = 0;
    let headRz = 0;
    let lShX = 0;
    let lShZ = 0.08;
    let lElX = -0.12;
    let rShX = 0;
    let rShZ = -0.08;
    let rElX = -0.12;
    let lHipX = 0;
    let lKneeX = 0;
    let rHipX = 0;
    let rKneeX = 0;
    let showRingBox = false;

    if (state === 'walk' || state === 'run') {
      const freq = state === 'run' ? 11.5 : 7.5;
      const amp = state === 'run' ? 0.78 : 0.48;
      this.phase += dt * freq * Math.max(0.5, Math.min(1.3, speed / (state === 'run' ? 6 : 3.2)));
      const s = Math.sin(this.phase);
      const c = Math.cos(this.phase);

      hipsY = 0.88 + Math.abs(c) * (state === 'run' ? 0.045 : 0.025);
      torsoRx = state === 'run' ? 0.14 : 0.05;
      torsoRy = -s * 0.06;

      lHipX = s * amp;
      rHipX = -s * amp;
      lKneeX = Math.max(0, -c) * (state === 'run' ? 0.9 : 0.52);
      rKneeX = Math.max(0, c) * (state === 'run' ? 0.9 : 0.52);

      lShX = -s * amp * 0.8;
      rShX = s * amp * 0.8;
      lElX = state === 'run' ? -0.85 : -0.25 - Math.max(0, s) * 0.25;
      rElX = state === 'run' ? -0.85 : -0.25 - Math.max(0, -s) * 0.25;
    } else if (state === 'jump') {
      hipsY = 0.92;
      torsoRx = 0.08;
      lHipX = -0.35;
      lKneeX = 0.65;
      rHipX = -0.2;
      rKneeX = 0.45;
      lShX = -0.6;
      rShX = -0.6;
      lShZ = 0.35;
      rShZ = -0.35;
    } else if (state === 'land') {
      hipsY = 0.78;
      torsoRx = 0.15;
      lHipX = -0.28;
      lKneeX = 0.52;
      rHipX = -0.28;
      rKneeX = 0.52;
      lShX = 0.25;
      rShX = 0.25;
    } else if (state === 'interact') {
      torsoRx = 0.1;
      rShX = -0.95;
      rElX = -0.35;
    } else if (state === 'kiss') {
      this.kissTimer += dt;
      hipsY = 0.87;
      torsoRx = 0.14;
      headRx = -0.08;
      headRz = 0.16; // Gentle romantic head tilt
      lShX = -0.55;
      lShZ = -0.18;
      lElX = -0.85;
      rShX = -0.55;
      rShZ = 0.18;
      rElX = -0.85;
    } else if (state === 'propose_kneel') {
      // Natural kneeling pose with right knee down and ring box presented forward
      hipsY = 0.51;
      torsoRx = 0.06;
      headRx = -0.18; // Looking softly up at partner
      lHipX = -1.25;
      lKneeX = 1.25;
      rHipX = 0.15;
      rKneeX = 1.38;
      rShX = -1.15;
      rElX = -0.22;
      lShX = -0.25;
      lElX = -0.45;
      showRingBox = true;
    } else if (state === 'propose_partner') {
      hipsY = 0.88 + Math.sin(time * 1.8) * 0.008;
      torsoRx = 0.04;
      headRx = 0.12; // Looking gently down toward kneeling partner
      lShX = -0.65;
      lShZ = -0.14;
      lElX = -1.25;
      rShX = -0.65;
      rShZ = 0.14;
      rElX = -1.25;
    } else {
      // Idle breathing & subtle life
      const breath = Math.sin(time * 1.8);
      hipsY = 0.88 + breath * 0.006;
      torsoRx = breath * 0.015;
      headRx = Math.sin(time * 0.9) * 0.025;
      lShZ = 0.08 + breath * 0.015;
      rShZ = -0.08 - breath * 0.015;
      this.kissTimer = 0;
    }

    rig.ringBox.visible = showRingBox;

    rig.hips.position.y = THREE.MathUtils.lerp(rig.hips.position.y, hipsY, damp);
    rig.torso.rotation.x = THREE.MathUtils.lerp(rig.torso.rotation.x, torsoRx, damp);
    rig.torso.rotation.y = THREE.MathUtils.lerp(rig.torso.rotation.y, torsoRy, damp);
    rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, headRx, damp);
    rig.head.rotation.z = THREE.MathUtils.lerp(rig.head.rotation.z, headRz, damp);

    rig.leftShoulder.rotation.x = THREE.MathUtils.lerp(rig.leftShoulder.rotation.x, lShX, damp);
    rig.leftShoulder.rotation.z = THREE.MathUtils.lerp(rig.leftShoulder.rotation.z, lShZ, damp);
    rig.leftElbow.rotation.x = THREE.MathUtils.lerp(rig.leftElbow.rotation.x, lElX, damp);

    rig.rightShoulder.rotation.x = THREE.MathUtils.lerp(rig.rightShoulder.rotation.x, rShX, damp);
    rig.rightShoulder.rotation.z = THREE.MathUtils.lerp(rig.rightShoulder.rotation.z, rShZ, damp);
    rig.rightElbow.rotation.x = THREE.MathUtils.lerp(rig.rightElbow.rotation.x, rElX, damp);

    rig.leftHip.rotation.x = THREE.MathUtils.lerp(rig.leftHip.rotation.x, lHipX, damp);
    rig.leftKnee.rotation.x = THREE.MathUtils.lerp(rig.leftKnee.rotation.x, lKneeX, damp);

    rig.rightHip.rotation.x = THREE.MathUtils.lerp(rig.rightHip.rotation.x, rHipX, damp);
    rig.rightKnee.rotation.x = THREE.MathUtils.lerp(rig.rightKnee.rotation.x, rKneeX, damp);
  }
}
