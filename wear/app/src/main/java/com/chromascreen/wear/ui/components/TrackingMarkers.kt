package com.chromascreen.wear.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.awaitTouchSlopOrCancellation
import androidx.compose.foundation.gestures.drag
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.chromascreen.wear.model.ChromaSettings
import com.chromascreen.wear.model.MarkerStyle
import com.chromascreen.wear.model.markerLayout
import kotlin.math.max
import kotlin.math.roundToInt

/** 拖动时的最小触摸热区：手表屏幕小，跟踪点本体可能只有 6dp，热区必须单独放大。 */
private val MinTouchTarget = 44.dp

@Composable
fun TrackingMarkerLayer(
    settings: ChromaSettings,
    dragEnabled: Boolean,
    showDragHint: Boolean,
    onDrag: (dxFraction: Float, dyFraction: Float) -> Unit,
    onTap: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (settings.markerCount == 0) return

    BoxWithConstraints(modifier.fillMaxSize()) {
        val widthPx = constraints.maxWidth.toFloat().coerceAtLeast(1f)
        val heightPx = constraints.maxHeight.toFloat().coerceAtLeast(1f)
        val density = LocalDensity.current
        val markerPx = with(density) { settings.markerSizeDp.dp.toPx() }
        val touchPx = with(density) { MinTouchTarget.toPx() }
        val hitPx = max(markerPx, touchPx)
        val positions = markerLayout(settings.markerCount, settings.offsetX, settings.offsetY)

        positions.forEachIndexed { index, (fx, fy) ->
            // 只有中心点带拖动热区，拖它等于整组平移；多点阵列保持刚性，方便后期解算。
            val draggable = dragEnabled && index == 0
            val boxPx = if (draggable) hitPx else markerPx
            Box(
                modifier = Modifier
                    .offset {
                        IntOffset(
                            (fx * widthPx - boxPx / 2f).roundToInt(),
                            (fy * heightPx - boxPx / 2f).roundToInt(),
                        )
                    }
                    .size(with(density) { boxPx.toDp() })
                    .then(
                        if (draggable) {
                            Modifier.pointerInput(widthPx, heightPx) {
                                // 中心热区必须同时认“拖动”和“轻点”：屏幕正中是最顺手的点击位置，
                                // 若只挂拖动手势，用户点中央唤不出菜单。
                                awaitEachGesture {
                                    val down = awaitFirstDown(requireUnconsumed = false)
                                    val slopChange = awaitTouchSlopOrCancellation(down.id) { change, over ->
                                        change.consume()
                                        onDrag(over.x / widthPx, over.y / heightPx)
                                    }
                                    if (slopChange != null) {
                                        drag(down.id) { change ->
                                            change.consume()
                                            val delta = change.positionChange()
                                            onDrag(delta.x / widthPx, delta.y / heightPx)
                                        }
                                    } else {
                                        onTap()
                                    }
                                }
                            }
                        } else {
                            Modifier
                        }
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (draggable && showDragHint) DragAffordance()
                Canvas(Modifier.size(settings.markerSizeDp.dp)) {
                    drawMarker(settings.markerStyle)
                }
            }
        }
    }
}

/** 未锁定且面板打开时，中心点外围画一圈虚线提示“此处可拖动”，锁定后完全消失，不会进画面。 */
@Composable
private fun DragAffordance() {
    Canvas(Modifier.fillMaxSize()) {
        val stroke = Stroke(
            width = 1.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx())),
        )
        drawCircle(
            color = Color.White.copy(alpha = 0.45f),
            radius = size.minDimension / 2f - stroke.width,
            style = stroke,
        )
    }
}

/**
 * 跟踪点图形全部用 Canvas 现画：任意尺寸下边缘都锐利，
 * 且不依赖位图资源，避免在不同 dpi 的手表上被系统缩放糊掉。
 */
fun DrawScope.drawMarker(style: MarkerStyle) {
    val d = size.minDimension
    if (d <= 0f) return
    val radius = d / 2f
    val center = Offset(size.width / 2f, size.height / 2f)
    val topLeft = Offset(center.x - radius, center.y - radius)
    val square = Size(d, d)
    val hairline = max(0.7f, d * 0.03f)

    when (style) {
        MarkerStyle.CHECKER -> {
            drawCircle(Color.White, radius, center)
            // 0° 在 3 点方向、正角度顺时针：180°/0° 起笔即左上与右下两个黑格
            drawArc(Color.Black, 180f, 90f, useCenter = true, topLeft = topLeft, size = square)
            drawArc(Color.Black, 0f, 90f, useCenter = true, topLeft = topLeft, size = square)
            drawCircle(Color(0xFF9E9E9E), max(0.5f, d * 0.045f), center)
        }

        MarkerStyle.BULLSEYE -> {
            drawCircle(Color.Black, radius, center)
            drawCircle(Color.White, radius * 0.72f, center)
            drawCircle(Color.Black, radius * 0.44f, center)
            drawCircle(Color.White, radius * 0.16f, center)
        }

        MarkerStyle.CROSS -> {
            drawCircle(Color.White, radius, center)
            val arm = radius * 0.92f
            val thickness = max(1f, d * 0.11f)
            drawLine(
                Color.Black,
                Offset(center.x - arm, center.y),
                Offset(center.x + arm, center.y),
                strokeWidth = thickness,
            )
            drawLine(
                Color.Black,
                Offset(center.x, center.y - arm),
                Offset(center.x, center.y + arm),
                strokeWidth = thickness,
            )
        }

        MarkerStyle.DOT -> {
            drawCircle(Color.White, radius, center)
            drawCircle(Color.Black, radius * 0.62f, center)
        }
    }

    // 统一描边，防止跟踪点与同色底幕（例如白幕配白点）粘连
    drawCircle(
        color = Color.Black.copy(alpha = 0.3f),
        radius = radius - hairline / 2f,
        center = center,
        style = Stroke(width = hairline),
    )
}
