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

    const mergeGrad = ctx.createLinearGradient(0, this.dividerY, 0, this.height);
    mergeGrad.addColorStop(0, "#161638");
    mergeGrad.addColorStop(1, "#0e0e22");
    ctx.fillStyle = mergeGrad;
    ctx.fillRect(0, this.dividerY, this.width, this.height - this.dividerY);

    const platformH = 30;
    const platGrad = ctx.createLinearGradient(0, this.height - platformH, 0, this.height);
    platGrad.addColorStop(0, COLORS.platformTop);
    platGrad.addColorStop(1, COLORS.platform);
    ctx.fillStyle = platGrad;
    ctx.fillRect(0, this.height - platformH, this.width, platformH);

    ctx.strokeStyle = COLORS.platformTop;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.height - platformH);
    ctx.lineTo(this.width, this.height - platformH);
    ctx.stroke();

    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, this.dividerY);
    ctx.lineTo(this.width, this.dividerY);
    ctx.stroke();
    ctx.setLineDash([]);

    const glowGrad = ctx.createLinearGradient(0, this.dividerY - 15, 0, this.dividerY + 15);
    glowGrad.addColorStop(0, "rgba(50, 60, 160, 0)");
    glowGrad.addColorStop(0.5, "rgba(50, 60, 160, 0.15)");
    glowGrad.addColorStop(1, "rgba(50, 60, 160, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, this.dividerY - 15, this.width, 30);
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
      ctx.lineWidth = width + 8;
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

      ctx.shadowColor = e.leaked ? "#ff4444" : "#ff3355";
      ctx.shadowBlur = e.leaked ? (isFlashing ? 15 : 5) : 8;

      ctx.fillStyle = e.leaked ? COLORS.leakedEnemy : COLORS.enemyFill;
      ctx.strokeStyle = isFlashing ? "#ff8888" : COLORS.enemyStroke;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      if (e.leaked && !e.dying) {
        ctx.fillStyle = "#ffffff";
        ctx.font = `${e.radius}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🍴", e.x, e.y);
      } else if (!e.dying) {
        ctx.fillStyle = "#ffcccc";
        ctx.font = `${e.radius * 1.1}px sans-serif`;
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

      ctx.shadowColor = def.color;
      ctx.shadowBlur = p.mergeAnimTimer > 0 ? 25 : 10;

      const grad = ctx.createRadialGradient(
        pos.x - r * 0.25, pos.y - r * 0.25, r * 0.1,
        pos.x, pos.y, r,
      );
      grad.addColorStop(0, lightenColor(def.color, 70));
      grad.addColorStop(0.6, def.color);
      grad.addColorStop(1, darkenColor(def.color, 30));
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = lightenColor(def.color, 40);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(10, r * 0.65)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.9;
      ctx.fillText(`${p.tier + 1}`, pos.x, pos.y + 1);

      ctx.restore();
    }
  }

  drawHUD(wave: number, totalValue: number, productCount: number, fps: number, gameOver: boolean) {
    const ctx = this.ctx;

    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, this.width, 40);

    ctx.strokeStyle = "rgba(100, 120, 200, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(this.width, 40);
    ctx.stroke();

    ctx.fillStyle = COLORS.hud;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`⚔ 波次 ${wave}`, 12, 20);

    ctx.textAlign = "center";
    ctx.fillText(`💰 ${totalValue}  (${productCount}枚)`, this.width / 2, 20);

    ctx.textAlign = "right";
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(150,170,220,0.6)";
    ctx.fillText(`${fps} FPS`, this.width - 10, 20);

    if (gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = "#ff4466";
      ctx.font = "bold 38px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("游戏结束", this.width / 2, this.height / 2 - 60);

      ctx.fillStyle = "#ccddff";
      ctx.font = "22px monospace";
      ctx.fillText(`存活到第 ${wave} 波`, this.width / 2, this.height / 2);

      ctx.fillStyle = "#ffd700";
      ctx.fillText(`最终财富: ${totalValue}`, this.width / 2, this.height / 2 + 40);

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

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}
