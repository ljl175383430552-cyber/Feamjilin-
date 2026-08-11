# KeyLedger — Codex 可执行部署流程

把下面整段提示词发给 Codex（或同类 coding agent）。目标：在当前仓库构建并部署 **KeyLedger** 静态站点。

---

## 发给 Codex 的提示词（复制即用）

```text
你是部署执行代理。请严格按顺序完成 KeyLedger（AI API Key 本地账本）的构建与部署，不要改产品逻辑，除非构建失败必须修。

## 项目事实
- 技术栈：Vite + React + TypeScript + Tailwind
- 类型：纯前端静态站；密钥只存浏览器 localStorage（可选 AES-GCM）
- 无后端、无数据库、不需要 GEMINI_API_KEY
- 本地开发：npm install && npm run dev（端口 5188）
- 生产构建：npm run build → 产出 dist/

## 执行步骤

### 1) 环境检查
- 确认 Node.js >= 20
- 在仓库根目录执行：node -v && npm -v

### 2) 安装与质量门禁
```bash
npm ci || npm install
npm run lint
npm run build
```
- lint / build 任一失败：只做最小修复后重跑，直到通过
- 构建成功后确认存在 dist/index.html

### 3) 选择部署目标（按优先级自动选择第一个可用）
A. 已登录 Vercel CLI → 用 Vercel
B. 已登录 Netlify CLI → 用 Netlify
C. 已登录 Cloudflare Wrangler 且可 Pages → 用 Cloudflare Pages
D. 以上都不可用 → 输出「本地预览」方案并启动 preview，同时生成可手工上传的产物说明

### 4A) Vercel
```bash
npx vercel --yes --prod
```
- 构建命令：npm run build
- 输出目录：dist
- Framework Preset：Vite

### 4B) Netlify
```bash
npx netlify deploy --prod --dir=dist
```
若需首次建站：
```bash
npx netlify sites:create --name keyledger
npx netlify deploy --prod --dir=dist
```

### 4C) Cloudflare Pages
```bash
npx wrangler pages deploy dist --project-name=keyledger
```

### 4D) 本地预览（无云账号时）
```bash
npm run preview -- --host 0.0.0.0 --port 4173
```
并说明：将 dist/ 整目录上传到任意静态托管（Nginx / OSS / GitHub Pages / 对象存储静态网站）。

### 5) 安全与验收清单（部署后必须自检）
- [ ] 打开站点首页可见品牌名 KeyLedger
- [ ] 可创建一条 OpenAI/Claude/Gemini 记录
- [ ] 详情页可切换 .env / JSON 等配置格式并复制
- [ ] 刷新页面后数据仍在（localStorage）
- [ ] 若启用主密码：锁定后再解锁成功
- [ ] 站点为 HTTPS（生产环境）
- [ ] 不要把真实 API Key 提交进 git
- [ ] 不要在服务端日志打印密钥

### 6) 回传结果格式
完成后用中文简报：
1. 使用的部署平台
2. 生产 URL
3. 构建命令与产物目录
4. 验收结果（通过/失败项）
5. 若失败：精确报错与你已尝试的修复
```

---

## 人工快速路径（不等 Codex）

```bash
npm install
npm run build
npx vercel --prod
# 或
npx netlify deploy --prod --dir=dist
```

## Nginx 示例

```nginx
server {
  listen 80;
  server_name keyledger.example.com;
  root /var/www/keyledger/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy no-referrer;
}
```

## 注意

- KeyLedger **不适合**把密钥同步到云端；当前设计刻意无后端。
- 若后续要做多端同步，应另开分支，使用端到端加密后再谈账号体系。
