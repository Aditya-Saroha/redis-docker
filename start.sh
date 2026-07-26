#!/bin/bash
set -e

/usr/local/bin/kv-server &
KV_PID=$!

node server.js &
WEB_PID=$!

# Wait for either process to exit. `wait -n` returns as soon as the
# first backgrounded job finishes, whatever its exit code.
wait -n "$KV_PID" "$WEB_PID"
EXIT_CODE=$?

# Whichever one exited, the other becomes an orphan if we don't also
# kill it — so bring both down and let Render's restart policy take
# over the whole container, rather than leaving a half-dead process
# tree running silently.
kill "$KV_PID" "$WEB_PID" 2>/dev/null || true

exit "$EXIT_CODE"