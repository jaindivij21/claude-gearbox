---
description: Set which model & effort Claude uses for each part of a task, just for this session.
argument-hint: [on | off | set <part> <model> [effort] | turbo <part> | add <part> | rm <part> | preset <name>]
---
!`node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" $ARGUMENTS`

The block above is the current Gearbox setup for **this session** (it's already applied — the command ran, don't run it again). Show it to me as-is, then in one line confirm what changed or tell me the next step. If Gearbox is ON, from now on this session use each part's model when you spawn a sub-agent for that kind of work, and aim for its effort. Keep this reply short.
