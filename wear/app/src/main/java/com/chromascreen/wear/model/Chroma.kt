package com.chromascreen.wear.model

import androidx.annotation.StringRes
import androidx.compose.ui.graphics.Color
import com.chromascreen.wear.R

/** 跟踪点样式。新增样式只需在此登记并在 TrackingMarkers.kt 的 drawMarker 中补一个分支。 */
enum class MarkerStyle(@StringRes val labelRes: Int) {
    CHECKER(R.string.style_checker),
    BULLSEYE(R.string.style_bullseye),
    CROSS(R.string.style_cross),
    DOT(R.string.style_dot),
}

data class ChromaColor(
    val id: String,
    @StringRes val labelRes: Int,
    val color: Color,
    val hex: String,
)

object ChromaColors {
    /** 数字纯色用于抠像软件的“完美键”，影视色为 Rosco/GAM 幕布实测色，便于与实景幕布混拍时匹配。 */
    val presets: List<ChromaColor> = listOf(
        ChromaColor("green_digital", R.string.color_green_digital, Color(0xFF00FF00), "#00FF00"),
        ChromaColor("green_chroma", R.string.color_green_chroma, Color(0xFF00B140), "#00B140"),
        ChromaColor("blue_digital", R.string.color_blue_digital, Color(0xFF0000FF), "#0000FF"),
        ChromaColor("blue_chroma", R.string.color_blue_chroma, Color(0xFF0047BB), "#0047BB"),
        ChromaColor("red", R.string.color_red, Color(0xFFFF0000), "#FF0000"),
        ChromaColor("white", R.string.color_white, Color(0xFFFFFFFF), "#FFFFFF"),
        ChromaColor("black", R.string.color_black, Color(0xFF000000), "#000000"),
        ChromaColor("magenta", R.string.color_magenta, Color(0xFFFF00FF), "#FF00FF"),
    )

    fun byId(id: String): ChromaColor = presets.firstOrNull { it.id == id } ?: presets.first()

    fun nextId(id: String): String {
        val index = presets.indexOfFirst { it.id == id }
        return presets[(index + 1).mod(presets.size)].id
    }
}

data class ChromaSettings(
    val colorId: String = ChromaColors.presets.first().id,
    val markerCount: Int = 1,
    val markerStyle: MarkerStyle = MarkerStyle.CHECKER,
    val markerSizeDp: Int = 24,
    val brightnessPercent: Int = 100,
    /** 跟踪点整组相对屏幕中心的偏移，单位为屏幕宽/高的比例，范围 ±0.45。 */
    val offsetX: Float = 0f,
    val offsetY: Float = 0f,
) {
    fun coerced(): ChromaSettings = copy(
        markerCount = MARKER_COUNTS.minByOrNull { kotlin.math.abs(it - markerCount) } ?: 1,
        markerSizeDp = markerSizeDp.coerceIn(MIN_SIZE_DP, MAX_SIZE_DP),
        brightnessPercent = brightnessPercent.coerceIn(MIN_BRIGHTNESS, 100),
        offsetX = offsetX.coerceIn(-MAX_OFFSET, MAX_OFFSET),
        offsetY = offsetY.coerceIn(-MAX_OFFSET, MAX_OFFSET),
    )

    companion object {
        const val MIN_SIZE_DP = 6
        const val MAX_SIZE_DP = 160
        const val SIZE_STEP_DP = 2
        const val MIN_BRIGHTNESS = 5
        const val BRIGHTNESS_STEP = 5
        const val MAX_OFFSET = 0.45f
        const val OFFSET_STEP = 0.01f
        val MARKER_COUNTS = listOf(0, 1, 3, 5)
    }
}

/** 跟踪点在屏幕上的相对位置（0..1）。围绕中心成环分布，避免落在圆形表盘的切边外。 */
fun markerLayout(count: Int, offsetX: Float, offsetY: Float): List<Pair<Float, Float>> {
    val cx = 0.5f + offsetX
    val cy = 0.5f + offsetY
    val radius = 0.28f
    return when (count) {
        1 -> listOf(cx to cy)
        3 -> listOf(cx to cy, (cx - radius) to cy, (cx + radius) to cy)
        5 -> {
            val d = radius * 0.7071f
            listOf(
                cx to cy,
                (cx - d) to (cy - d), (cx + d) to (cy - d),
                (cx - d) to (cy + d), (cx + d) to (cy + d),
            )
        }
        else -> emptyList()
    }
}
