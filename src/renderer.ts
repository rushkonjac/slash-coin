import { COLORS, SlashPoint, Enemy, Product, Buff, RelicDef } from "./types";
import { ParticleSystem } from "./particles";
import { getKind } from "./mergeTree";

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

    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, "#0c0c22");
    bgGrad.addColorStop(0.45, "#101030");
    bgGrad.addColorStop(0.55, "#141438");
    bgGrad.addColorStop(1, "#0e0e28");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

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

      const isFlashing = e.leaked && !e.isBomb && Math.sin(e.flashTimer * 8) > 0;

      if (e.isBomb) {
        ctx.shadowColor = e.leaked ? COLORS.bombCore : "#ff0066";
        ctx.shadowBlur = e.leaked ? 18 : 12;
        ctx.fillStyle = COLORS.bombFill;
        ctx.strokeStyle = e.leaked ? COLORS.bombCore : COLORS.bombStroke;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        if (!e.dying) {
          ctx.fillStyle = "#ffee88";
          ctx.font = `${e.radius * 1.05}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("💣", e.x, e.y);
        }
      } else {
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
      }

      ctx.restore();
    }
  }

  drawProducts(products: Product[]) {
    const ctx = this.ctx;
    for (const p of products) {
      const def = getKind(p.kindId);
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
      const tag =
        def.branch === "neutral"
          ? "基"
          : def.branch === "fire"
            ? "火"
            : def.branch === "ice"
              ? "冰"
              : "雷";
      ctx.fillText(`${tag}${def.depth}`, pos.x, pos.y + 1);

      ctx.restore();
    }
  }

  drawHUD(
    wave: number,
    totalValue: number,
    productCount: number,
    fps: number,
    gameOver: boolean,
    relics: RelicDef[],
  ) {
    const ctx = this.ctx;
    const hudH = 56;

    ctx.fillStyle = COLORS.hudBg;
    ctx.fillRect(0, 0, this.width, hudH);

    ctx.strokeStyle = "rgba(100, 120, 200, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hudH);
    ctx.lineTo(this.width, hudH);
    ctx.stroke();

    ctx.fillStyle = COLORS.hud;
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`⚔ 波次 ${wave}`, 12, 18);

    ctx.textAlign = "center";
    ctx.fillText(`💰 ${totalValue}  (${productCount}枚)`, this.width / 2, 18);

    ctx.textAlign = "right";
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(150,170,220,0.6)";
    ctx.fillText(`${fps} FPS`, this.width - 10, 18);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let rx = 12;
    const ry = 40;
    ctx.font = "13px sans-serif";
    for (const r of relics) {
      ctx.fillText(r.icon, rx, ry);
      rx += 22;
      if (rx > this.width - 80) break;
    }
    if (relics.length === 0) {
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(150,170,220,0.45)";
      ctx.fillText("遗物：波次 2/4/7… 解锁", 12, ry);
    }

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

  drawHoldProgress(x: number, y: number, progress: number) {
    const ctx = this.ctx;
    const r = 28;
    ctx.save();

    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    if (progress > 0.5) {
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 10;
      ctx.stroke();
    }

    ctx.restore();
  }

  private buffCardRects: { x: number; y: number; w: number; h: number }[] = [];

  drawBuffSelect(choices: Buff[], reason: "new_tier" | "consume", animTimer: number) {
    const ctx = this.ctx;
    const fadeIn = Math.min(animTimer / 0.3, 1);

    ctx.save();
    ctx.globalAlpha = 0.7 * fadeIn;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = fadeIn;

    const titleText = reason === "new_tier" ? "🎉 发现新稀有度！选择增益" : "💎 消耗产物，选择增益";
    ctx.fillStyle = reason === "new_tier" ? "#ffd700" : "#22ddff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(titleText, this.width / 2, this.height * 0.185);
    ctx.fillStyle = "rgba(180, 200, 255, 0.65)";
    ctx.font = "11px monospace";
    ctx.fillText("流派/深度影响出现权重 · 燃烧/冰冻/连锁/雷电各有特色", this.width / 2, this.height * 0.218);

    const cardW = Math.min(this.width * 0.26, 150);
    const cardH = cardW * 1.6;
    const gap = Math.min(this.width * 0.04, 25);
    const totalW = cardW * choices.length + gap * (choices.length - 1);
    const startX = (this.width - totalW) / 2;
    const startY = this.height * 0.3;

    this.buffCardRects = [];

    for (let i = 0; i < choices.length; i++) {
      const buff = choices[i];
      const cx = startX + i * (cardW + gap);
      const cy = startY;

      const slideOffset = Math.max(0, 1 - (animTimer - i * 0.08) / 0.25) * 40;

      this.buffCardRects.push({ x: cx, y: cy, w: cardW, h: cardH });

      ctx.save();
      ctx.translate(0, slideOffset);
      ctx.globalAlpha = fadeIn * Math.min(1, (animTimer - i * 0.08) / 0.2);

      const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      cardGrad.addColorStop(0, "#1e1e4a");
      cardGrad.addColorStop(1, "#12122e");
      ctx.fillStyle = cardGrad;
      roundRect(ctx, cx, cy, cardW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = "rgba(100, 130, 255, 0.5)";
      ctx.lineWidth = 2;
      roundRect(ctx, cx, cy, cardW, cardH, 12);
      ctx.stroke();

      ctx.font = `${cardW * 0.35}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(buff.icon, cx + cardW / 2, cy + cardH * 0.22);

      ctx.font = `bold ${Math.max(12, cardW * 0.12)}px monospace`;
      ctx.fillStyle = "#eeddff";
      ctx.fillText(buff.name, cx + cardW / 2, cy + cardH * 0.48);

      ctx.font = `${Math.max(10, cardW * 0.09)}px monospace`;
      ctx.fillStyle = "#aabbdd";
      wrapText(ctx, buff.description, cx + cardW / 2, cy + cardH * 0.65, cardW - 16, Math.max(12, cardW * 0.1));

      ctx.restore();
    }

    ctx.restore();
  }

  getBuffChoiceIndex(clickX: number, clickY: number, count: number): number {
    for (let i = 0; i < this.buffCardRects.length && i < count; i++) {
      const r = this.buffCardRects[i];
      if (clickX >= r.x && clickX <= r.x + r.w && clickY >= r.y && clickY <= r.y + r.h) {
        return i;
      }
    }
    return -1;
  }

  private relicCardRects: { x: number; y: number; w: number; h: number }[] = [];

  drawRelicSelect(choices: RelicDef[], animTimer: number) {
    const ctx = this.ctx;
    const fadeIn = Math.min(animTimer / 0.3, 1);

    ctx.save();
    ctx.globalAlpha = 0.72 * fadeIn;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = fadeIn;

    ctx.fillStyle = "#eebb66";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚱ 波次遗物：三选一", this.width / 2, this.height * 0.16);
    ctx.fillStyle = "#aa9977";
    ctx.font = "12px monospace";
    ctx.fillText("流派遗物会偏斜合成树分支；最多 7 件", this.width / 2, this.height * 0.2);

    const cardW = Math.min(this.width * 0.26, 150);
    const cardH = cardW * 1.65;
    const gap = Math.min(this.width * 0.04, 25);
    const totalW = cardW * choices.length + gap * (choices.length - 1);
    const startX = (this.width - totalW) / 2;
    const startY = this.height * 0.28;

    this.relicCardRects = [];

    for (let i = 0; i < choices.length; i++) {
      const rel = choices[i];
      const cx = startX + i * (cardW + gap);
      const cy = startY;
      const slideOffset = Math.max(0, 1 - (animTimer - i * 0.08) / 0.25) * 40;

      this.relicCardRects.push({ x: cx, y: cy, w: cardW, h: cardH });

      ctx.save();
      ctx.translate(0, slideOffset);
      ctx.globalAlpha = fadeIn * Math.min(1, (animTimer - i * 0.08) / 0.2);

      const cardGrad = ctx.createLinearGradient(cx, cy, cx, cy + cardH);
      cardGrad.addColorStop(0, "#2a2218");
      cardGrad.addColorStop(1, "#12100a");
      ctx.fillStyle = cardGrad;
      roundRect(ctx, cx, cy, cardW, cardH, 12);
      ctx.fill();

      ctx.strokeStyle = "rgba(220, 180, 90, 0.55)";
      ctx.lineWidth = 2;
      roundRect(ctx, cx, cy, cardW, cardH, 12);
      ctx.stroke();

      ctx.font = `${cardW * 0.38}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(rel.icon, cx + cardW / 2, cy + cardH * 0.2);

      ctx.font = `bold ${Math.max(12, cardW * 0.11)}px monospace`;
      ctx.fillStyle = "#eeddcc";
      ctx.fillText(rel.name, cx + cardW / 2, cy + cardH * 0.46);

      ctx.font = `${Math.max(10, cardW * 0.085)}px monospace`;
      ctx.fillStyle = "#bbaa99";
      wrapText(ctx, rel.description, cx + cardW / 2, cy + cardH * 0.62, cardW - 14, Math.max(12, cardW * 0.095));

      ctx.restore();
    }

    ctx.restore();
  }

  getRelicChoiceIndex(clickX: number, clickY: number, count: number): number {
    for (let i = 0; i < this.relicCardRects.length && i < count; i++) {
      const r = this.relicCardRects[i];
      if (clickX >= r.x && clickX <= r.x + r.w && clickY >= r.y && clickY <= r.y + r.h) {
        return i;
      }
    }
    return -1;
  }

  drawDiscoveryToast(text: string, timeLeft: number) {
    const ctx = this.ctx;
    const alpha = Math.min(1, timeLeft * 2);
    ctx.save();
    ctx.globalAlpha = alpha * 0.95;
    const pad = 12;
    ctx.font = "bold 13px monospace";
    const tw = ctx.measureText(text).width;
    const x = this.width - tw - pad * 2 - 16;
    const y = 64;
    const w = tw + pad * 2;
    const h = 32;
    ctx.fillStyle = "rgba(20, 18, 40, 0.88)";
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 210, 120, 0.5)";
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.fillStyle = "#ffe0aa";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + pad, y + h / 2);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const chars = text.split("");
  let line = "";
  let curY = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, curY);
      line = ch;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
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
