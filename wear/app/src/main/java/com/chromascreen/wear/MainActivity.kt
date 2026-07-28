package com.chromascreen.wear

import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.chromascreen.wear.model.ChromaSettings
import com.chromascreen.wear.ui.ChromaApp
import com.chromascreen.wear.util.Haptics
import com.chromascreen.wear.util.applyImmersiveMode
import com.chromascreen.wear.util.applyScreenBrightness
import com.chromascreen.wear.util.setKeepScreenOn
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var controller: ChromaController
    private lateinit var haptics: Haptics

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        controller = ChromaController(applicationContext)
        haptics = Haptics(this)

        applyImmersiveMode()
        setKeepScreenOn(true)

        // 锁定时吞掉返回键与手表的边缘侧滑（系统会把侧滑退出转成一次返回事件）；
        // 未锁定但面板打开时，返回/侧滑先收起面板而不是退出 App。
        val backCallback = object : OnBackPressedCallback(false) {
            override fun handleOnBackPressed() {
                if (!controller.locked.value && controller.panelVisible.value) {
                    controller.hidePanel()
                }
            }
        }
        onBackPressedDispatcher.addCallback(this, backCallback)

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    controller.settings.collect { applyScreenBrightness(it.brightnessPercent) }
                }
                launch {
                    combine(controller.locked, controller.panelVisible) { locked, panel ->
                        locked || panel
                    }.collect { backCallback.isEnabled = it }
                }
            }
        }

        setContent { ChromaApp(controller, haptics) }
    }

    override fun onResume() {
        super.onResume()
        applyImmersiveMode()
        setKeepScreenOn(true)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) applyImmersiveMode()
    }

    /**
     * 带实体侧键/表冠按键的手表（华为、佳明式双键、部分 AOSP 手表）可以完全不碰屏幕操作：
     * 侧键1 锁定/解锁前的锁屏、侧键2 切色、侧键3 开关跟踪点、音量键调点位大小。
     * 锁定后所有实体键一并屏蔽，只留长按 3 秒解锁。
     */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (controller.locked.value) {
            return when (keyCode) {
                KeyEvent.KEYCODE_STEM_1,
                KeyEvent.KEYCODE_STEM_2,
                KeyEvent.KEYCODE_STEM_3,
                KeyEvent.KEYCODE_VOLUME_UP,
                KeyEvent.KEYCODE_VOLUME_DOWN,
                -> true
                else -> super.onKeyDown(keyCode, event)
            }
        }
        return when (keyCode) {
            KeyEvent.KEYCODE_STEM_1 -> {
                controller.lock()
                true
            }
            KeyEvent.KEYCODE_STEM_2 -> {
                controller.cycleColor()
                haptics.tick()
                true
            }
            KeyEvent.KEYCODE_STEM_3 -> {
                controller.toggleMarkers()
                haptics.tick()
                true
            }
            KeyEvent.KEYCODE_VOLUME_UP -> {
                controller.adjustSize(ChromaSettings.SIZE_STEP_DP)
                true
            }
            KeyEvent.KEYCODE_VOLUME_DOWN -> {
                controller.adjustSize(-ChromaSettings.SIZE_STEP_DP)
                true
            }
            else -> super.onKeyDown(keyCode, event)
        }
    }
}
