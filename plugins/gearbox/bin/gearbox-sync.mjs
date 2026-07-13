#!/usr/bin/env node
// Gearbox sync — runs from a Claude Code hook (SessionStart + UserPromptSubmit).
//
// What it does, every time it runs:
//   * Decides whether Gearbox is ON for this session (env GEARBOX, or a marker file).
//   * ON  -> generates one sub-agent (.md) per aspect in profile.json (only when changed),
//           removes stale gearbox agents, and injects a "gear map" so Claude routes each
//           kind of work to the right gear.
//   * OFF -> removes any gearbox-managed agent files so Claude behaves exactly as normal,
//           and injects nothing.
//
// It must NEVER break a prompt: any error is swallowed and it exits 0 with no output.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const MARK = "gearbox:managed"; // ownership tag stamped into every generated agent file
const HOME = homedir();
const GEARBOX_HOME = join(HOME, ".claude", "gearbox"); // user data (survives plugin updates)
const AGENTS_DIR = join(HOME, ".claude", "agents");
const PROFILE = join(GEARBOX_HOME, "profile.json");
const ON_MARKER = join(GEARBOX_HOME, "ON");
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROFILE = join(SCRIPT_DIR, "..", "templates", "profile.default.json");

const VALID_EFFORT = new Set(["low", "medium", "high", "xhigh", "max"]);

// ---- read the hook payload (to learn the event name) without ever blocking ----
function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}
function hookEventName(raw) {
  try {
    const j = JSON.parse(raw);
    return j.hook_event_name || j.hookEventName || "UserPromptSubmit";
  } catch {
    return "UserPromptSubmit";
  }
}

// ---- is Gearbox on for this session? ----
function isActive() {
  const env = (process.env.GEARBOX || "").trim().toLowerCase();
  if (env && env !== "0" && env !== "false" && env !== "off") return true;
  return existsSync(ON_MARKER);
}

// ---- list gearbox-managed agent files currently on disk ----
function managedAgentFiles() {
  if (!existsSync(AGENTS_DIR)) return [];
  const out = [];
  for (const f of readdirSync(AGENTS_DIR)) {
    if (!f.endsWith(".md")) continue;
    const p = join(AGENTS_DIR, f);
    try {
      if (readFileSync(p, "utf8").includes(MARK)) out.push(p);
    } catch {}
  }
  return out;
}
function removeAll(paths) {
  for (const p of paths) {
    try { unlinkSync(p); } catch {}
  }
}

// ---- build the .md body for one aspect ----
function agentFile(aspect) {
  const model = String(aspect.model || "inherit");
  const turbo = !!aspect.ultracode;
  let effort = String(aspect.effort || "").toLowerCase();
  if (turbo) effort = "xhigh"; // turbo/ultracode always runs hard
  if (!VALID_EFFORT.has(effort)) effort = "";

  const fm = [`name: ${aspect.agent}`, `description: ${oneLine(aspect.description)}`];
  if (model && model !== "inherit") fm.push(`model: ${model}`);
  if (effort) fm.push(`effort: ${effort}`);
  if (Array.isArray(aspect.tools) && aspect.tools.length) fm.push(`tools: ${aspect.tools.join(", ")}`);

  const body = [];
  body.push(`<!-- ${MARK}: generated from ~/.claude/gearbox/profile.json — do not edit by hand -->`);
  body.push("");
  body.push(aspect.instructions ? String(aspect.instructions) : `You are the ${aspect.id} gear.`);
  if (turbo) {
    body.push("");
    body.push(
      "Run this in turbo (ultracode-style): break the work into parts, fan out parallel sub-tasks where it helps, and adversarially double-check the result before returning."
    );
  }
  return `---\n${fm.join("\n")}\n---\n${body.join("\n")}\n`;
}
function oneLine(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

// ---- write file only if content changed (keeps hot-reload churn to zero) ----
function writeIfChanged(path, content) {
  try {
    if (existsSync(path) && readFileSync(path, "utf8") === content) return false;
    writeFileSync(path, content);
    return true;
  } catch {
    return false;
  }
}

// ---- the gear map injected into Claude's context ----
function gearMap(aspects) {
  const lines = aspects.map((a) => {
    const bits = [`model: ${a.model || "inherit"}`];
    const eff = a.ultracode ? "xhigh" : a.effort;
    if (eff) bits.push(`effort: ${eff}`);
    if (a.ultracode) bits.push("turbo");
    return `- ${cap(a.id)} → subagent "${a.agent}" (${bits.join(", ")})`;
  });
  return [
    "[Gearbox active] The user has set per-aspect model/effort gears. Delegate work to these sub-agents so each part runs at the chosen model + effort:",
    ...lines,
    'Prefer these gearbox sub-agents over the default ones for these kinds of work. The user may change gears at any time — always follow the latest values above. You still decide *when* to split work into sub-agents; gears only set *which* model/effort each uses.',
  ].join("\n");
}
function cap(s) {
  s = String(s || "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---- emit hook output (silent context injection) ----
function emit(event, context) {
  if (!context) { process.exit(0); }
  const payload = { hookSpecificOutput: { hookEventName: event, additionalContext: context } };
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}

// ---- main ----
function main() {
  const raw = readStdin();
  const event = hookEventName(raw);

  if (!isActive()) {
    // OFF: leave no trace — remove any gearbox-managed agents and say nothing.
    removeAll(managedAgentFiles());
    process.exit(0);
  }

  // ON: load the profile.
  let profile;
  try {
    profile = JSON.parse(readFileSync(PROFILE, "utf8"));
  } catch {
    process.exit(0); // no/broken profile -> do nothing
  }
  const aspects = Array.isArray(profile.aspects) ? profile.aspects.filter((a) => a && a.agent && a.id) : [];
  if (!aspects.length) process.exit(0);

  try { mkdirSync(AGENTS_DIR, { recursive: true }); } catch {}

  // Write current aspects.
  const wanted = new Set();
  for (const a of aspects) {
    const path = join(AGENTS_DIR, `${a.agent}.md`);
    wanted.add(path);
    writeIfChanged(path, agentFile(a));
  }
  // Remove gearbox-managed agents that are no longer in the profile.
  removeAll(managedAgentFiles().filter((p) => !wanted.has(p)));

  emit(event, gearMap(aspects));
}

try {
  main();
} catch {
  process.exit(0); // never break a prompt
}
