# 斩币（slash-coin）Web 原型

屏幕即战场、划砍守线、底部物理堆叠与分支合成，配合波次遗物与三选一增益的玩法验证原型。设计细节见 [`docs/GDD.md`](docs/GDD.md)，产品阶段见 [`docs/ROADMAP.md`](docs/ROADMAP.md)，长篇技术规划见 [`docs/TECH-PLAN.md`](docs/TECH-PLAN.md)。

---

## 技术栈

| 类别 | 选型 | 说明 |
|------|------|------|
| 语言 | TypeScript | 严格类型，模块边界清晰 |
| 构建 | Vite 8 | ESM、开发热更新 |
| 渲染 | Canvas 2D | 单全屏画布，设备像素比缩放 |
| 物理 | Matter.js 0.20 | 产物刚体、平台与侧墙；**勿改 `Engine` 默认重力 scale** |
| 部署 | 静态资源 + GitHub Actions | `push` 到 `master` 构建并发布 Pages |

---

## 环境要求

- Node.js **18+**（CI 使用 20）
- npm

---

## 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 开发服 http://0.0.0.0:5173（便于 WSL/局域网调试）
npm run build        # 输出到 dist/，生产 base 为相对路径 ./
npm run preview      # 本地预览构建结果 :4173
```

---

## 目录与模块职责

```
slash-coin/
├── index.html          # 入口 HTML，#game 画布
├── src/
│   ├── main.ts         # 挂载 Game、异常兜底
│   ├── game.ts         # 主循环、状态机、各系统编排
│   ├── input.ts        # 指针轨迹、刀光线段、长按消耗
│   ├── physics.ts      # Matter 世界、重力、静态碰撞体
│   ├── enemies.ts      # 波次、生成、重力下落、漏怪、炸弹标记
│   ├── products.ts     # 产物刚体、三合一、分支合成结果、随机移除（炸弹惩罚）
│   ├── mergeTree.ts    # 产物 kind 表、MERGE_TABLE、加权合成
│   ├── buffs.ts        # 增益池、按产物加权三选一
│   ├── relics.ts       # 遗物池、波次里程碑、流派 MergeContext
│   ├── particles.ts    # 简单粒子
│   ├── renderer.ts     # 背景、平台、实体、HUD、弹层 UI
│   └── types.ts        # 共享类型与颜色常量
├── docs/               # GDD / 路线 / 技术路线文档
└── .github/workflows/  # Pages 部署
```

**数据流（简述）**

1. `InputManager` 产出刀光 **线段**；`Game` 对敌人做 **线段-圆** 相交检测。  
2. 产物合成在 **游戏逻辑层** 按 `kindId` 聚类 + 距离阈值判定，**不**依赖 Matter 碰撞事件做三合一。  
3. `GameStats` 由遗物与增益共同修改；`ProductManager` / `EnemyManager` 通过回调读取合并上下文、合成距离、冲击倍率等。

---

## 关键实现注意点

### Matter.js 重力

使用 `Matter.Engine.create({ gravity: { x: 0, y: 1.8 } })` 即可，**不要**把 `gravity.scale` 设为 `1`。引擎默认 scale 为 `0.001`，擅自改为 `1` 会导致重力放大约千倍、产物穿模或行为异常。

### 触摸与 UI

画布上对 `touch*` 使用了 `preventDefault`，浏览器**不会**再派发 `click`。游戏内 **增益/遗物/结束重开** 等 UI 使用 **`pointerup`** 处理，避免移动端点不动。

### 构建路径 `base`

- **开发**：`base: "/"`  
- **生产**：`base: "./"`，便于 GitHub Pages 子路径部署及本地直接打开 `dist/index.html` 时资源可加载。

若改为固定绝对路径（例如 `/repo-name/`），需同步托管目录与访问 URL。

### 炸弹敌人

- 划中：**随机移除**一枚场上产物（无增益），炸弹进入死亡动画。  
- 落地：在落点 **生成**随机 `kind`（深度随波次），**不参与**漏怪吃币逻辑与「仅有漏怪且无产物」的 Game Over 判定。

---

## 部署（GitHub Pages）

仓库已含 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)：向 **`master`** 推送后自动 `npm ci` → `npm run build` → `deploy-pages`。

请在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。具体访问域名以仓库 Pages 设置为准。

---

## 与正式版技术路线的关系

原型用于快速验证手感与规则；长期方案在 `docs/TECH-PLAN.md` 中规划为 **Cocos Creator + 小游戏/多端** 等。本仓库中的 TypeScript 模块划分（输入、物理、合成、波次）可作为迁移时的逻辑参考，但不宜假设 API 可直接粘贴进引擎。
