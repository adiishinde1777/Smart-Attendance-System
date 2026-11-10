# ESP32 Smart Attendance System - Hardware Setup & Flashing Instructions

Follow this step-by-step guide to configure the Arduino IDE, install board packages and libraries, connect the hardware, and flash the firmware to your ESP32 board.

---

## 1. Prerequisites & Required Software

1. Download and install the latest **Arduino IDE** (version 2.0+ or 1.8.19) from:
   [https://www.arduino.cc/en/software](https://www.arduino.cc/en/software)
2. USB Data Cable (Micro-USB or Type-C depending on your ESP32 board). Note: ensure it is a **data transfer cable**, not a power-only charge cable.
3. Install CP2102 or CH340 USB-to-UART bridge drivers if the COM port does not appear automatically in Windows Device Manager.

---

## 2. Install ESP32 Board Package in Arduino IDE

1. Open Arduino IDE.
2. Navigate to **File** -> **Preferences**.
3. In the **Additional Board Manager URLs** field, paste:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**.
5. Navigate to **Tools** -> **Board** -> **Boards Manager...**.
6. In the search box, type `esp32`.
7. Find **esp32 by Espressif Systems** and click **Install**.

---

## 3. Install Required Arduino Libraries

Go to **Sketch** -> **Include Library** -> **Manage Libraries...** (or press `Ctrl + Shift + I`) and install the following:

1. **MFRC522** (by GithubCommunity / Miguel Balboa):
   - Search: `MFRC522` -> Install latest version.
2. **LiquidCrystal I2C** (by Frank de Brabander or Marco Schwartz):
   - Search: `LiquidCrystal I2C` -> Install.
3. **ArduinoJson** (by Benoit Blanchon):
   - Search: `ArduinoJson` -> Install **Version 6.x** (e.g. 6.21.4).

---

## 4. Configure Firmware Credentials

Open `esp32/smart_attendance_firmware/smart_attendance_firmware.ino` in Arduino IDE.

Modify the following lines with your local network and server details:

```cpp
// 1. Wi-Fi Configuration
const char* WIFI_SSID     = "Your_WiFi_Network_Name";
const char* WIFI_PASSWORD = "Your_WiFi_Network_Password";

// 2. Server Base URL
// Replace with the local IP address of the computer running the Node.js backend:
// (Run 'ipconfig' in Windows Command Prompt to find your IPv4 Address, e.g. 192.168.1.150)
const char* SERVER_BASE_URL = "http://192.168.1.150:5000/api";

// 3. Device Identification
// Must match one of the devices registered in the database:
const char* DEVICE_ID       = "ESP32-TY-A-01";
const char* DEVICE_TOKEN    = "esp32_secret_token_101";
```

---

## 5. Board Selection & Flashing

1. Connect the ESP32 board to your computer via USB.
2. In Arduino IDE, go to **Tools** -> **Board** -> **esp32** -> Select **ESP32 Dev Module** (or **DOIT ESP32 DEVKIT V1**).
3. Go to **Tools** -> **Port** -> Select the active COM port (e.g., `COM3`, `COM4`).
4. Set the following upload parameters:
   - **Upload Speed**: `115200` (or `921600` for faster flashing)
   - **Flash Frequency**: `80MHz`
   - **Partition Scheme**: `Default 4MB with spiffs`
5. Click the **Upload** button (the right-arrow icon in the top toolbar).
   > **Tip**: If the console gets stuck on `Connecting........_____.....`, press and hold down the **BOOT** (or **IO0**) button on your ESP32 board until the upload progress percentage begins displaying, then release the button.

---

## 6. Serial Monitor & Hardware Verification

1. Open **Tools** -> **Serial Monitor** (or press `Ctrl + Shift + M`).
2. Set the baud rate in the bottom right corner to **115200 baud**.
3. Press the **EN / RST** button on the ESP32.
4. You should observe output similar to:
   ```text
   === SMART ATTENDANCE IOT SYSTEM BOOTING ===
   Connecting WiFi...
   WiFi Connected!
   IP Address: 192.168.1.105
   [HEARTBEAT] Server response: 200
   Firmware Version: 0x92 = v2.0
   ```
5. The 16x2 LCD will display:
   ```text
   Smart Attendance
   Tap RFID Card...
   ```

---

## 7. Testing RFID Scans

1. Hold an RFID Card or Key fob (such as `A3B5C821` for Rahul Patil) close to the RC522 reader.
2. Observe the behavior:
   - **Green LED** lights up.
   - **Success Buzzer** plays a crisp beep.
   - LCD displays:
     ```text
     Rahul Patil
     Rahul: Present!
     ```
   - The Teacher Dashboard and Student Dashboard on the web application instantly update via Socket.IO!
3. If you tap an unregistered card:
   - **Red LED** turns on.
   - Buzzer sounds 3 warning beeps.
   - LCD displays:
     ```text
     Scan Rejected
     Card Unknown
     ```
