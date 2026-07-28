package com.chromascreen.wear.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chromascreen.wear.ChromaController
import com.chromascreen.wear.model.ChromaColors
import com.chromascreen.wear.model.ChromaSettings
import com.chromascreen.wear.ui.components.ControlPanel
import com.chromascreen.wear.ui.components.LockShield
import com.chromascreen.wear.ui.components.SizeHud
import com.chromascreen.wear.ui.components.TrackingMarkerLayer
import com.chromascreen.wear.util.Haptics
import com.chromascreen.wear.util.isRoundScreen
import kotlinx.coroutines.delay

/** 面板无操作后自动隐藏，避免忘记收面板就开拍。 */
private const val PANEL_AUTO_HIDE_MS = 8_000L
private const val DRAG_HINT_MS = 1_500L
private const val SIZE_HUD_MS = 1_200L

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun ChromaApp(controller: ChromaController, haptics: Haptics) {
    val settings by controller.settings.collectAsStateWithLifecycle()
    val locked by controller.locked.collectAsStateWithLifecycle()
    val panelVisible by controller.panelVisible.collectAsStateWithLifecycle()
    val interactionTick by controller.interactionTick.collectAsStateWithLifecycle()
    val sizeHudTick by controller.sizeHudTick.collectAsStateWithLifecycle()
    val isRound = isRoundScreen()
    val screenColor = ChromaColors.byId(settings.colorId).color

    LaunchedEffect(panelVisible, interactionTick) {
        if (panelVisible && !locked) {
            delay(PANEL_AUTO_HIDE_MS)
            controller.hidePanel()
        }
    }

    // 收起面板后短暂提示中心点可拖动，随后彻底消失，保证画面干净
    var dragHintVisible by remember { mutableStateOf(false) }
    LaunchedEffect(panelVisible) {
        if (!panelVisible && !locked && settings.markerCount > 0) {
            dragHintVisible = true
            delay(DRAG_HINT_MS)
            dragHintVisible = false
        } else {
            dragHintVisible = false
        }
    }

    var sizeHudVisible by remember { mutableStateOf(false) }
    LaunchedEffect(sizeHudTick) {
        if (sizeHudTick > 0L) {
            sizeHudVisible = true
            delay(SIZE_HUD_MS)
            sizeHudVisible = false
        }
    }

    val rootFocus = remember { FocusRequester() }
    LaunchedEffect(panelVisible, locked) {
        if (!panelVisible) runCatching { rootFocus.requestFocus() }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(screenColor)
            // 面板收起时，表冠/旋转边框直接调节跟踪点大小，不用唤出任何 UI
            .onRotaryScrollEvent { event ->
                if (locked || panelVisible) return@onRotaryScrollEvent false
                val step = if (event.verticalScrollPixels >= 0f) {
                    ChromaSettings.SIZE_STEP_DP
                } else {
                    -ChromaSettings.SIZE_STEP_DP
                }
                controller.adjustSize(step)
                true
            }
            .focusRequester(rootFocus)
            .focusable(),
    ) {
        if (!locked) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .pointerInput(Unit) {
                        detectTapGestures(onTap = { controller.showPanel() })
                    },
            )
        }

        TrackingMarkerLayer(
            settings = settings,
            dragEnabled = !locked && !panelVisible,
            showDragHint = dragHintVisible,
            onDrag = controller::nudge,
        )

        if (sizeHudVisible && !panelVisible && !locked) {
            Box(Modifier.matchParentSize(), contentAlignment = Alignment.BottomCenter) {
                SizeHud(
                    sizeDp = settings.markerSizeDp,
                    modifier = Modifier
                        .padding(bottom = if (isRound) 26.dp else 12.dp)
                        .clip(RoundedCornerShape(12.dp)),
                )
            }
        }

        if (panelVisible && !locked) {
            ControlPanel(
                settings = settings,
                isRound = isRound,
                onColor = controller::setColor,
                onCount = controller::setMarkerCount,
                onStyle = controller::setMarkerStyle,
                onSizeDelta = controller::adjustSize,
                onBrightnessDelta = controller::adjustBrightness,
                onNudge = controller::nudge,
                onCenter = controller::centerMarkers,
                onLock = controller::lock,
                onReset = controller::reset,
                onInteraction = controller::notifyInteraction,
                modifier = Modifier
                    // 吞掉面板区域的点击，避免点标签就把面板关了
                    .pointerInput(Unit) {
                        detectTapGestures(onTap = { controller.notifyInteraction() })
                    },
            )
        }

        if (locked) {
            LockShield(haptics = haptics, onUnlock = controller::unlock)
        }
    }
}
