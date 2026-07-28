package com.chromascreen.wear.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.max

/** 面板配色：深色半透明底 + 高对比文字，保证在任何色幕上都看得清。 */
object PanelTheme {
    val Surface = Color(0xF2101214)
    val SurfaceSoft = Color(0x33FFFFFF)
    val Accent = Color(0xFF00E39A)
    val OnSurface = Color(0xFFFFFFFF)
    val OnSurfaceDim = Color(0xB3FFFFFF)
    val Outline = Color(0x40FFFFFF)
}

private val LabelStyle = TextStyle(
    color = PanelTheme.OnSurfaceDim,
    fontSize = 10.sp,
    fontWeight = FontWeight.Medium,
    letterSpacing = 0.6.sp,
)

private val ValueStyle = TextStyle(
    color = PanelTheme.OnSurface,
    fontSize = 12.sp,
    fontWeight = FontWeight.SemiBold,
)

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    BasicText(text = text, modifier = modifier, style = LabelStyle)
}

/** 无水波纹按钮：手表上用缩放+透明度做按压反馈，比 ripple 更省电也更直观。 */
@Composable
private fun Modifier.pressable(enabled: Boolean = true, onClick: () -> Unit): Modifier {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    return this
        .scale(if (pressed) 0.94f else 1f)
        .alpha(if (!enabled) 0.35f else if (pressed) 0.75f else 1f)
        .clickable(
            enabled = enabled,
            interactionSource = interaction,
            indication = null,
            onClick = onClick,
        )
}

@Composable
fun ColorSwatch(
    color: Color,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(34.dp)
            .pressable(onClick = onClick)
            .clip(RoundedCornerShape(10.dp))
            .background(color)
            .border(
                width = if (selected) 2.dp else 1.dp,
                color = if (selected) PanelTheme.OnSurface else PanelTheme.Outline,
                shape = RoundedCornerShape(10.dp),
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (selected) {
            Canvas(Modifier.size(12.dp)) {
                drawCheckGlyph(if (color.luminance() > 0.5f) Color.Black else Color.White)
            }
        }
    }
}

private fun Color.luminance(): Float = 0.299f * red + 0.587f * green + 0.114f * blue

@Composable
fun PillChoice(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .height(30.dp)
            .pressable(onClick = onClick)
            .clip(RoundedCornerShape(15.dp))
            .background(if (selected) PanelTheme.OnSurface else PanelTheme.SurfaceSoft),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = label,
            style = TextStyle(
                color = if (selected) Color.Black else PanelTheme.OnSurfaceDim,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            ),
        )
    }
}

/** 加减步进条：手表上滑块很难精确操作，用大按钮 + 表冠代替。 */
@Composable
fun StepperRow(
    value: String,
    onMinus: () -> Unit,
    onPlus: () -> Unit,
    minusEnabled: Boolean = true,
    plusEnabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        GlyphButton(enabled = minusEnabled, onClick = onMinus) { drawMinusGlyph(PanelTheme.OnSurface) }
        BasicText(text = value, style = ValueStyle)
        GlyphButton(enabled = plusEnabled, onClick = onPlus) { drawPlusGlyph(PanelTheme.OnSurface) }
    }
}

@Composable
fun GlyphButton(
    enabled: Boolean = true,
    size: Dp = 34.dp,
    background: Color = PanelTheme.SurfaceSoft,
    onClick: () -> Unit,
    glyph: DrawScope.() -> Unit,
) {
    Box(
        modifier = Modifier
            .size(size)
            .pressable(enabled = enabled, onClick = onClick)
            .clip(CircleShape)
            .background(background),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.size(size * 0.45f)) { glyph() }
    }
}

@Composable
fun WideButton(
    label: String,
    accent: Boolean = false,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    glyph: (DrawScope.() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(38.dp)
            .pressable(onClick = onClick)
            .clip(RoundedCornerShape(19.dp))
            .background(if (accent) PanelTheme.Accent else PanelTheme.SurfaceSoft),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        if (glyph != null) {
            Canvas(Modifier.size(14.dp)) { glyph() }
            Spacer(Modifier.width(6.dp))
        }
        BasicText(
            text = label,
            style = TextStyle(
                color = if (accent) Color.Black else PanelTheme.OnSurface,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
            ),
        )
    }
}

/** 位置微调：上下左右各 1% 屏宽，比手指拖动精确得多，便于把点对准镜头光轴。 */
@Composable
fun NudgePad(
    onNudge: (Float, Float) -> Unit,
    onCenter: () -> Unit,
    step: Float,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            GlyphButton(size = 30.dp, onClick = { onNudge(-step, 0f) }) {
                drawArrowGlyph(PanelTheme.OnSurface, 180f)
            }
            GlyphButton(size = 30.dp, onClick = { onNudge(0f, -step) }) {
                drawArrowGlyph(PanelTheme.OnSurface, 270f)
            }
            GlyphButton(size = 34.dp, onClick = onCenter) { drawTargetGlyph(PanelTheme.Accent) }
            GlyphButton(size = 30.dp, onClick = { onNudge(0f, step) }) {
                drawArrowGlyph(PanelTheme.OnSurface, 90f)
            }
            GlyphButton(size = 30.dp, onClick = { onNudge(step, 0f) }) {
                drawArrowGlyph(PanelTheme.OnSurface, 0f)
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 图标全部用 Canvas 绘制，不引入 material-icons，安装包可以压到 2MB 以内
// ---------------------------------------------------------------------------

fun DrawScope.drawLockGlyph(color: Color, locked: Boolean = true) {
    val w = size.width
    val h = size.height
    val bodyW = w * 0.78f
    val bodyH = h * 0.5f
    val bodyTop = h - bodyH
    drawRoundRect(
        color = color,
        topLeft = Offset((w - bodyW) / 2f, bodyTop),
        size = Size(bodyW, bodyH),
        cornerRadius = CornerRadius(w * 0.12f),
    )
    val shackleR = bodyW * 0.32f
    val stroke = Stroke(width = max(1f, w * 0.12f), cap = StrokeCap.Round)
    drawArc(
        color = color,
        startAngle = 180f,
        sweepAngle = if (locked) 180f else 150f,
        useCenter = false,
        topLeft = Offset(w / 2f - shackleR + if (locked) 0f else w * 0.14f, bodyTop - shackleR),
        size = Size(shackleR * 2f, shackleR * 2f),
        style = stroke,
    )
}

fun DrawScope.drawPlusGlyph(color: Color) {
    val stroke = max(1.5f, size.minDimension * 0.16f)
    val c = size.minDimension / 2f
    drawLine(color, Offset(0f, c), Offset(size.width, c), stroke, StrokeCap.Round)
    drawLine(color, Offset(c, 0f), Offset(c, size.height), stroke, StrokeCap.Round)
}

fun DrawScope.drawMinusGlyph(color: Color) {
    val stroke = max(1.5f, size.minDimension * 0.16f)
    val c = size.height / 2f
    drawLine(color, Offset(0f, c), Offset(size.width, c), stroke, StrokeCap.Round)
}

fun DrawScope.drawCheckGlyph(color: Color) {
    val stroke = max(1.2f, size.minDimension * 0.2f)
    drawLine(
        color,
        Offset(size.width * 0.12f, size.height * 0.55f),
        Offset(size.width * 0.42f, size.height * 0.82f),
        stroke,
        StrokeCap.Round,
    )
    drawLine(
        color,
        Offset(size.width * 0.42f, size.height * 0.82f),
        Offset(size.width * 0.88f, size.height * 0.22f),
        stroke,
        StrokeCap.Round,
    )
}

/** rotationDegrees: 0 右, 90 下, 180 左, 270 上 */
fun DrawScope.drawArrowGlyph(color: Color, rotationDegrees: Float) {
    val stroke = max(1.5f, size.minDimension * 0.16f)
    withRotation(rotationDegrees) {
        val cy = size.height / 2f
        drawLine(color, Offset(size.width * 0.1f, cy), Offset(size.width * 0.85f, cy), stroke, StrokeCap.Round)
        drawLine(
            color,
            Offset(size.width * 0.5f, size.height * 0.15f),
            Offset(size.width * 0.85f, cy),
            stroke,
            StrokeCap.Round,
        )
        drawLine(
            color,
            Offset(size.width * 0.5f, size.height * 0.85f),
            Offset(size.width * 0.85f, cy),
            stroke,
            StrokeCap.Round,
        )
    }
}

private fun DrawScope.withRotation(degrees: Float, block: DrawScope.() -> Unit) {
    rotate(degrees) { block() }
}

fun DrawScope.drawTargetGlyph(color: Color) {
    val stroke = max(1.2f, size.minDimension * 0.12f)
    val r = size.minDimension / 2f
    drawCircle(color, r - stroke / 2f, style = Stroke(width = stroke))
    drawCircle(color, r * 0.22f)
}

fun DrawScope.drawResetGlyph(color: Color) {
    val stroke = max(1.2f, size.minDimension * 0.13f)
    val r = size.minDimension / 2f - stroke
    drawArc(
        color = color,
        startAngle = 40f,
        sweepAngle = 290f,
        useCenter = false,
        topLeft = Offset(stroke, stroke),
        size = Size(r * 2f, r * 2f),
        style = Stroke(width = stroke, cap = StrokeCap.Round),
    )
    drawLine(
        color,
        Offset(size.width * 0.86f, size.height * 0.5f),
        Offset(size.width * 0.62f, size.height * 0.62f),
        stroke,
        StrokeCap.Round,
    )
}

@Composable
fun PanelDivider(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(PanelTheme.Outline),
    )
}
