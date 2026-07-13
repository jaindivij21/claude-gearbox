#!/bin/sh
# Gearbox hook gate. Registered in ~/.claude/settings.json for SessionStart + UserPromptSubmit.
# It is deliberately cheap when Gearbox is OFF: it spawns Node ONLY when Gearbox is on.
#
#   ON  = env GEARBOX set (per-session, via the `ccgear` alias) OR the marker file ~/.claude/gearbox/ON exists.
#   OFF = neither. Then: no Node, remove any leftover gearbox agents, emit nothing -> Claude is exactly normal.

# Locate the sync script next to this one, so it works wherever the plugin is installed.
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
GB="$HOME/.claude/gearbox"   # user data (profile.json, ON marker) — stable, not the plugin dir
AG="$HOME/.claude/agents"
SYNC="$DIR/gearbox-sync.mjs"

is_on() {
  case "$GEARBOX" in
    ""|0|off|false|no) : ;;   # not on via env
    *) return 0 ;;
  esac
  [ -f "$GB/ON" ] && return 0
  return 1
}

if is_on; then
  # Active: hand the hook payload (stdin) to the sync script, which generates the
  # gear sub-agents and prints the gear map as JSON hook output.
  exec node "$SYNC"
fi

# Off: leave no trace. Remove only gearbox-managed agent files (never the user's own).
if [ -d "$AG" ]; then
  for f in "$AG"/*.md; do
    [ -f "$f" ] || continue
    if grep -q "gearbox:managed" "$f" 2>/dev/null; then
      rm -f "$f"
    fi
  done
fi
exit 0
