#!/usr/bin/env bash
# Start a local MongoDB for development (no Docker needed).
set -e
MONGO_BIN="${MONGO_BIN:-$HOME/.local/mongodb/bin/mongod}"
DBPATH="${MONGO_DBPATH:-$HOME/.local/var/seltiv-mongo}"
LOGPATH="${MONGO_LOGPATH:-$HOME/.local/var/log/seltiv-mongod.log}"
PORT="${MONGO_PORT:-27017}"

if ! [ -x "$MONGO_BIN" ]; then
  echo "mongod not found at $MONGO_BIN — set MONGO_BIN or install MongoDB." >&2
  exit 1
fi

mkdir -p "$DBPATH" "$(dirname "$LOGPATH")"

if pgrep -f "mongod .*--port $PORT" >/dev/null; then
  echo "MongoDB already running on :$PORT"
  exit 0
fi

"$MONGO_BIN" --dbpath "$DBPATH" --port "$PORT" --bind_ip 127.0.0.1 --logpath "$LOGPATH" --fork
echo "MongoDB started on 127.0.0.1:$PORT  (log: $LOGPATH)"
