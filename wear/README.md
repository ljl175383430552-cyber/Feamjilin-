# 腕上绿幕 · ChromaWatch

面向影视广告拍摄的 **安卓手表色幕工具**：全屏绿/蓝/红/白幕 + 专业跟踪点 + 锁屏防误触。

操作逻辑对齐手机版 [Feamjilin-/ChromaScreen](https://github.com/ljl175383430552-cyber/Feamjilin-)：一键锁定画面，**长按 3 秒**解锁。

---

## 为什么用手表做绿幕

| 场景 | 手表的优势 |
|------|-----------|
| 手部 / 手腕特写抠像 | 直接戴在演员手腕上，幕布跟手走 |
| 道具 / 产品遮挡 | 可贴在产品背面当便携幕布 |
| 跟焦 / 跟踪参考 | 中间棋盘点可作为后期解算锚点 |
| 现场快速出幕 | 开机即用，比布幕轻便 |

---

## 功能一览

- **色幕**：数字绿 `#00FF00`、影视绿 `#00B140`、数字蓝、影视蓝、红、白、黑、品红
- **跟踪点**：棋盘 / 同心环 / 十字 / 实心点；数量 0 / 1 / 3 / 5；尺寸 6~160 dp（面板同步显示物理毫米）
- **锁屏**：点「锁定屏幕」→ 面板收起、拦截触摸 / 返回 / 边缘侧滑；**长按 3 秒**显示进度环后解锁
- **亮度**：改窗口背光，不叠半透明黑，保证色幕 RGB 纯度（抠像友好）
- **表冠 / 实体键**：面板收起时表冠调点位大小；STEM_1 锁定、STEM_2 切色、STEM_3 开关跟踪点
- **适配**：圆形 / 方形 / 带下巴表盘；沉浸全屏常亮；minSdk 23 覆盖 Wear OS 2~5 与多数国产 AOSP 手表

---

## 怎么装到安卓手表里

手表不像手机有应用商店那么方便，推荐下面三条路径，按设备选一条即可。

### 路径 A · USB / Wi‑Fi 侧载（推荐，适配所有安卓手表）

适用：华为、小米、OPPO、一加、三星 Galaxy Watch（开发者模式）、国产 AOSP 手表等。

1. **手表打开开发者选项**
   - 设置 → 关于手表 → 连续点「版本号」7 次
   - 开发者选项里打开 **ADB 调试**（有的还要开「通过 Wi‑Fi 调试」）
2. **电脑装好 ADB**（Android SDK platform-tools）
3. **连接手表**
   ```bash
   # USB（多数手表用磁吸座 / 厂家转接线）
   adb devices

   # 或 Wi‑Fi：先在手表上看 IP，例如 192.168.1.88
   adb connect 192.168.1.88:5555
   ```
4. **安装 APK**
   ```bash
   # 仓库内一键脚本
   ./wear/scripts/install.sh

   # 或手动
   adb install -r wear/app/build/outputs/apk/universal/release/app-universal-release.apk
   ```
5. 手表应用列表里找到 **「腕上绿幕」** 打开即可。

> `universal` 风味把 `android.hardware.type.watch` 标成 **非必需**，所以非 Wear OS 的国产安卓手表也能装。

### 路径 B · 手机伴侣 App 侧载

部分手表（三星 Galaxy Wearable、华为运动健康「调试」模式）允许从配对手机推送 APK。把 `app-universal-release.apk` 传到手机后，按厂家文档推送到手表。

### 路径 C · Google Play（仅 Wear OS 官方渠道）

上传 **`playwear`** 风味 APK / AAB。该风味把 `watch` 特性标为必需，满足 Play Console 的 Wear 表单要求。

```bash
cd wear && ./gradlew assemblePlaywearRelease
# 产物：app/build/outputs/apk/playwear/release/app-playwear-release.apk
```

---

## 现场操作流程

```
打开 App
  → 轻点屏幕唤出菜单
  → 选色幕 / 调跟踪点大小与数量 / 拖动或方向键微调位置
  → 点「锁定屏幕」（或按表侧键 STEM_1）
  → 拍摄（画面全是色幕+跟踪点，无任何 UI）
  → 长按屏幕 3 秒解锁 → 继续调参或退出
```

面板收起时：

- **表冠 / 旋转边框**：调节跟踪点大小（屏幕底部短暂显示 dp · mm）
- **音量键上下**：同样调节跟踪点大小
- **轻点**：重新唤出菜单

锁定后：所有触摸、实体键、返回键、边缘侧滑一律屏蔽，只留长按 3 秒解锁。

---

## 工程结构

```
wear/
├── app/src/main/
│   ├── AndroidManifest.xml          # 双风味 watch 特性占位符
│   └── java/com/chromascreen/wear/
│       ├── MainActivity.kt          # 全屏常亮、实体键、返回拦截
│       ├── ChromaController.kt      # 全局状态 + SharedPreferences 落盘
│       ├── model/Chroma.kt          # 色幕预设、点位布局、参数边界
│       ├── data/SettingsStore.kt
│       ├── ui/ChromaApp.kt          # 主界面编排
│       ├── ui/components/
│       │   ├── TrackingMarkers.kt   # Canvas 矢量跟踪点
│       │   ├── LockShield.kt        # 长按 3 秒解锁护盾
│       │   ├── ControlPanel.kt      # 圆形小屏参数面板
│       │   └── Widgets.kt           # 无 Material Icons 的自绘控件
│       └── util/                    # 沉浸式、亮度、震动
├── scripts/install.sh               # ADB 侧载脚本
└── README.md
```

**技术选型简述**

| 选择 | 原因 |
|------|------|
| Kotlin + Jetpack Compose | 手表 UI 简单，Compose 对圆形裁切 / 旋钮输入支持好 |
| 不引入 Wear 专用 Material | 减包体；自绘图标，release APK ≈ **909 KB** |
| SharedPreferences | 手表存储紧，参数量少，无需 DataStore |
| 窗口亮度而非叠黑 | 保证抠像色值纯净 |
| `configChanges` 拦配置变化 | Activity 不重建，拍摄中不断电不闪屏 |

---

## 本地编译

```bash
# 需要 JDK 17+ 与 Android SDK（API 34）
export ANDROID_HOME=/path/to/Android/Sdk

cd wear
./gradlew assembleUniversalRelease   # 侧载用（推荐）
./gradlew assemblePlaywearRelease    # Play 用
./gradlew testUniversalDebugUnitTest # 26 个 JVM 单测
```

产物：

| 风味 | 用途 | APK |
|------|------|-----|
| `universalRelease` | USB/Wi‑Fi 侧载、国产手表 | `app/build/outputs/apk/universal/release/` |
| `playwearRelease` | Google Play Wear 表单 | `app/build/outputs/apk/playwear/release/` |

CI：推送本分支或打 `v*` tag 时，GitHub Actions 会自动打出两个 release APK 并挂到 Artifact / Release。

---

## 与手机版的对应关系

| 手机版 ChromaScreen | 手表版 ChromaWatch |
|---------------------|--------------------|
| 双击唤出设置按钮 | 轻点唤出面板 |
| 锁定后长按约 5 秒解锁 | 长按 **3 秒**解锁（手表操作更短更稳） |
| 跟踪点可拖动 | 中心点可拖；另提供方向微调（±1% 屏宽） |
| 全屏 API / iOS 加主屏 | 系统栏沉浸 + 常亮，无浏览器壳 |

---

## 许可

与仓库其余部分保持一致。拍摄现场请遵守当地法规与剧组安全规范。
