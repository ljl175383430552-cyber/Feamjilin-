plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.chromascreen.wear"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.chromascreen.wear"
        // API 23 覆盖 Wear OS 2.0(API 25) 以及大量国产 AOSP 安卓手表(Android 6/7/8)
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
        resourceConfigurations += listOf("zh", "en")
    }

    // universal: 不声明 watch 特性，任意安卓设备(手表/手机/AOSP 手表)都能侧载
    // playwear: 声明 watch 特性为必需，用于 Google Play 的 Wear OS 表单分发
    flavorDimensions += "distribution"
    productFlavors {
        create("universal") {
            dimension = "distribution"
            isDefault = true
            manifestPlaceholders["watchFeatureRequired"] = "false"
        }
        create("playwear") {
            dimension = "distribution"
            manifestPlaceholders["watchFeatureRequired"] = "true"
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // 未配置签名时用 debug 签名出包，方便直接侧载到手表
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }

    packaging {
        resources.excludes += setOf(
            "/META-INF/{AL2.0,LGPL2.1}",
            "DebugProbesKt.bin",
            "kotlin-tooling-metadata.json",
        )
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.ui)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.androidx.compose.ui.tooling.preview)

    // 没有 KVM 的 CI 机器上也能跑：Robolectric 在 JVM 里直接驱动 Compose
    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(platform(libs.androidx.compose.bom))
    testImplementation(libs.androidx.compose.ui.test.junit4)
    // 必须走 debugImplementation：Robolectric 读的是 app 合并后的 manifest，
    // 只有这样才能解析到 ui-test-manifest 里的 ComponentActivity
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
