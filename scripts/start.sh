#!/usr/bin/env bash
# Build the Prelegal image and run it at http://localhost:8000.
# Shared by start-mac.sh and start-linux.sh.
set -euo pipefail

NAME=prelegal
PORT=8000
cd "$(dirname "$0")/.."

docker build -t "$NAME" .
# Remove any previous container so the database always starts fresh.
docker rm -f "$NAME" >/dev/null 2>&1 || true

ENV_ARGS=()
if [ -f .env ]; then ENV_ARGS=(--env-file .env); fi
# The ${arr[@]+...} form avoids an "unbound variable" error for an empty array on bash 3.2 (macOS).
docker run -d --name "$NAME" -p "$PORT:8000" ${ENV_ARGS[@]+"${ENV_ARGS[@]}"} "$NAME" >/dev/null

echo "Waiting for Prelegal to start..."
for _ in $(seq 1 30); do
  if curl -fsS "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    echo "Prelegal is running at http://localhost:$PORT"
    exit 0
  fi
  sleep 1
done

echo "Prelegal did not become healthy in time. Container logs:" >&2
docker logs "$NAME" >&2
exit 1
