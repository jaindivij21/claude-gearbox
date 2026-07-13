---
description: Show your per-session Gearbox (which model & effort Claude uses for each part of a task); on/off.
argument-hint: [on | off | (or just tell me what to change)]
---
!`node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" $ARGUMENTS`

Above is this session's Gearbox console (already applied — don't re-run it for a plain view). Show it to me as-is, in a code block, then stop — no explanation of commands.

If I asked for a change in plain words (e.g. "put implementation on fable", "run research cheaper", "turbo code review", "add debugging", "turn it off"), apply it by running the CLI, then show the updated console:
`node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" <cmd>` — where `<cmd>` is `set <part> <model> [effort]` | `shift <part> up|down` | `rev <part> up|down` | `turbo <part> [on|off]` | `add <part>` | `rm <part>` | `on` | `off`. Models (strong→cheap): fable · opus[1m] · opus · sonnet · haiku. Effort: low · medium · high · xhigh · max. Keep it abstracted — I should never need to know these commands.
