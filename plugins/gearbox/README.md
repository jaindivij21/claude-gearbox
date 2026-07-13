# gearbox (plugin)

Pick which **model** and **effort** Claude uses for each *part* of a task — planning, research,
implementation, and more — from inside Claude, **per session**. Off by default: until you turn it
on in a session, Claude behaves exactly as normal.

**On / off:** `/gearbox on` to start it for this session, `/gearbox off` for normal Claude. It only
affects a session after you turn it on there, and only until you turn it off — other Claude windows
are untouched. **Update:** `/plugin marketplace update claude-gearbox` → `/plugin install gearbox@claude-gearbox` → `/reload-plugins`.

## Use it (all from inside Claude — no shell, no separate tool)
`/gearbox` shows a driveshaft console; the knob (◉) sits in each part's current gear:

```
  planning        ①──②──③──◉──⑤  sonnet    rev ▐▐░░░ medium
  implementation  ①──◉──③──④──⑤  opus[1m]  rev ▐▐▐▐░ xhigh   ⊙ TURBO
  gears →  ①fable  ②opus[1m]  ③opus  ④sonnet  ⑤haiku   (① strongest · costliest)
```

Drive it — **`/gearbox tune`** opens the shifter: a small ⚙ GEARBOX terminal window bound to this
session, with real keys (↑↓ part · ←→ gear · -/+ rev · t turbo · q close). Every keypress auto-saves
live; the session picks it up on its next message. `/gearbox` shows the console in chat; plain words
work too (*"put implementation on fable"*); `/gearbox on` / `off` toggle it.

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
