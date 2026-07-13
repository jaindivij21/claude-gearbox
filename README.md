# ⚙️ Gearbox for Claude Code

**Pick which model and effort Claude uses for each _part_ of a task** — plan on a cheap model, research on
a mid one, implement on your strongest — mainly to spend fewer tokens. Like a car gearbox: each part is a
gear you shift up or down.

It's a **terminal gear-shifter** (no browser), it's **opt-in per session**, and when it's off Claude behaves
**exactly as normal** — as if the plugin weren't installed.

```
  ⚙  GEARBOX   shift the model & effort for each part          setup: balanced

  PART            GEAR · model                  REV · effort    TURBO
▸ planning        [1·fable] 2 3 4 5             █░░░░ low       ·
  exploration     1 [2·haiku] 3 4 5             █░░░░ low       ·
  research        1 2 [3·sonnet] 4 5            ██░░░ medium    ·
  implementation  1 2 3 4 [5·opus[1m]]          ████░ xhigh     ◉ BOOST
  code review     1 2 3 [4·opus] 5              ███░░ high      ·

  ↑↓ part   ←→ gear   -/+ rev   t turbo   a add   x del   p preset   s save   q quit
```

## Why

Out of the box, Claude Code has one global model and one global effort — everything runs on the expensive
default. Gearbox lets you set a model + effort per kind of work and switch setups without touching your
config, so cheap work stays cheap and only the hard part runs hot.

## Install

```
/plugin marketplace add jaindivij21/claude-gearbox
/plugin install gearbox@claude-gearbox
```

Add a shell alias so the commands are handy (the plugin's `bin/` isn't on your `PATH`):

```sh
# ~/.zshrc or ~/.bashrc — point at your installed plugin path, e.g.
alias gearbox="$HOME/.claude/plugins/marketplaces/claude-gearbox/plugins/gearbox/bin/gearbox"
alias ccgear='GEARBOX=1 claude'
```

## Use

1. **Shift your gears** — run `gearbox tune` (works in a normal terminal, or `! gearbox tune` inside a Claude
   Code session). Arrow keys pick the part and shift the gear (model) / rev (effort); `t` = turbo; `s` = save.
   It writes `~/.claude/gearbox/profile.json`.
2. **Turn it on** — one session: `GEARBOX=1 claude` (or `ccgear`). Keep it on: `gearbox on`. Stop: `gearbox off`.
3. **Work normally.** Claude runs each part in the gear you set. Re-shift and re-save any time — it applies on
   your next message, no restart. Leave it off and nothing changes.

## What you can put in a gear

Any kind of work Claude does. Built-in parts: **planning, exploration, research, implementation, code review**;
add more from the tuner: **debugging, testing, refactor, docs, summarizing, general**, or a custom one.

- **Gear = model** — `fable · haiku · sonnet · opus · opus[1m]` (1st → 5th).
- **Rev = effort** — `low · medium · high · xhigh · max`.
- **Turbo** — run that part extra hard: `xhigh` + orchestrate (split up, fan out, double-check).

## How it works

- Your gears live in `~/.claude/gearbox/profile.json`.
- A plugin **hook** runs on session start and every prompt. When Gearbox is **on** it (re)generates one
  sub-agent per part in `~/.claude/agents/` with your model + effort baked into the frontmatter, and injects a
  short "gear map" so Claude routes each kind of work to the right helper. When **off** it spawns nothing and
  removes any gearbox sub-agents — so Claude is untouched. Disabling the plugin removes the hook entirely.

## Honest limits

- **Effort** is fully honoured for parts Claude hands to a sub-agent (it's in the agent's frontmatter). For work
  Claude does itself in the main chat, you control the model but effort follows the session default.
- **Routing** is automatic delegation (matched on each part's description and reinforced by the gear-map
  reminder each turn) — strong guidance, not a hard guarantee for every single spawn.
- **Model names** resolve per provider (`opus` → the current Opus on Anthropic/Bedrock); pin `opus[1m]` where
  you want determinism.

## Layout

```
claude-gearbox/
├── .claude-plugin/marketplace.json
└── plugins/gearbox/
    ├── .claude-plugin/plugin.json
    ├── hooks/hooks.json          # SessionStart + UserPromptSubmit → gearbox-hook.sh
    ├── bin/
    │   ├── gearbox               # on / off / status / tune / edit
    │   ├── gearbox-tune.mjs       # the terminal gear-shifter (TUI)
    │   ├── gearbox-hook.sh        # hook gate (cheap when off)
    │   └── gearbox-sync.mjs       # generates the sub-agents + gear map
    ├── templates/profile.default.json
    ├── ui/gearbox.html            # optional browser version of the shifter
    └── README.md
```

## License

MIT — see [LICENSE](LICENSE).
