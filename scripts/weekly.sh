#!/usr/bin/env bash
# 周更入口：刷资讯 → 观察档自动换人 / 建议清单 → 重建页面数据
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

NODE="$(command -v node || true)"
if [[ -z "$NODE" ]]; then
  echo "找不到 node，请先把 node 加进 PATH" >&2
  exit 127
fi

exec "$NODE" "$ROOT/scripts/update-weekly.mjs" "$@"
