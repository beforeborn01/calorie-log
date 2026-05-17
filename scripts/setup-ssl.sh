#!/usr/bin/env bash
# ============================================
# 申请 / 续签 Let's Encrypt 证书（webroot 模式）
#
# 设计目标：
#   - 不引入额外常驻容器；只在需要时跑一次性的 certbot 容器
#   - nginx 容器把宿主 ./ssl/live → 容器 /etc/nginx/ssl，证书一拷就生效
#   - 续签时只需重跑此脚本（建议放 cron）
#
# 用法（在 ECS 项目根目录下）：
#   ./scripts/setup-ssl.sh issue  --domain example.com  --email me@x.com
#   ./scripts/setup-ssl.sh renew                           # 续签（自动 reload nginx）
#   ./scripts/setup-ssl.sh issue --domain example.com --email me@x.com --staging   # 测试用
#
# 前置条件：
#   1) 域名 A 记录已指向本机公网 IP
#   2) 80 端口必须可从公网访问（用于 ACME http-01 challenge）
#      —— 当前项目宿主 80 被 docker 8088→80 占用，所以确保 docker compose 已 up 且 nginx 在 80
#      —— 火山云安全组放行 80 / 443
#   3) docker-compose.prod.yml 的 nginx service 已挂载 ./ssl/live 和 ./ssl/acme-webroot
# ============================================

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml"
WEBROOT="./ssl/acme-webroot"
LIVE_DIR="./ssl/live"
ENV_FILE=".env"

log()  { printf '\033[36m[ssl]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[ssl][WARN]\033[0m %s\n' "$*"; }
err()  { printf '\033[31m[ssl][ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

ACTION=""
DOMAIN=""
EMAIL=""
STAGING=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    issue|renew) ACTION="$1"; shift ;;
    --domain)    DOMAIN="$2"; shift 2 ;;
    --email)     EMAIL="$2";  shift 2 ;;
    --staging)   STAGING=1;   shift ;;
    -h|--help)
      sed -n '2,/^# ====*$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) err "未知参数: $1" ;;
  esac
done

[[ -n "$ACTION" ]] || err "缺少子命令：issue 或 renew"

mkdir -p "$WEBROOT" "$LIVE_DIR"

# ---------- issue ----------
issue() {
  [[ -n "$DOMAIN" ]] || err "issue 需要 --domain"
  [[ -n "$EMAIL"  ]] || err "issue 需要 --email"

  # ACME http-01 验证必须经由域名:80 抵达本机 nginx；如果宿主端口不是 80，
  # Let's Encrypt 永远访问不到我们写在 webroot 里的 challenge 文件。
  local web_port="8088"
  if [[ -f "$ENV_FILE" ]]; then
    local v
    v=$(grep -E '^WEB_PORT=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')
    [[ -n "$v" ]] && web_port="$v"
  fi
  if [[ "$web_port" != "80" ]]; then
    err "WEB_PORT=${web_port}，但 Let's Encrypt http-01 验证需要宿主 80 端口。
       请先在 .env 设置 WEB_PORT=80，docker compose up -d 重启 nginx 后再跑本脚本。
       （证书申请成功后可以保持 WEB_PORT=80；HSTS / 301 跳转会引流到 443）"
  fi

  # 校验 nginx 在跑（webroot 模式需要 nginx 服务于 ./ssl/acme-webroot）
  if ! $COMPOSE ps nginx 2>/dev/null | grep -q 'Up\|running'; then
    err "nginx 未运行；先 ./scripts/deploy.sh update 起服务再申请证书"
  fi

  log "申请证书 domain=${DOMAIN} email=${EMAIL} staging=${STAGING}"
  local extra=""
  [[ $STAGING -eq 1 ]] && extra="--staging"

  # certbot 一次性容器；--webroot 把 challenge 文件写到我们 nginx 也挂着的 ./ssl/acme-webroot
  # --cert-name 固定为 app，便于续签 + 与挂载路径解耦
  docker run --rm \
    -v "$(pwd)/ssl/acme-webroot:/var/www/certbot" \
    -v "$(pwd)/ssl/letsencrypt:/etc/letsencrypt" \
    certbot/certbot:latest \
    certonly --non-interactive --agree-tos --webroot \
    -w /var/www/certbot \
    --email "$EMAIL" \
    --cert-name app \
    -d "$DOMAIN" \
    $extra

  install_cert
  enable_https_in_env
  log "重载 nginx"
  $COMPOSE restart nginx
  log "完成。访问 https://${DOMAIN}/"
}

install_cert() {
  local src="./ssl/letsencrypt/live/app"
  [[ -f "$src/fullchain.pem" ]] || err "证书文件未生成：$src/fullchain.pem"

  log "拷贝证书到 ${LIVE_DIR}/"
  # 用真实文件而非软链：宿主软链跨 mountpoint 进容器有时丢
  cp -L "$src/fullchain.pem" "$LIVE_DIR/fullchain.pem"
  cp -L "$src/privkey.pem"   "$LIVE_DIR/privkey.pem"
  chmod 644 "$LIVE_DIR/fullchain.pem"
  chmod 600 "$LIVE_DIR/privkey.pem"
}

enable_https_in_env() {
  # 把 DOMAIN= 写进 .env，让 docker-compose 启 nginx 时注入
  if [[ ! -f "$ENV_FILE" ]]; then
    warn ".env 不存在；请手动确保 nginx 容器 environment.DOMAIN=${DOMAIN}"
    return
  fi
  if grep -q '^DOMAIN=' "$ENV_FILE"; then
    if grep -q "^DOMAIN=${DOMAIN}$" "$ENV_FILE"; then
      log ".env 已含 DOMAIN=${DOMAIN}"
    else
      log "更新 .env: DOMAIN -> ${DOMAIN}"
      # 跨平台 sed
      if sed --version >/dev/null 2>&1; then
        sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" "$ENV_FILE"
      else
        sed -i '' "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" "$ENV_FILE"
      fi
    fi
  else
    log "追加 DOMAIN=${DOMAIN} 到 .env"
    printf '\nDOMAIN=%s\n' "$DOMAIN" >> "$ENV_FILE"
  fi
}

# ---------- renew ----------
renew() {
  log "尝试续签所有证书"
  docker run --rm \
    -v "$(pwd)/ssl/acme-webroot:/var/www/certbot" \
    -v "$(pwd)/ssl/letsencrypt:/etc/letsencrypt" \
    certbot/certbot:latest \
    renew --webroot -w /var/www/certbot --quiet

  if [[ -d ./ssl/letsencrypt/live/app ]]; then
    install_cert
    log "重载 nginx"
    $COMPOSE exec -T nginx nginx -s reload || $COMPOSE restart nginx
  else
    warn "未发现已签发的证书；跳过 install"
  fi
}

case "$ACTION" in
  issue) issue ;;
  renew) renew ;;
esac
