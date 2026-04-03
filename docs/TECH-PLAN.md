# 斩币 — 技术路线

> 基于游戏设计文档（GDD.md）和产品路线图（ROADMAP.md），制定各阶段的技术选型、架构设计和实施方案。

---

## 1. 技术选型总览

### 1.1 原型阶段（Phase 0-1）

| 层面 | 选型 | 理由 |
|---|---|---|
| 渲染 | HTML5 Canvas 2D | 零门槛部署，手机浏览器直接测试触屏 |
| 物理引擎 | Matter.js | 轻量级 2D 物理，支持碰撞/重力/摩擦/弹性，社区成熟 |
| 语言 | TypeScript | 类型安全，重构友好，独立开发者减少 bug |
| 构建工具 | Vite | 热更新快，TypeScript 原生支持 |
| 部署 | 静态托管（Vercel / Netlify） | 零成本，分享链接即可测试 |

### 1.2 正式版（Phase 2-3）

| 层面 | 选型 | 理由 |
|---|---|---|
| 游戏引擎 | Cocos Creator 3.x | 微信小游戏原生支持，一套代码多端导出（Web/iOS/Android/小游戏） |
| 物理引擎 | Cocos 内置 Box2D 或自定义轻量物理 | 性能更可控，与引擎深度集成 |
| 语言 | TypeScript | 与 Cocos Creator 原生匹配 |
| 数据存储 | 本地 LocalStorage + 云存储 | 局外养成数据需要持久化和跨设备同步 |
| 后端 | 轻量云函数（微信云开发 / Firebase） | 排行榜、成就同步、防作弊 |

### 1.3 为什么分两套技术栈

Phase 0-1 用纯 Web 技术的目的是**验证速度最大化**：
- 不需要安装 IDE/引擎，浏览器开发浏览器测试
- Matter.js 的 API 比游戏引擎物理更直观，适合快速实验参数
- 验证通过后核心逻辑（碰撞检测、合成规则、波次逻辑）可以直接迁移到 Cocos 的 TypeScript 项目中

---

## 2. 核心技术挑战与方案

### 2.1 实时划砍碰撞检测

**挑战：** 手指轨迹是连续的线段，需要逐帧检测与所有敌人碰撞体的相交。

**方案：**

```
每帧处理流程：
1. 采集 touch/mouse move 事件，记录当前帧的轨迹点
2. 将相邻两个采样点连成线段（刀光线段）
3. 对每个活跃敌人的碰撞体（圆形），判断线段与圆的相交
4. 相交 → 触发切割，计算切割方向和伤害
```

**关键实现细节：**
- 触摸采样频率：至少 60fps，必要时插值补充中间点，避免快速滑动"穿过"敌人
- 碰撞检测用线段-圆相交算法，O(n) 遍历所有敌人，n 通常 < 50，无性能压力
- 刀光宽度：将线段扩展为矩形（或胶囊体），宽度与划速成正比
- 切割方向向量用于计算敌人飞出方向和产物击飞方向

**优化策略：**
- 空间分区（Grid）：屏幕分成若干格子，只检测刀光所在格子内的敌人
- 当敌人数量 > 30 时启用空间分区，否则直接遍历

### 2.2 产物物理堆叠

**挑战：** 大量圆形产物在平台上堆叠、碰撞、滚动，同时需要检测合成条件。

**方案：**

```
物理层（Matter.js）：
- 每个产物 = 一个圆形刚体
- 平台 = 静态矩形刚体
- 左右墙壁 = 静态矩形刚体
- 重力、摩擦、弹性由 Matter.js 处理

合成检测层（自定义逻辑）：
- 监听 Matter.js 的 collisionStart 事件
- 当两个相同类型的产物碰撞时，检查附近是否有第三个同类型产物
- 三个凑齐 → 触发合成：移除三个旧产物，在质心位置创建一个新产物
- 新产物有短暂的"膨胀"动画 + 向外推力
```

**合成检测算法：**

```
当产物 A 和产物 B 碰撞且类型相同时：
1. 以 A 和 B 的中点为圆心，搜索半径 R 内的所有同类型产物
2. 如果找到第三个 C → 触发三合一
3. R = 产物直径 × 2.5（允许一定距离内的"吸附合成"）
4. 合成后检查新产物是否与其他同类碰撞 → 递归触发连锁
```

**性能关键参数：**
- 物理模拟步长：1/60s（与渲染同步）
- 单帧最大合成检测次数：限制为 5 次，防止连锁爆炸卡死
- 产物上限：平台上最多 80 个物理体（超过时最旧的铜币自动消失，给出提示）

### 2.3 性能瓶颈：物理体数量

**挑战：** Matter.js 在 100+ 物理体时可能出现性能问题，尤其在低端手机上。

**Phase 0 压测方案：**
1. 创建测试场景：持续生成产物直到 150 个
2. 在以下设备测试帧率：
   - 中端 Android（骁龙 7 系列）
   - iPhone SE / iPhone 12
   - 低端 Android（骁龙 4 系列）
3. 记录帧率、CPU 占用、合成检测耗时

**降级策略（如果性能不达标）：**

| 优化层级 | 措施 | 效果 |
|---|---|---|
| 第一层 | 减小物理模拟频率（1/30s），渲染保持 60fps | 减少 50% 物理计算量 |
| 第二层 | 睡眠机制：静止超过 2 秒的产物暂停物理模拟 | 大幅减少活跃体数量 |
| 第三层 | 替换 Matter.js，使用自定义简化物理（只处理圆-圆碰撞和重力） | 最大性能控制 |
| 第四层 | 放弃实时物理，改用预计算堆叠位置 + 动画模拟 | 最终手段，牺牲物理真实感 |

### 2.4 分支合成树的数据结构

**方案：**

```typescript
interface ProductDef {
  id: string;            // "fire_ruby"
  tier: number;          // 稀有度/深度层级
  branch: string;        // "fire" | "ice" | "lightning" | ...
  displayName: string;
  radius: number;        // 物理半径（越高级越大）
  mass: number;          // 物理质量
  color: string;         // 原型阶段用颜色区分
  heritageValue: number; // 遗产折算价值
}

interface MergeRule {
  sourceId: string;      // 合成素材的产物 ID
  outcomes: {
    productId: string;   // 可能的产出 ID
    baseWeight: number;  // 基础权重
  }[];
}

// 运行时根据遗物调整权重
function getMergeOutcome(sourceId: string, relics: Relic[]): ProductDef {
  const rule = mergeRules.get(sourceId);
  const adjustedWeights = rule.outcomes.map(o => ({
    ...o,
    weight: applyRelicModifiers(o.baseWeight, o.productId, relics)
  }));
  return weightedRandom(adjustedWeights);
}
```

合成规则配置为纯数据，方便热更新和赛季调整。

### 2.5 刀光渲染

**方案：**

```
轨迹记录：
- 维护一个固定长度的点队列（最近 N 个触摸点）
- 每个点记录：位置、时间戳、速度

渲染方式：
- 将点队列连成平滑曲线（Catmull-Rom 或贝塞尔插值）
- 沿曲线法线方向扩展为带状网格（宽度 = f(速度)）
- 透明度沿时间衰减（尾端渐隐）
- 原型阶段：Canvas 2D 的 lineTo + 径向渐变
- 正式版：Cocos 的自定义 Mesh 或 Graphics 组件

粒子效果：
- 切中敌人时在切割点生成粒子爆发
- 粒子数量和颜色与切割速度/连击数相关
```

---

## 3. 架构设计

### 3.1 模块划分

```
src/
├── core/                    # 核心游戏逻辑（可跨引擎复用）
│   ├── SlashDetector.ts     # 划砍碰撞检测
│   ├── MergeSystem.ts       # 合成规则与检测
│   ├── WaveManager.ts       # 波次管理与敌人生成
│   ├── ProductManager.ts    # 产物生命周期管理
│   ├── BuffSystem.ts        # 增益系统
│   ├── RelicSystem.ts       # 遗物系统
│   └── GameState.ts         # 全局游戏状态
│
├── physics/                 # 物理层
│   ├── PhysicsWorld.ts      # Matter.js 封装
│   └── CollisionHandler.ts  # 碰撞事件处理与分发
│
├── render/                  # 渲染层（原型阶段 Canvas 2D）
│   ├── GameRenderer.ts      # 主渲染器
│   ├── SlashRenderer.ts     # 刀光渲染
│   ├── ProductRenderer.ts   # 产物渲染
│   ├── EnemyRenderer.ts     # 敌人渲染
│   ├── UIRenderer.ts        # HUD / 增益面板 / 遗物面板
│   └── ParticleSystem.ts    # 粒子效果
│
├── input/                   # 输入处理
│   ├── TouchInput.ts        # 触摸事件采集与标准化
│   └── GestureDetector.ts   # 手势识别（划砍 vs 长按）
│
├── data/                    # 游戏数据配置
│   ├── products.json        # 产物定义
│   ├── mergeRules.json      # 合成规则
│   ├── enemies.json         # 敌人定义
│   ├── waves.json           # 波次配置
│   ├── buffs.json           # 增益定义
│   ├── relics.json          # 遗物定义
│   └── achievements.json    # 成就定义
│
├── meta/                    # 局外系统
│   ├── HeritageManager.ts   # 遗产结算
│   ├── UnlockManager.ts     # 内容解锁管理
│   ├── AchievementTracker.ts # 成就追踪
│   └── SaveManager.ts       # 存档管理
│
└── main.ts                  # 入口
```

### 3.2 核心设计原则

**数据驱动：** 所有产物、敌人、波次、增益、遗物、成就都由 JSON 配置定义，代码只处理逻辑。方便策划调整和赛季更新。

**逻辑与渲染分离：** `core/` 下的模块不依赖任何渲染或物理引擎 API。Phase 2 迁移到 Cocos 时，只需要替换 `physics/` 和 `render/` 层。

**事件驱动通信：** 各系统通过事件总线通信，降低耦合：

```typescript
// 示例事件流
"enemy:killed"     → ProductManager（生成掉落产物）
"product:merged"   → MergeSystem（检查连锁）→ BuffSystem（检查里程碑）
"product:consumed" → BuffSystem（弹出增益选择）
"wave:cleared"     → WaveManager（下一波）→ RelicSystem（检查里程碑）
"product:eaten"    → GameState（检查失败条件）
```

### 3.3 游戏主循环

```typescript
function gameLoop(deltaTime: number) {
  // 1. 输入处理
  inputManager.update();
  const slashSegments = inputManager.getSlashSegments();
  const longPressTarget = inputManager.getLongPressTarget();

  // 2. 划砍碰撞检测
  slashDetector.checkSlash(slashSegments, enemies, products);

  // 3. 波次管理（生成新敌人）
  waveManager.update(deltaTime);

  // 4. 敌人更新（移动、吃产物）
  enemyManager.update(deltaTime);

  // 5. 物理模拟步进
  physicsWorld.step(deltaTime);

  // 6. 合成检测（在物理步进后，基于新的碰撞状态）
  mergeSystem.checkMerges();

  // 7. 游戏状态检查（失败条件等）
  gameState.checkConditions();

  // 8. 渲染
  renderer.render();
}
```

---

## 4. 各阶段技术任务

### Phase 0（第 1 个月）

**Week 1：基础框架**
- [ ] 项目初始化（Vite + TypeScript + Matter.js）
- [ ] Canvas 渲染基础（全屏 Canvas，适配移动端视口）
- [ ] 触摸输入采集与标准化
- [ ] 物理世界初始化（平台、墙壁、重力）

**Week 2：划砍 + 敌人**
- [ ] 刀光轨迹记录与渲染
- [ ] 划砍碰撞检测（线段-圆相交）
- [ ] 直落型敌人生成与移动
- [ ] 切中反馈（敌人飞出 + 粒子）

**Week 3：产物 + 合成**
- [ ] 产物物理体创建（圆形刚体）
- [ ] 敌人死亡时产物掉落
- [ ] 碰撞检测触发合成（3 合 1）
- [ ] 合成视觉反馈（膨胀 + 推力）
- [ ] 刀光与产物的物理交互（击飞/拨动）

**Week 4：闭环 + 压测**
- [ ] 漏过敌人行为（落到平台、吃产物）
- [ ] 失败条件实现
- [ ] 基础 HUD（波次、产物总价值）
- [ ] 性能压测（100+ 物理体帧率）
- [ ] 部署到 Vercel，发给测试者

### Phase 1（第 2-3 个月）

**核心玩法完善**
- [ ] 侧抛型敌人（抛物线轨迹）
- [ ] 炸弹型敌人（不可切割 + 误切惩罚 + 漏下转化）
- [ ] 分支合成树实现（JSON 配置 + 权重随机）
- [ ] 连锁合成检测与动画

**增益系统**
- [ ] 长按检测（1 秒 + 圆形进度条）
- [ ] 增益面板 UI（三选一）
- [ ] 增益效果实现（刀光宽度、爆炸、经济偏移等）
- [ ] 稀有度里程碑检测与免费增益触发

**遗物系统**
- [ ] 遗物数据结构与配置
- [ ] 波次里程碑触发（前密后疏）
- [ ] 遗物选择 UI（三选一 + 替换）
- [ ] 遗物效果实现（分支权重修改、基础规则变更）
- [ ] 遗物 combo 效果

**波次系统**
- [ ] 波次配置（敌人类型、数量、速度递增）
- [ ] 波次间隔与节奏控制
- [ ] 波次清除判定

**音效与反馈**
- [ ] 切割音效（多层叠加）
- [ ] 合成音效（不同等级不同音调）
- [ ] 连锁合成音效递升
- [ ] 背景音乐

### Phase 2（第 4-5 个月）— 引擎迁移 + 小游戏

**Cocos Creator 迁移**
- [ ] 项目初始化（Cocos Creator 3.x + TypeScript）
- [ ] core/ 逻辑层直接迁移（不依赖引擎 API）
- [ ] 物理层替换（Matter.js → Cocos Box2D 或自定义）
- [ ] 渲染层重写（Canvas 2D → Cocos 组件/节点）
- [ ] 输入层适配（Cocos 触摸事件）
- [ ] 微信小游戏导出与调试

**局外系统**
- [ ] 遗产结算逻辑
- [ ] 内容解锁管理（遗物/增益/分支/敌人池）
- [ ] 永久微提升系统
- [ ] LocalStorage 存档（小游戏环境）
- [ ] 图鉴 UI

**成就系统**
- [ ] 成就追踪器（跨局累积、单局检测、产物组合检测）
- [ ] 成就通知 UI
- [ ] 称号系统

**社交功能**
- [ ] 微信排行榜（开放域数据）
- [ ] 分享卡片（成就截图 + 小程序码）
- [ ] 好友挑战

**广告接入**
- [ ] 微信激励视频 SDK 集成
- [ ] 广告触发点实现（续命、遗产翻倍）

### Phase 3（第 6-8 个月）— 移动端 App

**原生 App 导出**
- [ ] Cocos Creator 导出 iOS / Android
- [ ] 原生性能优化（渲染批次、内存管理）
- [ ] 推送通知（赛季更新、每日提醒）

**内购系统**
- [ ] 内购 SDK 集成（Apple IAP / Google Play Billing）
- [ ] 商城 UI
- [ ] 皮肤系统（刀光、产物、背景替换）
- [ ] 赛季通行证逻辑

**后端服务**
- [ ] 云函数搭建（排行榜、存档同步、防作弊）
- [ ] 赛季数据管理
- [ ] 运营后台（热更新配置、活动管理）

---

## 5. 关键技术决策记录

### 5.1 为什么原型用 Matter.js 而不是直接上 Cocos

| 因素 | Matter.js + Canvas | Cocos Creator |
|---|---|---|
| 启动速度 | npm init 即可，5 分钟跑起来 | 需要安装编辑器，配置项目，30 分钟+ |
| 物理调参 | API 直观，参数即时生效 | 需要在编辑器和代码间切换 |
| 部署测试 | 浏览器直接打开，分享链接即可 | 需要构建导出 |
| 团队门槛 | 纯 Web 开发技能 | 需要学习 Cocos 框架 |
| 迁移成本 | 核心逻辑可复用 | — |

结论：原型阶段追求**验证速度**，不追求最终技术栈。

### 5.2 为什么正式版选 Cocos Creator 而不是 Unity / Godot

| 因素 | Cocos Creator | Unity | Godot |
|---|---|---|---|
| 微信小游戏支持 | 原生一键导出 | 需要 minigame 适配，包体大 | 不支持 |
| 开发语言 | TypeScript（与原型一致） | C# | GDScript |
| 包体大小 | 小（2-5MB 起） | 大（15MB+） | 中等 |
| 2D 游戏适配 | 专长 | 可以但偏重 3D | 优秀 |
| 国内生态 | 活跃，文档齐全 | 活跃 | 偏弱 |
| 独立开发者友好 | 高（免费、轻量） | 中（订阅费） | 高（开源免费） |

结论：**Cocos Creator** 在"小游戏导出 + TypeScript + 轻量级"三个维度最适合本项目。

### 5.3 物理引擎备选方案

如果 Matter.js / Box2D 性能不满足需求：

**方案 A：Planck.js**
- Box2D 的 TypeScript 移植版，API 与 Box2D 一致
- 性能通常优于 Matter.js
- 迁移成本：中等

**方案 B：自定义简化物理**
- 只实现圆-圆碰撞检测 + 圆-矩形碰撞 + 重力
- 不需要完整的物理引擎（没有关节、约束等复杂特性）
- 性能最优，但开发成本高
- 适合作为最终优化手段

---

## 6. 性能预算

### 目标设备

| 分类 | 设备示例 | 帧率目标 |
|---|---|---|
| 高端 | iPhone 13+, 骁龙 8 系列 | 稳定 60fps |
| 中端 | iPhone SE, 骁龙 7 系列 | 稳定 60fps |
| 低端 | 入门 Android, 骁龙 4 系列 | 稳定 30fps |

### 性能指标

| 指标 | 预算 |
|---|---|
| 物理体上限 | 80 个（含敌人 + 产物） |
| 粒子上限 | 200 个 |
| 渲染 Draw Call | < 50 |
| 内存占用 | < 150MB |
| 首屏加载时间 | < 3 秒（小游戏环境） |
| 包体大小 | < 4MB（小游戏首包） |

---

## 7. 数据存储方案

### 7.1 本地存储（Phase 2）

```typescript
interface SaveData {
  // 局外养成
  heritage: number;
  unlockedRelics: string[];
  unlockedBuffs: string[];
  unlockedBranches: string[];
  permanentUpgrades: Record<string, number>;

  // 成就
  achievements: Record<string, {
    unlocked: boolean;
    progress: number;
  }>;

  // 图鉴
  discoveredProducts: string[];

  // 统计
  totalKills: number;
  totalMerges: number;
  highestWave: number;
  highestTierReached: number;
  totalGamesPlayed: number;
}
```

Phase 2 使用 `wx.setStorage` / `localStorage`，单设备存储。

### 7.2 云存储（Phase 3）

- 微信云开发 / Firebase 存档同步
- 登录后自动同步，支持换设备
- 排行榜数据存云端
- 赛季数据独立存储，赛季结束归档

---

## 8. 测试策略

### 8.1 自动化测试

**核心逻辑单元测试（Vitest）：**
- 合成规则正确性（3 合 1、分支权重、连锁检测）
- 增益效果计算
- 遗物效果叠加
- 成就触发条件
- 遗产结算

**集成测试：**
- 完整游戏循环（生成敌人 → 切割 → 产物掉落 → 合成 → 增益 → 下一波）
- 边界条件（产物被吃光、遗物满槽替换、极端连锁合成）

### 8.2 手动测试

- 各设备帧率测试（Phase 0 Week 4）
- 手感测试（每次修改物理参数后）
- 流程测试（每个 Phase 结束前完整走一遍）

### 8.3 调试工具

Phase 0 内置开发者面板：
- 物理体数量 / 帧率实时显示
- 一键生成指定数量产物（压测）
- 一键跳到指定波次
- 合成分支权重可视化
- 碰撞体轮廓显示开关
