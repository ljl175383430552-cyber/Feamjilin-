package com.chromascreen.wear.util

import android.app.Activity
import android.view.View
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * 沉浸式全屏：手表系统会在顶部叠一层时间/图标，拍摄时会进画面，必须隐藏系统栏。
 * 同时关闭 decorFitsSystemWindows，让色幕铺到圆形表盘的物理边缘（含挖孔与“下巴”）。
 */
fun Activity.applyImmersiveMode() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    WindowInsetsControllerCompat(window, window.decorView).apply {
        hide(WindowInsetsCompat.Type.systemBars())
        systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }
    @Suppress("DEPRECATION")
    window.decorView.systemUiVisibility = (
        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )
}

fun Activity.setKeepScreenOn(keepOn: Boolean) {
    if (keepOn) {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    } else {
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }
}

/**
 * 用窗口亮度覆盖而不是叠一层半透明黑：叠黑会污染 RGB 值，抠像时绿幕不再是纯 #00FF00。
 * 窗口亮度只改背光，色值保持数字纯色。
 */
fun Activity.applyScreenBrightness(percent: Int) {
    window.attributes = window.attributes.apply {
        screenBrightness = (percent.coerceIn(1, 100) / 100f)
    }
}

@Composable
fun isRoundScreen(): Boolean = LocalConfiguration.current.isScreenRound
