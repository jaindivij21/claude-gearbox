# ⚙️ Gearbox for Claude Code

**Pick which model and effort Claude uses for each _part_ of a task** — plan on a cheap model,
research on a mid one, implement on your strongest — to spend fewer tokens. Like a car gearbox:
each part is a gear you shift.

You drive it entirely **from inside Claude** with the `/gearbox` command, it's **per session** (each
shell is independent), and it's **off by default** — until you turn it on in a session, Claude behaves
exactly as if the plugin weren't installed.

```
⚙  GEARBOX — session a1b2c3d4 — ON — setup: balanced

  PART              MODEL       EFFORT            TURBO
  planning          sonnet      ▓▓░░░ medium      —
  exploration       haiku       ▓░░░░ low         —
  research          sonnet      ▓▓░░░ medium      —
  implementation    opus[1m]    ▓▓▓▓░ xhigh       ● ultracode
  code review       opus        ▓▓▓░░ high        —

Models, most→least powerful:  fable · opus[1m] · opus · sonnet · haiku
```

## Install

```
/plugin marketplace add jaindivij21/claude-gearbox
/plugin install gearbox@claude-gearbox
```

That's it — no shell aliases, no separate app. Everything is `/gearbox` inside Claude.

## Use

- `/gearbox on` — turn it on for **this** session.
- `/gearbox` — show your gears.
- `/gearbox set <part> <model> [effort]` — e.g. `/gearbox set implementation opus xhigh`.
- `/gearbox turbo <part>` — run that part extra hard (**turbo = ultracode**: xhigh + decompose → fan out → verify).
- `/gearbox add <part>` · `/gearbox rm <part>` · `/gearbox preset <eco|balanced|full-send>` · `/gearbox off`.

Then just work. Claude runs each part in the gear you set; change a gear and it applies on your next
message. Another Claude shell is unaffected.

## Parts and gears

Built-in parts: **planning, exploration, research, implementation, code review**. Add **debugging,
testing, refactor, docs, summarizing, general**, or any custom name.

- **Model** (most → least powerful): `fable` · `opus[1m]` · `opus` · `sonnet` · `haiku`.
  (Fable 5 is the most capable/expensive tier; Haiku the cheapest.)
- **Effort** (low → high): `low` · `medium` · `high` · `xhigh` · `max`.
- **Turbo** = ultracode for that part.

## How it works

Your gears for a session live in `~/.claude/gearbox/sessions/<session-id>.json`. A plugin hook reads
*that session's* gears on each message and tells Claude which model + effort to use for each kind of
work. If a session never turns Gearbox on, the hook does nothing — no files, no behaviour change.
Disabling the plugin removes the hook entirely.

**One thing to know:** the **model** you pick for a part is the firm choice — Claude uses it when it
spawns a sub-agent for that kind of work. **Effort** is applied where the spawn allows it; the model is
the main lever.

## Layout

```
claude-gearbox/
├── .claude-plugin/marketplace.json
└── plugins/gearbox/
    ├── .claude-plugin/plugin.json
    ├── commands/gearbox.md        # the /gearbox command
    ├── hooks/hooks.json           # SessionStart + UserPromptSubmit (inject) · SessionEnd (cleanup)
    ├── bin/
    │   ├── gearbox-cli.mjs        # per-session config (what /gearbox runs)
    │   ├── gearbox-sync.mjs       # reads this session's gears, injects the gear map
    │   └── gearbox-hook.sh        # cheap gate (no-op when unused)
    ├── templates/profile.default.json
    └── README.md
```

## License

MIT — see [LICENSE](LICENSE).
