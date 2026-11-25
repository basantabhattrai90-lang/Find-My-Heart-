import * as THREE from 'three';
import { STATIC_COLLIDERS } from './world/MansionData';

const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _idealCamPos = new THREE.Vector3();

export class CameraController {
  public yaw = 0; // Camera behind player (+Z), looking -Z into the mansion
  public pitch = 0.28;
  public distance = 4.3;
  public sensitivity = 1.0;

  private currentLookAt = new THREE.Vector3(0, 1.35, 7.4);
  private currentPos = new THREE.Vector3(0, 3.0, 11.4);
  private manualLookCooldown = 0;
  private cinematicOverride: {
    active: boolean;
    pos: THREE.Vector3;
    lookAt: THREE.Vector3;
    speed: number;
  } = {
    active: false,
    pos: new THREE.Vector3(),
    lookAt: new THREE.Vector3(),
    speed: 2.8,
  };

  public setStartScreenOrbit(camera: THREE.PerspectiveCamera, elapsed: number): void {
    const angle = elapsed * 0.14;
    const x = Math.sin(angle) * 3.6;
    const z = 8.8 + Math.cos(angle * 0.7) * 1.4;
    camera.position.set(x, 2.7 + Math.sin(elapsed * 0.25) * 0.18, z);
    camera.lookAt(0, 1.45, 2.5);
  }

  public rotate(dx: number, dy: number): void {
    if (this.cinematicOverride.active) return;
    this.manualLookCooldown = 1.1;
    const factor = 0.0048 * this.sensitivity;
    this.yaw -= dx * factor;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * factor, -0.12, 0.92);
  }

  public followMovement(inX: number, inY: number, playerRy: number, isMoving: boolean, dt: number): void {
    if (this.cinematicOverride.active) return;
    if (this.manualLookCooldown > 0) {
      this.manualLookCooldown = Math.max(0, this.manualLookCooldown - dt);
      return;
    }
    if (!isMoving) return;

    // Gentle steering follow when pushing left/right on joystick or A/D (unless backing straight up)
    if (inY >= -0.35 && Math.abs(inX) > 0.08) {
      const steerRate = 1.45 * Math.min(1.2, Math.max(0.7, this.sensitivity));
      this.yaw -= inX * steerRate * dt;
    }

    // Smoothly align camera behind character when moving forward
    if (inY > 0.25) {
      const targetYaw = playerRy + Math.PI;
      const diff = Math.atan2(Math.sin(targetYaw - this.yaw), Math.cos(targetYaw - this.yaw));
      this.yaw += diff * (1 - Math.exp(-2.1 * dt));
    }
  }

  public startCinematic(pos: THREE.Vector3, lookAt: THREE.Vector3, speed = 2.6): void {
    this.cinematicOverride.active = true;
    this.cinematicOverride.pos.copy(pos);
    this.cinematicOverride.lookAt.copy(lookAt);
    this.cinematicOverride.speed = speed;
  }

  public stopCinematic(): void {
    this.cinematicOverride.active = false;
  }

  public snapToPlayer(playerPos: THREE.Vector3): void {
    this.manualLookCooldown = 0;
    this.currentLookAt.set(playerPos.x, playerPos.y + 1.35, playerPos.z);
    const cosP = Math.cos(this.pitch);
    this.currentPos.set(
      this.currentLookAt.x + Math.sin(this.yaw) * cosP * this.distance,
      this.currentLookAt.y + Math.sin(this.pitch) * this.distance,
      this.currentLookAt.z + Math.cos(this.yaw) * cosP * this.distance
    );
  }

  public update(camera: THREE.PerspectiveCamera, playerPos: THREE.Vector3, dt: number): void {
    if (this.cinematicOverride.active) {
      const k = 1 - Math.exp(-this.cinematicOverride.speed * dt);
      this.currentPos.lerp(this.cinematicOverride.pos, k);
      this.currentLookAt.lerp(this.cinematicOverride.lookAt, k);
      camera.position.copy(this.currentPos);
      camera.lookAt(this.currentLookAt);
      return;
    }

    _targetPos.set(playerPos.x, playerPos.y + 1.35, playerPos.z);
    const followK = 1 - Math.exp(-14 * dt);
    this.currentLookAt.lerp(_targetPos, followK);

    const cosP = Math.cos(this.pitch);
    const offsetX = Math.sin(this.yaw) * cosP * this.distance;
    const offsetY = Math.sin(this.pitch) * this.distance;
    const offsetZ = Math.cos(this.yaw) * cosP * this.distance;

    _idealCamPos.set(
      this.currentLookAt.x + offsetX,
      Math.max(0.55, this.currentLookAt.y + offsetY),
      this.currentLookAt.z + offsetZ
    );

    // Lightweight 2D ray-step against static wall colliders so camera never clips behind walls
    const safeDist = this.computeWallSafeFraction(this.currentLookAt, _idealCamPos);
    _idealCamPos.lerpVectors(this.currentLookAt, _idealCamPos, safeDist);
    _idealCamPos.y = Math.max(0.55, _idealCamPos.y);

    const posK = 1 - Math.exp(-16 * dt);
    this.currentPos.lerp(_idealCamPos, posK);

    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentLookAt);
  }

  private computeWallSafeFraction(origin: THREE.Vector3, camPos: THREE.Vector3): number {
    _rayOrigin.copy(origin);
    _rayDir.subVectors(camPos, origin);
    const totalLen = _rayDir.length();
    if (totalLen < 0.01) return 1;

    const steps = 10;
    const margin = 0.25;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const sx = _rayOrigin.x + _rayDir.x * t;
      const sz = _rayOrigin.z + _rayDir.z * t;
      for (let c = 0; c < STATIC_COLLIDERS.length; c++) {
        const box = STATIC_COLLIDERS[c];
        // Ignore low furniture colliders so camera glides smoothly overhead
        if (box.tag === 'furniture') continue;
        if (
          sx >= box.minX - margin &&
          sx <= box.maxX + margin &&
          sz >= box.minZ - margin &&
          sz <= box.maxZ + margin
        ) {
          return Math.max(0.24, (i - 1) / steps);
        }
      }
    }
    return 1;
  }
}
