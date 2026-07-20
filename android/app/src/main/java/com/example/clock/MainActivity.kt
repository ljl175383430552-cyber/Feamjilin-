package com.example.clock

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {

    private lateinit var countdownText: TextView
    private lateinit var statusHint: TextView
    private lateinit var permissionButton: Button
    private lateinit var actionButton: Button

    private val uiHandler = Handler(Looper.getMainLooper())
    private val uiUpdater = object : Runnable {
        override fun run() {
            updateUi()
            uiHandler.postDelayed(this, 250L)
        }
    }

    /** 打开应用后（权限就绪时）只自动开始一次倒计时 */
    private var autoStarted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        countdownText = findViewById(R.id.countdownText)
        statusHint = findViewById(R.id.statusHint)
        permissionButton = findViewById(R.id.permissionButton)
        actionButton = findViewById(R.id.actionButton)

        permissionButton.setOnClickListener {
            startActivity(
                Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
            )
        }

        actionButton.setOnClickListener {
            when (LockService.state) {
                LockState.IDLE -> startLock()
                LockState.COUNTDOWN, LockState.LOCKED -> stopLock()
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1
            )
        }
    }

    override fun onResume() {
        super.onResume()
        if (canDrawOverlays() && LockService.state == LockState.IDLE && !autoStarted) {
            autoStarted = true
            startLock()
        }
        uiHandler.post(uiUpdater)
    }

    override fun onPause() {
        super.onPause()
        uiHandler.removeCallbacks(uiUpdater)
    }

    private fun canDrawOverlays() = Settings.canDrawOverlays(this)

    private fun startLock() {
        if (!canDrawOverlays()) {
            updateUi()
            return
        }
        val intent = Intent(this, LockService::class.java).setAction(LockService.ACTION_START)
        ContextCompat.startForegroundService(this, intent)
    }

    private fun stopLock() {
        startService(Intent(this, LockService::class.java).setAction(LockService.ACTION_STOP))
    }

    private fun updateUi() {
        val hasPermission = canDrawOverlays()
        permissionButton.visibility = if (hasPermission) View.GONE else View.VISIBLE
        actionButton.isEnabled = hasPermission

        when (LockService.state) {
            LockState.IDLE -> {
                countdownText.text = "--"
                statusHint.setText(if (hasPermission) R.string.hint_idle else R.string.hint_need_permission)
                actionButton.setText(R.string.start_countdown)
            }
            LockState.COUNTDOWN -> {
                countdownText.text = LockService.remainingSeconds.toString()
                statusHint.setText(R.string.hint_countdown)
                actionButton.setText(R.string.cancel_countdown)
            }
            LockState.LOCKED -> {
                countdownText.setText(R.string.locked_label)
                statusHint.setText(R.string.hint_locked)
                actionButton.setText(R.string.stop_lock)
            }
        }
    }
}
