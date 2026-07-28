package com.chromascreen.wear.data

import android.content.Context
import com.chromascreen.wear.model.ChromaSettings
import com.chromascreen.wear.model.MarkerStyle

/**
 * 用 SharedPreferences 持久化拍摄参数：手表上重启 App 或电量耗尽后能恢复上一条镜头的设置，
 * 不引入 DataStore 是为了把依赖和安装包压到最小（手表存储普遍只有 4~8GB 且系统占用高）。
 */
class SettingsStore(context: Context) {

    private val prefs = context.getSharedPreferences("chroma_settings", Context.MODE_PRIVATE)

    fun load(): ChromaSettings {
        val defaults = ChromaSettings()
        return ChromaSettings(
            colorId = prefs.getString(KEY_COLOR, defaults.colorId) ?: defaults.colorId,
            markerCount = prefs.getInt(KEY_COUNT, defaults.markerCount),
            markerStyle = runCatching {
                MarkerStyle.valueOf(prefs.getString(KEY_STYLE, defaults.markerStyle.name)!!)
            }.getOrDefault(defaults.markerStyle),
            markerSizeDp = prefs.getInt(KEY_SIZE, defaults.markerSizeDp),
            brightnessPercent = prefs.getInt(KEY_BRIGHTNESS, defaults.brightnessPercent),
            offsetX = prefs.getFloat(KEY_OFFSET_X, defaults.offsetX),
            offsetY = prefs.getFloat(KEY_OFFSET_Y, defaults.offsetY),
        ).coerced()
    }

    fun save(settings: ChromaSettings) {
        prefs.edit()
            .putString(KEY_COLOR, settings.colorId)
            .putInt(KEY_COUNT, settings.markerCount)
            .putString(KEY_STYLE, settings.markerStyle.name)
            .putInt(KEY_SIZE, settings.markerSizeDp)
            .putInt(KEY_BRIGHTNESS, settings.brightnessPercent)
            .putFloat(KEY_OFFSET_X, settings.offsetX)
            .putFloat(KEY_OFFSET_Y, settings.offsetY)
            .apply()
    }

    private companion object {
        const val KEY_COLOR = "color_id"
        const val KEY_COUNT = "marker_count"
        const val KEY_STYLE = "marker_style"
        const val KEY_SIZE = "marker_size_dp"
        const val KEY_BRIGHTNESS = "brightness"
        const val KEY_OFFSET_X = "offset_x"
        const val KEY_OFFSET_Y = "offset_y"
    }
}
