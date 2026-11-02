#!/usr/bin/env bash
# Stop and remove the Prelegal container. Shared by stop-mac.sh and stop-linux.sh.
set -euo pipefail

if docker rm -f prelegal >/dev/null 2>&1; then
  echo "Prelegal stopped."
else
  echo "Prelegal is not running."
fi
