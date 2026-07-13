# gearbox (plugin)

Pick which **model** and **effort** Claude uses for each *part* of a task — planning, research,
implementation, and more — from inside Claude, **per session**. Off by default: until you turn it
on in a session, Claude behaves exactly as normal.

## Use it (all from inside Claude — no shell, no separate tool)
- `/gearbox on` — turn it on for this session.
- `/gearbox` — show your current gears.
- `/gearbox set <part> <model> [effort]` — e.g. `/gearbox set implementation opus xhigh`.
- `/gearbox turbo <part>` — run that part extra hard (**turbo = ultracode**: xhigh + decompose → fan out → verify).
- `/gearbox add <part>` · `/gearbox rm <part>` · `/gearbox preset <eco|balanced|full-send>` · `/gearbox off`.

Change a gear any time; it applies on your **next message**. Each Claude session is independent —
turning it on in one shell doesn't touch another.

## Parts and gears
Built-in parts: **planning, exploration, research, implementation, code review** (add debugging, testing,
refactor, docs, summarizing, general, or any custom name).
- **Model** (most → least powerful): `fable · opus[1m] · opus · sonnet · haiku`.
- **Effort** (low → high): `low · medium · high · xhigh · max`.
- **Turbo** = ultracode for that part.

## How it works
Your gears for a session live in `~/.claude/gearbox/sessions/<session-id>.json`. A hook reads *that
session's* gears on each message and tells Claude which model + effort to use for each kind of work.
When a session hasn't turned Gearbox on, the hook does nothing — no files, no changes.

**One thing to know:** the **model** you pick for a part is the firm choice — Claude uses it when it
spawns a sub-agent for that kind of work. **Effort** is applied where the spawn allows it; think of the
model as the main lever.
