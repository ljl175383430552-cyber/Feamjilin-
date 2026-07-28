package com.chromascreen.wear

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.chromascreen.wear.model.ChromaColors
import com.chromascreen.wear.model.ChromaSettings
import com.chromascreen.wear.model.MarkerStyle
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ChromaControllerTest {

    private lateinit var context: Context

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("chroma_settings", Context.MODE_PRIVATE)
            .edit().clear().commit()
    }

    @Test
    fun `锁定后面板必须消失`() {
        val controller = ChromaController(context)
        controller.showPanel()
        assertTrue(controller.panelVisible.value)

        controller.lock()

        assertTrue(controller.locked.value)
        assertFalse(controller.panelVisible.value)
    }

    @Test
    fun `锁定期间不接受唤出面板的请求`() {
        val controller = ChromaController(context)
        controller.lock()

        controller.showPanel()
        controller.togglePanel()

        assertFalse("锁定时面板绝不能被唤出", controller.panelVisible.value)
    }

    @Test
    fun `解锁后恢复面板`() {
        val controller = ChromaController(context)
        controller.lock()
        controller.unlock()

        assertFalse(controller.locked.value)
        assertTrue(controller.panelVisible.value)
    }

    @Test
    fun `参数改动会落盘并在重启后恢复`() {
        val first = ChromaController(context)
        first.setColor("red")
        first.setMarkerCount(5)
        first.setMarkerStyle(MarkerStyle.BULLSEYE)
        first.adjustSize(ChromaSettings.SIZE_STEP_DP * 3)
        first.nudge(0.05f, -0.02f)
        val expected = first.settings.value

        val restarted = ChromaController(context)

        assertEquals(expected, restarted.settings.value)
    }

    @Test
    fun `恢复默认会清掉所有现场调整`() {
        val controller = ChromaController(context)
        controller.setColor("magenta")
        controller.adjustSize(40)
        controller.nudge(0.2f, 0.2f)

        controller.reset()

        assertEquals(ChromaSettings(), controller.settings.value)
    }

    @Test
    fun `实体键切色循环覆盖全部预设`() {
        val controller = ChromaController(context)
        val seen = mutableSetOf(controller.settings.value.colorId)
        repeat(ChromaColors.presets.size - 1) {
            controller.cycleColor()
            seen += controller.settings.value.colorId
        }
        assertEquals(ChromaColors.presets.size, seen.size)
    }

    @Test
    fun `跟踪点开关在关闭与单点之间切换`() {
        val controller = ChromaController(context)
        assertEquals(1, controller.settings.value.markerCount)

        controller.toggleMarkers()
        assertEquals(0, controller.settings.value.markerCount)

        controller.toggleMarkers()
        assertEquals(1, controller.settings.value.markerCount)
    }

    @Test
    fun `居中复位清零偏移`() {
        val controller = ChromaController(context)
        controller.nudge(0.1f, 0.1f)
        controller.centerMarkers()

        assertEquals(0f, controller.settings.value.offsetX, 0.0001f)
        assertEquals(0f, controller.settings.value.offsetY, 0.0001f)
    }

    @Test
    fun `面板收起时用表冠调大小才触发浮层提示`() {
        val controller = ChromaController(context)
        controller.hidePanel()
        val before = controller.sizeHudTick.value

        controller.adjustSize(ChromaSettings.SIZE_STEP_DP)

        assertTrue(controller.sizeHudTick.value > before)
    }
}
