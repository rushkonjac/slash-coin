import { Enemy } from "./types";

let nextId = 1;

export class EnemyManager {
  enemies: Enemy[] = [];
  private spawnTimer = 0;
  private waveEnemiesLeft = 0;
  wave = 1;
  waveActive = false;
  waveClearTimer = 0;
  private screenW: number;
  private screenH: number;
  private dividerY: number;

  constructor(screenW: number, screenH: number, dividerY: number) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.dividerY = dividerY;
    this.startWave(1);
  }

  startWave(wave: number) {
    this.wave = wave;
    this.waveEnemiesLeft = this.enemiesForWave(wave);
    this.waveActive = true;
    this.spawnTimer = 0;
    this.waveClearTimer = 0;
  }

  private enemiesForWave(w: number): number {
    return Math.floor(4 + w * 2);
  }

  private spawnInterval(): number {
    return Math.max(400, 1400 - this.wave * 70);
  }

  private enemySpeed(): number {
    return 70 + this.wave * 6;
  }

  private enemyValue(): number {
    return 1 + Math.floor(this.wave / 3);
  }

  update(dt: number) {
    this.spawnTimer += dt * 1000;

    if (this.waveActive && this.waveEnemiesLeft > 0 && this.spawnTimer >= this.spawnInterval()) {
      this.spawnTimer = 0;
      this.spawnEnemy();
      this.waveEnemiesLeft--;
    }

    for (const e of this.enemies) {
      if (e.dying) {
        e.deathTimer -= dt;
        e.x += e.deathVx * dt;
        e.y += e.deathVy * dt;
        e.deathVy += 600 * dt;
        if (e.deathTimer <= 0) e.alive = false;
        continue;
      }
      if (e.leaked) {
        e.leakedTimer += dt;
        e.flashTimer += dt;
        continue;
      }
      e.y += e.speed * dt;

      const landY = this.screenH - 30 - e.radius;
      if (e.y >= landY) {
        e.y = landY;
        e.leaked = true;
        e.leakedTimer = 0;
        e.flashTimer = 0;
      }
    }

    this.enemies = this.enemies.filter((e) => e.alive);

    const fallingEnemies = this.enemies.filter((e) => !e.leaked && !e.dying);
    if (this.waveActive && this.waveEnemiesLeft <= 0 && fallingEnemies.length === 0) {
      this.waveClearTimer += dt;
      if (this.waveClearTimer > 2.0) {
        this.startWave(this.wave + 1);
      }
    }
  }

  private spawnEnemy() {
    const margin = 40;
    const x = margin + Math.random() * (this.screenW - margin * 2);
    const e: Enemy = {
      id: nextId++,
      x,
      y: -25,
      radius: 18,
      hp: 1,
      speed: this.enemySpeed(),
      value: this.enemyValue(),
      alive: true,
      leaked: false,
      leakedTimer: 0,
      flashTimer: 0,
      deathVx: 0,
      deathVy: 0,
      deathTimer: 0,
      dying: false,
    };
    this.enemies.push(e);
  }

  killEnemy(enemy: Enemy, slashDirX: number, slashDirY: number) {
    enemy.dying = true;
    enemy.deathTimer = 0.4;
    const knockback = 400;
    enemy.deathVx = slashDirX * knockback;
    enemy.deathVy = slashDirY * knockback - 200;
  }
}
