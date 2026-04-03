import { COLORS, PRODUCT_TIERS, SlashPoint, Enemy, Product } from "./types";
import { ParticleSystem } from "./particles";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dividerY: number;

  constructor(
    private canvas: HTMLCanvasElement,
    width: number,
    height: number,
    dividerY: number,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.width = width;
    this.height = height;
    this.dividerY = dividerY;
  }

  clear() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.battleZone;
    ctx.fillRect(0, 0, this.width, this.dividerY);
    ctx.fillStyle = COLORS.mergeZone;
    ctx.fillRect(0, this.dividerY, this.width, this.height - this.dividerY);

    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, this.dividerY);
    ctx.lineTo(this.width, this.dividerY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.platform;
    ctx.fillRect(0, this.height - 30, this.width, 30);
  }

  drawSlashTrail(points: SlashPoint[], now: number) {
    if (points.length < 2) return;
    const ctx = this.ctx;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const age = now - p1.time;
      const alpha = Math.max(0, 1 - age / 200);
      if (alpha <= 0) continue;

      const speed = p1.speed || 0;
      const width = Math.min(3 + speed * 0.008, 14);

      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = COLORS.slashGlow;
      ctx.lineWidth = width + 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COLORS.slash;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawEnemies(enemies: Enemy[]) {
    const ctx = this.ctx;
    for (const e of enemies) {
      if (!e.alive) continue;

      ctx.save();

      if (e.dying) {
        ctx.globalAlpha = Math.max(0, e.deathTimer / 0.4);
      }

      const isFlashing = e.leaked && Math.sin(e.flashTimer * 8) > 0;
      ctx.fillStyle = e.leaked ? COLORS.leakedEnemy : COLORS.enemyFill;
      ctx.strokeStyle = isFlashing ? "#ff8888" : COLORS.enemyStroke;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (e.leaked && !e.dying) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("🍴", e.x, e.y + 4);
      } else if (!e.dying) {
        ctx.fillStyle = "#ffcccc";
        ctx.font = `${e.radius * 0.7}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("👹", e.x, e.y);
      }

      ctx.restore();
    }
  }

  drawProducts(products: Product[]) {
    const ctx = this.ctx;
    for (const p of products) {
      const def = PRODUCT_TIERS[p.tier];
      const pos = p.body.position;

      let scale = 1;
      if (p.mergeAnimTimer > 0) {
        scale = 1 + Math.sin((p.mergeAnimTimer / 0.3) * Math.PI) * 0.4;
      }
      if (p.spawnAnimTimer > 0) {
        scale = 1 - p.spawnAnimTimer / 0.3 * 0.5;
      }

      const r = def.radius * scale;

      ctx.save();

      if (p.mergeAnimTimer > 0) {
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 15;
      }

      const grad = ctx.createRadialGradient(pos.x - r * 0.3, pos.y - r * 0.3, 0, pos.x, pos.y, r);
      grad.addColorStop(0, lightenColor(def.color, 40));
      grad.addColorStop(1, def.color);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = lightenColor(def.color, 20);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(9, r * 0.7)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${p.tier + 1}`, pos.x, pos.y);

      ctx.restore();
    }
  }

  drawHUD(wave: number, totalValue: number, productCount: number, fps: number, gameOver: boolean) {
    const ctx = this.ctx;

    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, this.width, 36);

    ctx.fillStyle = COLORS.hud;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`波次 ${wave}`, 10, 18);

    ctx.textAlign = "center";
    ctx.fillText(`💰 ${totalValue}  (${productCount})`, this.width / 2, 18);

    ctx.textAlign = "right";
    ctx.fillText(`${fps} FPS`, this.width - 10, 18);

    if (gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = "#ff4466";
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("游戏结束", this.width / 2, this.height / 2 - 50);

      ctx.fillStyle = "#aabbdd";
      ctx.font = "20px monospace";
      ctx.fillText(`存活到第 ${wave} 波`, this.width / 2, this.height / 2 + 10);
      ctx.fillText(`最终财富: ${totalValue}`, this.width / 2, this.height / 2 + 45);

      ctx.fillStyle = "#55ff99";
      ctx.font = "bold 18px monospace";
      ctx.fillText("点击屏幕重新开始", this.width / 2, this.height / 2 + 100);
    }
  }

  drawParticles(particles: ParticleSystem) {
    particles.draw(this.ctx);
  }
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
