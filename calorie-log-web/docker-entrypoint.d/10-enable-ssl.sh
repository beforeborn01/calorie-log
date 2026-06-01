#!/usr/bin/env sh
# 仅当 /etc/nginx/ssl/fullchain.pem 存在时启用 HTTPS：
#   - 把 /etc/nginx/conf.d/_ssl.conf.tpl 渲染（替换 __DOMAIN__）拷到 conf.d/ssl.conf
#   - 给主 nginx.conf 的 80 server 注入 301 跳转（除 ACME challenge 外）
#
# 没证书就什么都不做，nginx 启动时只有 80 server，行为和未上 HTTPS 时一致。
#
# 通过环境变量 DOMAIN 指定域名（必填，否则跳过 SSL 启用并打 warning）。
#
# 该脚本由 nginx 官方镜像在启动时自动执行（/docker-entrypoint.d/*.sh）。

set -e

CERT_FILE="/etc/nginx/ssl/fullchain.pem"
KEY_FILE="/etc/nginx/ssl/privkey.pem"
TPL_SRC="/etc/nginx/_ssl.conf.tpl"
TPL_DST="/etc/nginx/conf.d/ssl.conf"
MAIN_CONF="/etc/nginx/conf.d/default.conf"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "[entrypoint] SSL 证书未挂载（$CERT_FILE 缺失），保持纯 HTTP 模式"
    exit 0
fi

if [ -z "${DOMAIN:-}" ]; then
    echo "[entrypoint][WARN] 检测到证书但未设置 DOMAIN 环境变量；跳过 HTTPS 启用"
    exit 0
fi

echo "[entrypoint] 启用 HTTPS（DOMAIN=$DOMAIN）"

# 渲染 SSL server
sed "s|__DOMAIN__|$DOMAIN|g" "$TPL_SRC" > "$TPL_DST"

# 在主配置 80 server 里注入：除 challenge 之外强制 301
# 用一个标记块包起来，重启时 idempotent
if ! grep -q '# >>> https-redirect injected' "$MAIN_CONF"; then
    awk '
        /^server \{/ && !injected {
            print
            print "    # >>> https-redirect injected"
            print "    if ($scheme = http) { set $do_redirect 1; }"
            print "    if ($request_uri ~ ^/\\.well-known/acme-challenge/) { set $do_redirect 0; }"
            print "    if ($request_uri = /healthz) { set $do_redirect 0; }"
            print "    if ($do_redirect = 1) { return 301 https://$host$request_uri; }"
            print "    # <<< https-redirect injected"
            injected=1
            next
        }
        { print }
    ' "$MAIN_CONF" > "$MAIN_CONF.new" && mv "$MAIN_CONF.new" "$MAIN_CONF"
fi

echo "[entrypoint] HTTPS 配置就绪"
