package com.chromascreen.wear

import android.content.Context
import com.chromascreen.wear.data.SettingsStore
import com.chromascreen.wear.model.ChromaColors
import com.chromascreen.wear.model.ChromaSettings
import com.chromascreen.wear.model.MarkerStyle
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * 全局状态中枢：拍摄参数 + 锁屏状态 + 面板可见性。
 *
 * 刻意不做成 ViewModel —— Activity 已经用 configChanges 拦下了绝大多数配置变化，
 * 参数本身又落盘在 SharedPreferences 里，这样能少一层依赖，并且方便 Activity 的实体键
 * 回调（表冠、侧键）直接驱动同一份状态。
 */
class ChromaController(context: Context) {

    private val store = SettingsStore(context)

    private val _settings = MutableStateFlow(store.load())
    val settings: StateFlow<ChromaSettings> = _settings.asStateFlow()

    private val _locked = MutableStateFlow(false)
    val locked: StateFlow<Boolean> = _locked.asStateFlow()

    private val _panelVisible = MutableStateFlow(true)
    val panelVisible: StateFlow<Boolean> = _panelVisible.asStateFlow()

    /** 每次交互自增，用于重置面板自动隐藏计时。 */
    private val _interactionTick = MutableStateFlow(0L)
    val interactionTick: StateFlow<Long> = _interactionTick.asStateFlow()

    /** 面板关闭时用表冠改点位大小，靠这个计数触发一次浮层提示。 */
    private val _sizeHudTick = MutableStateFlow(0L)
    val sizeHudTick: StateFlow<Long> = _sizeHudTick.asStateFlow()

    fun notifyInteraction() {
        _interactionTick.value = _interactionTick.value + 1
    }

    private fun update(transform: (ChromaSettings) -> ChromaSettings) {
        val next = transform(_settings.value).coerced()
        if (next != _settings.value) {
            _settings.value = next
            store.save(next)
        }
        notifyInteraction()
    }

    fun setColor(id: String) = update { it.copy(colorId = id) }

    fun cycleColor() = update { it.copy(colorId = ChromaColors.nextId(it.colorId)) }

    fun setMarkerCount(count: Int) = update { it.copy(markerCount = count) }

    fun toggleMarkers() = update { it.copy(markerCount = if (it.markerCount == 0) 1 else 0) }

    fun setMarkerStyle(style: MarkerStyle) = update { it.copy(markerStyle = style) }

    fun adjustSize(deltaDp: Int) {
        update { it.copy(markerSizeDp = it.markerSizeDp + deltaDp) }
        if (!_panelVisible.value) _sizeHudTick.value = _sizeHudTick.value + 1
    }

    fun adjustBrightness(delta: Int) = update { it.copy(brightnessPercent = it.brightnessPercent + delta) }

    fun nudge(dx: Float, dy: Float) = update { it.copy(offsetX = it.offsetX + dx, offsetY = it.offsetY + dy) }

    fun setOffset(x: Float, y: Float) = update { it.copy(offsetX = x, offsetY = y) }

    fun centerMarkers() = update { it.copy(offsetX = 0f, offsetY = 0f) }

    fun reset() = update { ChromaSettings() }

    fun lock() {
        _panelVisible.value = false
        _locked.value = true
    }

    fun unlock() {
        _locked.value = false
        _panelVisible.value = true
        notifyInteraction()
    }

    fun toggleLock() {
        if (_locked.value) unlock() else lock()
    }

    fun showPanel() {
        if (_locked.value) return
        _panelVisible.value = true
        notifyInteraction()
    }

    fun hidePanel() {
        _panelVisible.value = false
    }

    fun togglePanel() {
        if (_panelVisible.value) hidePanel() else showPanel()
    }
}
