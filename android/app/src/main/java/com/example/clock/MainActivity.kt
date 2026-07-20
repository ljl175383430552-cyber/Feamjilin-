package com.example.clock

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.CountDownTimer
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {

    companion object {
        private const val COUNTDOWN_MS = 30_000L
        private const val UNLOCK_HOLD_MS = 5_000L
        private const val TICK_MS = 50L
    }

    private lateinit var countdownScreen: LinearLayout
    private lateinit var countdownText: TextView
    private lateinit var contentInput: EditText
    private lateinit var restartButton: Button
    private lateinit var lockScreen: View
    private lateinit var lockContent: TextView
    private lateinit var unlockProgress: ProgressBar
    private lateinit var unlockHint: TextView

    private var countdownTimer: CountDownTimer? = null
    private var unlockTimer: CountDownTimer? = null
    private var isLocked = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        countdownScreen = findViewById(R.id.countdownScreen)
        countdownText = findViewById(R.id.countdownText)
        contentInput = findViewById(R.id.contentInput)
        restartButton = findViewById(R.id.restartButton)
        lockScreen = findViewById(R.id.lockScreen)
        lockContent = findViewById(R.id.lockContent)
        unlockProgress = findViewById(R.id.unlockProgress)
        unlockHint = findViewById(R.id.unlockHint)

        // 保持屏幕常亮，锁定期间不会自动熄屏
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // 锁定状态下屏蔽返回键
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (isLocked) {
                    Toast.makeText(this@MainActivity, R.string.locked_toast, Toast.LENGTH_SHORT).show()
                } else {
                    finish()
                }
            }
        })

        setupLockScreenTouch()
        restartButton.setOnClickListener { startCountdown() }

        startCountdown()
    }

    private fun startCountdown() {
        restartButton.visibility = View.GONE
        countdownTimer?.cancel()
        countdownTimer = object : CountDownTimer(COUNTDOWN_MS, 100L) {
            override fun onTick(millisUntilFinished: Long) {
                // 向上取整，保证从 30 显示到 1
                countdownText.text = ((millisUntilFinished + 999) / 1000).toString()
            }

            override fun onFinish() {
                lockNow()
            }
        }.start()
    }

    private fun lockNow() {
        isLocked = true

        val content = contentInput.text.toString().trim()
        lockContent.text = if (content.isNotEmpty()) content
                           else getString(R.string.default_lock_content)

        // 收起软键盘焦点，进入沉浸式全屏（隐藏状态栏 / 导航栏，降低滑动干扰）
        contentInput.clearFocus()
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE

        lockScreen.visibility = View.VISIBLE
        Toast.makeText(this, R.string.locked_toast, Toast.LENGTH_SHORT).show()
    }

    private fun unlockNow() {
        isLocked = false
        cancelUnlockHold()

        WindowCompat.getInsetsController(window, window.decorView)
            .show(WindowInsetsCompat.Type.systemBars())

        lockScreen.visibility = View.GONE
        restartButton.visibility = View.VISIBLE
        countdownText.text = "--"
        Toast.makeText(this, R.string.unlocked_toast, Toast.LENGTH_SHORT).show()
    }

    /**
     * 锁定层消费所有触摸事件（点击 / 滑动均无效），
     * 仅识别"按住不放 5 秒"这一个手势用于解锁。
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun setupLockScreenTouch() {
        lockScreen.setOnTouchListener { _, event ->
            when (event.actionMasked) {
                MotionEvent.ACTION_DOWN -> startUnlockHold()
                MotionEvent.ACTION_POINTER_DOWN,
                MotionEvent.ACTION_UP,
                MotionEvent.ACTION_CANCEL -> cancelUnlockHold()
            }
            true // 消费所有事件，使滑动等操作无效
        }
    }

    private fun startUnlockHold() {
        unlockTimer?.cancel()
        unlockProgress.visibility = View.VISIBLE
        unlockHint.setText(R.string.unlocking)
        unlockTimer = object : CountDownTimer(UNLOCK_HOLD_MS, TICK_MS) {
            override fun onTick(millisUntilFinished: Long) {
                unlockProgress.progress = (UNLOCK_HOLD_MS - millisUntilFinished).toInt()
            }

            override fun onFinish() {
                unlockProgress.progress = UNLOCK_HOLD_MS.toInt()
                unlockNow()
            }
        }.start()
    }

    private fun cancelUnlockHold() {
        unlockTimer?.cancel()
        unlockTimer = null
        unlockProgress.progress = 0
        unlockProgress.visibility = View.INVISIBLE
        unlockHint.setText(R.string.unlock_hint)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        // 锁定期间重新获得焦点时保持沉浸式全屏
        if (hasFocus && isLocked) {
            WindowCompat.getInsetsController(window, window.decorView)
                .hide(WindowInsetsCompat.Type.systemBars())
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        countdownTimer?.cancel()
        unlockTimer?.cancel()
    }
}
