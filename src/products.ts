import Matter from "matter-js";
import { Product, PRODUCT_TIERS } from "./types";
import { PhysicsWorld } from "./physics";

let nextId = 1;

export class ProductManager {
  products: Product[] = [];
  private physics: PhysicsWorld;
  private mergeQueue: { ids: number[]; tier: number; cx: number; cy: number }[] = [];
  onMerge: ((tier: number) => void) | null = null;

  constructor(physics: PhysicsWorld) {
    this.physics = physics;
  }

  spawnProduct(x: number, y: number, tier: number): Product {
    const def = PRODUCT_TIERS[tier];
    const body = this.physics.createProductBody(x, y, def.radius);
    this.physics.addBody(body);

    const p: Product = {
      id: nextId++,
      body,
      tier,
      merging: false,
      mergeAnimTimer: 0,
      spawnAnimTimer: 0.3,
    };
    this.products.push(p);
    return p;
  }

  spawnDrops(x: number, y: number, value: number) {
    let remaining = value;
    while (remaining > 0) {
      const count = Math.min(remaining, 3);
      remaining -= count;
      for (let i = 0; i < count; i++) {
        const ox = (Math.random() - 0.5) * 30;
        const oy = (Math.random() - 0.5) * 20;
        const p = this.spawnProduct(x + ox, y + oy, 0);
        const vx = (Math.random() - 0.5) * 3;
        const vy = -(Math.random() * 3 + 1);
        Matter.Body.setVelocity(p.body, { x: vx, y: vy });
      }
    }
  }

  update(dt: number) {
    for (const p of this.products) {
      if (p.spawnAnimTimer > 0) p.spawnAnimTimer -= dt;
      if (p.mergeAnimTimer > 0) p.mergeAnimTimer -= dt;
    }
    this.checkMerges();
    this.processMergeQueue();
  }

  private checkMerges() {
    const byTier = new Map<number, Product[]>();
    for (const p of this.products) {
      if (p.merging) continue;
      const arr = byTier.get(p.tier) || [];
      arr.push(p);
      byTier.set(p.tier, arr);
    }

    for (const [tier, prods] of byTier) {
      if (tier >= PRODUCT_TIERS.length - 1) continue;
      if (prods.length < 3) continue;

      const clusters = this.findClusters(prods);
      for (const cluster of clusters) {
        if (cluster.length >= 3) {
          const group = cluster.slice(0, 3);
          let cx = 0, cy = 0;
          for (const p of group) {
            p.merging = true;
            cx += p.body.position.x;
            cy += p.body.position.y;
          }
          cx /= 3;
          cy /= 3;
          this.mergeQueue.push({
            ids: group.map((p) => p.id),
            tier: tier + 1,
            cx,
            cy,
          });
        }
      }
    }
  }

  private findClusters(prods: Product[]): Product[][] {
    if (prods.length < 3) return [];
    const clusters: Product[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < prods.length; i++) {
      if (used.has(prods[i].id)) continue;
      const cluster: Product[] = [prods[i]];
      const queue = [prods[i]];
      used.add(prods[i].id);

      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (let j = 0; j < prods.length; j++) {
          if (used.has(prods[j].id)) continue;
          const dist = this.bodyDist(cur.body, prods[j].body);
          const touchDist = PRODUCT_TIERS[cur.tier].radius * 2.5;
          if (dist < touchDist) {
            cluster.push(prods[j]);
            queue.push(prods[j]);
            used.add(prods[j].id);
          }
        }
      }
      if (cluster.length >= 3) clusters.push(cluster);
    }
    return clusters;
  }

  private bodyDist(a: Matter.Body, b: Matter.Body): number {
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private processMergeQueue() {
    for (const m of this.mergeQueue) {
      for (const id of m.ids) {
        const idx = this.products.findIndex((p) => p.id === id);
        if (idx >= 0) {
          this.physics.removeBody(this.products[idx].body);
          this.products.splice(idx, 1);
        }
      }
      const np = this.spawnProduct(m.cx, m.cy, m.tier);
      np.mergeAnimTimer = 0.3;

      const pushForce = 0.02;
      for (const p of this.products) {
        if (p.id === np.id) continue;
        const dx = p.body.position.x - m.cx;
        const dy = p.body.position.y - m.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80 && dist > 0) {
          Matter.Body.applyForce(p.body, p.body.position, {
            x: (dx / dist) * pushForce,
            y: (dy / dist) * pushForce,
          });
        }
      }

      if (this.onMerge) this.onMerge(m.tier);
    }
    this.mergeQueue = [];
  }

  removeProduct(product: Product) {
    this.physics.removeBody(product.body);
    const idx = this.products.indexOf(product);
    if (idx >= 0) this.products.splice(idx, 1);
  }

  findNearestProduct(x: number, y: number, maxDist: number): Product | null {
    let best: Product | null = null;
    let bestDist = maxDist;
    for (const p of this.products) {
      const dx = p.body.position.x - x;
      const dy = p.body.position.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  totalValue(): number {
    let v = 0;
    for (const p of this.products) {
      v += PRODUCT_TIERS[p.tier].value;
    }
    return v;
  }

  count(): number {
    return this.products.length;
  }

  applySlashForce(x: number, y: number, dirX: number, dirY: number, speed: number) {
    for (const p of this.products) {
      const dx = p.body.position.x - x;
      const dy = p.body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = PRODUCT_TIERS[p.tier].radius + 15;
      if (dist < hitRadius) {
        const forceMag = Math.min(speed * 0.00005, 0.03);
        Matter.Body.applyForce(p.body, p.body.position, {
          x: dirX * forceMag + (dx / (dist || 1)) * forceMag * 0.5,
          y: dirY * forceMag + (dy / (dist || 1)) * forceMag * 0.5,
        });
      }
    }
  }
}
