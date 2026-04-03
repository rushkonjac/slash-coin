import { COLORS, Buff, GameStats, RelicDef } from "./types";
import { InputManager } from "./input";
import { PhysicsWorld } from "./physics";
import { EnemyManager } from "./enemies";
import { ProductManager } from "./products";
import { ParticleSystem } from "./particles";
import { Renderer } from "./renderer";
import { pickBuffChoices, createDefaultStats, type BuffPickContext } from "./buffs";
import { getKind, BASE_KIND_ID, bombLeakRewardDepth, pickRandomKindAtDepth } from "./mergeTree";
import {
  mergeContextFromRelics,
  pickRelicChoices,
  RELIC_MILESTONE_WAVES,
  MAX_RELIC_SLOTS,
} from "./relics";

type GameState = "playing" | "buff_select" | "relic_select" | "game_over";

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
  private lastTime = 0;
  private fps = 60;
  private fpsCounter = 0;
  private fpsTimer = 0;

  private state: GameState = "playing";
  private stats: GameStats;
  private discoveredDepths = new Set<number>();
  private discoveredKinds = new Set<string>();
  private buffChoices: Buff[] = [];
  private buffReason: "new_tier" | "consume" = "new_tier";
  private consumeProductId: number | null = null;
  private buffAnimTimer = 0;

  relics: RelicDef[] = [];
  private relicChoices: RelicDef[] = [];
  private relicAnimTimer = 0;
  private relicOfferedWaves = new Set<number>();
  private pendingRelicWave: number | null = null;

  private toastText = "";
  private toastTimer = 0;
  /** 合成新深度时若正在选遗物/增益，延后弹出免费增益 */
  private pendingFreeDepthBuff = false;
  /** 最近一次合成产物的 kindId，用于里程碑三选一加权 */
  private lastBuffSourceKindId: string | null = null;

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
    this.stats = createDefaultStats();

    this.input = new InputManager(canvas);
    this.physics = new PhysicsWorld(this.width, this.height);
    this.enemies = new EnemyManager(this.width, this.height);
    this.enemies.onWaveStart = (wave) => this.tryOfferRelic(wave);

    this.products = new ProductManager(this.physics);
    this.products.getMergeContext = () => mergeContextFromRelics(this.relics);
    this.products.getMergeRadiusMult = () => this.stats.mergeRadiusMult;
    this.products.getMergeBlastMult = () => this.stats.mergeBlastMult;

    this.particles = new ParticleSystem();
    this.renderer = new Renderer(canvas, this.width, this.height, this.dividerY);

    this.products.onMerge = (resultKindId: string) => {
      this.lastBuffSourceKindId = resultKindId;
      const k = getKind(resultKindId);
      if (!this.discoveredKinds.has(resultKindId)) {
        this.discoveredKinds.add(resultKindId);
        this.toastText = `新发现：${k.name}`;
        this.toastTimer = 2.5;
      }
      if (!this.discoveredDepths.has(k.depth)) {
        this.discoveredDepths.add(k.depth);
        if (k.depth > 0) {
          if (this.state === "playing") this.triggerBuffSelect("new_tier");
          else this.pendingFreeDepthBuff = true;
        }
      }
    };

    canvas.addEventListener("pointerup", (e) => this.handlePointerUp(e));
  }

  private handlePointerUp(e: PointerEvent) {
    if (e.button !== 0) return;
    this.handleUiTap(e.clientX, e.clientY);
  }

  start() {
    this.spawnInitialProducts();
    this.discoveredDepths.add(0);
    this.discoveredKinds.add(BASE_KIND_ID);
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private spawnInitialProducts() {
    for (let i = 0; i < 5; i++) {
      const x = this.width * 0.2 + (i / 4) * this.width * 0.6;
      this.products.spawnProduct(x, this.height - 60, BASE_KIND_ID);
    }
  }

  private tryOfferRelic(wave: number) {
    const milestone = (RELIC_MILESTONE_WAVES as readonly number[]).includes(wave);
    if (!milestone) return;
    if (this.relics.length >= MAX_RELIC_SLOTS) return;
    if (this.relicOfferedWaves.has(wave)) return;

    if (this.state !== "playing") {
      this.pendingRelicWave = wave;
      return;
    }

    this.openRelicSelect(wave);
  }

  private openRelicSelect(wave: number) {
    const owned = new Set(this.relics.map((r) => r.id));
    this.relicChoices = pickRelicChoices(3, owned);
    if (this.relicChoices.length === 0) {
      this.pendingRelicWave = null;
      return;
    }
    this.relicOfferedWaves.add(wave);
    this.state = "relic_select";
    this.relicAnimTimer = 0;
    this.pendingRelicWave = null;
  }

  private applyRelic(r: RelicDef) {
    this.relics.push(r);
    if (r.apply) r.apply(this.stats);
    this.enemies.enemySlowMult = this.stats.enemySlowMult;
    this.state = "playing";
    this.relicChoices = [];
    if (this.pendingFreeDepthBuff) {
      this.pendingFreeDepthBuff = false;
      this.triggerBuffSelect("new_tier");
    } else {
      this.flushPendingRelic();
    }
  }

  private flushPendingRelic() {
    if (this.pendingRelicWave != null && this.state === "playing") {
      const w = this.pendingRelicWave;
      this.pendingRelicWave = null;
      if (!(RELIC_MILESTONE_WAVES as readonly number[]).includes(w)) return;
      if (this.relics.length >= MAX_RELIC_SLOTS) return;
      if (this.relicOfferedWaves.has(w)) return;
      this.openRelicSelect(w);
    }
  }

  private restart() {
    for (const p of [...this.products.products]) {
      this.products.removeProduct(p);
    }
    this.enemies.enemies = [];
    this.enemies.startWave(1);
    this.particles.particles = [];
    this.state = "playing";
    this.stats = createDefaultStats();
    this.relics = [];
    this.discoveredDepths.clear();
    this.discoveredKinds.clear();
    this.relicOfferedWaves.clear();
    this.pendingRelicWave = null;
    this.buffChoices = [];
    this.relicChoices = [];
    this.consumeProductId = null;
    this.toastTimer = 0;
    this.pendingFreeDepthBuff = false;
    this.discoveredDepths.add(0);
    this.discoveredKinds.add(BASE_KIND_ID);
    this.spawnInitialProducts();
  }

  private handleUiTap(clientX: number, clientY: number) {
    if (this.state === "game_over") {
      this.restart();
      return;
    }
    if (this.state === "buff_select") {
      const idx = this.renderer.getBuffChoiceIndex(clientX, clientY, this.buffChoices.length);
      if (idx >= 0 && idx < this.buffChoices.length) {
        this.applyBuff(this.buffChoices[idx]);
      }
      return;
    }
    if (this.state === "relic_select") {
      const idx = this.renderer.getRelicChoiceIndex(clientX, clientY, this.relicChoices.length);
      if (idx >= 0 && idx < this.relicChoices.length) {
        this.applyRelic(this.relicChoices[idx]);
      }
    }
  }

  private triggerBuffSelect(reason: "new_tier" | "consume") {
    this.buffReason = reason;
    let sourceKindId: string | undefined;
    if (reason === "consume" && this.consumeProductId != null) {
      sourceKindId = this.products.products.find((p) => p.id === this.consumeProductId)?.kindId;
    } else if (reason === "new_tier") {
      sourceKindId = this.lastBuffSourceKindId ?? undefined;
    }
    const ctx: BuffPickContext = { reason, sourceKindId };
    this.buffChoices = pickBuffChoices(3, ctx);
    this.state = "buff_select";
    this.buffAnimTimer = 0;
  }

  private applyBuff(buff: Buff) {
    buff.apply(this.stats);
    this.enemies.enemySlowMult = this.stats.enemySlowMult;

    if (this.buffReason === "consume" && this.consumeProductId != null) {
      const p = this.products.products.find((pr) => pr.id === this.consumeProductId);
      if (p) {
        const col = getKind(p.kindId).color;
        this.particles.emit(p.body.position.x, p.body.position.y, 15, col);
        this.products.removeProduct(p);
      }
      this.consumeProductId = null;
    }

    this.state = "playing";
    this.buffChoices = [];
    if (this.pendingFreeDepthBuff) {
      this.pendingFreeDepthBuff = false;
      this.triggerBuffSelect("new_tier");
    } else {
      this.flushPendingRelic();
    }
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

    if (this.toastTimer > 0) this.toastTimer -= dt;

    if (this.state === "playing") {
      this.update(dt, now);
    }
    if (this.state === "buff_select") {
      this.buffAnimTimer += dt;
    }
    if (this.state === "relic_select") {
      this.relicAnimTimer += dt;
    }
    this.render(now);

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number, now: number) {
    this.enemies.iceSlashGravityMult = this.stats.iceSlashGravityMult;

    this.input.pruneTrail(now);
    this.input.updateHold();

    const holdResult = this.input.consumeHold();
    if (holdResult) {
      const nearProduct = this.products.findNearestProduct(holdResult.x, holdResult.y, 60);
      if (nearProduct) {
        this.consumeProductId = nearProduct.id;
        this.triggerBuffSelect("consume");
        return;
      }
    }

    const segments = this.input.consumeSegments();
    const dropMult = this.stats.dropValueMult * this.stats.dropRelicMult;

    for (const seg of segments) {
      const dx = seg.p2.x - seg.p1.x;
      const dy = seg.p2.y - seg.p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const dirX = dx / len;
      const dirY = dy / len;
      const speed = seg.p2.speed;
      const hitExtra =
        Math.min(speed * 0.005, 8) *
        this.stats.slashWidthMult *
        this.stats.lightningSlashHitMult;

      for (const enemy of this.enemies.enemies) {
        if (enemy.dying) continue;

        if (
          !enemy.isBomb &&
          this.stats.iceSlashSlowSeconds > 0 &&
          this.lineCircleIntersect(
            seg.p1.x,
            seg.p1.y,
            seg.p2.x,
            seg.p2.y,
            enemy.x,
            enemy.y,
            enemy.radius + hitExtra + 56,
          )
        ) {
          enemy.iceSlowTimer = Math.max(
            enemy.iceSlowTimer,
            this.stats.iceSlashSlowSeconds,
          );
        }

        if (
          !this.lineCircleIntersect(
            seg.p1.x,
            seg.p1.y,
            seg.p2.x,
            seg.p2.y,
            enemy.x,
            enemy.y,
            enemy.radius + hitExtra,
          )
        ) {
          continue;
        }

        if (enemy.isBomb) {
          const stolen = this.products.removeRandomProduct();
          if (stolen) {
            this.particles.emit(stolen.x, stolen.y, 20, stolen.color);
            this.particles.emit(enemy.x, enemy.y, 16, "#ff0044");
          } else {
            this.particles.emit(enemy.x, enemy.y, 10, "#ff0044");
          }
          this.toastText = stolen ? "误切炸弹！随机失去一枚产物" : "误切炸弹！（场上无产物可失）";
          this.toastTimer = 2.2;
          this.enemies.killEnemy(enemy, dirX, dirY);
          continue;
        }

        this.enemies.killEnemy(enemy, dirX, dirY);
        this.particles.emitDirectional(enemy.x, enemy.y, dirX, dirY, 12, COLORS.enemyStroke);
        this.particles.emit(enemy.x, enemy.y, 6, "#ffaa44");

        if (!enemy.leaked) {
          const dropVal = Math.ceil(enemy.value * dropMult);
          this.products.spawnDrops(enemy.x, enemy.y, dropVal, this.width, this.stats.coinAttractCenter);
          if (Math.random() < this.stats.burnKillExtraChance) {
            this.products.spawnDrops(enemy.x, enemy.y, 1, this.width, this.stats.coinAttractCenter);
          }
        }
      }

      const midX = (seg.p1.x + seg.p2.x) / 2;
      const midY = (seg.p1.y + seg.p2.y) / 2;
      this.products.applySlashForce(midX, midY, dirX, dirY, speed);
    }

    this.enemies.update(dt);

    for (const enemy of this.enemies.enemies) {
      if (!enemy.alive || !enemy.isBomb || !enemy.bombConvertPending) continue;
      enemy.bombConvertPending = false;
      const depth = bombLeakRewardDepth(this.enemies.wave);
      const kindId = pickRandomKindAtDepth(depth);
      this.products.spawnProduct(enemy.x, enemy.y, kindId);
      const k = getKind(kindId);
      this.particles.emit(enemy.x, enemy.y, 24, k.color);
      if (!this.discoveredKinds.has(kindId)) {
        this.discoveredKinds.add(kindId);
        this.toastText = `炸弹转化 · 新产物：${k.name}`;
      } else {
        this.toastText = `炸弹安全落地 → ${k.name}`;
      }
      this.toastTimer = 2;
      enemy.alive = false;
    }

    const eatEvery = 1.0 * this.stats.enemyEatIntervalMult;
    for (const enemy of this.enemies.enemies) {
      if (!enemy.leaked || enemy.dying || enemy.isBomb) continue;
      if (enemy.leakedTimer >= eatEvery) {
        enemy.leakedTimer -= eatEvery;
        const nearest = this.products.findNearestProduct(enemy.x, enemy.y, 120);
        if (nearest) {
          const col = getKind(nearest.kindId).color;
          this.particles.emit(nearest.body.position.x, nearest.body.position.y, 4, col);
          this.products.removeProduct(nearest);
        }
      }
    }

    this.physics.step(dt);
    this.products.update(dt);
    this.particles.update(dt);

    const hasLeakedEnemies = this.enemies.enemies.some(
      (e) => e.leaked && !e.dying && !e.isBomb,
    );
    if (this.products.count() === 0 && hasLeakedEnemies) {
      this.state = "game_over";
    }
  }

  private lineCircleIntersect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number,
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

    if (this.input.holdActive && this.input.holdProgress > 0) {
      this.renderer.drawHoldProgress(this.input.holdX, this.input.holdY, this.input.holdProgress);
    }

    this.renderer.drawHUD(
      this.enemies.wave,
      this.products.totalValue(),
      this.products.count(),
      this.fps,
      this.state === "game_over",
      this.relics,
    );

    if (this.toastTimer > 0 && this.toastText) {
      this.renderer.drawDiscoveryToast(this.toastText, this.toastTimer);
    }

    if (this.state === "buff_select") {
      this.renderer.drawBuffSelect(this.buffChoices, this.buffReason, this.buffAnimTimer);
    }
    if (this.state === "relic_select") {
      this.renderer.drawRelicSelect(this.relicChoices, this.relicAnimTimer);
    }
  }
}
