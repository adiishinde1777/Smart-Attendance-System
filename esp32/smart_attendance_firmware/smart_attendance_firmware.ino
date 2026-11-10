/*
 * =========================================================================================
 * SMART ATTENDANCE SYSTEM - IoT BASED COLLEGE MANAGEMENT PLATFORM
 * Production ESP32 Firmware for RFID RC522, I2C 16x2 LCD, Status LEDs & Buzzer
 * =========================================================================================
 * 
 * Hardware Requirements:
 * - ESP32 NodeMCU-32S / ESP-WROOM-32 Development Board
 * - MFRC522 RFID Reader (SPI mode, 3.3V power ONLY!)
 * - 16x2 LCD with PCF8574 I2C Backpack (I2C address 0x27 or 0x3F)
 * - 1x Green LED (Success) + 220 Ohm Resistor
 * - 1x Red LED (Error/Reject) + 220 Ohm Resistor
 * - 1x Active or Passive Piezo Buzzer
 * 
 * Features:
 * - Automatic Wi-Fi connection and reconnect watchdog
 * - Periodic background heartbeats (60s) to keep online status active
 * - HTTPS / HTTP JSON REST API integration
 * - Hardware device authentication via X-Device-Id and X-Device-Token headers
 * - Dual-line LCD status animations
 * - Success / Error audible buzzer feedback patterns
 * - Duplicate scan cooldown (3000ms)
 * - Offline scan buffering: caches scans when offline and syncs upon reconnection
 * =========================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// =========================================================================================
// 1. PIN DEFINITIONS & HARDWARE CONFIGURATION
// =========================================================================================

// RC522 RFID SPI Pins (ESP32 Hardware VSPI)
#define SS_PIN          5       // SDA / SS Pin
#define RST_PIN         22      // Reset Pin
#define SCK_PIN         18      // SPI Clock
#define MISO_PIN        19      // SPI Master In Slave Out
#define MOSI_PIN        23      // SPI Master Out Slave In

// Indicators & Audio
#define GREEN_LED_PIN   2       // Green LED (Attendance Confirmed)
#define RED_LED_PIN     4       // Red LED (Card Blocked / Unknown / Error)
#define BUZZER_PIN      15      // Piezo Buzzer

// I2C LCD Configuration
#define LCD_I2C_ADDR    0x27    // Standard I2C address (use 0x3F if 0x27 doesn't respond)
#define LCD_COLS        16
#define LCD_ROWS        2
#define SDA_PIN         21      // ESP32 default I2C SDA
#define SCL_PIN         22      // ESP32 default I2C SCL (Note: if RST_PIN is 22, move RST to GPIO 27)

// Let's redefine RST_PIN to GPIO 27 to avoid I2C SCL collision on GPIO 22:
#undef RST_PIN
#define RST_PIN         27      // RC522 RST moved to GPIO 27 for clean I2C coexistence

// =========================================================================================
// 2. NETWORK & SERVER CREDENTIALS
// =========================================================================================

// Wi-Fi Configuration
const char* WIFI_SSID     = "College_WiFi_SSID";
const char* WIFI_PASSWORD = "College_WiFi_Password";

// Backend API Server Configuration
// Replace with the IP address or domain name of your backend server (e.g. 192.168.1.100:5000)
const char* SERVER_BASE_URL = "http://192.168.1.100:5000/api";

// ESP32 IoT Device Identity & Hardware Security Tokens
const char* DEVICE_ID       = "ESP32-TY-A-01";
const char* DEVICE_TOKEN    = "esp32_secret_token_101";

// =========================================================================================
// 3. GLOBAL OBJECTS & STATE VARIABLES
// =========================================================================================

MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

// Offline Queue Buffer Structure
struct OfflineScan {
  char cardUid[20];
  char eventId[32];
  unsigned long timestamp;
};

#define OFFLINE_QUEUE_SIZE 25
OfflineScan offlineQueue[OFFLINE_QUEUE_SIZE];
int queueCount = 0;

// Timing and cooldowns
unsigned long lastScanMillis = 0;
String lastScannedUid = "";
const unsigned long SCAN_COOLDOWN_MS = 3000;

unsigned long lastHeartbeatMillis = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 60000; // 60 seconds

// =========================================================================================
// 4. AUDIO & VISUAL FEEDBACK HELPERS
// =========================================================================================

void playSuccessBuzzer() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(120);
  digitalWrite(BUZZER_PIN, LOW);
}

void playErrorBuzzer() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(80);
    digitalWrite(BUZZER_PIN, LOW);
    delay(70);
  }
}

void indicateSuccess(const String& name, const String& statusText) {
  digitalWrite(GREEN_LED_PIN, HIGH);
  digitalWrite(RED_LED_PIN, LOW);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  // Truncate name to 16 characters for LCD
  String displayFirstLine = name.length() > 16 ? name.substring(0, 16) : name;
  lcd.print(displayFirstLine);
  
  lcd.setCursor(0, 1);
  lcd.print(statusText.length() > 16 ? statusText.substring(0, 16) : statusText);
  
  playSuccessBuzzer();
  delay(1500);
  
  digitalWrite(GREEN_LED_PIN, LOW);
}

void indicateFailure(const String& line1, const String& line2) {
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, HIGH);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.length() > 16 ? line1.substring(0, 16) : line1);
  
  lcd.setCursor(0, 1);
  lcd.print(line2.length() > 16 ? line2.substring(0, 16) : line2);
  
  playErrorBuzzer();
  delay(1800);
  
  digitalWrite(RED_LED_PIN, LOW);
}

void displayIdleScreen() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Smart Attendance");
  lcd.setCursor(0, 1);
  if (WiFi.status() == WL_CONNECTED) {
    lcd.print("Tap RFID Card...");
  } else {
    lcd.print("Offline Mode...");
  }
}

// =========================================================================================
// 5. WI-FI & HEARTBEAT MANAGEMENT
// =========================================================================================

void connectWiFi() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    lcd.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString());
    delay(1500);
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Using Offline");
    delay(1500);
  }
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/devices/heartbeat";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  StaticJsonDocument<128> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["wifiRssi"] = WiFi.RSSI();
  doc["freeHeap"] = ESP.getFreeHeap();

  String payload;
  serializeJson(doc, payload);

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.printf("[HEARTBEAT] Server response: %d\n", httpCode);
  } else {
    Serial.printf("[HEARTBEAT] Error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// =========================================================================================
// 6. OFFLINE SCAN BUFFER & SYNCHRONIZATION
// =========================================================================================

void enqueueOfflineScan(const String& uid) {
  if (queueCount >= OFFLINE_QUEUE_SIZE) {
    // Shift left to discard oldest
    for (int i = 0; i < OFFLINE_QUEUE_SIZE - 1; i++) {
      offlineQueue[i] = offlineQueue[i + 1];
    }
    queueCount = OFFLINE_QUEUE_SIZE - 1;
  }

  strncpy(offlineQueue[queueCount].cardUid, uid.c_str(), sizeof(offlineQueue[queueCount].cardUid));
  snprintf(offlineQueue[queueCount].eventId, sizeof(offlineQueue[queueCount].eventId), "OFF-%lu-%d", millis(), queueCount);
  offlineQueue[queueCount].timestamp = millis();
  queueCount++;

  Serial.printf("[OFFLINE] Buffered scan for UID %s. Total in queue: %d\n", uid.c_str(), queueCount);
}

void syncOfflineScans() {
  if (queueCount == 0 || WiFi.status() != WL_CONNECTED) return;

  Serial.printf("[SYNC] Attempting to sync %d offline scans...\n", queueCount);
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/devices/sync-offline";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  DynamicJsonDocument doc(4096);
  JsonArray queueArr = doc.createNestedArray("queue");
  for (int i = 0; i < queueCount; i++) {
    JsonObject item = queueArr.createNestedObject();
    item["cardUid"] = offlineQueue[i].cardUid;
    item["scanEventId"] = offlineQueue[i].eventId;
    item["timestamp"] = offlineQueue[i].timestamp;
  }

  String payload;
  serializeJson(doc, payload);
  int httpCode = http.POST(payload);

  if (httpCode == 200 || httpCode == 201) {
    Serial.println("[SYNC] Offline scans successfully synced with backend!");
    queueCount = 0; // Clear queue
  } else {
    Serial.printf("[SYNC] Failed to sync. HTTP %d\n", httpCode);
  }
  http.end();
}

// =========================================================================================
// 7. REST API SCAN DISPATCHER
// =========================================================================================

void sendScanToServer(const String& cardUid) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("UID: " + cardUid);
  lcd.setCursor(0, 1);
  lcd.print("Verifying...");

  if (WiFi.status() != WL_CONNECTED) {
    // Offline caching mode
    enqueueOfflineScan(cardUid);
    indicateSuccess("Saved Offline", "Sync on WiFi");
    displayIdleScreen();
    return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/devices/scan";
  http.begin(url);
  http.setTimeout(4000); // 4 second timeout
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  StaticJsonDocument<256> reqDoc;
  reqDoc["cardUid"] = cardUid;
  reqDoc["scanEventId"] = "EVT-" + String(millis());
  reqDoc["deviceCode"] = DEVICE_ID;

  String reqPayload;
  serializeJson(reqDoc, reqPayload);

  int httpCode = http.POST(reqPayload);

  if (httpCode > 0) {
    String responseString = http.getString();
    DynamicJsonDocument resDoc(1024);
    DeserializationError error = deserializeJson(resDoc, responseString);

    if (!error) {
      bool isSuccess = resDoc["success"] | false;
      const char* studentName = resDoc["studentName"] | "Student";
      const char* subjectName = resDoc["subjectName"] | "Lecture";
      const char* displayMsg = resDoc["displayMessage"] | "Verified";
      const char* errorMsg = resDoc["message"] | "Scan Rejected";

      if (isSuccess) {
        indicateSuccess(String(studentName), String(displayMsg));
      } else {
        indicateFailure("Scan Rejected", String(displayMsg));
      }
    } else {
      indicateFailure("Server Error", "JSON Parse Err");
    }
  } else {
    // Server or network timeout -> enqueue offline
    Serial.printf("[HTTP ERROR] %s\n", http.errorToString(httpCode).c_str());
    enqueueOfflineScan(cardUid);
    indicateFailure("Net Timeout", "Buffered Offline");
  }

  http.end();
  displayIdleScreen();
}

// =========================================================================================
// 8. SETUP & MAIN LOOP
// =========================================================================================

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== SMART ATTENDANCE IOT SYSTEM BOOTING ===");

  // Pin modes
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize LCD
  Wire.begin(SDA_PIN, SCL_PIN);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("College IoT ERP");
  lcd.setCursor(0, 1);
  lcd.print("Init Hardware...");
  delay(1000);

  // Initialize SPI & RC522 RFID Reader
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  mfrc522.PCD_Init();
  delay(100);
  mfrc522.PCD_DumpVersionToSerial(); // Prints firmware version of RC522

  // Connect to Wi-Fi
  connectWiFi();

  // Send initial startup heartbeat
  sendHeartbeat();

  displayIdleScreen();
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. Wi-Fi Reconnect Watchdog
  if (WiFi.status() != WL_CONNECTED && currentMillis % 15000 < 50) {
    Serial.println("[WIFI] Attempting background reconnection...");
    WiFi.reconnect();
  }

  // 2. Periodic Heartbeat
  if (currentMillis - lastHeartbeatMillis >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMillis = currentMillis;
    sendHeartbeat();
    syncOfflineScans();
  }

  // 3. RFID Card Detection
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Format Card UID to uppercase hex string (e.g. A3B5C821)
  String uidString = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidString += "0";
    uidString += String(mfrc522.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();

  // Prevent multiple scans within 3 seconds of the same card
  if (uidString == lastScannedUid && (currentMillis - lastScanMillis < SCAN_COOLDOWN_MS)) {
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return;
  }

  lastScanMillis = currentMillis;
  lastScannedUid = uidString;

  Serial.println("\n-------------------------------------------");
  Serial.printf("[RFID SCANNED] Card UID: %s\n", uidString.c_str());
  Serial.println("-------------------------------------------");

  // Send scan payload to backend server
  sendScanToServer(uidString);

  // Halt card communication until next card
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
