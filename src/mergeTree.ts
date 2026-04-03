import type { Branch, ProductKindDef, MergeContext } from "./types";

export const PRODUCT_KINDS: Record<string, ProductKindDef> = {};
export const MERGE_TABLE: Record<string, { targetId: string; weight: number }[]> = {};

const DEPTH_RADIUS = [14, 18, 22, 27, 32] as const;
const DEPTH_VALUE = [1, 5, 25, 100, 400] as const;

function reg(
  id: string,
  branch: Branch,
  depth: number,
  name: string,
  color: string,
  targets: { targetId: string; weight: number }[] | null,
) {
  PRODUCT_KINDS[id] = {
    id,
    branch,
    depth,
    name,
    color,
    radius: DEPTH_RADIUS[Math.min(depth, DEPTH_RADIUS.length - 1)],
    value: DEPTH_VALUE[Math.min(depth, DEPTH_VALUE.length - 1)],
  };
  if (targets && targets.length > 0) MERGE_TABLE[id] = targets;
}

function bn(b: Branch): string {
  if (b === "fire") return "火";
  if (b === "ice") return "冰";
  return "雷";
}

reg("base", "neutral", 0, "素铜", "#e08840", [
  { targetId: "f1", weight: 1 },
  { targetId: "i1", weight: 1 },
  { targetId: "l1", weight: 1 },
]);

reg("f1", "fire", 1, `${bn("fire")}屑银`, "#ff6644", [
  { targetId: "f2a", weight: 1 },
  { targetId: "f2b", weight: 1 },
]);
reg("i1", "ice", 1, `${bn("ice")}屑银`, "#66ccff", [
  { targetId: "i2a", weight: 1 },
  { targetId: "i2b", weight: 1 },
]);
reg("l1", "lightning", 1, `${bn("lightning")}屑银`, "#eedd33", [
  { targetId: "l2a", weight: 1 },
  { targetId: "l2b", weight: 1 },
]);

reg("f2a", "fire", 2, `${bn("fire")}赤锭`, "#ff4422", [
  { targetId: "f3a", weight: 1 },
  { targetId: "f3b", weight: 1 },
]);
reg("f2b", "fire", 2, `${bn("fire")}烬锭`, "#cc5522", [
  { targetId: "f3b", weight: 1 },
  { targetId: "f3c", weight: 1 },
]);
reg("i2a", "ice", 2, `${bn("ice")}霜锭`, "#44aaff", [
  { targetId: "i3a", weight: 1 },
  { targetId: "i3b", weight: 1 },
]);
reg("i2b", "ice", 2, `${bn("ice")}晶锭`, "#88ddff", [
  { targetId: "i3b", weight: 1 },
  { targetId: "i3c", weight: 1 },
]);
reg("l2a", "lightning", 2, `${bn("lightning")}弧锭`, "#ffee55", [
  { targetId: "l3a", weight: 1 },
  { targetId: "l3b", weight: 1 },
]);
reg("l2b", "lightning", 2, `${bn("lightning")}闪锭`, "#ddcc22", [
  { targetId: "l3b", weight: 1 },
  { targetId: "l3c", weight: 1 },
]);

reg("f3a", "fire", 3, `${bn("fire")}熔核`, "#ff2200", [
  { targetId: "f4a", weight: 1 },
  { targetId: "f4b", weight: 1 },
]);
reg("f3b", "fire", 3, `${bn("fire")}焰心`, "#ff6622", [
  { targetId: "f4b", weight: 1 },
  { targetId: "f4c", weight: 1 },
]);
reg("f3c", "fire", 3, `${bn("fire")}余烬`, "#aa3311", [
  { targetId: "f4c", weight: 1 },
  { targetId: "f4d", weight: 1 },
]);
reg("i3a", "ice", 3, `${bn("ice")}深寒`, "#2288dd", [
  { targetId: "i4a", weight: 1 },
  { targetId: "i4b", weight: 1 },
]);
reg("i3b", "ice", 3, `${bn("ice")}凝华`, "#55bbee", [
  { targetId: "i4b", weight: 1 },
  { targetId: "i4c", weight: 1 },
]);
reg("i3c", "ice", 3, `${bn("ice")}雪魄`, "#aaddff", [
  { targetId: "i4c", weight: 1 },
  { targetId: "i4d", weight: 1 },
]);
reg("l3a", "lightning", 3, `${bn("lightning")}霆核`, "#fff066", [
  { targetId: "l4a", weight: 1 },
  { targetId: "l4b", weight: 1 },
]);
reg("l3b", "lightning", 3, `${bn("lightning")}极电`, "#eecc33", [
  { targetId: "l4b", weight: 1 },
  { targetId: "l4c", weight: 1 },
]);
reg("l3c", "lightning", 3, `${bn("lightning")}磁暴`, "#bbaa00", [
  { targetId: "l4c", weight: 1 },
  { targetId: "l4d", weight: 1 },
]);

for (const id of ["f4a", "f4b", "f4c", "f4d"] as const) {
  reg(id, "fire", 4, `${bn("fire")}神锻`, "#ff1100", null);
}
for (const id of ["i4a", "i4b", "i4c", "i4d"] as const) {
  reg(id, "ice", 4, `${bn("ice")}永霜`, "#1166cc", null);
}
for (const id of ["l4a", "l4b", "l4c", "l4d"] as const) {
  reg(id, "lightning", 4, `${bn("lightning")}天罚`, "#ffdd00", null);
}

export const BASE_KIND_ID = "base";

/** 炸弹漏怪奖励：按波次随机深度，再在该深度随机一种产物 */
export function bombLeakRewardDepth(wave: number): number {
  if (wave <= 2) return Math.random() < 0.55 ? 0 : 1;
  if (wave <= 5) return Math.floor(Math.random() * 3);
  if (wave <= 10) return Math.floor(Math.random() * 4);
  return Math.min(4, Math.floor(Math.random() * 5));
}

export function pickRandomKindAtDepth(depth: number): string {
  const ids = Object.keys(PRODUCT_KINDS).filter((k) => PRODUCT_KINDS[k].depth === depth);
  if (ids.length === 0) return BASE_KIND_ID;
  return ids[Math.floor(Math.random() * ids.length)]!;
}

export function getKind(id: string): ProductKindDef {
  return PRODUCT_KINDS[id] ?? PRODUCT_KINDS[BASE_KIND_ID];
}

function kindsOneDeeperSameBranch(branch: Branch, fromDepth: number): string[] {
  return Object.keys(PRODUCT_KINDS).filter(
    (k) => PRODUCT_KINDS[k].branch === branch && PRODUCT_KINDS[k].depth === fromDepth + 1,
  );
}

function rollWeighted(entries: { targetId: string; weight: number }[]): string {
  let total = 0;
  for (const e of entries) total += e.weight;
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.targetId;
  }
  return entries[entries.length - 1].targetId;
}

export function pickMergeResult(sourceKindId: string, ctx: MergeContext): string {
  const options = MERGE_TABLE[sourceKindId];
  if (!options?.length) return sourceKindId;

  let weighted = options.map((o) => ({ ...o }));

  if (ctx.gamblerRelic) {
    const u = 1 / weighted.length;
    weighted = weighted.map((w) => ({ ...w, weight: u }));
  } else if (ctx.favoredBranch) {
    const fb = ctx.favoredBranch;
    let sumF = 0;
    let sumO = 0;
    for (const w of weighted) {
      const b = PRODUCT_KINDS[w.targetId]?.branch;
      if (b === fb) sumF += w.weight;
      else sumO += w.weight;
    }
    if (sumF > 0 && sumO > 0) {
      const targetF = 0.7;
      const targetO = 0.3;
      for (const w of weighted) {
        const b = PRODUCT_KINDS[w.targetId]?.branch;
        if (b === fb) w.weight = (w.weight / sumF) * targetF;
        else w.weight = (w.weight / sumO) * targetO;
      }
    }
  }

  let result = rollWeighted(weighted);

  if (ctx.gamblerRelic && Math.random() < 0.2) {
    const k = PRODUCT_KINDS[result];
    if (k && k.depth < 4) {
      const deeper = kindsOneDeeperSameBranch(k.branch, k.depth);
      if (deeper.length) result = deeper[Math.floor(Math.random() * deeper.length)];
    }
  }

  return result;
}
