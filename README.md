# KeyLedger

本地优先的 **AI API Key 账本**：记录不同 AI 工具的密钥、Base URL、模型，并一键导出 `.env` / JSON / cURL 配置格式。

## 功能框架

- 提供商预设：OpenAI / Claude / Gemini / DeepSeek / Groq / xAI / Mistral / Ollama / 自定义
- 每条记录：Key、Base URL、模型、标签、备注
- 配置模板：按提供商渲染可复制片段
- 本地存储：`localStorage`；可选主密码（PBKDF2 + AES-GCM）
- 导入 / 导出 JSON（便于备份，请自行保管）

## 本地运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 构建

```bash
npm run lint
npm run build
```

静态产物在 `dist/`。

## 发给 Codex 的部署流程

见 [`docs/CODEX_DEPLOY.md`](docs/CODEX_DEPLOY.md) —— 文档内含可直接粘贴给 Codex 执行的完整提示词。

## 安全提示

- 密钥只存在当前浏览器；清站数据即丢失（请先导出备份）
- 生产环境请使用 HTTPS
- 不要把含真实 Key 的导出文件提交到 Git
