#!/bin/sh
# Gearbox hook gate. Registered by the plugin for SessionStart + UserPromptSubmit (inject)
# and SessionEnd (cleanup). Cheap when Gearbox is unused: if no session has turned it on,
# no Node process is spawned and nothing is emitted — Claude behaves exactly as normal.

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SYNC="$DIR/gearbox-sync.mjs"
SESSIONS="$HOME/.claude/gearbox/sessions"

if [ "$1" = "--cleanup" ]; then
  # SessionEnd: only bother if this session might have a state file.
  [ -d "$SESSIONS" ] && [ -n "$(ls -A "$SESSIONS" 2>/dev/null)" ] || exit 0
  exec node "$SYNC" --cleanup
fi

# Inject path: skip entirely unless some session has Gearbox on.
[ -d "$SESSIONS" ] && [ -n "$(ls -A "$SESSIONS" 2>/dev/null)" ] || exit 0
exec node "$SYNC"
