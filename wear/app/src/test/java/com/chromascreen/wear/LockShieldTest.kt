package com.chromascreen.wear

import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performTouchInput
import com.chromascreen.wear.ui.components.LockShield
import com.chromascreen.wear.ui.components.UNLOCK_HOLD_MILLIS
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * 锁屏是这个工具最关键的一条交互：拍摄中误触会直接毁掉一条镜头，
 * 所以解锁必须“不到 3 秒绝不放行”。这里用 Compose 的虚拟时钟精确验证时序。
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LockShieldTest {

    @get:Rule
    val rule = createComposeRule()

    private var unlocked = false

    private fun setShield() {
        rule.setContent {
            LockShield(
                haptics = null,
                onUnlock = { unlocked = true },
                modifier = Modifier.testTag(SHIELD),
            )
        }
        rule.mainClock.autoAdvance = false
    }

    /** 按下后必须先让重组落地，长按计时的 LaunchedEffect 才会挂上帧时钟。 */
    private fun press() {
        rule.onNodeWithTag(SHIELD).performTouchInput { down(center) }
        rule.waitForIdle()
    }

    private fun release() {
        rule.onNodeWithTag(SHIELD).performTouchInput { up() }
        rule.waitForIdle()
    }

    @Test
    fun `轻点一下不解锁`() {
        setShield()

        press()
        rule.mainClock.advanceTimeBy(120)
        release()
        rule.mainClock.advanceTimeBy(UNLOCK_HOLD_MILLIS.toLong() * 2)

        assertFalse("轻点就解锁会导致拍摄中被误触", unlocked)
    }

    @Test
    fun `长按不足三秒不解锁`() {
        setShield()

        press()
        rule.mainClock.advanceTimeBy(UNLOCK_HOLD_MILLIS - 400L)

        assertFalse("不足 3 秒就解锁", unlocked)
    }

    @Test
    fun `长按满三秒解锁`() {
        setShield()

        press()
        rule.mainClock.advanceTimeBy(UNLOCK_HOLD_MILLIS + 300L)

        assertTrue("长按满 3 秒后应当解锁", unlocked)
    }

    @Test
    fun `中途松手后重新计时`() {
        setShield()

        press()
        rule.mainClock.advanceTimeBy(UNLOCK_HOLD_MILLIS - 500L)
        release()
        rule.mainClock.advanceTimeBy(200)

        press()
        rule.mainClock.advanceTimeBy(UNLOCK_HOLD_MILLIS - 500L)
        assertFalse("松手后必须从 0 重新计时", unlocked)

        rule.mainClock.advanceTimeBy(900)
        assertTrue(unlocked)
    }

    private companion object {
        const val SHIELD = "lock_shield"
    }
}
