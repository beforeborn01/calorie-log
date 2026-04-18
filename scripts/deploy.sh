#!/usr/bin/env bash
# ============================================
# 食养记 生产部署脚本（ECS 使用）
# 用法：
#   ./scripts/deploy.sh init      # 首次部署（生成 .env 并启动）
#   ./scripts/deploy.sh update    # 拉最新代码并重建
#   ./scripts/deploy.sh logs [svc]
#   ./scripts/deploy.sh status
#   ./scripts/deploy.sh stop
#   ./scripts/deploy.sh restart [svc]
#   ./scripts/deploy.sh down      # 停止（保留数据卷）
#   ./scripts/deploy.sh nuke      # 停止并清空数据卷（⚠️ 删库）
#   ./scripts/deploy.sh backup    # 备份 postgres 到 backups/
# ============================================

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml"

log()  { printf '\033[36m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[deploy][WARN]\033[0m %s\n' "$*"; }
err()  { printf '\033[31m[deploy][ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

# 跨平台 sed：macOS / Alpine / GNU 都能用
sedi() {
  if sed --version >/dev/null 2>&1; then
    sed -i "$@"
  else
    sed -i '' "$@"
  fi
}

check_deps() {
  command -v docker >/dev/null || err "docker 未安装。可运行：curl -fsSL https://get.docker.com | sh"
  docker compose version >/dev/null 2>&1 || err "docker compose (v2) 未安装"
  command -v openssl >/dev/null || err "openssl 未安装"
}

gen_env() {
  if [[ -f .env ]]; then
    log ".env 已存在，跳过生成"
    return
  fi
  [[ -f .env.prod.example ]] || err "找不到 .env.prod.example"
  log "首次部署：生成 .env（postgres/redis 密码 Admin123!，JWT 随机）"
  cp .env.prod.example .env

  # 随机 JWT（HS512 要求 ≥64 字节，base64 编码后约 88 字符）
  local jwt
  jwt=$(openssl rand -base64 64 | tr -d '\n')

  # 替换模板占位符
  sedi "s|REPLACE_ME_STRONG_POSTGRES_PWD|Admin123!|" .env
  sedi "s|REPLACE_ME_REDIS_PWD|Admin123!|" .env
  # JWT 密钥可能含 / + =，用 | 作为 sed 分隔符避开
  sedi "s|REPLACE_ME_JWT_SECRET_AT_LEAST_64_CHARS_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|${jwt}|" .env

  warn "Admin123! 仅适合内网 / 学习环境；上真生产前请改强密码并执行 down -v 重置 DB"
}

init() {
  check_deps
  gen_env

  log "构建并启动（首次 3-5 分钟：maven 拉依赖 + npm install + vite build）"
  $COMPOSE up -d --build

  log "等待服务就绪..."
  local ready=false
  for _ in $(seq 1 30); do
    if $COMPOSE ps app 2>/dev/null | grep -q 'healthy'; then
      ready=true
      break
    fi
    sleep 3
  done
  $ready || warn "app 超过 90 秒未健康，查看日志：./scripts/deploy.sh logs app"

  $COMPOSE ps
  local port
  port=$(grep -E '^WEB_PORT=' .env 2>/dev/null | cut -d= -f2-)
  port=${port:-8088}
  log "完成。访问 http://<你的公网IP>:${port}/"
  log "Demo 账号（V7 seed）：18601977124 / Admin123!"
}

update() {
  check_deps
  [[ -f .env ]] || err ".env 不存在，请先执行 init"
  log "拉取最新代码"
  git pull --ff-only
  log "重建并滚动更新"
  $COMPOSE up -d --build
  log "清理无主镜像"
  docker image prune -f >/dev/null
  $COMPOSE ps
}

logs_cmd()    { $COMPOSE logs -f --tail=200 "${2:-}"; }
status()      { $COMPOSE ps; }
stop()        { $COMPOSE stop; }
restart()     { $COMPOSE restart "${2:-}"; }
down_cmd()    { $COMPOSE down; log "已停止。数据卷保留；彻底清空用 nuke"; }
nuke()        {
  warn "即将停止并删除所有数据卷（postgres / redis）。"
  read -rp "确认？输入 YES 继续：" ans
  [[ "$ans" == "YES" ]] || { log "取消"; exit 0; }
  $COMPOSE down -v
  log "已清空"
}

backup() {
  [[ -f .env ]] || err ".env 不存在"
  # shellcheck disable=SC1091
  set -a; source .env; set +a
  local ts dir out
  ts=$(date +%Y%m%d-%H%M%S)
  dir="backups"
  mkdir -p "$dir"
  out="$dir/pg-${ts}.sql.gz"
  log "备份到 $out"
  $COMPOSE exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-calorie_log}" -d "${POSTGRES_DB:-calorie_log_db}" \
    | gzip > "$out"
  log "完成：$(du -h "$out" | cut -f1)"
}

case "${1:-}" in
  init)    init ;;
  update)  update ;;
  logs)    logs_cmd "$@" ;;
  status)  status ;;
  stop)    stop ;;
  restart) restart "$@" ;;
  down)    down_cmd ;;
  nuke)    nuke ;;
  backup)  backup ;;
  *)
    echo "用法：$0 {init|update|logs|status|stop|restart|down|nuke|backup}"
    exit 1 ;;
esac
