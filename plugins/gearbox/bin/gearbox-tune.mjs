#!/usr/bin/env node
// Gearbox shifter — a real keystroke-driven TUI, bound to ONE Claude Code session.
// Launched from inside that session by `/gearbox tune` (opens in its own small terminal
// window, where keystrokes actually work). Every change AUTO-SAVES live to
// ~/.claude/gearbox/sessions/<session-id>.json; the session picks it up on its next message.
//
//   ↑ ↓  pick a part        ← →  slide the gear (left = stronger, toward fable)
//   - +  rev (effort)       t    turbo (ultracode)      o  gearbox on/off
//   a    add a part         x    remove part            q  close
//
// Usage: node gearbox-tune.mjs <session-id>

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const SID = process.argv[2];
if (!SID) { console.error("usage: gearbox-tune.mjs <session-id>"); process.exit(1); }

const HOME = homedir();
const SESSIONS_DIR = join(HOME, ".claude", "gearbox", "sessions");
const FILE = join(SESSIONS_DIR, `${SID}.json`);
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROFILE = join(SCRIPT_DIR, "..", "templates", "profile.default.json");

// Descending power: Fable 5 is the strongest/most expensive tier, Haiku the cheapest.
const MODELS = ["fable", "opus[1m]", "opus", "sonnet", "haiku"];
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const CATALOG = [
  { id: "planning", desc: "Design an approach before coding", model: "sonnet", effort: "medium" },
  { id: "exploration", desc: "Search & read the codebase", model: "haiku", effort: "low" },
  { id: "research", desc: "Multi-source / web deep-research", model: "sonnet", effort: "medium" },
  { id: "implementation", desc: "Write & edit code", model: "opus[1m]", effort: "xhigh", ultra: true },
  { id: "code review", desc: "Find bugs in a diff", model: "opus", effort: "high" },
  { id: "debugging", desc: "Root-cause a failure", model: "opus", effort: "high" },
  { id: "testing", desc: "Write & run tests, verify", model: "sonnet", effort: "medium" },
  { id: "refactor", desc: "Clean up, same behaviour", model: "sonnet", effort: "medium" },
  { id: "docs", desc: "READMEs, PR text, comments", model: "haiku", effort: "low" },
  { id: "summarizing", desc: "Digest logs & long output", model: "haiku", effort: "low" },
  { id: "general", desc: "Catch-all sub-agents", model: "sonnet", effort: "medium" },
];

function mkAspect(id) {
  const u = CATALOG.find((c) => c.id === id) || { desc: "", model: "sonnet", effort: "medium" };
  return { id, model: u.model, effort: u.effort, ultracode: !!u.ultra, description: u.desc ? u.desc + "." : "" };
}
function load() {
  try {
    const p = JSON.parse(readFileSync(FILE, "utf8"));
    if (Array.isArray(p.aspects) && p.aspects.length) {
      return { on: p.on !== false, name: p.name || "custom",
        aspects: p.aspects.map((a) => ({ id: a.id || "part",
          model: MODELS.includes(a.model) ? a.model : "sonnet",
          effort: EFFORTS.includes(a.effort) ? a.effort : "medium",
          ultracode: !!a.ultracode, description: a.description || "" })) };
    }
  } catch {}
  try {
    const t = JSON.parse(readFileSync(DEFAULT_PROFILE, "utf8"));
    return { on: true, name: t.name || "balanced", aspects: t.aspects.map((a) => ({ ...a })) };
  } catch {}
  return { on: true, name: "balanced", aspects: ["planning", "exploration", "research", "implementation", "code review"].map(mkAspect) };
}
function save() {
  mkdirSync(SESSIONS_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(st, null, 2) + "\n");
  savedAt = Date.now();
}

const A = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m", inv: "\x1b[7m",
  amber: "\x1b[38;5;214m", green: "\x1b[38;5;42m", yellow: "\x1b[38;5;220m",
  red: "\x1b[38;5;203m", orange: "\x1b[38;5;208m", grey: "\x1b[38;5;246m", faint: "\x1b[38;5;240m",
  white: "\x1b[38;5;255m",
};
const revColor = (i) => [A.green, A.green, A.yellow, A.red, A.red][i];
const effIdx = (a) => EFFORTS.indexOf(a.ultracode ? "xhigh" : a.effort);
const pad = (s, n) => { s = String(s); return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length); };

let st = load();
let sel = 0, savedAt = 0;

function draw() {
  const out = [];
  out.push("");
  out.push("  " + A.amber + A.bold + "⚙  G E A R B O X" + A.reset + "   " + A.grey + "session " + String(SID).slice(0, 8) + A.reset
    + "   " + (st.on ? A.green + "● ON" : A.red + "● OFF") + A.reset
    + (Date.now() - savedAt < 1500 ? "   " + A.green + "✓ live" + A.reset : "        "));
  out.push("  " + A.faint + "─".repeat(72) + A.reset);
  out.push("  " + A.faint + "gears:  ①fable  ②opus[1m]  ③opus  ④sonnet  ⑤haiku     (① strongest·costliest)" + A.reset);
  out.push("");
  st.aspects.forEach((a, i) => {
    const cur = i === sel;
    const mi = MODELS.indexOf(a.model);
    let shaft = "";
    for (let k = 0; k < MODELS.length; k++) {
      shaft += k === mi ? A.amber + "◉" + A.reset : A.faint + "①②③④⑤"[k] + A.reset;
      if (k < MODELS.length - 1) shaft += A.faint + "──" + A.reset;
    }
    const ei = effIdx(a);
    let rev = "";
    for (let k = 0; k < EFFORTS.length; k++) rev += (k <= ei ? revColor(ei) + "▰" : A.faint + "▱") + A.reset;
    const eff = a.ultracode ? "xhigh" : a.effort;
    const turbo = a.ultracode ? "  " + A.orange + "⊙ TURBO" + A.reset : "";
    const name = (cur ? A.inv + A.bold : A.grey) + " " + pad(a.id, 15) + A.reset;
    const marker = cur ? A.amber + "▶" + A.reset : " ";
    out.push(` ${marker}${name} ${shaft}  ${(cur ? A.white : A.grey) + pad(a.model, 9) + A.reset} ${rev} ${(cur ? A.white : A.grey) + pad(eff, 6) + A.reset}${turbo}`);
  });
  out.push("");
  out.push("  " + A.faint + "─".repeat(72) + A.reset);
  out.push("  " + A.faint + "↑↓ part   ←→ gear (← stronger)   -/+ rev   t turbo   a add   x remove" + A.reset);
  out.push("  " + A.faint + "o on/off   q close      changes apply to the session on its next message" + A.reset);
  process.stdout.write("\x1b[2J\x1b[H" + out.join("\n") + "\n");
}

if (!process.stdin.isTTY) { console.error("gearbox-tune must run in a real terminal window."); process.exit(1); }
process.stdout.write("\x1b]0;⚙ GEARBOX — " + String(SID).slice(0, 8) + "\x07\x1b[?25l");
process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding("utf8");
draw();
const tick = setInterval(draw, 900); // refresh the "✓ live" flash

function quit() {
  clearInterval(tick);
  try { process.stdin.setRawMode(false); } catch {}
  process.stdout.write("\x1b[?25h\x1b[2J\x1b[H  ⚙ Gearbox shifter closed — settings saved for session " + String(SID).slice(0, 8) + ".\n  You can close this window.\n");
  process.exit(0);
}

process.stdin.on("data", (key) => {
  const a = st.aspects[sel];
  switch (key) {
    case "q": case "\x03": quit(); break;
    case "\x1b[A": case "k": sel = (sel - 1 + st.aspects.length) % st.aspects.length; break;
    case "\x1b[B": case "j": sel = (sel + 1) % st.aspects.length; break;
    case "\x1b[D": case "h": { const i = MODELS.indexOf(a.model); if (i > 0) { a.model = MODELS[i - 1]; st.on = true; save(); } break; }               // ← stronger
    case "\x1b[C": case "l": { const i = MODELS.indexOf(a.model); if (i < MODELS.length - 1) { a.model = MODELS[i + 1]; st.on = true; save(); } break; } // → cheaper
    case "+": case "=": if (!a.ultracode) { const i = EFFORTS.indexOf(a.effort); if (i < EFFORTS.length - 1) { a.effort = EFFORTS[i + 1]; st.on = true; save(); } } break;
    case "-": case "_": if (!a.ultracode) { const i = EFFORTS.indexOf(a.effort); if (i > 0) { a.effort = EFFORTS[i - 1]; st.on = true; save(); } } break;
    case "t": a.ultracode = !a.ultracode; st.on = true; save(); break;
    case "o": st.on = !st.on; save(); break;
    case "a": { const next = CATALOG.find((c) => !st.aspects.some((x) => x.id === c.id)); if (next) { st.aspects.push(mkAspect(next.id)); sel = st.aspects.length - 1; st.on = true; save(); } break; }
    case "x": if (st.aspects.length > 1) { st.aspects.splice(sel, 1); sel = Math.max(0, sel - 1); save(); } break;
    default: return;
  }
  draw();
});
