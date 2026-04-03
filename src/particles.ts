import { Particle } from "./types";

export class ParticleSystem {
  particles: Particle[] = [];

  emit(x: number, y: number, count: number, color: string, speed = 200) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.4 + Math.random() * 0.3,
        radius: 2 + Math.random() * 3,
        color,
      });
    }
  }

  emitDirectional(x: number, y: number, dirX: number, dirY: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const spread = 0.8;
      const angle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * spread;
      const spd = 150 + Math.random() * 250;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.3 + Math.random() * 0.2,
        radius: 2 + Math.random() * 2,
        color,
      });
    }
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
