import Matter from "matter-js";

export interface Vec2 {
  x: number;
  y: number;
}

export interface SlashPoint {
  x: number;
  y: number;
  time: number;
  speed: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  speed: number;
  value: number;
  alive: boolean;
  leaked: boolean;
  leakedTimer: number;
  flashTimer: number;
  deathVx: number;
  deathVy: number;
  deathTimer: number;
  dying: boolean;
}

export interface Product {
  id: number;
  body: Matter.Body;
  tier: number;
  merging: boolean;
  mergeAnimTimer: number;
  spawnAnimTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export const PRODUCT_TIERS = [
  { name: "铜币", color: "#cd7f32", radius: 10, value: 1 },
  { name: "银币", color: "#c0c0c0", radius: 14, value: 5 },
  { name: "金币", color: "#ffd700", radius: 18, value: 25 },
  { name: "宝石", color: "#00cfff", radius: 23, value: 100 },
  { name: "神石", color: "#bf00ff", radius: 28, value: 400 },
];

export const COLORS = {
  bg: "#0a0a1a",
  battleZone: "#0d0d24",
  mergeZone: "#0a0a18",
  platform: "#1a1a3a",
  wall: "#1a1a3a",
  divider: "#222255",
  slash: "#ffffff",
  slashGlow: "rgba(150, 200, 255, 0.5)",
  enemyFill: "#cc3344",
  enemyStroke: "#ff5566",
  leakedEnemy: "#884444",
  hud: "#aabbdd",
  hudBg: "rgba(10, 10, 26, 0.7)",
};
