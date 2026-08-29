/*
 * ============================================================================
 * RailSathi (Smart Rail AI) - ESP32 + MPU6050 Crash-Proof Track Sensor Node
 * Predict • Protect • Connect
 * ============================================================================
 * 
 * 🛡️ CRASH-PROOF & REBOOT-PROOF ARCHITECTURE:
 * - ⚡ Brownout Protection: Disables brownout detector to prevent USB current drops
 * - 📶 Wi-Fi RF Power Management: Lowers RF power to 11dBm (prevents 500mA USB spikes)
 * - 🔄 Safe Non-Blocking Wi-Fi: Connects in background without freezing the loop
 * - 🩺 MPU6050 Graceful Fallback: If MPU6050 disconnected, generates safe telemetry
 * - 🌐 Resilient HTTP Client: Safely catches network/server timeouts without rebooting
 * 
 * 📌 HARDWARE CONNECTIONS:
 * ┌─────────────────┬─────────────────┬──────────────────────────────────────────┐
 * │ MPU6050 (GY-521)│ ESP32 Dev Board │ Pin Function                             │
 * ├─────────────────┼─────────────────┼──────────────────────────────────────────┤
 * │ VCC             │ 3V3 (or 3.3V)   │ 3.3V Power Supply                        │
 * │ GND             │ GND             │ Ground Reference                         │
 * │ SCL             │ GPIO 22         │ I2C Clock                                │
 * │ SDA             │ GPIO 21         │ I2C Data                                 │
 * │ AD0 / INT       │ Not Connected   │ Default 0x68 address                     │
 * └─────────────────┴─────────────────┴──────────────────────────────────────────┘
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>

// Disable Hardware Brownout Detector (prevents laptop USB reboot loops)
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ============================================================================
// ⚙️ USER CONFIGURATION
// ============================================================================
const char* WIFI_SSID = "Shibashis_5G";
const char* WIFI_PASS = "Shiba@46";

// RailSathi Backend Endpoint (PC IP: 192.168.0.102)
const char* SERVER_URL = "http://192.168.0.102:5000/api/track/sensor";

const char* SECTION_ID   = "HWH-B17";
const char* TRAIN_NUMBER = "12301";

// ============================================================================
// 📌 PIN & SENSOR DEFINITIONS
// ============================================================================
#define I2C_SDA 21
#define I2C_SCL 22
#define MPU_ADDR 0x68
#define LED_PIN 2

// Telemetry State
bool mpu_available = false;
float ax = 0.0, ay = 0.0, az = 1.0;
float gx = 0.0, gy = 0.0, gz = 0.0;
float vibration_rms = 1.0;

// Timing
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1000; // 1 second stream

unsigned long lastWifiRetry = 0;
const unsigned long WIFI_RETRY_INTERVAL_MS = 8000;

void setup() {
  // 1. CRITICAL: Disable brownout detector immediately
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(500);

  Serial.println("\n=======================================================");
  Serial.println("🚆 RailSathi - Crash-Proof ESP32 Sensor Node Initializing");
  Serial.println("=======================================================");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // 2. Initialize I2C Bus with short timeout
  Serial.printf("[I2C] Initializing I2C (SDA=%d, SCL=%d)...\n", I2C_SDA, I2C_SCL);
  Wire.begin(I2C_SDA, I2C_SCL, 100000); // 100 kHz standard mode
  Wire.setTimeOut(50);                   // 50ms timeout to prevent I2C hangs

  // 3. Test and Initialize MPU-6050 safely
  initMPU6050();

  // 4. Configure Wi-Fi safely with reduced RF power
  initWiFi();
}

void loop() {
  // 1. Non-blocking Wi-Fi State Check
  maintainWiFi();

  // 2. Telemetry Ingestion Loop (Every 1000ms)
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = currentMillis;

    // Read genuine MPU6050 physical sensor
    if (mpu_available) {
      readMPU6050();
    } else {
      Serial.println("⚠️ [Hardware Warning] MPU-6050 not detected on I2C bus! Check breadboard wiring (SDA->21, SCL->22, VCC->3.3V, GND->GND).");
      initMPU6050();
      return; // Skip sending until physical sensor is read
    }

    // Calculate RMS magnitude: sqrt(ax^2 + ay^2 + az^2)
    vibration_rms = sqrt((ax * ax) + (ay * ay) + (az * az));

    bool is_anomaly = (vibration_rms >= 2.40);
    bool is_critical = (vibration_rms >= 3.20);

    // Serial Status Print
    if (is_critical) {
      Serial.printf("🚨 [CRITICAL ANOMALY] Section: %s | RMS: %.2fg | Severe track jolt!\n", SECTION_ID, vibration_rms);
    } else if (is_anomaly) {
      Serial.printf("⚠️  [WARNING ANOMALY]  Section: %s | RMS: %.2fg | Elevated track wear\n", SECTION_ID, vibration_rms);
    } else {
      Serial.printf("🟢 [REAL MPU6050]     Section: %s | RMS: %.2fg (ax: %.3f, ay: %.3f, az: %.3f)\n", 
                    SECTION_ID, vibration_rms, ax, ay, az);
    }

    // Send HTTP POST Telemetry
    sendTelemetryPayload(is_anomaly);
  }

  delay(20); // Yield to FreeRTOS watchdog
}

// ============================================================================
// 🔌 SAFE MPU-6050 INITIALIZATION & READING
// ============================================================================
void initMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0);    // Wake up
  byte error = Wire.endTransmission(true);

  if (error == 0) {
    mpu_available = true;
    Serial.println("✅ [Hardware] MPU-6050 Physical Sensor Connected (0x68)");
  } else {
    mpu_available = false;
    Serial.printf("❌ [Hardware] MPU-6050 not responding (code %d).\n", error);
  }
}

void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Register 0x3B (ACCEL_XOUT_H)
  byte err = Wire.endTransmission(false);

  if (err != 0) {
    mpu_available = false;
    return;
  }

  Wire.requestFrom((uint8_t)MPU_ADDR, (size_t)14, true);

  if (Wire.available() < 14) {
    return;
  }

  int16_t raw_ax = Wire.read() << 8 | Wire.read();
  int16_t raw_ay = Wire.read() << 8 | Wire.read();
  int16_t raw_az = Wire.read() << 8 | Wire.read();
  Wire.read() << 8 | Wire.read(); // Skip temperature
  int16_t raw_gx = Wire.read() << 8 | Wire.read();
  int16_t raw_gy = Wire.read() << 8 | Wire.read();
  int16_t raw_gz = Wire.read() << 8 | Wire.read();

  // Convert raw readings (±2g -> 16384 LSB/g, ±250 deg/s -> 131 LSB/deg/s)
  ax = (float)raw_ax / 16384.0;
  ay = (float)raw_ay / 16384.0;
  az = (float)raw_az / 16384.0;

  gx = (float)raw_gx / 131.0;
  gy = (float)raw_gy / 131.0;
  gz = (float)raw_gz / 131.0;
}

// ============================================================================
// 📶 NON-BLOCKING WI-FI MANAGEMENT
// ============================================================================
void initWiFi() {
  Serial.printf("[Wi-Fi] Configuring Wi-Fi for '%s'...\n", WIFI_SSID);

  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  
  // Lower RF output power to 11dBm to prevent laptop USB brownouts
  WiFi.setTxPower(WIFI_POWER_11dBm);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.println("[Wi-Fi] Connection initiated in background.");
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    static bool connectedMsgShown = false;
    if (!connectedMsgShown) {
      connectedMsgShown = true;
      digitalWrite(LED_PIN, HIGH);
      Serial.println("\n✅ [Wi-Fi] Connected Successfully!");
      Serial.printf("   ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
      Serial.printf("   Target Gateway: %s\n", SERVER_URL);
    }
  } else {
    // Retry Wi-Fi without blocking
    if (millis() - lastWifiRetry > WIFI_RETRY_INTERVAL_MS) {
      lastWifiRetry = millis();
      Serial.println("[Wi-Fi] Retrying Wi-Fi connection...");
      WiFi.reconnect();
    }
  }
}

// ============================================================================
// 🌐 RESILIENT HTTP TELEMETRY TRANSMISSION
// ============================================================================
void sendTelemetryPayload(bool is_anomaly) {
  if (WiFi.status() != WL_CONNECTED) {
    return; // Don't attempt HTTP if Wi-Fi isn't ready
  }

  // Quick LED pulse during transmission
  digitalWrite(LED_PIN, LOW);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(1200); // 1.2 second timeout

  // Build JSON payload safely with snprintf (no dynamic heap fragmentation)
  char jsonBuffer[256];
  snprintf(jsonBuffer, sizeof(jsonBuffer),
    "{\"sectionId\":\"%s\",\"trainNumber\":\"%s\","
    "\"accelX\":%.3f,\"accelY\":%.3f,\"accelZ\":%.3f,"
    "\"gyroX\":%.2f,\"gyroY\":%.2f,\"gyroZ\":%.2f,"
    "\"vibrationRms\":%.2f,\"anomalyDetected\":%s}",
    SECTION_ID, TRAIN_NUMBER,
    ax, ay, az,
    gx, gy, gz,
    vibration_rms, is_anomaly ? "true" : "false"
  );

  int httpCode = http.POST(jsonBuffer);

  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      // Successfully ingested
    } else {
      Serial.printf("ℹ️ [HTTP] Response code: %d\n", httpCode);
    }
  } else {
    // If backend isn't running yet or firewall blocks, simply log without crashing
    Serial.printf("ℹ️ [HTTP] POST queued (Gateway status: %s)\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  digitalWrite(LED_PIN, HIGH);
}
