# gearbox (plugin)

Pick which **model** and **effort** Claude uses for each *part* of a task — planning, exploration,
research, implementation, code review, and more. Off by default; when off, Claude behaves exactly as normal.

## Use it
- **Open the shifter (in your terminal):** `gearbox tune` — arrow keys to shift the gear (model) and rev
  (effort), `t` for turbo, `s` to save. Writes `~/.claude/gearbox/profile.json`.
- **Turn it on:** one session → `GEARBOX=1 claude`; keep it on → `gearbox on` (`gearbox off` to stop).
- **Check:** `gearbox status`.

`bin/` isn't on your `PATH` by default — add an alias (see the repo README) or call the scripts by path.

## How it works
- `profile.json` holds your gears (one entry per part: model, effort, turbo).
- A plugin hook runs on session start + each prompt. When Gearbox is **on** it regenerates one sub-agent
  per part in `~/.claude/agents/` with your model + effort in the frontmatter, and reminds Claude to route
  each kind of work to the right one. When **off** it spawns nothing and removes any gearbox sub-agents.
- `turbo` on a part → that helper runs at `xhigh` and is told to orchestrate (split up, fan out, verify).

## Honest limits
- Effort is fully honoured for parts Claude hands to a sub-agent (baked into the agent frontmatter). For work
  Claude does itself in the main chat, you control the model but effort follows the session default.
- Routing is automatic delegation, reinforced by a gear-map reminder each turn — strong guidance, not a hard
  guarantee for every spawn.

See the repository README for install and the full walkthrough.
