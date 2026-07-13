---
description: Your per-session gearbox — /gearbox tune opens a real-keys shifter window; on/off; console view.
argument-hint: [tune | on | off]
---
!`node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" $ARGUMENTS`

Above is this session's Gearbox console — the command already ran, and if the args included `tune`, the shifter window has ALREADY been opened. Your only job:

1. Print the console verbatim in a code block (including any » note under it). Nothing else — no explanations, no menus, no questions.
2. If the user asks for a change in plain words ("put implementation on fable", "add a debugging part", "turn it off"), apply it with `node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" <cmd>` (`set <part> <model> [effort]` | `effort <part> <level>` | `turbo <part> [on|off]` | `add <part>` | `rm <part>` | `tune` | `on` | `off`) and print the returned console verbatim. Models strong→cheap: fable, opus[1m], opus, sonnet, haiku. Effort low→high: low, medium, high, xhigh, max.
3. If the user asks to tune/shift/adjust interactively, run the `tune` subcommand (it opens the shifter window) — do not simulate a UI in chat.
