package com.example.scanreader

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.example.scanreader.databinding.ActivityMainBinding
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import java.util.Locale

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {

    private lateinit var binding: ActivityMainBinding

    private var imageCapture: ImageCapture? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var toneGenerator: ToneGenerator? = null

    private val textRecognizer by lazy {
        TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
    }

    private val requestCameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                startCamera()
            } else {
                Toast.makeText(this, R.string.camera_permission_denied, Toast.LENGTH_LONG).show()
                binding.statusText.setText(R.string.camera_permission_denied)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        tts = TextToSpeech(this, this)
        toneGenerator = runCatching {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
        }.getOrNull()

        binding.scanButton.setOnClickListener { captureAndRecognize() }
        binding.stopButton.setOnClickListener { stopSpeaking() }

        if (hasCameraPermission()) {
            startCamera()
        } else {
            requestCameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun hasCameraPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(binding.previewView.surfaceProvider)
            }

            imageCapture = ImageCapture.Builder()
                .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                .build()

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageCapture
                )
                binding.statusText.setText(R.string.status_ready)
            } catch (e: Exception) {
                binding.statusText.setText(R.string.camera_start_failed)
                Toast.makeText(this, R.string.camera_start_failed, Toast.LENGTH_LONG).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun captureAndRecognize() {
        val imageCapture = imageCapture ?: run {
            Toast.makeText(this, R.string.camera_not_ready, Toast.LENGTH_SHORT).show()
            return
        }

        stopSpeaking()
        binding.scanButton.isEnabled = false
        binding.statusText.setText(R.string.status_recognizing)

        imageCapture.takePicture(
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(imageProxy: ImageProxy) {
                    recognizeText(imageProxy)
                }

                override fun onError(exception: ImageCaptureException) {
                    binding.scanButton.isEnabled = true
                    binding.statusText.setText(R.string.capture_failed)
                }
            }
        )
    }

    @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
    private fun recognizeText(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            binding.scanButton.isEnabled = true
            binding.statusText.setText(R.string.capture_failed)
            return
        }

        val inputImage =
            InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)

        textRecognizer.process(inputImage)
            .addOnSuccessListener { visionText ->
                val recognized = visionText.text.trim()
                if (recognized.isEmpty()) {
                    binding.resultText.setText(R.string.no_text_found)
                    binding.statusText.setText(R.string.status_ready)
                    speak(getString(R.string.no_text_found))
                } else {
                    binding.resultText.text = recognized
                    binding.statusText.setText(R.string.status_speaking)
                    playSuccessTone()
                    speak(recognized)
                }
            }
            .addOnFailureListener {
                binding.resultText.setText(R.string.recognize_failed)
                binding.statusText.setText(R.string.status_ready)
            }
            .addOnCompleteListener {
                imageProxy.close()
                binding.scanButton.isEnabled = true
            }
    }

    /** 识别成功时的音效提示 */
    private fun playSuccessTone() {
        toneGenerator?.startTone(ToneGenerator.TONE_PROP_ACK, 200)
    }

    private fun speak(text: String) {
        if (!ttsReady) {
            Toast.makeText(this, R.string.tts_not_ready, Toast.LENGTH_SHORT).show()
            return
        }
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, UTTERANCE_ID)
    }

    private fun stopSpeaking() {
        tts?.stop()
        if (ttsReady) {
            binding.statusText.setText(R.string.status_ready)
        }
    }

    override fun onInit(status: Int) {
        if (status != TextToSpeech.SUCCESS) {
            Toast.makeText(this, R.string.tts_init_failed, Toast.LENGTH_LONG).show()
            return
        }

        val result = tts?.setLanguage(Locale.SIMPLIFIED_CHINESE)
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            Toast.makeText(this, R.string.tts_chinese_unavailable, Toast.LENGTH_LONG).show()
            return
        }

        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}

            override fun onDone(utteranceId: String?) {
                runOnUiThread { binding.statusText.setText(R.string.status_ready) }
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                runOnUiThread { binding.statusText.setText(R.string.status_ready) }
            }
        })

        ttsReady = true
    }

    override fun onDestroy() {
        super.onDestroy()
        tts?.stop()
        tts?.shutdown()
        toneGenerator?.release()
        textRecognizer.close()
    }

    companion object {
        private const val UTTERANCE_ID = "scan_reader_utterance"
    }
}
