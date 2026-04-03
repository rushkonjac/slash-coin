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

export type Branch = "fire" | "ice" | "lightning" | "neutral";

export interface ProductKindDef {
  id: string;
  branch: Branch;
  depth: number;
  name: string;
  color: string;
  radius: number;
  value: number;
}

export interface MergeContext {
  favoredBranch: Branch | null;
  gamblerRelic: boolean;
}

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  favoredBranch?: Branch;
  gamblerRelic?: boolean;
  apply?: (stats: GameStats) => void;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  vy: number;
  radius: number;
  hp: number;
  gravity: number;
  value: number;
  alive: boolean;
  leaked: boolean;
  leakedTimer: number;
  flashTimer: number;
  deathVx: number;
  deathVy: number;
  deathTimer: number;
  dying: boolean;
  /** 炸弹：不可斩杀；误切随机吃掉一枚产物；漏至平台变随机产物 */
  isBomb: boolean;
  /** 炸弹刚落地，等待本帧结束后转化为产物 */
  bombConvertPending: boolean;
  /** 被冰系斩击减速，秒 */
  iceSlowTimer: number;
}

export interface Buff {
  id: string;
  name: string;
  description: string;
  icon: string;
  apply: (stats: GameStats) => void;
  /** 与消耗/里程碑产物同流派时，三选一出现权重提高 */
  branchAffinity?: Branch;
  /** 与产物深度段一致时加权：low 0-1 / mid 2 / high 3-4 */
  depthAffinity?: "low" | "mid" | "high";
  /** chain=连锁合成 slash=斩击 economy=资源 milestone=里程碑略加成 */
  tags?: string[];
  /** 基础抽取权重，默认 1 */
  basePickWeight?: number;
}

export interface GameStats {
  slashWidthMult: number;
  slashDamageMult: number;
  dropValueMult: number;
  enemySlowMult: number;
  mergeRadiusMult: number;
  coinAttractCenter: number;
  /** 敌人吃产物间隔乘数，越大吃得越慢 */
  enemyEatIntervalMult: number;
  /** 掉落价值额外乘数（遗物等叠加） */
  dropRelicMult: number;
  /** 合成完成时推开周围产物的力度乘数（连锁） */
  mergeBlastMult: number;
  /** 击杀普通敌人时额外掉落 1 点价值的概率（燃烧） */
  burnKillExtraChance: number;
  /** >0 时斩击命中未落地敌人会施加冰冻时间（秒） */
  iceSlashSlowSeconds: number;
  /** 冰冻期间竖直加速度×该值（越小落越慢） */
  iceSlashGravityMult: number;
  /** 斩击判定半径额外乘数（雷电刃幅） */
  lightningSlashHitMult: number;
}

export interface Product {
  id: number;
  body: Matter.Body;
  kindId: string;
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

export const COLORS = {
  bg: "#0a0a1a",
  battleZone: "#0d0d24",
  mergeZone: "#12122a",
  platform: "#2a2a50",
  platformTop: "#3a3a6a",
  wall: "#1a1a3a",
  divider: "#3344aa",
  slash: "#ffffff",
  slashGlow: "rgba(150, 200, 255, 0.5)",
  enemyFill: "#cc3344",
  enemyStroke: "#ff5566",
  leakedEnemy: "#884444",
  bombFill: "#2a2030",
  bombStroke: "#ff3366",
  bombCore: "#ffcc00",
  hud: "#ccddff",
  hudBg: "rgba(10, 10, 30, 0.8)",
};
