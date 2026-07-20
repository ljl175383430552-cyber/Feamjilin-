package com.example.clock

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.CountDownTimer
import android.os.IBinder
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

enum class LockState { IDLE, COUNTDOWN, LOCKED }

/**
 * 前台服务：负责 30 秒倒计时，然后在所有应用上层加一个
 * 完全隐形的全屏悬浮 View（无任何可见元素）。锁定后屏幕
 * 显示的就是当前画面本身，只是触摸无效；长按屏幕 5 秒解锁。
 */
class LockService : Service() {

    companion object {
        const val ACTION_START = "com.example.clock.action.START"
        const val ACTION_STOP = "com.example.clock.action.STOP"

        private const val CHANNEL_ID = "touch_lock"
        private const val NOTIFICATION_ID = 1
        private const val COUNTDOWN_MS = 30_000L
        private const val UNLOCK_HOLD_MS = 5_000L

        @Volatile var state = LockState.IDLE
        @Volatile var remainingSeconds = 0
    }

    private var countdownTimer: CountDownTimer? = null
    private var unlockTimer: CountDownTimer? = null
    private var overlayView: View? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startCountdown()
            ACTION_STOP -> shutdown(showUnlockedToast = state == LockState.LOCKED)
        }
        return START_NOT_STICKY
    }

    private fun startCountdown() {
        createNotificationChannel()
        state = LockState.COUNTDOWN
        remainingSeconds = (COUNTDOWN_MS / 1000).toInt()
        startForeground(NOTIFICATION_ID, buildNotification(getString(R.string.notif_countdown, remainingSeconds)))

        countdownTimer?.cancel()
        countdownTimer = object : CountDownTimer(COUNTDOWN_MS, 200L) {
            override fun onTick(millisUntilFinished: Long) {
                val secs = ((millisUntilFinished + 999) / 1000).toInt()
                if (secs != remainingSeconds) {
                    remainingSeconds = secs
                    updateNotification(getString(R.string.notif_countdown, secs))
                }
            }

            override fun onFinish() {
                remainingSeconds = 0
                lock()
            }
        }.start()
    }

    /**
     * 锁定：加一个完全隐形的全屏 View。屏幕上看不到任何东西，
     * 当前画面原样显示，但所有点击 / 滑动都不再生效。
     * 唯一识别的手势是"按住不放 5 秒"，用于解开锁定。
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun lock() {
        if (overlayView != null) return

        val view = View(this)
        view.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> startUnlockHold()
                MotionEvent.ACTION_POINTER_DOWN,
                MotionEvent.ACTION_UP,
                MotionEvent.ACTION_CANCEL -> cancelUnlockHold()
            }
            true
        }

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            PixelFormat.TRANSPARENT
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            params.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        windowManager().addView(view, params)
        overlayView = view
        state = LockState.LOCKED
        updateNotification(getString(R.string.notif_locked))
    }

    private fun startUnlockHold() {
        unlockTimer?.cancel()
        unlockTimer = object : CountDownTimer(UNLOCK_HOLD_MS, UNLOCK_HOLD_MS) {
            override fun onTick(millisUntilFinished: Long) = Unit

            override fun onFinish() {
                shutdown(showUnlockedToast = true)
            }
        }.start()
    }

    private fun cancelUnlockHold() {
        unlockTimer?.cancel()
        unlockTimer = null
    }

    private fun shutdown(showUnlockedToast: Boolean) {
        countdownTimer?.cancel()
        countdownTimer = null
        unlockTimer?.cancel()
        unlockTimer = null

        overlayView?.let { windowManager().removeView(it) }
        overlayView = null

        if (showUnlockedToast) {
            Toast.makeText(this, R.string.unlocked_toast, Toast.LENGTH_SHORT).show()
        }

        state = LockState.IDLE
        remainingSeconds = 0
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun windowManager() = getSystemService(WINDOW_SERVICE) as WindowManager

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.notif_channel_name),
                NotificationManager.IMPORTANCE_LOW
            )
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun updateNotification(text: String) {
        (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
            .notify(NOTIFICATION_ID, buildNotification(text))
    }

    override fun onDestroy() {
        super.onDestroy()
        countdownTimer?.cancel()
        unlockTimer?.cancel()
        overlayView?.let { windowManager().removeView(it) }
        overlayView = null
        state = LockState.IDLE
        remainingSeconds = 0
    }
}
