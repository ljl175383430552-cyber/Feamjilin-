#!/usr/bin/env bash
# 把腕上绿幕 APK 侧载到已连接的安卓手表 / 模拟器。
# 用法：
#   ./wear/scripts/install.sh              # 装 release，没有就现编
#   ./wear/scripts/install.sh --debug      # 装 debug
#   ./wear/scripts/install.sh --build-only # 只编译不安装
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLAVOR="universal"
BUILD_TYPE="release"
BUILD_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --debug) BUILD_TYPE="debug" ;;
    --build-only) BUILD_ONLY=1 ;;
    --playwear) FLAVOR="playwear" ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
  esac
done

APK="$ROOT/app/build/outputs/apk/${FLAVOR}/${BUILD_TYPE}/app-${FLAVOR}-${BUILD_TYPE}.apk"
TASK="assemble$(echo "${FLAVOR:0:1}" | tr '[:lower:]' '[:upper:]')${FLAVOR:1}$(echo "${BUILD_TYPE:0:1}" | tr '[:lower:]' '[:upper:]')${BUILD_TYPE:1}"

if [[ ! -f "$APK" ]]; then
  echo "→ 未找到 $APK，开始编译 ($TASK)…"
  (cd "$ROOT" && ./gradlew ":app:$TASK")
fi

if [[ ! -f "$APK" ]]; then
  echo "✗ 编译后仍找不到 APK" >&2
  exit 1
fi

SIZE=$(du -h "$APK" | awk '{print $1}')
echo "→ APK: $APK ($SIZE)"

if [[ "$BUILD_ONLY" -eq 1 ]]; then
  echo "✓ 仅编译完成"
  exit 0
fi

if ! command -v adb >/dev/null 2>&1; then
  if [[ -n "${ANDROID_HOME:-}" && -x "$ANDROID_HOME/platform-tools/adb" ]]; then
    export PATH="$ANDROID_HOME/platform-tools:$PATH"
  else
    echo "✗ 找不到 adb。请安装 Android SDK platform-tools，或设置 ANDROID_HOME。" >&2
    exit 1
  fi
fi

DEVICES=$(adb devices | awk 'NR>1 && $2=="device" {print $1}')
if [[ -z "$DEVICES" ]]; then
  cat >&2 <<'EOF'
✗ 没有已连接的设备。

请先：
  1. 手表打开「开发者选项 → ADB 调试」
  2. USB 连接，或：adb connect <手表IP>:5555
  3. adb devices 能看到 device 状态后再重试
EOF
  exit 1
fi

echo "→ 目标设备："
echo "$DEVICES" | sed 's/^/  /'

adb install -r "$APK"
echo "✓ 安装完成。在手表应用列表打开「腕上绿幕」。"
echo "  提示：拍摄前点一次「锁定屏幕」；长按 3 秒解锁。"
