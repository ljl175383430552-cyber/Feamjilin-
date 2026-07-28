package com.chromascreen.wear.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chromascreen.wear.R
import com.chromascreen.wear.model.ChromaColors
import com.chromascreen.wear.model.ChromaSettings
import com.chromascreen.wear.model.MarkerStyle
import java.util.Locale
import kotlinx.coroutines.launch

/**
 * 参数面板。为圆形表盘做了三件事：
 *  1. 纵向滚动 + 表冠(旋转输入)滚动，不依赖横向空间；
 *  2. 圆屏时加大左右内边距，避免控件被切边裁掉；
 *  3. 全部改用大按钮/步进器，不用滑块——手指在 1.2 英寸屏上拖不准。
 */
@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun ControlPanel(
    settings: ChromaSettings,
    isRound: Boolean,
    onColor: (String) -> Unit,
    onCount: (Int) -> Unit,
    onStyle: (MarkerStyle) -> Unit,
    onSizeDelta: (Int) -> Unit,
    onBrightnessDelta: (Int) -> Unit,
    onNudge: (Float, Float) -> Unit,
    onCenter: () -> Unit,
    onLock: () -> Unit,
    onReset: () -> Unit,
    onInteraction: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val scroll = rememberScrollState()
    val scope = rememberCoroutineScope()
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) { runCatching { focusRequester.requestFocus() } }
    LaunchedEffect(scroll.isScrollInProgress) {
        if (scroll.isScrollInProgress) onInteraction()
    }

    val hPad = if (isRound) 24.dp else 12.dp
    val vPad = if (isRound) 30.dp else 16.dp

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .onRotaryScrollEvent { event ->
                    scope.launch { scroll.scrollBy(event.verticalScrollPixels) }
                    onInteraction()
                    true
                }
                .focusRequester(focusRequester)
                .focusable()
                .verticalScroll(scroll)
                .padding(horizontal = hPad, vertical = vPad),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            val current = ChromaColors.byId(settings.colorId)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SectionLabel(stringResource(R.string.panel_color))
                BasicText(
                    text = "${stringResource(current.labelRes)} ${current.hex}",
                    style = TextStyle(color = PanelTheme.OnSurface, fontSize = 9.sp),
                )
            }

            ChromaColors.presets.chunked(4).forEach { row ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    row.forEach { preset ->
                        ColorSwatch(
                            color = preset.color,
                            selected = preset.id == settings.colorId,
                            onClick = { onColor(preset.id) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            PanelDivider(Modifier.padding(vertical = 2.dp))

            SectionLabel(stringResource(R.string.panel_count))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                ChromaSettings.MARKER_COUNTS.forEach { count ->
                    PillChoice(
                        label = if (count == 0) stringResource(R.string.marker_off) else "$count",
                        selected = settings.markerCount == count,
                        onClick = { onCount(count) },
                        modifier = Modifier.weight(if (count == 0) 1.6f else 1f),
                    )
                }
            }

            if (settings.markerCount > 0) {
                SectionLabel(stringResource(R.string.panel_style))
                MarkerStyle.entries.chunked(2).forEach { row ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        row.forEach { style ->
                            PillChoice(
                                label = stringResource(style.labelRes),
                                selected = settings.markerStyle == style,
                                onClick = { onStyle(style) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }

                SectionLabel(stringResource(R.string.panel_size))
                StepperRow(
                    value = markerSizeLabel(settings.markerSizeDp),
                    onMinus = { onSizeDelta(-ChromaSettings.SIZE_STEP_DP) },
                    onPlus = { onSizeDelta(ChromaSettings.SIZE_STEP_DP) },
                    minusEnabled = settings.markerSizeDp > ChromaSettings.MIN_SIZE_DP,
                    plusEnabled = settings.markerSizeDp < ChromaSettings.MAX_SIZE_DP,
                )

                SectionLabel(stringResource(R.string.panel_center))
                NudgePad(
                    onNudge = onNudge,
                    onCenter = onCenter,
                    step = ChromaSettings.OFFSET_STEP,
                )
            }

            PanelDivider(Modifier.padding(vertical = 2.dp))

            SectionLabel(stringResource(R.string.panel_brightness))
            StepperRow(
                value = "${settings.brightnessPercent}%",
                onMinus = { onBrightnessDelta(-ChromaSettings.BRIGHTNESS_STEP) },
                onPlus = { onBrightnessDelta(ChromaSettings.BRIGHTNESS_STEP) },
                minusEnabled = settings.brightnessPercent > ChromaSettings.MIN_BRIGHTNESS,
                plusEnabled = settings.brightnessPercent < 100,
            )

            Spacer(Modifier.height(2.dp))

            WideButton(
                label = stringResource(R.string.panel_lock),
                accent = true,
                onClick = onLock,
                glyph = { drawLockGlyph(Color.Black) },
            )

            WideButton(
                label = stringResource(R.string.panel_reset),
                onClick = onReset,
                glyph = { drawResetGlyph(PanelTheme.OnSurface) },
            )

            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                BasicText(
                    text = "ChromaWatch 1.0.0",
                    style = TextStyle(
                        color = PanelTheme.OnSurfaceDim.copy(alpha = 0.4f),
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Normal,
                    ),
                )
            }
        }
    }
}

/**
 * 同时给出 dp 与实际物理毫米：现场跟焦/后期解算时，摄影和特效更关心跟踪点的真实尺寸，
 * 而同样的 dp 在不同 PPI 的手表上物理大小并不一致。
 */
@Composable
private fun markerSizeLabel(sizeDp: Int): String {
    val density = LocalDensity.current
    val metrics = LocalContext.current.resources.displayMetrics
    val px = with(density) { sizeDp.dp.toPx() }
    val realDpi = if (metrics.xdpi > 40f) metrics.xdpi else 160f * metrics.density
    val mm = px / realDpi * 25.4f
    return "$sizeDp dp · ${String.format(Locale.US, "%.1f", mm)} mm"
}

@Composable
fun SizeHud(sizeDp: Int, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .background(Color.Black.copy(alpha = 0.6f))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Canvas(Modifier.size(10.dp)) { drawTargetGlyph(Color.White) }
            Spacer(Modifier.size(6.dp))
            BasicText(
                text = markerSizeLabel(sizeDp),
                style = TextStyle(color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold),
            )
        }
    }
}
