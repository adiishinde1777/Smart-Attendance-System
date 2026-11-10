/*
 * =========================================================================================
 * SMART ATTENDANCE SYSTEM - IoT BASED COLLEGE MANAGEMENT PLATFORM
 * ESP8266 (NodeMCU) Firmware for RFID RC522, 3 Status LEDs & Buzzer (No LCD Required)
 * =========================================================================================
 *
 * Hardware Connections (NodeMCU ESP8266):
 * - RFID RC522:
 *     3.3V -> 3V3   (DO NOT connect to 5V/VIN!)
 *     GND  -> GND
 *     RST  -> D3 (GPIO 0)
 *     SDA  -> D4 (GPIO 2)
 *     SCK  -> D5 (GPIO 14)
 *     MISO -> D6 (GPIO 12)
 *     MOSI -> D7 (GPIO 13)
 * - 3 LEDs (with 220 Ohm / 330 Ohm resistors to GND):
 *     Green LED  (Attendance Marked)  -> D1 (GPIO 5)
 *     Red LED    (Busy / Rejected)    -> D2 (GPIO 4)
 *     Yellow LED (Wi-Fi / Ready)      -> D0 (GPIO 16)
 * - Piezo Buzzer:
 *     Buzzer (+) -> D8 (GPIO 15)
 *     Buzzer (-) -> GND
 *
 * LED Behavior:
 * - Wi-Fi Connected       : Yellow LED blinks 3 times, then stays ON (Device Ready!)
 * - Device Ready          : Yellow LED ON (Students can tap cards)
 * - Attendance Marked     : Green LED blinks (with success beep)
 * - Rejection / Error     : Red LED blinks 2 times (with 2 error beeps)
 * - 3.5s Busy / Cooldown  : Red LED blinks for ~3.5s ("Do NOT tap card yet!"),
 *                           then Yellow LED turns ON again when Ready!
 * =========================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>

// Uncomment the line below ONLY if you have a passive buzzer (clicks with digitalWrite)
// #define USE_PASSIVE_BUZZER

// =========================================================================================
// 1. PIN DEFINITIONS
// =========================================================================================

// RC522 RFID SPI Pins (SCK=GPIO14/D5, MISO=GPIO12/D6, MOSI=GPIO13/D7 are fixed hardware SPI)
#define RST_PIN         0       // D3 (GPIO 0)
#define SS_PIN          2       // D4 (GPIO 2) - SDA / SS

// 3 LEDs & Buzzer
#define GREEN_LED_PIN   5       // D1 (GPIO 5)  - Green LED (Attendance Marked)
#define RED_LED_PIN     4       // D2 (GPIO 4)  - Red LED (Rejected / Busy Cooldown)
#define STATUS_LED_PIN  16      // D0 (GPIO 16) - Yellow LED (Wi-Fi 3x Blink + Ready)
#define BUZZER_PIN      15      // D8 (GPIO 15) - Piezo Buzzer

// =========================================================================================
// 2. NETWORK & BACKEND SERVER CONFIGURATION
// =========================================================================================

const char* WIFI_SSID       = "Adii's S24";
const char* WIFI_PASSWORD   = "";   // Open hotspot (no password)

// NOTE FOR SAMSUNG S24 HOTSPOT:
// ESP8266 only supports 2.4 GHz Wi-Fi!
// On your phone: Mobile Hotspot -> Configure -> Band -> Select "2.4 GHz" (not 5 GHz).

// Your laptop's Wi-Fi IPv4 address (verified via ipconfig):
const char* SERVER_BASE_URL = "http://10.35.193.207:5000/api";

// Registered device credentials in backend database (configured by Super Admin):
const char* DEVICE_ID       = "ESP32-TY-A-01";
const char* DEVICE_TOKEN    = "esp32_secret_token_101";

// =========================================================================================
// 3. GLOBAL OBJECTS & STATE VARIABLES
// =========================================================================================

MFRC522 mfrc522(SS_PIN, RST_PIN);

struct OfflineScan {
  char cardUid[20];
  char eventId[32];
  unsigned long timestamp;
};

#define OFFLINE_QUEUE_SIZE 20
OfflineScan offlineQueue[OFFLINE_QUEUE_SIZE];
int queueCount = 0;

const unsigned long SCAN_BUSY_COOLDOWN_MS = 3500; // 3.5 sec busy cooldown with Red LED blink
unsigned long lastHeartbeatMillis = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 60000; // 60 seconds
unsigned long lastReconnectMillis = 0;

// =========================================================================================
// 4. BUZZER & 3-LED FEEDBACK HELPERS
// =========================================================================================

void buzzerOn(int freq = 2000) {
#ifdef USE_PASSIVE_BUZZER
  tone(BUZZER_PIN, freq);
#else
  digitalWrite(BUZZER_PIN, HIGH);
#endif
}

void buzzerOff() {
#ifdef USE_PASSIVE_BUZZER
  noTone(BUZZER_PIN);
#else
  digitalWrite(BUZZER_PIN, LOW);
#endif
}

void playStartupBeep() {
  buzzerOn(2200);
  delay(80);
  buzzerOff();
}

void runLedAndBuzzerTest() {
  Serial.println("[TEST] Checking all 3 LEDs + Buzzer one by one...");
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);

  Serial.println("[TEST] 1/3 Green LED (D1) ON");
  digitalWrite(GREEN_LED_PIN, HIGH); delay(500);
  digitalWrite(GREEN_LED_PIN, LOW);  delay(150);

  Serial.println("[TEST] 2/3 Red LED (D2) ON");
  digitalWrite(RED_LED_PIN, HIGH);   delay(500);
  digitalWrite(RED_LED_PIN, LOW);    delay(150);

  Serial.println("[TEST] 3/3 Yellow LED (D0) ON");
  digitalWrite(STATUS_LED_PIN, HIGH); delay(500);
  digitalWrite(STATUS_LED_PIN, LOW);  delay(150);

  playStartupBeep();
  Serial.println("[TEST] Hardware test finished.");
}

// Yellow LED: Ready when Wi-Fi is connected, OFF when disconnected
void updateReadyLed() {
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH); // Ready! Tap card
  } else {
    digitalWrite(STATUS_LED_PIN, LOW);  // Not connected yet
  }
}

// Blink Yellow LED 3 times to confirm Wi-Fi connectivity, then leave Yellow ON (Ready)
void indicateWifiConnected() {
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);
  delay(250);
  for (int i = 0; i < 3; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    buzzerOn(2200);
    delay(200);
    digitalWrite(STATUS_LED_PIN, LOW);
    buzzerOff();
    delay(180);
  }
  delay(150);
  digitalWrite(STATUS_LED_PIN, HIGH); // Stay ON = Ready for scanning!
}

// Green LED blinks on successful attendance mark
void indicateAttendanceMarked() {
  digitalWrite(STATUS_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  for (int i = 0; i < 3; i++) {
    digitalWrite(GREEN_LED_PIN, HIGH);
    if (i == 0) buzzerOn(2400);
    delay(220);
    buzzerOff();
    digitalWrite(GREEN_LED_PIN, LOW);
    delay(140);
  }
}

// Red LED blinks 2 times on rejection (Unknown card, Duplicate, Blocked, Error)
void indicateRejection() {
  digitalWrite(STATUS_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);
  for (int i = 0; i < 2; i++) {
    digitalWrite(RED_LED_PIN, HIGH);
    buzzerOn(900);
    delay(240);
    digitalWrite(RED_LED_PIN, LOW);
    buzzerOff();
    delay(180);
  }
}

// 3-4 sec Busy / Cooldown: Red LED blinks continuously -> "Do NOT tap card yet!"
// Then turns Red OFF and turns Yellow ON -> "Device Ready again!"
void waitBusyCooldownAndSignalReady(unsigned long durationMs) {
  digitalWrite(STATUS_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);

  Serial.println("[BUSY] Cooldown active (Red blinking - Do NOT tap card yet)...");
  unsigned long startMs = millis();
  bool redState = true;

  while (millis() - startMs < durationMs) {
    digitalWrite(RED_LED_PIN, redState ? HIGH : LOW);
    redState = !redState;

    // Drain/halt any premature card read attempts during cooldown
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
      mfrc522.PICC_HaltA();
      mfrc522.PCD_StopCrypto1();
    }
    delay(220);
  }

  digitalWrite(RED_LED_PIN, LOW);
  delay(100);

  // Ready again -> Yellow LED blinks briefly and stays ON
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(150);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(100);
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("[READY] Yellow LED ON -> Ready for next RFID card!");
  } else {
    Serial.println("[WIFI] Offline -> waiting for Wi-Fi connection...");
  }
}

// =========================================================================================
// 5. WI-FI & HEARTBEAT MANAGEMENT
// =========================================================================================

void startWiFiConnection() {
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.mode(WIFI_STA);
  if (strlen(WIFI_PASSWORD) == 0) {
    WiFi.begin(WIFI_SSID); // Open hotspot (no password)
  } else {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

void connectWiFi() {
  Serial.printf("\n[WIFI] Connecting to \"%s\"", WIFI_SSID);
  startWiFiConnection();

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    digitalWrite(STATUS_LED_PIN, attempts % 2 == 0 ? HIGH : LOW);
    delay(350);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected!");
    Serial.print("[WIFI] ESP8266 IP Address: ");
    Serial.println(WiFi.localIP());
    indicateWifiConnected(); // Blinks Yellow 3 times, then keeps Yellow ON (Ready!)
  } else {
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.println("\n[WIFI] Failed! Ensure 'Adii's S24' Hotspot Band is set to 2.4 GHz.");
    indicateRejection(); // 2 Red blinks
  }
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/devices/heartbeat";

  if (!http.begin(client, url)) return;

  http.setTimeout(4000);
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
    Serial.printf("[HEARTBEAT] Server HTTP %d (Online)\n", httpCode);
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
    for (int i = 0; i < OFFLINE_QUEUE_SIZE - 1; i++) {
      offlineQueue[i] = offlineQueue[i + 1];
    }
    queueCount = OFFLINE_QUEUE_SIZE - 1;
  }

  strncpy(offlineQueue[queueCount].cardUid, uid.c_str(), sizeof(offlineQueue[queueCount].cardUid) - 1);
  offlineQueue[queueCount].cardUid[sizeof(offlineQueue[queueCount].cardUid) - 1] = '\0';
  snprintf(offlineQueue[queueCount].eventId, sizeof(offlineQueue[queueCount].eventId), "OFF-%lu-%d", millis(), queueCount);
  offlineQueue[queueCount].timestamp = millis();
  queueCount++;

  Serial.printf("[OFFLINE] Buffered UID %s. Queue size: %d\n", uid.c_str(), queueCount);
}

void syncOfflineScans() {
  if (queueCount == 0 || WiFi.status() != WL_CONNECTED) return;

  Serial.printf("[SYNC] Syncing %d offline scan(s)...\n", queueCount);
  WiFiClient client;
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/devices/sync-offline";

  if (!http.begin(client, url)) return;

  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  DynamicJsonDocument doc(2048);
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
    Serial.println("[SYNC] Offline queue synced successfully!");
    queueCount = 0;
  } else {
    Serial.printf("[SYNC] Sync failed. HTTP %d\n", httpCode);
  }
  http.end();
}

// =========================================================================================
// 7. REST API SCAN DISPATCHER
// =========================================================================================

void sendScanToServer(const String& cardUid) {
  // Turn Yellow OFF & Red ON while communicating with server ("Scanning — do not tap!")
  digitalWrite(STATUS_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, HIGH);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[OFFLINE] Wi-Fi not connected -> scan buffered offline.");
    enqueueOfflineScan(cardUid);
    digitalWrite(RED_LED_PIN, LOW);
    indicateRejection(); // 2 Red blinks
    waitBusyCooldownAndSignalReady(SCAN_BUSY_COOLDOWN_MS);
    return;
  }

  WiFiClient client;
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/devices/scan";

  if (!http.begin(client, url)) {
    Serial.println("[HTTP] Unable to begin connection.");
    digitalWrite(RED_LED_PIN, LOW);
    indicateRejection();
    waitBusyCooldownAndSignalReady(SCAN_BUSY_COOLDOWN_MS);
    return;
  }

  http.setTimeout(4000);
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
  digitalWrite(RED_LED_PIN, LOW);

  if (httpCode > 0) {
    String responseString = http.getString();
    DynamicJsonDocument resDoc(1024);
    DeserializationError error = deserializeJson(resDoc, responseString);

    if (!error) {
      bool isSuccess = resDoc["success"] | false;
      const char* studentName = resDoc["studentName"] | "Unknown";
      const char* subjectName = resDoc["subjectName"] | "Lecture";
      const char* statusText  = resDoc["attendanceStatus"] | "";
      const char* msg         = resDoc["message"] | "No message";
      const char* errCode     = resDoc["errorCode"] | "";

      if (isSuccess) {
        Serial.printf("[SUCCESS] %s -> %s (%s)\n", studentName, subjectName, statusText);
        indicateAttendanceMarked(); // Green LED blinks!
      } else {
        Serial.printf("[REJECTED] (%s) %s\n", errCode, msg);
        indicateRejection(); // Red LED blinks 2 times!
      }
    } else {
      Serial.println("[ERROR] Invalid server response.");
      indicateRejection();
    }
  } else {
    Serial.printf("[HTTP ERROR] %s -> Buffering scan offline.\n", http.errorToString(httpCode).c_str());
    enqueueOfflineScan(cardUid);
    indicateRejection();
  }

  http.end();

  // 3.5-second Red LED blinking cooldown ("Do NOT tap yet"), then Yellow LED ON (Ready!)
  waitBusyCooldownAndSignalReady(SCAN_BUSY_COOLDOWN_MS);
}

// =========================================================================================
// 8. SETUP & MAIN LOOP
// =========================================================================================

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=== SMART ATTENDANCE SYSTEM (ESP8266 NodeMCU) ===");

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);
  buzzerOff();

  runLedAndBuzzerTest();

  SPI.begin();
  mfrc522.PCD_Init();
  delay(100);
  mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);
  byte rcVersion = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  Serial.printf("[RFID] Reader Version: 0x%02X ", rcVersion);
  mfrc522.PCD_DumpVersionToSerial();
  if (rcVersion == 0x00 || rcVersion == 0xFF) {
    Serial.println("[RFID ERROR] RC522 module not responding! Check 3.3V power & RST(D3)/SDA(D4)/SCK(D5)/MISO(D6)/MOSI(D7) wires.");
    indicateRejection();
  }

  connectWiFi();
  sendHeartbeat();
  Serial.println("[READY] System ready! Tap an RFID card (or send 'T' in Serial Monitor to test LEDs).");
}

void loop() {
  unsigned long currentMillis = millis();
  updateReadyLed();

  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'T' || cmd == 't') {
      runLedAndBuzzerTest();
    }
  }

  // 1. Reconnect Wi-Fi every 25 seconds if disconnected (proper timeout for phone hotspot DHCP)
  if (WiFi.status() != WL_CONNECTED && (currentMillis - lastReconnectMillis >= 25000)) {
    lastReconnectMillis = currentMillis;
    Serial.println("[WIFI] Reconnecting...");
    connectWiFi();
    if (WiFi.status() == WL_CONNECTED) {
      sendHeartbeat();
      syncOfflineScans();
    }
  }

  // 2. Periodic Heartbeat & Offline Sync every 60 seconds
  if (currentMillis - lastHeartbeatMillis >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMillis = currentMillis;
    sendHeartbeat();
    syncOfflineScans();
  }

  // 3. Check for new RFID card
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Format UID into uppercase HEX string
  String uidString = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uidString += "0";
    uidString += String(mfrc522.uid.uidByte[i], HEX);
  }
  uidString.toUpperCase();

  Serial.println("\n-------------------------------------------");
  Serial.printf("[RFID SCANNED] Card UID: %s\n", uidString.c_str());

  // Process scan -> Green/Red result -> 3.5s Red busy cooldown -> Yellow Ready ON
  sendScanToServer(uidString);

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
