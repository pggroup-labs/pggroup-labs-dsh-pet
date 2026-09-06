#!/usr/bin/env node
/**
 * build-penguin-animations.mjs
 *
 * 把企鹅透明 PNG pose 合成为 dsh-pet 兼容的 VP9-Alpha WebM 动画，用「语义层 + motion recipe」
 * 让少量静态 pose 生成丰富微动画（BREATH/BOB/SWAY/HOP/NOD/SQUASH/SLEEP/TALK/THINK），
 * 并按逻辑动作名写入资产目录，供「逻辑动作 → resolver → assetRoot/species → WebM」使用。
 *
 * 输入：user-example/penguin-animation/*.png（统一：角色居中、脚底对齐、比例一致）
 * 输出：对每个逻辑动作生成 <逻辑动作名>.webm（640×360 / VP9-Alpha / 透明），
 *       写入到资产根（默认 assets/penguin/ 或 pet 目录，由 --asset-root 指定）。
 *
 * 兼容 dsh-pet renderer 的约束：
 *   - 640×360，透明，VP9-Alpha（yuva420p）
 *   - 统一脚底 baseline（y=330）、统一 scale、水平居中
 *   - 首帧/末帧尽量贴近 idle neutral pose，减少跳位/闪烁/脚底漂移
 *
 * 用法：
 *   node scripts/build-penguin-animations.mjs --asset-root assets/penguin \
 *       --pose-dir user-example/penguin-animation --list
 *   node scripts/build-penguin-animations.mjs --asset-root assets/penguin
 *
 * 需要：支持 VP9-Alpha 的 ffmpeg（--ffmpeg 指定；默认用 PATH 的 ffmpeg）。
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const CONFIG = join(repoRoot, 'assets', 'config.jsonc');

// ---- 参数 ----
const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const LIST = args.includes('--list');
const FG = arg('ffmpeg', 'ffmpeg');
const ASSET_ROOT = arg('asset-root', join(repoRoot, 'assets', 'penguin'));
const POSE_DIR = arg('pose-dir', join(repoRoot, 'user-example', 'penguin-animation'));

// ---- 逻辑动作 → 基础 pose 映射（三层 fallback：L1 真实 WebM / L2 procedural / L3 idle）----
// key=逻辑动作名（与 config.jsonc 的 animation pool / categories / events 一致）
// value=pose 名 或 { pose, motion }
const PENGUIN_MAP = {
  // 核心
  '待机呼吸休闲':        { pose: 'idle',    motion: 'BREATH' },
  '东张西望':           { pose: 'idle',    motion: 'SWAY' },
  '被鼠标拖拽悬空反馈':    { pose: 'idle',    motion: 'BOB' },
  '原地漂浮踏步':        { pose: 'idle',    motion: 'BOB' },
  '螃蟹走路':           { pose: 'idle',    motion: 'SWAY' },
  '原地左转奔跑':        { pose: 'idle',    motion: 'HOP' },
  '原地重力下蹲压缩':     { pose: 'idle',    motion: 'SQUASH' },
  // 点击（不同情绪）
  '点击回应-开心跃动':    { pose: 'click',   motion: 'HOP' },
  '点击回应-害羞惊讶':    { pose: 'click',   motion: 'NOD' },
  '点击回应-傲娇生气':    { pose: 'click',   motion: 'SQUASH' },
  '点击回应-挠痒咯咯笑':   { pose: 'click',   motion: 'BOB' },
  '点击回应-元气挥手':    { pose: 'click',   motion: 'SWAY' },
  // 碎碎念 ×3
  '碎碎念-擦桌碎碎念':    { pose: 'whisper', motion: 'TALK' },
  '碎碎念-发呆碎碎念':    { pose: 'whisper', motion: 'TALK' },
  '碎碎念-对屏碎碎念':    { pose: 'whisper', motion: 'NOD' },
  // 余额 6 档
  '余额-钱袋满溢':       { pose: 'balance', motion: 'BOB' },
  '余额-金袋叮当':       { pose: 'balance', motion: 'NOD' },
  '余额-钱袋如常':       { pose: 'balance', motion: 'BREATH' },
  '余额-数金皱眉':       { pose: 'balance', motion: 'THINK' },
  '余额-袋空如洗':       { pose: 'balance', motion: 'SQUASH' },
  '余额-分文不剩':       { pose: 'balance', motion: 'SLEEP' },
  // 代表表情/大动作
  '写代码':             { pose: 'idle',    motion: 'TALK' },
  '涮火锅':             { pose: 'happy',   motion: 'HOP' },
  '原地专心玩魔方':       { pose: 'thinking', motion: 'THINK' },
  '打瞌睡被惊醒':        { pose: 'sleep',   motion: 'SLEEP' },
  '原地小憩沉眠':        { pose: 'sleep',   motion: 'SLEEP' },
  '哈欠连天':           { pose: 'sleep',   motion: 'BREATH' },
  '深度思考碎碎念':      { pose: 'thinking', motion: 'THINK' },
  '超大伸懒腰':          { pose: 'idle',    motion: 'BREATH' },
  '优雅女仆舞':          { pose: 'happy',   motion: 'SWAY' },
  '可爱宅舞':           { pose: 'happy',   motion: 'SWAY' },
  '轻快摇摆舞':          { pose: 'happy',   motion: 'SWAY' },
  '原地跳跃抓碎头顶物品': { pose: 'happy',   motion: 'HOP' },
};

// motion recipe：每项回放 [0,1] 相位内 transform 的采样。幅度很小（桌宠，不是 PPT 动画）。
const MOTION = {
  BREATH: { dur: 3.0, fn: ([t]) => ({ sY: 1 + 0.015 * Math.sin(t * 2 * Math.PI) }) },
  BOB:    { dur: 2.0, fn: ([t]) => ({ dy: -3 * Math.abs(Math.sin(t * 2 * Math.PI)), rot: 0.5 * Math.sin(t * 2 * Math.PI) }) },
  SWAY:   { dur: 2.6, fn: ([t]) => ({ rot: 1.5 * Math.sin(t * 2 * Math.PI) }) },
  HOP:    { dur: 0.9, fn: ([t]) => ({ dy: -8 * Math.sin(t * Math.PI) }) },
  NOD:    { dur: 2.0, fn: ([t]) => ({ rot: 1 * Math.sin(t * 2 * Math.PI) }) },
  SQUASH: { dur: 0.4, fn: ([t]) => ({ sY: t < 0.4 ? 0.9 : 1 + 0.03 * Math.sin((t - 0.4) * Math.PI) }) },
  SLEEP:  { dur: 4.0, fn: ([t]) => ({ sY: 1 + 0.01 * Math.sin(t * 2 * Math.PI) }) },
  TALK:   { dur: 2.4, fn: ([t]) => ({ rot: 1 * Math.sin(t * 4 * Math.PI), dy: -1.5 * Math.abs(Math.sin(t * 4 * Math.PI)) }) },
  THINK:  { dur: 2.8, fn: ([t]) => ({ rot: 1.2 * Math.sin(t * 2 * Math.PI) }) },
};

const W = 640, H = 360, FEET_Y = 330, FPS = 12;

function stripJsonc(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1').trim();
}

/** 读取 config.jsonc，得到所有逻辑动作名（pool+categories+events）。 */
function logicalActions() {
  const s = stripJsonc(require('node:fs').readFileSync(CONFIG, 'utf8'));
  const cfg = JSON.parse(s);
  const a = cfg.animations || {};
  const names = [];
  for (const k of ['idle', 'turn', 'drag', 'clicks']) names.push(...(a[k] || []));
  for (const m of (a.moves?.actions || [])) names.push(m.name);
  for (const c of (a.categories || [])) names.push(...(c.actions || []));
  for (const ev of Object.values(a.events || {})) names.push(...ev);
  return [...new Set(names)];
}

/**
 * 合成一帧：640×360 透明画布，把 pose PNG 缩放到统一角色高、水平居中、脚底贴 y=330，
 * 再套 motion recipe（围绕脚底/底部中心的 scaleY / translateY / rotate）。
 * 输出 PNG 到 frames 目录。pose 图应为已居中、脚底对齐的透明 PNG。
 */
function renderFrame(poseImg, motion, t, outPath, im) {
  // im 是已裁剪+统一高度的 PNG（PIL image 转 buffer 由调用方传入？）
  // 这里用 ffmpeg 直接以源 PNG 为帧输入帧序列处理 —— 但 motion 需要合成变换。
  // 为保持零额外依赖，我们把 motion 输出为 ffmpeg-filter 参数串到 drawtext/rotate 不可靠，
  // 故改用「逐帧 PNG + ffmpeg 拼接」：每帧先由 Node 用 @napi-rs/canvas 或 sharp 合成（可选），
  // 否则退化为静态帧（同一 pose 90% 缩放呼吸）。
  // 说明：完整实现建议引入 sharp/@napi-rs/canvas 做逐帧合成；此处给出契约与占位。
  writeFileSync(outPath, Buffer.alloc(0)); // 契约占位（见下方 README 注释）
}

function decodeMotion(name) {
  const m = PENGUIN_MAP[name] || { pose: 'idle', motion: 'BREATH' };
  const recipe = MOTION[m.motion] || MOTION.BREATH;
  return { pose: m.pose, motion: m.motion, recipe };
}

/** 用 ffmpeg 把帧序列编码为 VP9-Alpha 640×360 WebM。frameDir 含 f_%03d.png */
function encodeWebm(fg, frameDir, out) {
  execFileSync(fg, [
    '-y', '-framerate', String(FPS), '-i', join(frameDir, 'f_%03d.png'),
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-an', '-b:v', '0', '-crf', '32',
    '-auto-alt-ref', '0', '-t', String(2), out,
  ], { stdio: 'inherit' });
}

function main() {
  mkdirSync(ASSET_ROOT, { recursive: true });
  const actions = logicalActions();
  if (LIST) {
    console.log('Penguin animation coverage:');
    for (const name of actions) {
      const inMap = PENGUIN_MAP[name];
      console.log(`  ${name.padEnd(20)} ${inMap ? ('✓ ' + inMap.pose + ':' + inMap.motion) : '✗ (L3 → idle/BREATH)'}`);
    }
    console.log(`\nmissing (L3 fallback) count: ${actions.filter((n) => !PENGUIN_MAP[n]).length}/${actions.length}`);
    return;
  }
  console.log('需要 ffmpeg(VP9-Alpha) 与帧合成依赖（@napi-rs/canvas 或 sharp）。');
  console.log('请先在 scripts/ 中按上述契约实现逐帧合成后，运行本脚本；帧合成缺依赖时本脚本仅生成占位。');
  // 目前环境无 VP9-Alpha ffmpeg，无法在本机产出真实 WebM；此处给出完整生成契约。
}

main();
