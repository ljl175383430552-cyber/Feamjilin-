package com.chromascreen.wear

import android.content.Context
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.test.core.app.ApplicationProvider
import com.chromascreen.wear.ui.ChromaApp
import com.chromascreen.wear.ui.components.UNLOCK_HOLD_MILLIS
import com.chromascreen.wear.util.Haptics
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** 覆盖“轻点唤出菜单 → 一键锁定 → 长按 3 秒解锁”这条主链路。 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ChromaAppTest {

    @get:Rule
    val rule = createComposeRule()

    private lateinit var context: Context
    private lateinit var controller: ChromaController

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("chroma_settings", Context.MODE_PRIVATE).edit().clear().commit()
        controller = ChromaController(context)
    }

    /**
     * 冻结虚拟时钟：面板有 8 秒无操作自动隐藏，若让测试时钟自由推进，
     * waitForIdle 会把这 8 秒一次性走完，刚唤出的面板又被自动收起。
     */
    private fun launchApp() {
        rule.setContent { ChromaApp(controller, Haptics(context)) }
        rule.mainClock.autoAdvance = false
    }

    /** 让状态流的收集与重组落地；推进量远小于 8 秒，不会误触发面板自动隐藏。 */
    private fun settle(millis: Long = 120L) {
        rule.mainClock.advanceTimeBy(millis)
        rule.waitForIdle()
    }

    @Test
    fun `轻点屏幕唤出面板并能一键锁定`() {
        controller.hidePanel()
        launchApp()

        rule.onRoot().performClick()
        settle()
        assertTrue("轻点应当唤出参数面板", controller.panelVisible.value)

        // 直接触发按钮的点击语义动作：面板是纵向滚动列表，锁定按钮可能落在视口之外，
        // 而冻结时钟下 performScrollTo 的滚动动画无法完成。
        rule.onNodeWithText(context.getString(R.string.panel_lock))
            .performSemanticsAction(SemanticsActions.OnClick)
        settle()

        assertTrue(controller.locked.value)
        assertFalse("锁定后面板必须收起，画面里不能留 UI", controller.panelVisible.value)
    }

    @Test
    fun `锁定后轻点不会唤出面板`() {
        controller.lock()
        launchApp()

        repeat(3) {
            rule.onRoot().performClick()
            settle()
        }

        assertTrue(controller.locked.value)
        assertFalse(controller.panelVisible.value)
    }

    @Test
    fun `锁定后长按三秒恢复操作`() {
        controller.lock()
        launchApp()

        rule.onRoot().performTouchInput { down(center) }
        settle()
        rule.mainClock.advanceTimeBy(UNLOCK_HOLD_MILLIS - 500L)
        assertTrue("不足 3 秒不能解锁", controller.locked.value)

        rule.mainClock.advanceTimeBy(900)
        rule.waitForIdle()

        assertFalse(controller.locked.value)
        assertTrue("解锁后应直接回到面板", controller.panelVisible.value)
    }
}
