import type { Branch, GameStats, RelicDef } from "./types";

export const RELIC_MILESTONE_WAVES = [2, 4, 7, 11, 16, 22, 29] as const;
export const MAX_RELIC_SLOTS = 7;

export const RELIC_POOL: RelicDef[] = [
  {
    id: "forge_heart",
    name: "熔炉之心",
    description: "流派·火：合成走向火系分支约 70% 权重。",
    icon: "🔥",
    favoredBranch: "fire",
  },
  {
    id: "frost_sigil",
    name: "霜降",
    description: "流派·冰：合成走向冰系分支约 70% 权重。",
    icon: "❄",
    favoredBranch: "ice",
  },
  {
    id: "lightning_rod",
    name: "引雷针",
    description: "流派·雷：合成走向雷系分支约 70% 权重。",
    icon: "⚡",
    favoredBranch: "lightning",
  },
  {
    id: "gambler_die",
    name: "赌徒的骰子",
    description: "取消流派偏斜，合成均匀随机；20% 概率额外跳一级深度。",
    icon: "🎲",
    gamblerRelic: true,
  },
  {
    id: "wide_blade",
    name: "宽刃遗契",
    description: "刀光基础宽度 +25%。",
    icon: "🗾",
    apply: (s) => {
      s.slashWidthMult *= 1.25;
    },
  },
  {
    id: "miser_charm",
    name: "吝啬鬼护符",
    description: "敌人吃产物变慢 40%；掉落价值 -15%。",
    icon: "🪙",
    apply: (s) => {
      s.enemyEatIntervalMult *= 1.6;
      s.dropRelicMult *= 0.85;
    },
  },
  {
    id: "gravity_lens",
    name: "重力透镜",
    description: "掉落更偏向平台中央。",
    icon: "🌀",
    apply: (s) => {
      s.coinAttractCenter += 0.35;
    },
  },
  {
    id: "super_conduct",
    name: "超导",
    description: "合成判定距离 +20%（雷系散布流协同）。",
    icon: "🔗",
    apply: (s) => {
      s.mergeRadiusMult *= 1.2;
    },
  },
];

export function pickRelicChoices(count: number, ownedIds: Set<string>): RelicDef[] {
  const pool = RELIC_POOL.filter((r) => !ownedIds.has(r.id));
  const picks: RelicDef[] = [];
  const copy = [...pool];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    picks.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return picks;
}

export function mergeContextFromRelics(relics: RelicDef[]): { favoredBranch: Branch | null; gamblerRelic: boolean } {
  let gambler = false;
  let favored: Branch | null = null;
  for (const r of relics) {
    if (r.gamblerRelic) gambler = true;
    if (r.favoredBranch) favored = r.favoredBranch;
  }
  if (gambler) favored = null;
  return { favoredBranch: favored, gamblerRelic: gambler };
}
