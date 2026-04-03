import { PRODUCT_TIERS, COLORS } from "./types";
import { InputManager } from "./input";
import { PhysicsWorld } from "./physics";
import { EnemyManager } from "./enemies";
import { ProductManager } from "./products";
import { ParticleSystem } from "./particles";
import { Renderer } from "./renderer";

export class Game {
  private canvas: HTMLCanvasElement;
  private input: InputManager;
  private physics: PhysicsWorld;
  private enemies: EnemyManager;
  private products: ProductManager;
  private particles: ParticleSystem;
  private renderer: Renderer;

  private width: number;
  private height: number;
  private dividerY: number;
  private gameOver = false;
  private lastTime = 0;
  private fps = 60;
  private fpsCounter = 0;
  private fpsTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = this.width * dpr;
    canvas.height = this.height * dpr;
    canvas.style.width = this.width + "px";
    canvas.style.height = this.height + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    this.dividerY = this.height * 0.5;

    this.input = new InputManager(canvas);
    this.physics = new PhysicsWorld(this.width, this.height);
    this.enemies = new EnemyManager(this.width, this.height, this.dividerY);
    this.products = new ProductManager(this.physics);
    this.particles = new ParticleSystem();
    this.renderer = new Renderer(canvas, this.width, this.height, this.dividerY);

    canvas.addEventListener("click", () => {
      if (this.gameOver) this.restart();
    });
  }

  start() {
    this.spawnInitialProducts();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private spawnInitialProducts() {
    for (let i = 0; i < 5; i++) {
      const x = this.width * 0.2 + (i / 4) * this.width * 0.6;
      this.products.spawnProduct(x, this.height - 60, 0);
    }
  }

  private restart() {
    for (const p of [...this.products.products]) {
      this.products.removeProduct(p);
    }
    this.enemies.enemies = [];
    this.enemies.startWave(1);
    this.particles.particles = [];
    this.gameOver = false;

    this.spawnInitialProducts();
  }

  private loop(now: number) {
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;

    this.fpsCounter++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer >= 1) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    if (!this.gameOver) {
      this.update(dt, now);
    }
    this.render(now);

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number, now: number) {
    this.input.pruneTrail(now);
    const segments = this.input.consumeSegments();

    for (const seg of segments) {
      const dx = seg.p2.x - seg.p1.x;
      const dy = seg.p2.y - seg.p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const dirX = dx / len;
      const dirY = dy / len;
      const speed = seg.p2.speed;

      for (const enemy of this.enemies.enemies) {
        if (enemy.dying) continue;
        if (this.lineCircleIntersect(seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y, enemy.x, enemy.y, enemy.radius + Math.min(speed * 0.005, 8))) {
          this.enemies.killEnemy(enemy, dirX, dirY);
          this.particles.emitDirectional(enemy.x, enemy.y, dirX, dirY, 12, COLORS.enemyStroke);
          this.particles.emit(enemy.x, enemy.y, 6, "#ffaa44");

          if (!enemy.leaked) {
            this.products.spawnDrops(enemy.x, enemy.y, enemy.value);
          }
        }
      }

      const midX = (seg.p1.x + seg.p2.x) / 2;
      const midY = (seg.p1.y + seg.p2.y) / 2;
      this.products.applySlashForce(midX, midY, dirX, dirY, speed);
    }

    this.enemies.update(dt);

    for (const enemy of this.enemies.enemies) {
      if (!enemy.leaked || enemy.dying) continue;
      if (enemy.leakedTimer >= 1.0) {
        enemy.leakedTimer -= 1.0;
        const nearest = this.products.findNearestProduct(enemy.x, enemy.y, 120);
        if (nearest) {
          this.particles.emit(
            nearest.body.position.x,
            nearest.body.position.y,
            4,
            PRODUCT_TIERS[nearest.tier].color,
          );
          this.products.removeProduct(nearest);
        }
      }
    }

    this.physics.step(dt);
    this.products.update(dt);
    this.particles.update(dt);

    const hasLeakedEnemies = this.enemies.enemies.some((e) => e.leaked && !e.dying);
    if (this.products.count() === 0 && hasLeakedEnemies) {
      this.gameOver = true;
    }
  }

  private lineCircleIntersect(
    x1: number, y1: number,
    x2: number, y2: number,
    cx: number, cy: number,
    r: number,
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }

  private render(now: number) {
    this.renderer.clear();
    this.renderer.drawProducts(this.products.products);
    this.renderer.drawEnemies(this.enemies.enemies);
    this.renderer.drawSlashTrail(this.input.trailPoints, now);
    this.renderer.drawParticles(this.particles);
    this.renderer.drawHUD(
      this.enemies.wave,
      this.products.totalValue(),
      this.products.count(),
      this.fps,
      this.gameOver,
    );
  }
}
