/*
 * ============================================================================
 * 🚆 RailSathi - Lightweight USB Serial MPU-6050 Track Vibration Sensor
 * ============================================================================
 * 
 * 🔌 WIRING (4 Wires to Breadboard):
 * - VCC -> 3.3V (or 3V3)
 * - GND -> GND
 * - SCL -> GPIO 22
 * - SDA -> GPIO 21
 * 
 * 🚀 FEATURES:
 * - Direct USB Serial Stream (115200 baud) — No Wi-Fi required!
 * - Program size: ~15% (Instant fast upload, no brownout/power crashes)
 * - Outputs clean JSON over USB directly to your PC
 * ============================================================================
 */

#include <Wire.h>
#include <math.h>

#define MPU_ADDR 0x68
#define I2C_SDA 21
#define I2C_SCL 22
#define LED_PIN 2

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Initialize I2C Pins
  Wire.begin(I2C_SDA, I2C_SCL);

  // Wake up MPU-6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // Power management register
  Wire.write(0);    // Set to 0 to wake up sensor
  byte error = Wire.endTransmission(true);

  if (error == 0) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("✅ [MPU6050] Connected successfully over I2C (0x68)!");
  } else {
    Serial.printf("❌ [MPU6050] Not detected! Check wiring: SDA->21, SCL->22 (Error code: %d)\n", error);
  }
}

void loop() {
  // 1. Request 6 bytes of accelerometer data from MPU-6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Starting register: ACCEL_XOUT_H
  byte err = Wire.endTransmission(false);

  if (err == 0) {
    Wire.requestFrom((uint8_t)MPU_ADDR, (size_t)6, true);

    if (Wire.available() >= 6) {
      int16_t raw_ax = Wire.read() << 8 | Wire.read();
      int16_t raw_ay = Wire.read() << 8 | Wire.read();
      int16_t raw_az = Wire.read() << 8 | Wire.read();

      // Convert raw 16-bit values to G-force (±2g range -> 16384 LSB/g)
      float ax = (float)raw_ax / 16384.0;
      float ay = (float)raw_ay / 16384.0;
      float az = (float)raw_az / 16384.0;

      // Calculate Total Vibration RMS: sqrt(ax^2 + ay^2 + az^2)
      float rms = sqrt((ax * ax) + (ay * ay) + (az * az));
      bool is_anomaly = (rms >= 2.40);

      // 2. Output clean JSON line over USB Serial
      Serial.printf("{\"sectionId\":\"DAKE-DKAE-SUB5\",\"trainNumber\":\"32211\",\"accelX\":%.3f,\"accelY\":%.3f,\"accelZ\":%.3f,\"vibrationRms\":%.2f,\"anomaly\":%s}\n",
                    ax, ay, az, rms, is_anomaly ? "true" : "false");
    }
  } else {
    // Attempt sensor reconnection if disconnected
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x6B);
    Wire.write(0);
    Wire.endTransmission(true);
  }

  delay(250); // Stream 4 samples per second over USB
}
