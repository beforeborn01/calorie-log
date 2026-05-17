#!/usr/bin/env bash
# ============================================================
# 发布到火山 ECS（root@115.190.210.138 / sshmeet 别名指向）
#
# 这是 deploy.sh 的「本机驱动器」：
#   - 本机预检：HEAD 已 commit + 已 push
#   - SSH 进 ECS，必要时切到目标分支
#   - 调 ECS 上的 ./scripts/deploy.sh update（git pull + 重建 + 镜像清理）
#   - 等 app 健康
#   - 冒烟：调 /auth/send-code 验证 prod 假验证码已生效
#
# 用法：
#   ./scripts/release.sh                 # 部署当前分支
#   ./scripts/release.sh -b main         # 切到 main
#   ./scripts/release.sh --skip-smoke    # 跳过冒烟（如 60s 限频锁卡住）
#   ./scripts/release.sh --skip-checks   # 紧急用：跳过本地预检
#
# 可被环境变量覆盖：
#   ECS_HOST=root@115.190.210.138
#   ECS_KEY=~/program/volc/volc-meet.pem
#   ECS_PROJECT_DIR=/root/calorie-log
#   PUBLIC_BASE_URL=http://115.190.210.138:8088
#   HEALTH_TIMEOUT=120
# ============================================================

set -euo pipefail

cd "$(dirname "$0")/.."

ECS_HOST="${ECS_HOST:-root@115.190.210.138}"
ECS_KEY="${ECS_KEY:-$HOME/program/volc/volc-meet.pem}"
ECS_PROJECT_DIR="${ECS_PROJECT_DIR:-/root/calorie-log}"
# 默认仍是 IP+8088 的 HTTP；启用 HTTPS 后请覆盖：
#   PUBLIC_BASE_URL=https://your.domain ./scripts/release.sh
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://115.190.210.138:8088}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

BRANCH=""
SKIP_CHECKS=0
SKIP_SMOKE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--branch)   BRANCH="$2"; shift 2 ;;
    --skip-checks) SKIP_CHECKS=1; shift ;;
    --skip-smoke)  SKIP_SMOKE=1; shift ;;
    -h|--help)     sed -n '2,/^# ====*$/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done
[[ -z "${BRANCH}" ]] && BRANCH=$(git branch --show-current)

log()  { printf '\033[36m[release]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[release][WARN]\033[0m %s\n' "$*"; }
err()  { printf '\033[31m[release][ERROR]\033[0m %s\n' "$*" >&2; exit 1; }
ok()   { printf '\033[32m[release][✓]\033[0m %s\n' "$*"; }

ssh_ecs() { ssh -i "${ECS_KEY}" -o ConnectTimeout=15 -o BatchMode=yes "${ECS_HOST}" "$@"; }

# ---------- 1. 本地预检 ----------
local_checks() {
  log "本地预检：分支=${BRANCH}"

  [[ -z "$(git status --porcelain)" ]] || err "工作树有未提交改动。先 git commit + git push。"

  local local_sha remote_sha
  local_sha=$(git rev-parse HEAD)
  remote_sha=$(git rev-parse "origin/${BRANCH}" 2>/dev/null) || \
    err "远端没有 origin/${BRANCH}。先 git push -u origin ${BRANCH}。"
  [[ "$local_sha" == "$remote_sha" ]] || \
    err "本地 HEAD 与 origin/${BRANCH} 不一致：本地=${local_sha:0:7} 远端=${remote_sha:0:7}；先 git push。"
  ok "本地干净，HEAD ${local_sha:0:7} 与 origin/${BRANCH} 一致"

  ssh_ecs 'echo ok' >/dev/null 2>&1 || \
    err "无法 SSH 到 ${ECS_HOST}。检查 sshmeet 是否通；或 ${ECS_KEY} 权限是否 600。"
  ok "ECS 可达：${ECS_HOST}"
}

# ---------- 2. 调用 ECS 上的 deploy.sh update ----------
deploy() {
  log "ECS 端：cd ${ECS_PROJECT_DIR} && ./scripts/deploy.sh update（分支：${BRANCH}）"

  # 用未引号的 here-doc：本地变量 ${BRANCH}/${ECS_PROJECT_DIR} 在本地展开后嵌入；
  # ECS 端 shell 变量统一 \$ 转义保护
  ssh_ecs bash -s <<EOF
set -euo pipefail

cd "${ECS_PROJECT_DIR}"

# 显式拒绝 ECS 端的脏工作树（git pull 会无声失败）
if [ -n "\$(git status --porcelain)" ]; then
  echo "[ecs][ERROR] ECS 工作树有未提交改动，请人工进去看：" >&2
  git status --short >&2
  exit 1
fi

# 切到目标分支（若已在则空跑）
current=\$(git branch --show-current)
if [ "\$current" != "${BRANCH}" ]; then
  echo "[ecs] 切分支：\$current -> ${BRANCH}"
  git fetch --prune origin
  git checkout "${BRANCH}"
fi

# 委托给现有 deploy.sh：拉代码 + 重建全部 service + image prune
./scripts/deploy.sh update
EOF
}

# ---------- 3. 等 app 健康（deploy.sh update 是 fire-and-forget，要补一道）----------
wait_healthy() {
  log "等 app 健康（最多 ${HEALTH_TIMEOUT}s）"
  ssh_ecs bash -s <<EOF
set -e
cd "${ECS_PROJECT_DIR}"
deadline=\$(( \$(date +%s) + ${HEALTH_TIMEOUT} ))
while [ \$(date +%s) -lt \$deadline ]; do
  cid=\$(docker compose -f docker-compose.prod.yml ps -q app 2>/dev/null)
  if [ -n "\$cid" ]; then
    health=\$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}-{{end}}' "\$cid")
    if [ "\$health" = "healthy" ]; then
      echo "[ecs] app healthy"
      exit 0
    fi
  fi
  sleep 3
done
echo "[ecs][WARN] app 超时未健康，最近日志：" >&2
docker compose -f docker-compose.prod.yml logs --tail=80 app >&2
exit 1
EOF
}

# ---------- 4. 冒烟测试 ----------
smoke_test() {
  log "冒烟：${PUBLIC_BASE_URL}/api/v1/auth/send-code 应返回 code=\"123456\""
  local resp
  resp=$(curl -sS --max-time 15 -X POST "${PUBLIC_BASE_URL}/api/v1/auth/send-code" \
    -H 'Content-Type: application/json' \
    -d '{"identifier":"13900000099","scene":"register"}' 2>&1) || {
      warn "请求失败：$resp"; return 1
    }
  echo "  response: $resp"
  if echo "$resp" | grep -q '"code":"123456"'; then
    ok "prod 假验证码已生效"
  elif echo "$resp" | grep -q '"sent":true'; then
    warn "请求成功但响应没带 code——mock 开关可能没切到 true，核查 application-prod.yml"
    return 1
  else
    warn "意外响应——也可能 60s 限频锁还在（同号同场景），换号重试"
    return 1
  fi
}

# ---------- main ----------
log "目标：${ECS_HOST}:${ECS_PROJECT_DIR} · 分支 ${BRANCH}"
[[ $SKIP_CHECKS -eq 1 ]] || local_checks
deploy
wait_healthy || warn "健康检查未过，但已部署；人工核查 \`sshmeet 'cd ${ECS_PROJECT_DIR} && ./scripts/deploy.sh logs app'\`"
[[ $SKIP_SMOKE -eq 1 ]] || smoke_test || warn "冒烟未过，但容器已起，请人工再查"
ok "完成。访问 ${PUBLIC_BASE_URL}/"
