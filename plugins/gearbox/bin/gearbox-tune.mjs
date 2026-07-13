#!/usr/bin/env node
// Gearbox tuner — a terminal gear-shifter. Runs inside your terminal (e.g. `! gearbox tune`
// from a Claude Code session, or `gearbox tune` in any shell). Shift the model/effort for
// each part of a task and save straight to ~/.claude/gearbox/profile.json. No browser.
//
//   ↑/↓  select part     ←/→  shift gear (model)     -/+  rev (effort)
//   t  turbo    a  add part    x  delete    p  cycle preset    s  save    q  quit

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HOME = homedir();
const GEARBOX_HOME = join(HOME, ".claude", "gearbox");
const PROFILE = join(GEARBOX_HOME, "profile.json");
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROFILE = join(SCRIPT_DIR, "..", "templates", "profile.default.json");

const MODELS = [
  { v: "fable", gn: "1" }, { v: "haiku", gn: "2" }, { v: "sonnet", gn: "3" },
  { v: "opus", gn: "4" }, { v: "opus[1m]", gn: "5" },
];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const USECASES = [
  { id: "planning", desc: "Design an approach before coding", model: "fable", effort: "low" },
  { id: "exploration", desc: "Search & read the codebase", model: "haiku", effort: "low" },
  { id: "research", desc: "Multi-source / web deep-research", model: "sonnet", effort: "medium" },
  { id: "implementation", desc: "Write & edit code", model: "opus[1m]", effort: "xhigh", ultra: true },
  { id: "code review", desc: "Find bugs in a diff", model: "opus", effort: "high" },
  { id: "debugging", desc: "Root-cause a failure", model: "opus", effort: "high" },
  { id: "testing", desc: "Write & run tests, verify", model: "sonnet", effort: "medium" },
  { id: "refactor", desc: "Clean up without behaviour change", model: "sonnet", effort: "medium" },
  { id: "docs", desc: "READMEs, PR text, comments", model: "haiku", effort: "low" },
  { id: "summarizing", desc: "Digest logs, threads, output", model: "haiku", effort: "low" },
  { id: "general", desc: "Catch-all for other sub-agents", model: "sonnet", effort: "medium" },
];

// ---- ansi ----
const A = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  amber: "\x1b[38;5;214m", green: "\x1b[38;5;42m", yellow: "\x1b[38;5;220m",
  red: "\x1b[38;5;203m", orange: "\x1b[38;5;208m", grey: "\x1b[38;5;244m", faint: "\x1b[38;5;240m",
  white: "\x1b[38;5;255m", invAmber: "\x1b[48;5;214m\x1b[38;5;232m",
};
const revColor = (i) => [A.green, A.green, A.yellow, A.red, A.red][i];

function agentFromId(id) {
  const s = String(id).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "part";
  return "gearbox-" + s;
}
function useCase(id) { return USECASES.find((u) => u.id === id); }
function mkAspect(id) {
  const u = useCase(id) || { model: "sonnet", effort: "medium" };
  return { id, agent: agentFromId(id), model: u.model, effort: u.effort, ultracode: !!u.ultra, tools: null,
           description: u && u.desc ? u.desc + "." : "", instructions: "" };
}
function defaultProfile() {
  try { return JSON.parse(readFileSync(DEFAULT_PROFILE, "utf8")); } catch {}
  return { version: 1, name: "balanced",
    aspects: ["planning", "exploration", "research", "implementation", "code review"].map(mkAspect) };
}
function loadProfile() {
  try {
    const p = JSON.parse(readFileSync(PROFILE, "utf8"));
    if (Array.isArray(p.aspects)) return normalize(p);
  } catch {}
  return normalize(defaultProfile());
}
function normalize(p) {
  return { version: 1, name: p.name || "profile",
    aspects: (p.aspects || []).map((a) => ({
      id: a.id || "part", agent: a.agent || agentFromId(a.id || "part"),
      model: MODELS.some((m) => m.v === a.model) ? a.model : "sonnet",
      effort: EFFORTS.includes(a.effort) ? a.effort : "medium",
      ultracode: !!a.ultracode, tools: Array.isArray(a.tools) ? a.tools : null,
      description: a.description || "", instructions: a.instructions || "",
    })) };
}
function toProfile(st) {
  return { version: 1, name: st.name || "profile",
    aspects: st.aspects.map((a) => ({ id: a.id, agent: a.agent || agentFromId(a.id), model: a.model,
      effort: a.effort, ultracode: !!a.ultracode, tools: a.tools || null,
      description: a.description || "", instructions: a.instructions || "" })) };
}
function save(st) {
  mkdirSync(GEARBOX_HOME, { recursive: true });
  writeFileSync(PROFILE, JSON.stringify(toProfile(st), null, 2) + "\n");
}

const modelIdx = (v) => Math.max(0, MODELS.findIndex((m) => m.v === v));
const effIdx = (a) => EFFORTS.indexOf(a.ultracode ? "xhigh" : a.effort);

// ---- frame ----
function frame(st, sel, msg, mode, pickList) {
  const L = [];
  const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
  L.push("");
  L.push("  " + A.amber + A.bold + "⚙  GEARBOX" + A.reset + "   " + A.faint + "shift the model & effort for each part" + A.reset
    + "        " + A.grey + "setup: " + A.reset + A.white + st.name + A.reset);
  L.push("");
  L.push("  " + A.faint + pad("PART", 16) + pad("GEAR · model", 30) + pad("REV · effort", 16) + "TURBO" + A.reset);

  st.aspects.forEach((a, i) => {
    const cur = i === sel;
    const mk = MODELS.map((m, k) =>
      k === modelIdx(a.model)
        ? (cur ? A.invAmber : A.amber) + "[" + m.gn + "·" + m.v + "]" + A.reset
        : A.faint + m.gn + A.reset
    ).join(" ");
    const ei = effIdx(a);
    let rev = "";
    for (let k = 0; k < EFFORTS.length; k++) rev += (k <= ei ? revColor(ei) + "█" : A.faint + "░") + A.reset;
    const eff = revColor(ei) + (a.ultracode ? "xhigh" : a.effort) + A.reset;
    const turbo = a.ultracode ? A.orange + "◉ BOOST" + A.reset : A.faint + "·" + A.reset;
    const marker = cur ? A.amber + "▸ " + A.reset : "  ";
    const nameCol = (cur ? A.bold + A.white : A.grey) + pad(a.id, 16) + A.reset;
    // visible-length padding for the gear column (strip ansi to measure)
    const mkPlain = MODELS.map((m, k) => (k === modelIdx(a.model) ? "[" + m.gn + "·" + m.v + "]" : m.gn)).join(" ");
    const gearCol = mk + " ".repeat(Math.max(1, 30 - mkPlain.length));
    const revCol = rev + " " + eff + " ".repeat(Math.max(1, 16 - (EFFORTS.length + 1 + (a.ultracode ? 5 : a.effort.length))));
    L.push(marker + nameCol + gearCol + revCol + turbo);
  });

  L.push("");
  if (mode === "add") {
    L.push("  " + A.amber + "ADD A PART" + A.reset + A.faint + "  (press number, esc to cancel)" + A.reset);
    pickList.forEach((u, k) => L.push("   " + A.amber + (k + 1) + A.reset + "  " + A.white + pad(u.id, 14) + A.reset + A.faint + u.desc + A.reset));
  } else {
    L.push("  " + A.faint + "↑↓" + A.reset + " part   " + A.faint + "←→" + A.reset + " gear   "
      + A.faint + "-/+" + A.reset + " rev   " + A.faint + "t" + A.reset + " turbo   "
      + A.faint + "a" + A.reset + " add   " + A.faint + "x" + A.reset + " del   "
      + A.faint + "p" + A.reset + " preset   " + A.amber + "s" + A.reset + " save   " + A.faint + "q" + A.reset + " quit");
  }
  L.push("  " + A.faint + PROFILE.replace(HOME, "~") + A.reset + (msg ? "   " + A.green + msg + A.reset : ""));
  L.push("");
  return L.join("\n");
}

// ---- non-interactive render (for testing / no TTY) ----
if (process.argv.includes("--print") || !process.stdin.isTTY) {
  const st = loadProfile();
  process.stdout.write(frame(st, 0, "", "normal", []) + "\n");
  process.exit(0);
}

// ---- interactive ----
let st = loadProfile();
let sel = 0, dirty = false, msg = "", mode = "normal", pickList = [];
const out = (s) => process.stdout.write(s);

function draw() {
  out("\x1b[2J\x1b[H"); // clear + home
  out(frame(st, sel, msg, mode, pickList));
}
function availUseCases() {
  const have = new Set(st.aspects.map((a) => a.id));
  return USECASES.filter((u) => !have.has(u.id)).slice(0, 9);
}
function quit(code) {
  try { process.stdin.setRawMode(false); } catch {}
  out("\x1b[?25h\n"); // show cursor
  process.exit(code || 0);
}

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");
out("\x1b[?25l"); // hide cursor
draw();

const PRESETS = {
  eco: ["planning", "exploration", "research", "implementation", "code review"],
  balanced: ["planning", "exploration", "research", "implementation", "code review"],
  full: ["planning", "exploration", "research", "implementation", "code review", "debugging"],
};
const presetNames = ["eco", "balanced", "full-send"];
let presetI = 1;

process.stdin.on("data", (key) => {
  msg = "";
  if (mode === "add") {
    if (key === "\x1b" || key === "q") { mode = "normal"; draw(); return; }
    const n = parseInt(key, 10);
    if (n >= 1 && n <= pickList.length) {
      st.aspects.push(mkAspect(pickList[n - 1].id)); sel = st.aspects.length - 1; dirty = true; mode = "normal"; draw();
    }
    return;
  }
  const a = st.aspects[sel];
  switch (key) {
    case "\x03": case "q": // ctrl-c / q
      if (dirty) { msg = "unsaved — press q again to quit, s to save"; dirty = false; draw(); return; }
      quit(0); break;
    case "\x1b[A": case "k": sel = (sel - 1 + st.aspects.length) % st.aspects.length; break;      // up
    case "\x1b[B": case "j": sel = (sel + 1) % st.aspects.length; break;                            // down
    case "\x1b[C": case "l": a.model = MODELS[Math.min(MODELS.length - 1, modelIdx(a.model) + 1)].v; dirty = true; break; // right
    case "\x1b[D": case "h": a.model = MODELS[Math.max(0, modelIdx(a.model) - 1)].v; dirty = true; break;                 // left
    case "+": case "=": if (!a.ultracode) { a.effort = EFFORTS[Math.min(EFFORTS.length - 1, EFFORTS.indexOf(a.effort) + 1)]; dirty = true; } break;
    case "-": case "_": if (!a.ultracode) { a.effort = EFFORTS[Math.max(0, EFFORTS.indexOf(a.effort) - 1)]; dirty = true; } break;
    case "t": a.ultracode = !a.ultracode; dirty = true; break;
    case "x": if (st.aspects.length > 1) { st.aspects.splice(sel, 1); sel = Math.max(0, sel - 1); dirty = true; } break;
    case "a": { pickList = availUseCases(); if (pickList.length) { mode = "add"; } else { st.aspects.push(mkAspect("part-" + (st.aspects.length + 1))); sel = st.aspects.length - 1; dirty = true; } break; }
    case "p": { presetI = (presetI + 1) % presetNames.length; const name = presetNames[presetI]; const ids = PRESETS[["eco","balanced","full"][presetI]]; st = { name, aspects: ids.map(mkAspect) }; sel = 0; dirty = true; break; }
    case "s": save(st); dirty = false; msg = "saved ✓"; break;
    default: return;
  }
  draw();
});
