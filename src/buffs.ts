import type { Branch } from "./types";
import { Buff, GameStats } from "./types";
import { getKind } from "./mergeTree";

export interface BuffPickContext {
  reason: "new_tier" | "consume";
  /** 作为加权依据的产物 kindId（里程碑=刚合出的；消耗=长按的那枚） */
  sourceKindId?: string;
}

function depthTier(depth: number): "low" | "mid" | "high" {
  if (depth <= 1) return "low";
  if (depth === 2) return "mid";
  return "high";
}

function buffPickWeight(buff: Buff, ctx: BuffPickContext): number {
  let w = buff.basePickWeight ?? 1;
  const sid = ctx.sourceKindId;
  if (!sid) return w;

  const kind = getKind(sid);

  if (buff.branchAffinity && buff.branchAffinity === kind.branch) {
    w *= 2.75;
  }

  if (buff.depthAffinity) {
    const t = depthTier(kind.depth);
    if (buff.depthAffinity === t) w *= 1.85;
  }

  const tags = buff.tags;
  if (tags?.includes("chain") && kind.depth >= 2) w *= 1.55;
  if (tags?.includes("premium") && kind.depth >= 3) w *= 1.65;
  if (tags?.includes("economy") && kind.depth <= 1) w *= 1.4;
  if (tags?.includes("slash") && kind.depth >= 2) w *= 1.35;
  if (ctx.reason === "new_tier" && tags?.includes("milestone")) w *= 1.25;

  return w;
}

const BUFF_POOL: Buff[] = [
  {
    id: "ember_burst",
    name: "余烬爆裂",
    description: "燃烧：击杀敌人有 12% 再掉 1 点价值素铜。",
    icon: "🔥",
    branchAffinity: "fire",
    tags: ["milestone"],
    apply: (s) => {
      s.burnKillExtraChance = Math.min(0.65, s.burnKillExtraChance + 0.12);
    },
  },
  {
    id: "wildfire",
    name: "野火蔓延",
    description: "燃烧：合成冲击波 +18%。",
    icon: "🜂",
    branchAffinity: "fire",
    depthAffinity: "mid",
    tags: ["chain"],
    apply: (s) => {
      s.mergeBlastMult *= 1.18;
    },
  },
  {
    id: "inferno_core",
    name: "熔核迸发",
    description: "燃烧：击杀额外掉落概率 +8%，冲击波 +10%。",
    icon: "🌋",
    branchAffinity: "fire",
    depthAffinity: "high",
    tags: ["chain", "premium"],
    apply: (s) => {
      s.burnKillExtraChance = Math.min(0.65, s.burnKillExtraChance + 0.08);
      s.mergeBlastMult *= 1.1;
    },
  },
  {
    id: "frost_blade",
    name: "霜刃凝结",
    description: "冰冻：斩击命中滞空敌人，2 秒内下落变缓。",
    icon: "🧊",
    branchAffinity: "ice",
    apply: (s) => {
      s.iceSlashSlowSeconds = Math.max(s.iceSlashSlowSeconds, 2);
      s.iceSlashGravityMult = Math.min(s.iceSlashGravityMult, 0.52);
    },
  },
  {
    id: "deep_freeze",
    name: "深寒锁",
    description: "冰冻：减速延长至 2.6 秒，重力×0.45。",
    icon: "❄",
    branchAffinity: "ice",
    depthAffinity: "mid",
    tags: ["slash"],
    apply: (s) => {
      s.iceSlashSlowSeconds = Math.max(s.iceSlashSlowSeconds, 2.6);
      s.iceSlashGravityMult = Math.min(s.iceSlashGravityMult, 0.45);
    },
  },
  {
    id: "absolute_zero",
    name: "绝对零度",
    description: "冰冻：顶级控制，3 秒滞空减速。",
    icon: "🧿",
    branchAffinity: "ice",
    depthAffinity: "high",
    tags: ["premium", "milestone"],
    apply: (s) => {
      s.iceSlashSlowSeconds = Math.max(s.iceSlashSlowSeconds, 3);
      s.iceSlashGravityMult = Math.min(s.iceSlashGravityMult, 0.38);
    },
  },
  {
    id: "chain_reaction",
    name: "连锁反应",
    description: "连锁：合成推开力度 +45%。",
    icon: "💥",
    tags: ["chain", "milestone"],
    depthAffinity: "mid",
    apply: (s) => {
      s.mergeBlastMult *= 1.45;
    },
  },
  {
    id: "resonance_cascade",
    name: "共鸣级联",
    description: "连锁：合成距离 +30%，冲击波 +22%。",
    icon: "🌀",
    tags: ["chain"],
    depthAffinity: "high",
    apply: (s) => {
      s.mergeRadiusMult *= 1.3;
      s.mergeBlastMult *= 1.22;
    },
  },
  {
    id: "thunder_edge",
    name: "鸣雷刃",
    description: "雷电：斩击判定范围 +18%。",
    icon: "⚡",
    branchAffinity: "lightning",
    tags: ["slash"],
    apply: (s) => {
      s.lightningSlashHitMult *= 1.18;
    },
  },
  {
    id: "arc_wide",
    name: "弧光展开",
    description: "雷电：刀光宽度 +22%，雷刃 +10%。",
    icon: "🗲",
    branchAffinity: "lightning",
    depthAffinity: "mid",
    apply: (s) => {
      s.slashWidthMult *= 1.22;
      s.lightningSlashHitMult *= 1.1;
    },
  },
  {
    id: "storm_heart",
    name: "雷心",
    description: "雷电：掉落 +25%，斩击范围 +15%。",
    icon: "⛈",
    branchAffinity: "lightning",
    depthAffinity: "high",
    tags: ["premium"],
    apply: (s) => {
      s.dropValueMult *= 1.25;
      s.lightningSlashHitMult *= 1.15;
    },
  },
  {
    id: "copper_luck",
    name: "铜运",
    description: "素朴：掉落价值 +35%（低级产物加权易出现）。",
    icon: "🪙",
    depthAffinity: "low",
    tags: ["economy"],
    basePickWeight: 1.15,
    apply: (s) => {
      s.dropValueMult *= 1.35;
    },
  },
  {
    id: "slash_width",
    name: "宽刃",
    description: "刀光宽度 +30%。",
    icon: "⚔",
    tags: ["slash"],
    apply: (s) => {
      s.slashWidthMult *= 1.3;
    },
  },
  {
    id: "slash_damage",
    name: "锋锐",
    description: "斩击伤害 +25%。",
    icon: "🗡",
    apply: (s) => {
      s.slashDamageMult *= 1.25;
    },
  },
  {
    id: "drop_value",
    name: "贪婪",
    description: "掉落价值 +40%。",
    icon: "💎",
    apply: (s) => {
      s.dropValueMult *= 1.4;
    },
  },
  {
    id: "enemy_slow",
    name: "迟钝",
    description: "敌人全局下落减速 20%。",
    icon: "🐌",
    apply: (s) => {
      s.enemySlowMult *= 0.8;
    },
  },
  {
    id: "merge_range",
    name: "共鸣",
    description: "合成距离 +35%。",
    icon: "🔮",
    tags: ["chain"],
    apply: (s) => {
      s.mergeRadiusMult *= 1.35;
    },
  },
  {
    id: "coin_center",
    name: "聚财",
    description: "掉落偏向平台中央。",
    icon: "🧲",
    apply: (s) => {
      s.coinAttractCenter += 0.3;
    },
  },
  {
    id: "slash_width2",
    name: "巨刃",
    description: "刀光宽度 +50%。",
    icon: "🪓",
    depthAffinity: "high",
    apply: (s) => {
      s.slashWidthMult *= 1.5;
    },
  },
  {
    id: "drop_value2",
    name: "金雨",
    description: "掉落价值 +60%。",
    icon: "🌧",
    depthAffinity: "high",
    tags: ["premium"],
    apply: (s) => {
      s.dropValueMult *= 1.6;
    },
  },
];

export function pickBuffChoices(count: number, ctx: BuffPickContext): Buff[] {
  const pool = BUFF_POOL.map((b) => ({
    buff: b,
    w: buffPickWeight(b, ctx),
  }));
  const picks: Buff[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    let total = 0;
    for (const p of pool) total += p.w;
    let r = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].w;
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    picks.push(pool[idx].buff);
    pool.splice(idx, 1);
  }
  return picks;
}

export function createDefaultStats(): GameStats {
  return {
    slashWidthMult: 1,
    slashDamageMult: 1,
    dropValueMult: 1,
    enemySlowMult: 1,
    mergeRadiusMult: 1,
    coinAttractCenter: 0,
    enemyEatIntervalMult: 1,
    dropRelicMult: 1,
    mergeBlastMult: 1,
    burnKillExtraChance: 0,
    iceSlashSlowSeconds: 0,
    iceSlashGravityMult: 1,
    lightningSlashHitMult: 1,
  };
}
