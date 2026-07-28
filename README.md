# ChromaScreen

影视广告拍摄用色幕工具，含两个端：

| 端 | 目录 | 说明 |
|----|------|------|
| **手机 / 平板 / 电脑** | 仓库根目录（Vite + React） | 浏览器全屏绿幕 / 蓝幕 / 跟踪点 / 锁屏 |
| **安卓手表** | [`wear/`](wear/) | Wear OS + 国产 AOSP 手表原生 App |

手表端详细说明、侧载安装、实体键操作见 → **[wear/README.md](wear/README.md)**

---

## 手机版（Web）

**Prerequisites:** Node.js

1. `npm install`
2. （可选）设置 `.env.local` 中的 `GEMINI_API_KEY`
3. `npm run dev`

View in AI Studio: https://ai.studio/apps/9192dd79-f699-4124-bdf8-c5c2da7ac6d1

---

## 手表版（Wear）

```bash
export ANDROID_HOME=/path/to/Android/Sdk
cd wear
./gradlew assembleUniversalRelease
./scripts/install.sh          # ADB 侧载到已连接的手表
```

操作：轻点唤出菜单 → 选色 / 调跟踪点 → **锁定屏幕** → 拍摄 → **长按 3 秒解锁**。
