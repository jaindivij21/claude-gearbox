#!/usr/bin/env node
// Gearbox CLI — non-interactive, per session. Called by the /gearbox slash command:
//   node gearbox-cli.mjs <session-id> [subcommand] [args...]
// Reads/writes this session's gears at ~/.claude/gearbox/sessions/<sid>.json and prints
// a plain-text console (no ANSI — the output is shown in the Claude chat).

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HOME = homedir();
const GEARBOX_HOME = join(HOME, ".claude", "gearbox");
const SESSIONS_DIR = join(GEARBOX_HOME, "sessions");
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROFILE = join(SCRIPT_DIR, "..", "templates", "profile.default.json");

// Models in DESCENDING power (most capable/expensive first): Fable 5 tops the range
// ($10/$50 per 1M), Haiku is cheapest ($1/$5). power drives the little meter below.
const MODELS = [
  { v: "fable", power: 5 },
  { v: "opus[1m]", power: 4 },
  { v: "opus", power: 4 },
  { v: "sonnet", power: 3 },
  { v: "haiku", power: 2 },
];
const MODEL_NAMES = MODELS.map((m) => m.v);
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const USECASES = [
  { id: "planning", desc: "Design an approach before coding", model: "sonnet", effort: "medium" },
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
const PRESETS = {
  eco: { name: "eco", over: { planning: ["haiku", "low"], exploration: ["haiku", "low"], research: ["haiku", "low"], implementation: ["sonnet", "medium", false], "code review": ["haiku", "low"] } },
  balanced: { name: "balanced", over: {} },
  "full-send": { name: "full-send", over: { planning: ["opus[1m]", "high"], exploration: ["sonnet", "medium"], research: ["opus", "high"], implementation: ["fable", "xhigh", true], "code review": ["fable", "high"] } },
};
const CORE = ["planning", "exploration", "research", "implementation", "code review"];

function useCase(id) { return USECASES.find((u) => u.id === id); }
function mkAspect(id, over) {
  const u = useCase(id) || { desc: "", model: "sonnet", effort: "medium" };
  const model = (over && over[0]) || u.model;
  const effort = (over && over[1]) || u.effort;
  const ultra = over && over[2] != null ? over[2] : !!u.ultra;
  return { id, model, effort, ultracode: !!ultra, description: u.desc ? u.desc + "." : "" };
}
function seedProfile() {
  try { return normalize(JSON.parse(readFileSync(DEFAULT_PROFILE, "utf8"))); } catch {}
  return { on: true, name: "balanced", aspects: CORE.map((id) => mkAspect(id)) };
}
function buildPreset(p) { return { on: true, name: p.name, aspects: CORE.map((id) => mkAspect(id, p.over[id])) }; }

function sessionPath(sid) { return join(SESSIONS_DIR, `${sid}.json`); }
function load(sid) {
  try { return normalize(JSON.parse(readFileSync(sessionPath(sid), "utf8"))); } catch { return null; }
}
function normalize(p) {
  return {
    on: p.on !== false,
    name: p.name || "balanced",
    aspects: (p.aspects || []).map((a) => ({
      id: a.id || "part",
      model: MODEL_NAMES.includes(a.model) ? a.model : "sonnet",
      effort: EFFORTS.includes(a.effort) ? a.effort : "medium",
      ultracode: !!a.ultracode,
      description: a.description || "",
    })),
  };
}
function save(sid, st) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
  writeFileSync(sessionPath(sid), JSON.stringify(st, null, 2) + "\n");
}

function findAspect(st, name) {
  const q = String(name || "").toLowerCase();
  return st.aspects.find((a) => a.id.toLowerCase() === q) || st.aspects.find((a) => a.id.toLowerCase().startsWith(q));
}
function effIdx(a) { return EFFORTS.indexOf(a.ultracode ? "xhigh" : a.effort); }
function modelIdx(m) { const i = MODEL_NAMES.indexOf(m); return i < 0 ? 3 : i; }
const GEARNUM = ["①", "②", "③", "④", "⑤"];

// The console: a driveshaft per part — a shaft with 5 gear detents, the shift-knob (◉)
// sitting in the current gear, a rev meter for effort, and a turbo lamp.
function render(sid, st, note) {
  const L = [];
  const shortSid = String(sid).slice(0, 8);
  const RULE = "──────────────────────────────────────────────────────────────────────────";
  if (!st || !st.on) {
    L.push(RULE);
    L.push(`  ⚙  G E A R B O X      session ${shortSid}   ·   OFF`);
    L.push(RULE);
    L.push("");
    L.push("Idle — Claude is running normally. Start it with:   /gearbox on");
    if (note) L.push("", "» " + note);
    return L.join("\n");
  }
  L.push(RULE);
  L.push(`  ⚙  G E A R B O X      session ${shortSid}   ·   ON   ·   setup: ${st.name}`);
  L.push(RULE);
  L.push("  gears →  ①fable  ②opus[1m]  ③opus  ④sonnet  ⑤haiku      (① strongest · costliest)");
  L.push("");
  for (const a of st.aspects) {
    const mi = modelIdx(a.model);
    let shaft = "";
    for (let i = 0; i < MODELS.length; i++) { shaft += i === mi ? "◉" : GEARNUM[i]; if (i < MODELS.length - 1) shaft += "──"; }
    const ei = effIdx(a);
    const rev = "▐".repeat(ei + 1) + "░".repeat(EFFORTS.length - ei - 1);
    const eff = a.ultracode ? "xhigh" : a.effort;
    const turbo = a.ultracode ? "  ⊙ TURBO" : "";
    L.push(`  ${pad(a.id, 15)} ${shaft}  ${pad(a.model, 9)} rev ${rev} ${pad(eff, 6)}${turbo}`);
  }
  L.push("");
  L.push("  SHIFT  /gearbox shift <part> up|down     move the gear (up = stronger, toward fable)");
  L.push("  REV    /gearbox rev <part> up|down       throttle the effort (up = more, toward max)");
  L.push("  TURBO  /gearbox turbo <part>             ultracode: xhigh + decompose → fan out → verify");
  L.push("  more   set <part> <model> [effort] · add <part> · rm <part> · preset <eco|balanced|full-send> · off");
  if (note) L.push("", "» " + note);
  return L.join("\n");
}
function pad(s, n) { s = String(s); return s.length >= n ? s : s + " ".repeat(n - s.length); }

// ---- main ----
const [, , sid, sub, ...rest] = process.argv;
if (!sid) { process.stdout.write("Gearbox: no session id.\n"); process.exit(0); }
let st = load(sid);
let note = "";
const cmd = (sub || "show").toLowerCase();

try {
  switch (cmd) {
    case "show": case "status": break;
    case "on":
      if (!st) st = seedProfile();
      st.on = true; save(sid, st); note = "Gearbox is ON for this session. Change a gear any time; it applies on your next message."; break;
    case "off":
      if (st) { st.on = false; save(sid, st); }
      note = "Gearbox is OFF for this session — Claude runs normally."; break;
    case "reset":
      st = seedProfile(); st.on = true; save(sid, st); note = "Reset to the default setup."; break;
    case "preset": {
      const p = PRESETS[(rest[0] || "").toLowerCase()];
      if (!p) { note = `Unknown preset. Try: ${Object.keys(PRESETS).join(", ")}.`; break; }
      st = buildPreset(p); save(sid, st); note = `Loaded the “${p.name}” setup.`; break;
    }
    case "set": {
      if (!st) st = seedProfile();
      const a = findAspect(st, rest[0]);
      if (!a) { note = `No part “${rest[0]}”. Add it with: /gearbox add ${rest[0] || "<part>"}`; break; }
      const model = rest[1];
      if (model && !MODEL_NAMES.includes(model)) { note = `Unknown model “${model}”. Pick: ${MODEL_NAMES.join(", ")}.`; break; }
      if (model) a.model = model;
      const eff = rest[2];
      if (eff) { if (!EFFORTS.includes(eff)) { note = `Unknown effort “${eff}”. Pick: ${EFFORTS.join(", ")}.`; break; } a.effort = eff; a.ultracode = false; }
      save(sid, st); note = `Set ${a.id} → ${a.model}${eff ? " / " + eff : ""}.`; break;
    }
    case "effort": {
      if (!st) st = seedProfile();
      const a = findAspect(st, rest[0]);
      if (!a) { note = `No part “${rest[0]}”.`; break; }
      if (!EFFORTS.includes(rest[1])) { note = `Unknown effort. Pick: ${EFFORTS.join(", ")}.`; break; }
      a.effort = rest[1]; a.ultracode = false; save(sid, st); note = `Set ${a.id} effort → ${rest[1]}.`; break;
    }
    case "shift": {
      if (!st) st = seedProfile();
      const a = findAspect(st, rest[0]);
      if (!a) { note = `No part “${rest[0]}”. Add it with: /gearbox add ${rest[0] || "<part>"}`; break; }
      const dir = (rest[1] || "").toLowerCase();
      if (dir !== "up" && dir !== "down") { note = "Which way? /gearbox shift " + a.id + " up   (stronger)  or  down (cheaper)."; break; }
      const mi = modelIdx(a.model);
      const ni = dir === "up" ? Math.max(0, mi - 1) : Math.min(MODELS.length - 1, mi + 1);
      if (ni === mi) { note = `${a.id} is already in ${dir === "up" ? "top" : "lowest"} gear (${a.model}).`; break; }
      a.model = MODELS[ni].v; save(sid, st); note = `Shifted ${a.id} ${dir} → ${a.model}.`; break;
    }
    case "rev": {
      if (!st) st = seedProfile();
      const a = findAspect(st, rest[0]);
      if (!a) { note = `No part “${rest[0]}”.`; break; }
      const dir = (rest[1] || "").toLowerCase();
      if (dir !== "up" && dir !== "down") { note = "Which way? /gearbox rev " + a.id + " up   (more effort)  or  down."; break; }
      const cur = EFFORTS.indexOf(a.ultracode ? "xhigh" : a.effort);
      const ni = dir === "up" ? Math.min(EFFORTS.length - 1, cur + 1) : Math.max(0, cur - 1);
      a.ultracode = false; a.effort = EFFORTS[ni]; save(sid, st); note = `Revved ${a.id} ${dir} → ${a.effort}.`; break;
    }
    case "turbo": {
      if (!st) st = seedProfile();
      const a = findAspect(st, rest[0]);
      if (!a) { note = `No part “${rest[0]}”.`; break; }
      const want = rest[1] ? !/^(off|false|0|no)$/i.test(rest[1]) : !a.ultracode;
      a.ultracode = want; save(sid, st); note = `Turbo ${want ? "on" : "off"} for ${a.id}${want ? " (ultracode: xhigh + orchestrate)" : ""}.`; break;
    }
    case "add": {
      if (!st) st = seedProfile();
      const id = rest.join(" ").trim().toLowerCase();
      if (!id) { const avail = USECASES.filter((u) => !st.aspects.some((a) => a.id === u.id)).map((u) => u.id); note = `Name a part to add. Known parts: ${avail.join(", ") || "(all added)"}, or any custom name.`; break; }
      if (st.aspects.some((a) => a.id === id)) { note = `“${id}” is already a gear.`; break; }
      st.aspects.push(mkAspect(id)); save(sid, st); note = `Added ${id}.`; break;
    }
    case "rm": case "remove": {
      if (!st) { note = "Nothing to remove."; break; }
      const a = findAspect(st, rest.join(" "));
      if (!a) { note = `No part “${rest.join(" ")}”.`; break; }
      st.aspects = st.aspects.filter((x) => x !== a); save(sid, st); note = `Removed ${a.id}.`; break;
    }
    case "help":
      note = "Drive it: shift <part> up|down (model) · rev <part> up|down (effort) · turbo <part>. Also: on · off · set <part> <model> [effort] · add <part> · rm <part> · preset <eco|balanced|full-send> · reset"; break;
    default:
      note = `Unknown command “${cmd}”. Try /gearbox help.`;
  }
} catch (e) {
  note = "Something went wrong updating your gears.";
}

process.stdout.write(render(sid, st, note) + "\n");
