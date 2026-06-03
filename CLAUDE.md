# calorie-log

## 生产部署（ECS）
- 生产环境就是 `bcappandgame.com`（公网 115.190.210.138），跑在一台火山云 ECS 上。
- SSH 登录：本机别名 `sshmeet`，即 `ssh -i /Users/bc/program/volc/volc-meet.pem root@115.190.210.138`
  （非交互 shell 里别名不可用，直接用完整 `ssh -i ... root@115.190.210.138` 命令）。
- 仓库在 ECS 上路径：`/root/calorie-log`，跟踪 `origin/main`。
- 部署方式：`./scripts/deploy.sh update`（= `git pull --ff-only` + `docker compose -f docker-compose.prod.yml up -d --build`）。
- 这台 ECS 上同时跑了多个项目（budget / meet / up / sports / novel 等），共用一个外部 docker 网络 `bc-edge` 做同域名反代。

## ⚠️ Docker 网络别名冲突陷阱（bc-edge）
calorie-log 的 nginx 同时接 `calorie-log_default` 和共享网络 `bc-edge`。budget 项目的 compose 服务名也叫 `app`，
Docker 会自动把服务名注册成网络别名，于是 `bc-edge` 上的 `app` 会指向 budget 容器。nginx 反代若直接写
`proxy_pass http://app:8080` 会被解析到 budget → calorie-log 的 `/api` 全部 404/401（表现为登录返回
`40100 未登录或登录已过期`）。

约定：calorie-log nginx 一律用唯一别名 **`clog-app`**（在 `docker-compose.prod.yml` 的 app 服务上声明），
不要用 `app`。新增需要反代到本项目后端的 location 时同样用 `clog-app:8080`。
