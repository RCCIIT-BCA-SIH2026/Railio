/*
 * ============================================================================
 * RailSathi - ESP32 I2C Hardware Scanner (Diagnostic Tool)
 * Quick diagnostic tool to test MPU6050 wiring on Breadboard
 * ============================================================================
 * Hardware Connections:
 * - ESP32 3.3V  -> MPU6050 VCC
 * - ESP32 GND   -> MPU6050 GND
 * - ESP32 GPIO 21 -> MPU6050 SDA
 * - ESP32 GPIO 22 -> MPU6050 SCL
 * ============================================================================
 */

#include <Wire.h>

#define I2C_SDA 21
#define I2C_SCL 22

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  Serial.println("\n=======================================================");
  Serial.println("🚆 RailSathi - ESP32 I2C Hardware Bus Diagnostic");
  Serial.println("=======================================================");
  Serial.printf("Configuring I2C Pins: SDA = GPIO %d | SCL = GPIO %d\n", I2C_SDA, I2C_SCL);

  Wire.begin(I2C_SDA, I2C_SCL);
}

void loop() {
  byte error, address;
  int nDevices = 0;

  Serial.println("\n[Scanning I2C Bus for MPU6050...]");

  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();

    if (error == 0) {
      Serial.printf("✅ SUCCESS: I2C device found at 7-bit hex address: 0x%02X\n", address);
      if (address == 0x68) {
        Serial.println("   -> Target Recognized: MPU6050 6-Axis IMU (Standard 0x68 Address)");
        Serial.println("   -> Status: READY for RailSathi Firmware!");
      } else if (address == 0x69) {
        Serial.println("   -> Target Recognized: MPU6050 (AD0 pin HIGH, address 0x69)");
      }
      nDevices++;
    } else if (error == 4) {
      Serial.printf("❌ Unknown error at address 0x%02X\n", address);
    }
  }

  if (nDevices == 0) {
    Serial.println("⚠️ No I2C devices found.");
    Serial.println("👉 Troubleshooting Checklist:");
    Serial.println("   1. Check VCC wire: Is it in 3.3V?");
    Serial.println("   2. Check GND wire: Is it in GND?");
    Serial.println("   3. Check SDA wire: Must connect to GPIO 21");
    Serial.println("   4. Check SCL wire: Must connect to GPIO 22");
    Serial.println("   5. Press wires firmly into the breadboard.");
  } else {
    Serial.printf("\n🎯 Scan complete: %d device(s) found.\n", nDevices);
  }

  delay(5000); // Repeat scan every 5 seconds
}
