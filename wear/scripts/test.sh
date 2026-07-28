#!/usr/bin/env bash
# 在没有真机时，用 Robolectric JVM 测试验证核心逻辑；需要真机/模拟器时再走 install.sh。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
./gradlew :app:testUniversalDebugUnitTest "$@"
echo "✓ 全部单元测试通过（见 app/build/reports/tests/testUniversalDebugUnitTest/）"
