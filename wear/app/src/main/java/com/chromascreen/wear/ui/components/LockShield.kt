package com.chromascreen.wear.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chromascreen.wear.R
import com.chromascreen.wear.util.Haptics
import kotlinx.coroutines.delay

const val UNLOCK_HOLD_MILLIS = 3_000

/**
 * 锁屏护盾。铺满全屏并吞掉所有触摸事件（含手表的边缘侧滑），
 * 只保留“长按 3 秒解锁”这一个出口，避免拍摄中误触改参数或退出 App。
 *
 * 返回键/侧滑退出由 MainActivity 的 OnBackPressedCallback 一并拦截。
 */
@Composable
fun LockShield(
    haptics: Haptics?,
    onUnlock: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var pressed by remember { mutableStateOf(false) }
    var progress by remember { mutableFloatStateOf(0f) }
    var showHint by remember { mutableStateOf(true) }

    // 刚锁定时给一次提示就淡出，之后画面里不再有任何 UI 元素
    LaunchedEffect(Unit) {
        haptics?.confirm()
        delay(1_600)
        showHint = false
    }

    LaunchedEffect(pressed) {
        if (!pressed) {
            progress = 0f
            return@LaunchedEffect
        }
        haptics?.tick()
        var startFrame = 0L
        while (true) {
            withFrameMillis { frame ->
                if (startFrame == 0L) startFrame = frame
                progress = ((frame - startFrame).toFloat() / UNLOCK_HOLD_MILLIS).coerceIn(0f, 1f)
            }
            if (progress >= 1f) break
        }
        haptics?.success()
        onUnlock()
    }

    val hintAlpha by animateFloatAsState(
        targetValue = if (showHint || pressed) 1f else 0f,
        label = "lockHintAlpha",
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false)
                    down.consume()
                    pressed = true
                    try {
                        while (true) {
                            val event = awaitPointerEvent()
                            event.changes.forEach { it.consume() }
                            if (event.changes.none { it.pressed }) break
                        }
                    } finally {
                        pressed = false
                    }
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        if (pressed) {
            UnlockProgress(progress)
        } else if (hintAlpha > 0f) {
            BasicText(
                text = stringResource(R.string.hint_locked),
                modifier = Modifier
                    .alpha(hintAlpha * 0.55f)
                    .padding(horizontal = 20.dp),
                style = TextStyle(
                    color = Color.White,
                    fontSize = 11.sp,
                    textAlign = TextAlign.Center,
                ),
            )
        }
    }
}

@Composable
private fun UnlockProgress(progress: Float) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(56.dp)) {
                val stroke = 4.dp.toPx()
                val radius = size.minDimension / 2f - stroke / 2f
                drawCircle(
                    color = Color.Black.copy(alpha = 0.28f),
                    radius = radius,
                    style = Stroke(width = stroke),
                )
                drawArc(
                    color = Color.White,
                    startAngle = -90f,
                    sweepAngle = 360f * progress,
                    useCenter = false,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
            }
            Canvas(Modifier.size(20.dp)) { drawLockGlyph(Color.White, locked = true) }
        }
        BasicText(
            text = stringResource(R.string.hint_unlocking),
            style = TextStyle(color = Color.White.copy(alpha = 0.8f), fontSize = 10.sp),
        )
    }
}
