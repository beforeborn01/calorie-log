# ============================================
# 食养记前端 - 多阶段构建：node 打包 → nginx 托管
# ============================================

# --- 构建阶段 ---
FROM node:22-alpine AS builder
WORKDIR /build

# 先拷贝 package 文件利用 Docker 层缓存
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --loglevel error

COPY . .
# 默认 API_BASE 为相对路径 /api/v1（同域部署走 nginx 反代）
# 若要跨域部署，构建时可注入：docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

# --- 运行阶段 ---
FROM nginx:1.27-alpine
LABEL maintainer="calorie-log"

# 时区 Asia/Shanghai
RUN apk add --no-cache tzdata && \
    ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

# 主 server 配置（80）
COPY nginx.conf /etc/nginx/conf.d/default.conf
# 443 模板（仅当挂载证书且设置 DOMAIN 时由 entrypoint 启用）
COPY nginx-ssl.conf /etc/nginx/_ssl.conf.tpl
# 启用 HTTPS 的 entrypoint 钩子（nginx 官方镜像会自动执行 /docker-entrypoint.d/*.sh）
COPY docker-entrypoint.d/10-enable-ssl.sh /docker-entrypoint.d/10-enable-ssl.sh
RUN chmod +x /docker-entrypoint.d/10-enable-ssl.sh

# webroot for ACME http-01 challenge
RUN mkdir -p /var/www/certbot

COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80 443
