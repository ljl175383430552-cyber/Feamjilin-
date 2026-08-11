# KeyLedger — 发给 Codex 的完整交接包说明

把本仓库（或 zip 包）交给 Codex 时，**连同下方提示词一起粘贴**。

---

## 一键提示词（复制给 Codex）

```text
你收到的是 KeyLedger 完整前端工程（Vite + React + TypeScript + Tailwind）。

## 项目是什么
本地优先的 AI API Key 账本网页工具：
- 记录不同 AI 工具的 API Key / Base URL / 模型 / 备注 / 标签
- 按提供商导出配置片段（.env / JSON / cURL）
- 数据存浏览器 localStorage；可选主密码（PBKDF2 + AES-GCM）
- 无后端、无数据库

## 技术栈与入口
- 包管理：npm（有 package-lock.json）
- 开发：npm install && npm run dev  → http://localhost:5188
- 质量：npm run lint && npm run build → 产物 dist/
- 入口：index.html → src/main.tsx → src/App.tsx
- 设计：Cool Grey Neumorphism（Soft UI），token 在 src/index.css

## 关键目录
- src/App.tsx                 主界面（门禁 / 列表 / 详情 / 编辑弹层）
- src/hooks/useVault.ts       保险库状态与持久化
- src/lib/storage.ts          localStorage 读写 / 导入导出
- src/lib/crypto.ts           AES-GCM 加解密
- src/data/presets.ts         提供商预设与配置模板
- src/types.ts                类型
- src/index.css               Neumorphism design tokens 与工具类
- docs/CODEX_DEPLOY.md        部署流程
- vercel.json / netlify.toml  静态托管配置

## 设计系统约束（必须遵守）
- 背景与卡片同色：#E0E5EC（禁止白底卡片）
- 深度靠双阴影：extruded / inset（禁止硬边框定义形状）
- 字体：Plus Jakarta Sans（标题）+ DM Sans（正文）
- 圆角：卡片 32px，按钮/输入 16px
- Accent：#6C63FF 仅用于主 CTA / focus；成功色 #38B2AC
- 交互：300ms ease-out；hover 微抬升；active 压入阴影
- 触摸目标 ≥ 44px；focus ring 可见

## 你要做的事
1. 先 npm ci || npm install，确认 npm run lint 与 npm run build 通过
2. 按用户后续修改需求改代码（功能 / UI / 部署均可）
3. 改完必须再跑 lint + build
4. 不要把真实 API Key 写进仓库；不要引入不必要后端
5. 用中文简报说明：改了什么、怎么本地打开、如何部署

## 本地打开
npm install
npm run dev
# http://localhost:5188

## 部署
详见 docs/CODEX_DEPLOY.md；静态产物目录 dist/
```

---

## zip 包内容说明

打包排除：
- `node_modules/`
- `dist/`
- `.git/`
- 日志与本地环境文件

保留：
- 全部源码、`package-lock.json`、文档、静态托管配置、`.env.example`
