---
description: Open your per-session gearbox — an arrow-key shifter for which model & effort Claude uses for each part of a task.
argument-hint: [on | off]
---
!`node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" $ARGUMENTS`

Above is this session's Gearbox console (the command already ran — never re-run it just to view). Follow this flow exactly:

1. Print the console verbatim in a code block. No commentary.
2. If it shows OFF: stop (it says how to turn on).
3. If ON: enter **TUNE MODE** — loop until the user presses Esc (a rejected/cancelled question means "done": print the final console and stop).

   **ROUND A — grab a shifter.** One single-select question:
   - question: "Grab a shifter  (Esc when done)" · header: "Shifter"
   - one option per part (max 4; fold extras into Other). label = the part name; description = its current "model · effort(· TURBO)"; **preview = the full console code block with that part's row marked with `▶`** — so arrowing through parts highlights each row in the preview pane.

   **ROUND B — work the gear assembly** for the grabbed part. One call, three single-select questions:
   - "Gear" (the model): options `fable`, `opus[1m]`, `opus`, `sonnet` (haiku via Other). **Each option's preview = that part's shaft with the knob slid into that slot**, e.g. for implementation:
     `implementation   ◉──②──③──④──⑤    fable      ① strongest·costliest`
     `implementation   ①──◉──③──④──⑤    opus[1m]`
     …so arrowing up/down visibly slides the knob along the shaft. Put the current gear FIRST in the options and mark it "(current)".
   - "Rev" (the effort): options `low`, `medium`, `high`, `xhigh` (max via Other); each preview = the rev bar at that level, e.g. `rev ▰▰▰▱▱  high`. Current level first, marked "(current)".
   - "Turbo": options `⊙ ON — ultracode` (xhigh + decompose → fan out → verify) and `off`.

   **Apply** with: `node "${CLAUDE_PLUGIN_ROOT}/bin/gearbox-cli.mjs" "${CLAUDE_SESSION_ID}" set <part> <model> <effort>` then, if turbo changed, `… turbo <part> on|off`. Print the updated console verbatim in a code block and loop back to ROUND A.

4. Plain words also work at any point ("put implementation on fable", "add a debugging part", "turn it off") — apply via the same CLI (`set|effort|shift|rev|turbo|add|rm|on|off`) and print the console. Never make the user type CLI syntax.
