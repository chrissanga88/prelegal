#!/usr/bin/env bash
# Stop and remove the Prelegal container. Shared by stop-mac.sh and stop-linux.sh.
set -euo pipefail

NAME=prelegal
if [ -n "$(docker ps -aq --filter "name=^${NAME}$")" ]; then
  docker rm -f "$NAME" >/dev/null
  echo "Prelegal stopped."
else
  echo "Prelegal is not running."
fi
