#!/usr/bin/env node
// Gearbox sync — runs from the SessionStart + UserPromptSubmit hooks.
// Reads THIS session's gears (keyed by session_id from the hook's stdin) and, if Gearbox
// is on for this session, injects a "gear map" telling Claude which model + effort to use
// for each kind of work. Per-session: other shells are unaffected. If this session hasn't
// turned Gearbox on, it emits nothing — Claude behaves exactly as normal.
//
// With --cleanup (SessionEnd hook), it deletes this session's state file.
// It must NEVER break a prompt: any error is swallowed and it exits 0 with no output.

import { readFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HOME = homedir();
const SESSIONS_DIR = join(HOME, ".claude", "gearbox", "sessions");
const CLI = join(dirname(fileURLToPath(import.meta.url)), "gearbox-cli.mjs");
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

function readStdin() { try { return readFileSync(0, "utf8"); } catch { return ""; } }
function parse(raw) { try { return JSON.parse(raw); } catch { return {}; } }

function gearMap(st, sid) {
  const lines = st.aspects.map((a) => {
    const eff = a.ultracode ? "xhigh" : a.effort;
    const extra = a.ultracode ? ", turbo/ultracode: decompose → fan out → verify" : "";
    return `- ${a.id}: model ${a.model}, effort ${eff}${extra}${a.description ? ` — ${a.description}` : ""}`;
  });
  return [
    `[Gearbox on — setup "${st.name}"] For THIS session the user has set which model + effort to use for each kind of work:`,
    ...lines,
    "When you delegate or spawn a sub-agent for one of these kinds of work, use that part's model (pass it on the spawn), and aim for its effort. The model is the firm choice; apply the effort where the spawn mechanism allows it. You still decide *whether/when* to split work up — this only sets *which* model/effort each part uses.",
    "Keep the mechanism abstracted — never make the user type gearbox commands. Two ways they drive it: (1) if they ask to tune/adjust/open the gearbox, run the arrow-key shifter loop: 'Grab a shifter' question (options = parts, preview = console with that row marked ▶; Esc = done) → then one call with Gear (fable/opus[1m]/opus/sonnet, haiku via Other — each option's preview shows the part's shaft with the knob ◉ slid into that slot, current first), Rev (low..xhigh, max via Other, preview = rev bar), Turbo (on/off) → apply → print console → loop. (2) plain words (\"put implementation on fable\") — apply directly. Either way, apply changes by running:",
    `  node "${CLI}" "${sid}" <cmd>`,
    "  <cmd>: set <part> <model> [effort] | effort <part> <level> | shift/rev <part> up|down | turbo <part> [on|off] | add <part> | rm <part> | on | off. Models (strong→cheap): fable opus[1m] opus sonnet haiku. Effort (low→high): low medium high xhigh max. Always show the returned console verbatim after a change.",
  ].join("\n");
}

function main() {
  const raw = readStdin();
  const payload = parse(raw);
  const sid = payload.session_id || process.env.CLAUDE_CODE_SESSION_ID || process.env.CLAUDE_SESSION_ID;
  if (!sid) process.exit(0);
  const path = join(SESSIONS_DIR, `${sid}.json`);

  if (process.argv.includes("--cleanup")) {
    try { unlinkSync(path); } catch {}
    process.exit(0);
  }

  let st;
  try { st = JSON.parse(readFileSync(path, "utf8")); } catch { process.exit(0); } // not on for this session
  if (!st || st.on === false || !Array.isArray(st.aspects) || !st.aspects.length) process.exit(0);

  // normalize just enough for the map
  st.name = st.name || "custom";
  st.aspects = st.aspects
    .filter((a) => a && a.id && a.model)
    .map((a) => ({ id: a.id, model: a.model, effort: EFFORTS.includes(a.effort) ? a.effort : "medium", ultracode: !!a.ultracode, description: a.description || "" }));
  if (!st.aspects.length) process.exit(0);

  const event = payload.hook_event_name || "UserPromptSubmit";
  const out = { hookSpecificOutput: { hookEventName: event, additionalContext: gearMap(st, sid) } };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

try { main(); } catch { process.exit(0); }
