#!/usr/bin/env bash
# Install the production certificate renewal timer on the ECS host.
#
# Run on the server from the calorie-log checkout:
#   sudo ./scripts/install-ssl-renewal.sh

set -euo pipefail

cd "$(dirname "$0")/.."

SYSTEMD_DIR="/etc/systemd/system"
SERVICE_NAME="calorie-log-ssl-renew.service"
TIMER_NAME="calorie-log-ssl-renew.timer"

[[ "$(id -u)" -eq 0 ]] || {
  echo "请以 root 运行：sudo ./scripts/install-ssl-renewal.sh" >&2
  exit 1
}
command -v systemctl >/dev/null || {
  echo "找不到 systemctl；此脚本只支持 systemd 主机" >&2
  exit 1
}
[[ -f "deploy/systemd/${SERVICE_NAME}" ]] || {
  echo "找不到 deploy/systemd/${SERVICE_NAME}" >&2
  exit 1
}
[[ -x scripts/setup-ssl.sh ]] || chmod +x scripts/setup-ssl.sh

install -m 0644 "deploy/systemd/${SERVICE_NAME}" "${SYSTEMD_DIR}/${SERVICE_NAME}"
install -m 0644 "deploy/systemd/${TIMER_NAME}" "${SYSTEMD_DIR}/${TIMER_NAME}"

systemctl daemon-reload
systemctl enable --now "${TIMER_NAME}"

echo "已启用 ${TIMER_NAME}"
systemctl list-timers "${TIMER_NAME}" --no-pager
