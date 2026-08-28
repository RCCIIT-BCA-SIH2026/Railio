/*
 * ============================================================================
 * RailSathi - ESP32 + MPU6050 Track Vibration & Anomaly Telemetry Node
 * Predict • Protect • Connect
 * ============================================================================
 * Hardware Setup:
 * - ESP32 Dev Module
 * - MPU6050 6-Axis IMU (SDA -> GPIO 21, SCL -> GPIO 22, VCC -> 3.3V, GND -> GND)
 * - Status LED -> GPIO 2
 * - Buzzer -> GPIO 4
 *
 * Transmits 3-axis accelerometer and gyro data over Wi-Fi/MQTT or HTTP POST
 * to the RailSathi Node.js / FastAPI Gateway for AI-powered progressive track risk.
 * 
 * DISCLAIMER: Decision support prototype. Not certified railway safety equipment.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>

// Wi-Fi Credentials
const char* WIFI_SSID = "RailSathi_Track_IoT";
const char* WIFI_PASS = "RailSathi2026";

// Backend Ingestion Endpoint
const char* SERVER_URL = "http://192.168.1.100:5000/api/track/sensor";

// MPU6050 I2C Address
const int MPU_ADDR = 0x68;

// Telemetry Metadata
const char* SECTION_ID = "HWH-B17";
const char* TRAIN_NUMBER = "12301";

// Variables for Raw Sensor Data
int16_t raw_ax, raw_ay, raw_az;
int16_t raw_gx, raw_gy, raw_gz;

float ax, ay, az; // in 'g' units
float gx, gy, gz; // in deg/s
float vibration_rms = 0.0;

// Anomaly Thresholds
const float VIBRATION_THRESHOLD_WARNING = 2.4;
const float VIBRATION_THRESHOLD_CRITICAL = 3.2;

#define LED_PIN 2
#define BUZZER_PIN 4

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(21, 22);

  // Initialize MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0);    // Wake up MPU-6050
  Wire.endTransmission(true);

  Serial.println("[RailSathi] MPU6050 Initialized.");

  // Connect to Wi-Fi
  Serial.print("[RailSathi] Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[RailSathi] Wi-Fi Connected! IP: " + WiFi.localIP().toString());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n[RailSathi] Operating in Offline Sensor Buffer Mode.");
  }
}

void loop() {
  readMPU6050();

  // Calculate 3-axis RMS magnitude: sqrt(ax^2 + ay^2 + az^2)
  vibration_rms = sqrt(ax * ax + ay * ay + az * az);

  bool is_anomaly = (vibration_rms >= VIBRATION_THRESHOLD_WARNING);

  if (is_anomaly) {
    digitalWrite(BUZZER_PIN, HIGH);
    Serial.printf("⚠️ [ANOMALY DETECTED] Section: %s | RMS: %.2fg\n", SECTION_ID, vibration_rms);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
  }

  // Send Telemetry Payload
  if (WiFi.status() == WL_CONNECTED) {
    sendTelemetry(is_anomaly);
  }

  delay(1000); // 1 Hz Telemetry stream
}

void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Register 0x3B (ACCEL_XOUT_H)
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  raw_ax = Wire.read() << 8 | Wire.read();
  raw_ay = Wire.read() << 8 | Wire.read();
  raw_az = Wire.read() << 8 | Wire.read();
  Wire.read() << 8 | Wire.read(); // Temperature (unused)
  raw_gx = Wire.read() << 8 | Wire.read();
  raw_gy = Wire.read() << 8 | Wire.read();
  raw_gz = Wire.read() << 8 | Wire.read();

  // Convert raw readings to 'g' (±2g range) and deg/s (±250 deg/s range)
  ax = (float)raw_ax / 16384.0;
  ay = (float)raw_ay / 16384.0;
  az = (float)raw_az / 16384.0;

  gx = (float)raw_gx / 131.0;
  gy = (float)raw_gy / 131.0;
  gz = (float)raw_gz / 131.0;
}

void sendTelemetry(bool is_anomaly) {
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<300> doc;
  doc["sectionId"] = SECTION_ID;
  doc["trainNumber"] = TRAIN_NUMBER;
  doc["accelX"] = ax;
  doc["accelY"] = ay;
  doc["accelZ"] = az;
  doc["gyroX"] = gx;
  doc["gyroY"] = gy;
  doc["gyroZ"] = gz;
  doc["vibrationRms"] = vibration_rms;
  doc["anomalyDetected"] = is_anomaly;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.printf("[RailSathi Telemetry] Sent OK (HTTP %d)\n", httpCode);
  } else {
    Serial.printf("[RailSathi Telemetry] POST Error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}
