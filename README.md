# 食养记 (Calorie Log)

面向健身人群的饮食记录与营养分析应用。

## 仓库结构

```
calorie-log/
├── calorie-log-server/   # Spring Boot 3.x 后端（含 Dockerfile）
├── calorie-log-web/      # React + Vite 网页端
├── calorie-log-app/      # React Native 移动端
├── docker-compose.yml    # postgres + redis + app 一键启动
├── .env.example          # compose 环境变量模板
├── architecture-v1.md    # 架构设计文档
├── plan-v1.md            # 开发计划文档
└── prd-v1.md             # 产品需求文档
```

## 部署方式：Docker（推荐）

### 一键启动全部服务
```bash
cp .env.example .env           # 按需改 JWT_SECRET / DB 密码
docker compose up -d --build   # 构建并启动 postgres + redis + app
docker compose logs -f app     # 跟踪应用日志（Flyway 迁移 + 启动）
```
- 应用：http://localhost:8080
- Swagger UI（dev）：http://localhost:8080/swagger-ui.html
- 健康检查：http://localhost:8080/actuator/health

### 仅启动依赖（IDE 跑 Spring Boot）
```bash
docker compose up -d postgres redis
cd calorie-log-server
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### 停止 / 清理
```bash
docker compose down       # 保留数据卷
docker compose down -v    # 连同 postgres-data / redis-data 一起删
```

## 本地原生开发（非 Docker）

### 环境要求
- JDK 17+
- PostgreSQL 16
- Redis 7.x
- Node.js 20+

### 启动后端
```bash
cd calorie-log-server
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

### 启动网页端
```bash
cd calorie-log-web
npm install
npm run dev
```

### 启动移动端
```bash
cd calorie-log-app
npm install
# iOS: cd ios && bundle install && bundle exec pod install && cd ..
npx react-native start
```

## 文档
- [产品需求 PRD](./prd-v1.md)
- [系统架构](./architecture-v1.md)
- [开发计划](./plan-v1.md)
