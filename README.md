# ⚙️ Gearbox for Claude Code

**Pick which model and effort Claude uses for each _part_ of a task** — plan on a cheap model,
research on a mid one, implement on your strongest — to spend fewer tokens. Like a car gearbox:
each part is a gear you shift.

You drive it entirely **from inside Claude** with the `/gearbox` command, it's **per session** (each
shell is independent), and it's **off by default** — until you turn it on in a session, Claude behaves
exactly as if the plugin weren't installed.

```
──────────────────────────────────────────────────────────────────────
  ⚙  G E A R B O X      session a1b2c3d4   ·   ON   ·   setup: balanced
──────────────────────────────────────────────────────────────────────
  gears →  ①fable  ②opus[1m]  ③opus  ④sonnet  ⑤haiku    (① strongest · costliest)

  planning        ①──②──③──◉──⑤  sonnet    rev ▐▐░░░ medium
  exploration     ①──②──③──④──◉  haiku     rev ▐░░░░ low
  research        ①──②──③──◉──⑤  sonnet    rev ▐▐░░░ medium
  implementation  ①──◉──③──④──⑤  opus[1m]  rev ▐▐▐▐░ xhigh   ⊙ TURBO
  code review     ①──②──◉──④──⑤  opus      rev ▐▐▐░░ high
```

The knob `◉` sits in each part's current gear. You shift it with commands (Claude's terminal
can't host a live drag UI), but the console reads like a real gearbox.

## Install

```
/plugin marketplace add jaindivij21/claude-gearbox
/plugin install gearbox@claude-gearbox
```

That's it — no shell aliases, no separate app. Everything is `/gearbox` inside Claude.

## Update

When a new version ships, refresh the marketplace and reinstall (from inside Claude):

```
/plugin marketplace update claude-gearbox
/plugin install gearbox@claude-gearbox
/reload-plugins
```

## Turn it on & off

- **On** (this session only): `/gearbox on`
- **Off** (back to normal): `/gearbox off`
- **Remove entirely**: disable the plugin with `/plugin`.

**When it's off, Claude works exactly as normal.** In any session where you haven't run `/gearbox on`
— and after `/gearbox off` — the hook does nothing: no gear map, no files, no change to how Claude
picks models. Gearbox only affects a session *after* you switch it on there, and only until you switch
it off. `/gearbox` any time shows whether this session is ON or OFF.

## Use

- `/gearbox` — show your gearbox (the console above).
- `/gearbox on` — start it for **this** session · `/gearbox off` — back to normal.
- **To change any gear, just tell Claude in plain words** — e.g. *"put implementation on fable"*,
  *"run research cheaper"*, *"turbo on code review"*, *"add a debugging part"*. No commands to learn;
  Claude shifts the gear and shows you the updated console.

Then just work. Claude runs each part in the gear you set; change a gear and it applies on your next
message. Another Claude shell is unaffected.

## Parts and gears

Built-in parts: **planning, exploration, research, implementation, code review**. Add **debugging,
testing, refactor, docs, summarizing, general**, or any custom name.

- **Model** (most → least powerful): `fable` · `opus[1m]` · `opus` · `sonnet` · `haiku`.
  (Fable 5 is the most capable/expensive tier; Haiku the cheapest.)
- **Effort** (low → high): `low` · `medium` · `high` · `xhigh` · `max`.
- **Turbo** = ultracode for that part.

## Per session — how it works

Gearbox is **scoped to one Claude session** (one shell / one `claude` window). Each session keeps its
own gears in `~/.claude/gearbox/sessions/<session-id>.json`:

- Turning it on, shifting a gear, or turning it off in **one** session changes only that session.
  Another Claude window running at the same time is completely unaffected — they can even run
  different setups side by side.
- On each message, a plugin hook reads **this session's** gears (keyed by the session id) and tells
  Claude which model + effort to use for each kind of work. Change a gear and it applies on your
  **next** message — no restart.
- A session that never ran `/gearbox on` has no state file, so the hook emits nothing. When the last
  session using Gearbox ends, its file is cleaned up — nothing lingers globally.

**One thing to know:** the **model** you pick for a part is the firm choice — Claude uses it when it

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
