# 线上部署手册（单机 ECS / Docker / 公网 IP）

适用场景：一台 2C8G 的云服务器（阿里云 ECS / 腾讯云 CVM / AWS Lightsail 等），
只用公网 IP 访问（不带域名、不上 HTTPS）。方案：

```
┌──────────────────────────────────────────────────────┐
│  ECS 公网 IP :80                                      │
│      │                                                │
│      ▼                                                │
│  ┌─────────┐     http://app:8080     ┌─────────────┐  │
│  │  nginx  │ ──────────────────────► │  spring app │  │
│  │  (80)   │                         │   (8080)    │  │
│  └─────────┘                         └──────┬──────┘  │
│      │  静态 SPA                            │          │
│      │                                      │          │
│      ▼                              ┌───────┴───────┐  │
│  index.html + /assets/*             │  postgres     │  │
│                                     │  redis        │  │
│                                     └───────────────┘  │
│                                     （无公网端口）       │
└──────────────────────────────────────────────────────┘
```

---

## 1. 前置准备

### 1.1 ECS 配置
- **OS**：Ubuntu 22.04 LTS（或 Debian 12；CentOS 亦可，命令略调整）
- **规格**：2 vCPU / 8GB RAM（JVM 默认给 60% 堆 ≈ 4.8GB，够 Spring Boot + postgres + redis + nginx）
- **磁盘**：40GB 起步（Docker 镜像 ~2GB + postgres 数据）
- **安全组入方向**：
  - 80/TCP 开放（给浏览器）
  - 22/TCP 开放（给你 SSH）
  - 其他一律拒绝（postgres 5432 / redis 6379 **不要**开公网）

### 1.2 本机准备
- 一份最新 repo（本文档所在仓库）可以 `git clone`
- 生成两个强随机字符串（贴到 `.env`）：
  ```bash
  openssl rand -base64 24       # POSTGRES_PASSWORD / REDIS_PASSWORD 用
  openssl rand -base64 64 | tr -d '\n'   # JWT_SECRET 用
  ```

---

## 2. ECS 初始化

```bash
# SSH 登录
ssh root@<ECS_PUBLIC_IP>

# 安装 Docker + Compose v2（一条命令搞定）
curl -fsSL https://get.docker.com | sh

# 如用非 root 用户
# sudo usermod -aG docker $USER && exit   # 重新登录后生效

# 确认
docker --version
docker compose version
```

---

## 3. 拉代码 + 配置 .env

```bash
# 找个目录
cd /opt
git clone <你的仓库 URL> calorie-log
cd calorie-log

# 复制环境变量样板并编辑
cp .env.prod.example .env
nano .env    # 把三个 REPLACE_ME 填为前面 openssl 生成的值
```

**`.env` 检查清单**
- `POSTGRES_PASSWORD` — 强密码，≥16 位
- `REDIS_PASSWORD` — 可选但建议设，≥16 位
- `JWT_SECRET` — 必填，≥64 字符（HS512 要求）
- 其他 API Key 留空即可（用不到的模块自动走 Mock）

---

## 4. 启动

```bash
# 首次构建 + 启动（后端 + 前端都要 build，约 3-5 分钟）
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

# 跟日志看启动进度
docker compose -f docker-compose.prod.yml logs -f app

# 看到 `Started CalorieLogApplication in X.XXX seconds` 即 OK
# 然后 Ctrl+C 退出 logs
```

### 4.1 验证
```bash
# 内部健康检查
curl -s http://localhost/api/v1/actuator/health
# 期望：403（从公网访问 /actuator 走 deny 规则）或 200（curl 的是 127.0.0.1）

# 业务接口：发验证码（mock 模式会把 code 写进返回 data）
curl -s -X POST http://localhost/api/v1/auth/send-code \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"13900000001","scene":"register"}'

# 浏览器访问：
# http://<ECS_PUBLIC_IP>
```

### 4.2 首次登录
demo 账号已通过 Flyway V7 种入数据库：
- 手机号：`18601977124`
- 密码：`Admin123!`

> **正式上线前务必删除或修改 demo 账号**。详见 §7。

---

## 5. 日常运维

```bash
# 查状态
docker compose -f docker-compose.prod.yml ps

# 看日志
docker compose -f docker-compose.prod.yml logs -f app        # 后端
docker compose -f docker-compose.prod.yml logs -f nginx      # 前端
docker compose -f docker-compose.prod.yml logs -f postgres   # 数据库

# 重启单个服务
docker compose -f docker-compose.prod.yml restart app

# 更新代码后重新部署
git pull
docker compose -f docker-compose.prod.yml up -d --build

# 停止全部（保留数据）
docker compose -f docker-compose.prod.yml down

# 停止并清空数据卷（⚠️ 会删库）
docker compose -f docker-compose.prod.yml down -v
```

### 5.1 数据备份
```bash
# pg_dump 到宿主文件
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > backup-$(date +%Y%m%d).sql

# 还原
cat backup-YYYYMMDD.sql | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

---

## 6. 排障

| 症状 | 检查 |
|------|------|
| 浏览器 502 | `docker compose ... logs app`，通常是 app 还没起好 |
| 登录 401 / JWT 相关错误 | `.env` 的 `JWT_SECRET` 是否 ≥64 字符 |
| 数据库连接失败 | `POSTGRES_PASSWORD` 是否改了但 postgres 数据卷还是旧密码 → `down -v` 重来（会丢数据） |
| 公网访问不了 | 安全组 80 端口是否开；`curl http://localhost` 本机能否通 |
| 前端空白 | nginx 镜像是否成功构建（首次 `--build`）；`docker compose ... logs nginx` |
| 文件上传 413 | `client_max_body_size` 已设 10M；若还要大，改 `calorie-log-web/nginx.conf` |

---

## 7. 上线前的收尾（重要）

1. **删除 / 改 demo 账号密码**
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
     -c "UPDATE t_user SET deleted_at = NOW() WHERE phone = '18601977124';"
   # 或直接改密码：先用 python3 -c 'import bcrypt; print(bcrypt.hashpw(b"新密码",bcrypt.gensalt(10)).decode())' 算出 hash
   # UPDATE t_user SET password_hash = '$2b$10$...' WHERE phone = '18601977124';
   ```

2. **检查 SPRING_PROFILES_ACTIVE=prod 生效**
   - `/swagger-ui.html` 应 404（prod 关了 Swagger）
   - 日志根级别 WARN、业务 INFO

3. **后续域名 + HTTPS**
   - 按本套架构，加域名 + Let's Encrypt 的步骤：
     - DNS A 记录指向 ECS
     - `calorie-log-web/nginx.conf` 加 443 server 段 + certbot volume mount
     - certbot container 签证书
   - 拍照识别 / 摄像头 API 需要 HTTPS，有域名 + 证书后可开启真机拍照

4. **定时备份 cron**
   ```
   0 3 * * * cd /opt/calorie-log && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > /opt/backups/calorie-log-$(date +\%Y\%m\%d).sql.gz
   ```

---

## 8. 资源占用预估（2C8G）

冷启动后稳定状态参考：

| 服务 | 内存 | CPU |
|------|------|-----|
| app (JVM) | 1.0-1.5GB | 空闲 <5%，请求突发 40-80% |
| postgres | 200MB | 空闲 <2% |
| redis | 20-50MB | 空闲 <1% |
| nginx | 10MB | 空闲 <1% |
| 宿主余量 | ≥5GB | 足够 |

小规模（日活 <100）绰绰有余；上量可以加带宽、扩 RAM，或把 postgres 迁到 RDS。
