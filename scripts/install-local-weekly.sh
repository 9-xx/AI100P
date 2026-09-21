#!/usr/bin/env bash
# 在本机装 / 卸每周一定时周更（macOS launchd）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.aibaixuan.weekly"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOGDIR="$ROOT/logs"
UID_NUM="$(id -u)"
DOMAIN="gui/${UID_NUM}"

if [[ "${1:-}" == "--uninstall" ]]; then
  launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
  rm -f "$PLIST"
  echo "已卸载本机周更：$LABEL"
  exit 0
fi

NODE="$(command -v node)"
if [[ -z "$NODE" ]]; then
  echo "找不到 node" >&2
  exit 127
fi

mkdir -p "$LOGDIR" "$HOME/Library/LaunchAgents"
NODE_DIR="$(dirname "$NODE")"
PATH_VALUE="${NODE_DIR}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${ROOT}/scripts/weekly.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>1</integer>
    <key>Hour</key>
    <integer>10</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOGDIR}/weekly.log</string>
  <key>StandardErrorPath</key>
  <string>${LOGDIR}/weekly.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${PATH_VALUE}</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootout "${DOMAIN}/${LABEL}" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST"
echo "已安装本机周更：每周一 10:00（本机时区）→ npm run update:weekly"
echo "plist: $PLIST"
echo "日志: $LOGDIR/weekly.log"
echo "立刻试跑：launchctl start $LABEL"
echo "卸载：npm run schedule:uninstall"
