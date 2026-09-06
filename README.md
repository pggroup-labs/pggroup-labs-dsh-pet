# dsh-pet 🐧

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-0.3.0-blue">
  <img alt="platform" src="https://img.shields.io/badge/platform-DeepSeek%20Harness%20Web-8A2BE2">
  <img alt="assets" src="https://img.shields.io/badge/assets-transparent%20VP9--alpha-ff69b4">
</p>

> 🐧 一只住在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 里的小企鹅桌面宠物：待机呼吸、随机动作、左右转向、屏幕漫游、点击 Q 弹、拖拽甩抛反弹、右键点播、余额气泡，以及会调用当前 Harness 模型的 AI 碎碎念 / 桌宠聊天。支持浏览器 overlay、透明置顶桌面窗、多宠物同屏与 pet pack 扩展。

> 动作系统：待机呼吸、随机动作（打瞌睡、玩魔方、写代码、吃火锅……原动作库约 **97 个逻辑动作槽位**）、左右转向、屏幕漫游、点击 Q 弹、拖拽甩抛反弹、右键菜单点播、余额动画 + 头顶联想气泡。**动作系统拥有约 97 个逻辑动作**；小企鹅以「语义层 + 视觉映射 + 三级 fallback」接入该体系（见《动画体系》），不旁路现有引擎。

---

## ✨ 特性

- **纯粹的桌宠**：不掺业务功能——没有天气查询、系统监控、Agent 状态感知。
- **手绘风透明动画**：待机呼吸、打瞌睡、玩魔方、哼歌、吃火锅、放烟花……原动作库约 97 个逻辑动作。
- **永不停止的动画链**：每段动画播完立即按权重选下一个（默认 idle 10 / turn 5 / move 5，余 80% 归随机分类）。
- **屏幕漫游 / 点击 Q 弹 / 拖拽甩抛反弹**：物理与挤压曲线为纯函数，浏览器与桌面严格同手感。
- **右键级联菜单**：浏览器与桌面共用同一份，点播任意动作。
- **多开 / pet pack**：可配置多只宠物同屏；`pet/<前缀>-config.json` 定义全新物种（独立动画池 + 独立素材，与 main 严格隔离）。
- **余额展示**：按档位播动画 + 头顶气泡，每只可独立开关。
- **AI 碎碎念 / 桌宠聊天（可选）**：复用 **DeepSeek Harness 当前选择的 provider/model** 生成一句话或对话回应。

> ⚠️ **模型成本说明**：桌宠的**动画 / 物理 / 漫游本身不调用任何模型**；但「AI 碎碎念」与「桌宠聊天」为可选功能，**启用时会调用当前 Harness 选中的模型并产生对应模型调用/token 消耗**。默认 `whisperEnabled=false`（可在设置页开启；本地单并发模型请注意碎碎念可能与正在跑的任务竞争）。

## 🐧 小企鹅

- **外观**：红棒球帽（黄色 M）➕ 黑墨镜 ➕ 黄色背心 ➕ 蓝羽别针；有点酷、有点欠，但不讨厌。
- **人格**：中文互联网段子手 / KOL 气质——聪明、嘴碎、冷幽默、反差、程序员 / AI / 市场梗、偶尔自嘲、偶尔损主人一句（绝不恶意）。
- **动画**：idle/micro-motion（呼吸、左右看、点头、轻晃）作为常驻底层体验；火锅/魔方/写代码/睡觉等大动作低频出现。
- **碎碎念**：可按周期自动说一句（复用 Harness 模型），支持右键手动触发；动画与文本联动（`events.whisper`）。
- **聊天**：右键「对话」与桌宠聊天，同一 persona。
- **关闭 AI 碎碎念**：设置页把该宠物 `whisperEnabled` 关掉，或配置 `"whisperEnabled": false`。

### 小企鹅 Persona（默认）

小企鹅使用「泛互联网段子手人格」，默认 prompt（可在宠物配置的 `personaPrompt` 覆盖）：

> 你是一只住在 DeepSeek Harness 桌面里的小企鹅：戴红帽、墨镜、黄背心，中文互联网段子手型桌宠。观察敏锐、短句、冷幽默、反差，偶尔损主人一句但不恶意。每次只说一句，通常 8~32 个中文字，有画面感和 punchline。不要解释背景、不要解释笑点、不要自称 AI、不要用客服语气、不要每句都叫主人；避免鸡汤、土味情话和幼儿式卖萌。

配置示例：
```jsonc
{ "pets": [{ "id": "main", "name": "小企鹅", "whisperEnabled": true,
             "personaPrompt": "你是住在 DeepSeek Harness 里的小企鹅……" }] }
```

## 🖥️ 运行模式

- **浏览器 overlay**：宠物住在 DSH 网页里。
- **桌面模式（可选）**：透明置顶局部小窗；与浏览器同一份源码/行为。首次自动探测下载 Electron 到 `~/.dsh/electron/`；不可用时仅告警，不影响浏览器形态。
- **显示位置**：每只宠物 `display` 字段 —— `web` / `desktop` / `both` / `none`。

## ⚙️ 配置

| 配置项 | 说明 |
| --- | --- |
| 设置页「桌宠配置」 | 图形化编辑 大小/位置/边距、余额开关、碎碎念开关、**角色人设**、显示位置；保存即时生效。 |
| `pets[]`（用户层） | 每只宠物：`id`（唯一）、`size`、`balanceEnabled`、`whisperEnabled`、`display`、`position{corner,marginX,marginY}`、可选 `personaPrompt`、`assetRoot`、`media`、`aspect`、自有 `animations`/`animationWeights`（换皮/多物种用）。 |
| `animations` / `animationWeights` | 动画池 / 权重（默认参考 `assets/config.jsonc`）。 |
| `eventsRefreshSec` | `whisper`（碎碎念周期，默认 300s，可加 `whisperMinSec/whisperMaxSec` 抖动）、`balance`。 |
| `notificationsEnabled` | 系统通知总开关。 |

**数据结构（简化）**
```ts
interface PetConfig {
  id: string; displayName?: string;
  size: number;                       // 宽度 px，高度自动 = size × aspect
  asset?: string;                     // 换皮素材（per-pet assetRoot）
  width?: number;
  position?: { corner: Corner; marginX: number; marginY: number };
  balanceEnabled?: boolean;
  mutterEnabled?: boolean;            // 碎碎念开关
  displayMode?: 'web'|'desktop'|'both'|'none';
  personaPrompt?: string;             // 覆盖默认 persona
}
```

## 🎬 动画体系（小企鹅接入方式）

- **逻辑动作**（如“原地专心玩魔方”“写代码”“涮火锅”）仍是约 97 个逻辑 action，通过 `animationWeights` / `categories` 随机选择。
- **视觉映射**：`逻辑动作 → pet animation resolver → assetRoot/pet species → 对应 WebM`。此为**语义层**：同一逻辑动作可被不同物种映射到自己的视觉实现，绝不写死 `if (pet.id === 'penguin')`。
- **三级 fallback**（对 Penguin 素材）
  - **L1** 存在真正 Penguin WebM → 直接播放。
  - **L2** 无专用 WebM 但存在合适 Penguin base pose → 播放预生成 procedural WebM variant（同一 pose + 不同 motion recipe：BREATH / BOB / SWAY / HOP / NOD / SQUASH / SLEEP / TALK / THINK）。
  - **L3** 连对应 pose 都没有 → fallback 到 Penguin idle/micro-action。
  - **绝不 fallback 到蓝毛女仆素材；缺失也绝不 404 / 空白 / 卡帧。**

## 📄 用户数据 / 资产目录

| 层 | 路径 | 作用 |
| --- | --- | --- |
| 默认配置（只读） | 包内 `assets/config.jsonc` | 完整结构参考（宠物列表 / 动画池 / 权重）。 |
| 用户配置 | `$DSH_HOME/dsh-pet/main-config.json` | 覆盖 pets / animations / weights；`personaPrompt` 可覆盖人设。 |
| 用户动画（可选） | `$DSH_HOME/dsh-pet/main-animation/webm/` | VP9-Alpha `.webm` 同名覆盖包内默认动画。 |
| pet pack | `$DSH_HOME/dsh-pet/pet/<名前>-config.json` + `<名前>-animation/` | 全新物种（独立池 + 独立素材）。 |

## 🔧 从源码构建 / 生成 Penguin 动画

```sh
npm run types && npm run bundle     # 先 typecheck 再 tsdown 打包 lib
node scripts/build-penguin-animations.mjs   # 由企鹅透明 PNG pose 生成 VP9-alpha WebM（需支持 VP9-alpha 的 ffmpeg）
npm test                            # node --experimental-strip-types --test
```

- 生成脚本：`scripts/build-penguin-animations.mjs`（把 `user-example/penguin-animation/*.png` 排版到 640×360 透明画布 → 统一角色高、水平居中、脚底 y=330 → 套 motion recipe → 编码 VP9-alpha WebM 到对应素材目录）。
- 素材健康校验：`scripts/prepack-check.js` 检查各动画的 width/height/codec/alpha/duration/fps。

## 🗑️ 卸载

```sh
dsh plugin --profile web remove dsh-pet
```

## ⁉️ 安装（从本仓库）

```sh
dsh plugin --profile web add git+https://github.com/pggroup-labs/pggroup-labs-dsh-pet.git
```
重启 `dsh web`，在设置页开启「小企鹅」的碎碎念即可。

## 📄 许可

- 代码：MIT（详见 `LICENSE`）。
- 素材（动画/提示词/源视频）：允许开源使用，**禁止商用**。

## 🙏 致谢 / Upstream

本项目 fork 自 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)（MIT）。原项目的素材生成链（AI 提示词 → 绿幕视频 → 透明动画）、动画库与桌面 Helper 结构均来自 upstream；本 fork 在**保留其能力**的前提下加入小企鹅角色、per-pet 人设与碎碎念升级。素材版权与署名沿用 upstream 约定（禁止商用）。
