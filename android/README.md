# Clock（安卓锁屏倒计时应用）

一个简单的 Android 应用：

1. 打开软件后开始 **30 秒倒计时**，期间可以在输入框中填写锁定后要显示的内容；
2. 倒计时结束后 **锁定屏幕**：全屏黑色遮罩，点击、滑动等所有触摸操作均无效，返回键也被屏蔽，屏幕保持常亮并显示你预先填写的内容（未填写则显示"屏幕已锁定"）；
3. **长按屏幕 5 秒** 即可解锁（按住时底部显示进度条，中途松手则取消），解锁后可点击"重新开始倒计时"再次使用。

## 构建

需要 JDK 17+ 和 Android SDK（`compileSdk 34`）。设置好 `ANDROID_HOME` 环境变量后执行：

```bash
cd android
./gradlew :app:assembleDebug
```

生成的 APK 位于 `app/build/outputs/apk/debug/app-debug.apk`，安装到手机即可使用：

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

- 最低支持 Android 7.0（API 24）
- 语言：Kotlin，无第三方依赖（仅 AndroidX 基础库）

## 说明

- "锁定"是应用内的全屏遮罩锁定（Home 键 / 系统手势仍由系统控制，普通应用无法完全拦截）。如需更强的锁定效果，可在系统设置中开启"屏幕固定"（Screen Pinning）配合使用。
- 长按解锁的判定为：手指按住不动或移动均可，只要不抬起、持续 5 秒即解锁；使用第二根手指触摸会重置计时。
