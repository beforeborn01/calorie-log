# ============================================
# 食养记后端 - 多阶段构建
# 参考：nova 项目的 Dockerfile
#
# 注：底镜像用 jammy（Ubuntu 22.04 LTS）而非 alpine，
# 因为 eclipse-temurin:*-alpine 官方只发 amd64，
# Apple Silicon / ARM 服务器拉不到 arm64 manifest。
# jammy 为官方 multi-arch，amd64 / arm64 都可。
# ============================================

# --- 构建阶段 ---
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build

# 先拷贝 pom.xml 预下载依赖，利用 Docker layer 缓存
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    mvn dependency:go-offline -B || true

# 拷源码并打包
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn clean package -DskipTests -B && \
    mv target/*.jar /build/app.jar

# --- 运行阶段 ---
FROM eclipse-temurin:17-jre-jammy
LABEL maintainer="calorie-log"

# 时区 Asia/Shanghai + wget（供 compose 健康检查调用）+ 创建非 root 用户
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget tzdata && \
    ln -snf /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone && \
    groupadd -r app && useradd -r -g app app && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder --chown=app:app /build/app.jar app.jar

USER app

EXPOSE 8080

# 容器感知的 JVM 参数
ENV JAVA_OPTS="-XX:+UseContainerSupport \
    -XX:MaxRAMPercentage=75.0 \
    -XX:InitialRAMPercentage=50.0 \
    -XX:+UseG1GC \
    -XX:+HeapDumpOnOutOfMemoryError \
    -XX:HeapDumpPath=/tmp/heapdump.hprof \
    -Djava.security.egd=file:/dev/./urandom"

# exec 保证 SIGTERM 正确传递给 JVM（优雅停机）
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
