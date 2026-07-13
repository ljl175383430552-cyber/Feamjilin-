# 部署指南（腾讯云服务器）

本项目是「云同步提词器」：React 前端 + Express 后端（含 SSE 实时同步），**单个 Node 进程**即可同时托管网页和 API，无需数据库。

## 项目结构速览

- `server/index.ts` — 后端：房间 API、SSE 广播、托管 `dist/` 静态文件，默认监听 `8787` 端口（可用环境变量 `PORT` 修改）
- `src/` — 前端源码，`npm run build` 后输出到 `dist/`
- `data/rooms.json` — 运行时自动生成，保存共享房间数据（目录可用环境变量 `DATA_DIR` 修改）
- 无需配置任何密钥或第三方服务；`.env.example` 里的 `GEMINI_API_KEY` 是模板遗留，**本项目用不到，可忽略**

## 部署步骤（Ubuntu / Debian / TencentOS 通用）

### 1. 安装 Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
# TencentOS / OpenCloudOS / CentOS 系用：
# curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo yum install -y nodejs
node -v
```

### 2. 获取代码并构建

```bash
cd /opt
sudo git clone https://github.com/ljl175383430552-cyber/Feamjilin-.git teleprompter
cd teleprompter
# 若功能分支尚未合并到 main，需要：
# sudo git checkout cursor/teleprompter-sync-75ed
sudo npm install
sudo npm run build
```

### 3. 用 pm2 常驻运行

```bash
sudo npm install -g pm2
cd /opt/teleprompter
pm2 start "npm start" --name teleprompter
pm2 save
pm2 startup   # 按提示执行输出的命令，实现开机自启
```

验证：`curl http://localhost:8787` 应返回 HTML。

### 4. 开放端口（关键，最容易漏）

腾讯云默认防火墙会拦截非常用端口，需要两处都放行：

1. **腾讯云控制台 → 该服务器 → 安全组**：添加入站规则，放行 TCP `8787`（如果走 nginx 则放行 `80`/`443`）
2. **服务器内部防火墙**（如启用了 ufw/firewalld）：

```bash
sudo ufw allow 8787/tcp          # ufw
# 或
sudo firewall-cmd --permanent --add-port=8787/tcp && sudo firewall-cmd --reload
```

完成后浏览器访问 `http://服务器公网IP:8787` 即可使用。

### 5.（可选，推荐）nginx 反向代理 + 80 端口

```nginx
server {
    listen 80;
    server_name 你的域名或公网IP;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # SSE 实时同步必需：关闭缓冲、拉长超时，否则观看端收不到推送
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
        proxy_set_header Connection '';
    }
}
```

> **注意**：`/api/rooms/:id/events` 是 SSE 长连接，反向代理必须关闭缓冲（`proxy_buffering off`）并调大 `proxy_read_timeout`，这是本项目部署唯一的特殊要求。

如有域名，可再用 certbot 配置 HTTPS（PWA 与剪贴板功能在 HTTPS 下体验更好）。

## 更新版本

```bash
cd /opt/teleprompter
sudo git pull
sudo npm install
sudo npm run build
pm2 restart teleprompter
```

## 验收清单

- [ ] 浏览器打开首页，能新建文稿并进入提词播放
- [ ] 编辑页能「创建共享房间」，出现二维码和链接
- [ ] 用手机打开分享链接，能看到稿件内容
- [ ] 电脑改稿点「同步到所有设备」，手机端立刻更新并有提示音
- [ ] `pm2 restart teleprompter` 后房间仍在（`data/rooms.json` 持久化生效）
