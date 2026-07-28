package com.chromascreen.wear

import com.chromascreen.wear.model.ChromaColors
import com.chromascreen.wear.model.ChromaSettings
import com.chromascreen.wear.model.markerLayout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

class ChromaSettingsTest {

    @Test
    fun `点位大小被夹在合法区间内`() {
        assertEquals(
            ChromaSettings.MAX_SIZE_DP,
            ChromaSettings(markerSizeDp = 9_999).coerced().markerSizeDp,
        )
        assertEquals(
            ChromaSettings.MIN_SIZE_DP,
            ChromaSettings(markerSizeDp = -20).coerced().markerSizeDp,
        )
    }

    @Test
    fun `亮度不会被调到全黑导致找不回界面`() {
        val coerced = ChromaSettings(brightnessPercent = 0).coerced()
        assertEquals(ChromaSettings.MIN_BRIGHTNESS, coerced.brightnessPercent)
        assertTrue(coerced.brightnessPercent > 0)
    }

    @Test
    fun `跟踪点偏移不会被推出屏幕外`() {
        val coerced = ChromaSettings(offsetX = 3f, offsetY = -3f).coerced()
        assertEquals(ChromaSettings.MAX_OFFSET, coerced.offsetX, 0.0001f)
        assertEquals(-ChromaSettings.MAX_OFFSET, coerced.offsetY, 0.0001f)
    }

    @Test
    fun `非法点位数量会吸附到最近的合法档位`() {
        assertEquals(5, ChromaSettings(markerCount = 6).coerced().markerCount)
        // 正好在两档中间时取较小档：点位越少越不容易在小屏上互相干扰
        assertEquals(3, ChromaSettings(markerCount = 4).coerced().markerCount)
        assertEquals(1, ChromaSettings(markerCount = 2).coerced().markerCount)
        assertTrue(ChromaSettings().coerced().markerCount in ChromaSettings.MARKER_COUNTS)
    }

    @Test
    fun `单点布局落在屏幕正中`() {
        val (x, y) = markerLayout(count = 1, offsetX = 0f, offsetY = 0f).single()
        assertEquals(0.5f, x, 0.0001f)
        assertEquals(0.5f, y, 0.0001f)
    }

    @Test
    fun `多点阵列以中心点为基准整体平移`() {
        val base = markerLayout(5, 0f, 0f)
        val moved = markerLayout(5, 0.1f, -0.05f)
        assertEquals(base.size, moved.size)
        base.zip(moved).forEach { (b, m) ->
            assertEquals(0.1f, m.first - b.first, 0.0001f)
            assertEquals(-0.05f, m.second - b.second, 0.0001f)
        }
    }

    @Test
    fun `点位环绕中心分布且不超出圆形表盘可视区`() {
        listOf(3, 5).forEach { count ->
            markerLayout(count, 0f, 0f).forEach { (x, y) ->
                val distance = abs(x - 0.5f) + abs(y - 0.5f)
                assertTrue("count=$count 的点位越界: ($x, $y)", distance < 0.45f)
            }
        }
    }

    @Test
    fun `关闭跟踪点时不产生任何点位`() {
        assertTrue(markerLayout(0, 0f, 0f).isEmpty())
    }

    @Test
    fun `色幕预设可循环切换且首尾相接`() {
        var id = ChromaColors.presets.first().id
        repeat(ChromaColors.presets.size) { id = ChromaColors.nextId(id) }
        assertEquals(ChromaColors.presets.first().id, id)
        assertNotEquals(
            ChromaColors.presets.first().id,
            ChromaColors.nextId(ChromaColors.presets.first().id),
        )
    }

    @Test
    fun `未知色幕 id 回退到默认绿幕而不是崩溃`() {
        assertEquals(ChromaColors.presets.first(), ChromaColors.byId("不存在的颜色"))
    }
}
