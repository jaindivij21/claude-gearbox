---
description: Open your per-session gearbox — an arrow-key tuner for which model & effort Claude uses for each part of a task.
argument-hint: [on | off]
---
!`node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" $ARGUMENTS`

Above is this session's Gearbox console (the command already ran — never re-run it just to view). Follow this flow exactly:

1. Print the console verbatim in a code block. No extra commentary.
2. If it shows OFF: stop there (it tells me how to turn it on).
3. If it shows ON: enter **TUNE MODE** — an interactive, keyboard-driven loop using the AskUserQuestion tool. Repeat until I choose Done:
   - **Ask one call with two questions:**
     - header "Part" — one option per part from the console (max 4; fold any extras into an option named like the 4th part and mention the rest are reachable via Other). Each option's description = its current state, e.g. "sonnet · medium" or "opus[1m] · xhigh · TURBO".
     - header "Action" — options: `Shift gear (model)`, `Rev (effort)`, `Turbo on/off`, `Done tuning`.
   - **Then, based on Action:**
     - Shift gear → ask one question, header "Gear", options `fable`, `opus[1m]`, `opus`, `sonnet` (note haiku is available via Other). Give every option a `preview`: the selected part's shaft with the knob in that slot plus the label, e.g. `implementation  ◉──②──③──④──⑤   fable   (strongest · costliest)`.
     - Rev → ask one question, header "Effort", options `low`, `medium`, `high`, `xhigh` (max via Other), each with a preview of the rev bar, e.g. `rev ▰▰▰▱▱  high`.
     - Turbo → no extra question (it toggles).
     - Done tuning → exit the loop.
   - **Apply the change** by running: `node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" <cmd>` where `<cmd>` is `set <part> <model>` | `effort <part> <level>` | `turbo <part>` (also available: `shift/rev <part> up|down`, `add <part>`, `rm <part>`, `off`). Then print the updated console verbatim in a code block and loop back to the Part/Action menu.
4. When I pick Done, end with the final console only — no summary, no explanation.

I may also just say what I want in plain words at any point ("put implementation on fable", "add a debugging part") — apply it with the same CLI and show the console. Never make me type CLI syntax.
