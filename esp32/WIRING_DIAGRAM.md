# ESP32 Smart Attendance System - Hardware Wiring & Pin Mapping Guide

This document details the exact hardware connection and wiring specifications for connecting the **ESP32 Development Board** to the **RFID-RC522 Module**, **16x2 I2C Liquid Crystal Display**, **LED Indicators**, and **Buzzer**.

---

## 1. Complete Pinout Connection Table

| Peripheral Component | Component Pin | ESP32 GPIO Pin | Pin Type / Notes |
| :--- | :--- | :--- | :--- |
| **RFID RC522** | **3.3V (VCC)** | **3V3** | ⚠️ **DO NOT CONNECT TO 5V! (Will permanently damage RC522)** |
| | **RST** (Reset) | **GPIO 27** | Digital Output (Moved from GPIO 22 to avoid I2C SCL collision) |
| | **GND** | **GND** | Common Ground |
| | **MISO** | **GPIO 19** | Hardware VSPI MISO |
| | **MOSI** | **GPIO 23** | Hardware VSPI MOSI |
| | **SCK** | **GPIO 18** | Hardware VSPI Clock |
| | **SDA / SS** | **GPIO 5** | Hardware VSPI Chip Select (Slave Select) |
| | **IRQ** | *Not Connected* | Leave Floating |
| **16x2 LCD (I2C)** | **VCC** | **VIN / 5V** | 5V Power from USB/Vin rail |
| | **GND** | **GND** | Common Ground |
| | **SDA** | **GPIO 21** | ESP32 Hardware I2C Data |
| | **SCL** | **GPIO 22** | ESP32 Hardware I2C Clock |
| **Green LED (Success)** | **Anode (+)** | **GPIO 2** | Connected in series with 220Ω Resistor |
| | **Cathode (-)** | **GND** | Common Ground |
| **Red LED (Reject)** | **Anode (+)** | **GPIO 4** | Connected in series with 220Ω Resistor |
| | **Cathode (-)** | **GND** | Common Ground |
| **Piezo Buzzer** | **Positive (+)** | **GPIO 15** | Digital Output Beep Trigger |
| | **Negative (-)** | **GND** | Common Ground |

---

## 2. Circuit Diagram Representation (ASCII Schematic)

```
                       +-----------------------------+
                       |       ESP32 DEVKIT V1       |
                       |                             |
[3.3V] --------------->| 3V3                         |
[GND]  --------------->| GND                         |
                       |                             |
                       |         [VSPI BUS]          |
[RC522 SS/SDA] ------->| GPIO 5                      |
[RC522 SCK]    ------->| GPIO 18                     |
[RC522 MISO]   ------->| GPIO 19                     |
[RC522 MOSI]   ------->| GPIO 23                     |
[RC522 RST]    ------->| GPIO 27                     |
                       |                             |
                       |          [I2C BUS]          |
[LCD 16x2 SDA] ------->| GPIO 21                     |
[LCD 16x2 SCL] ------->| GPIO 22                     |
                       |                             |
                       |      [INDICATOR PINS]       |
[GREEN LED]    <-------| GPIO 2  ---[ 220Ω ]---> (+)  LED (-) ---> [GND]
[RED LED]      <-------| GPIO 4  ---[ 220Ω ]---> (+)  LED (-) ---> [GND]
[BUZZER]       <-------| GPIO 15 -----------------> (+) BUZZER (-) -> [GND]
                       +-----------------------------+
```

---

## 3. Critical Hardware Safety Guidelines

1. **Power Supply**:
   - The RFID RC522 **must operate strictly on 3.3V**. Powering it from the 5V/VIN pin will destroy the NXP MFRC522 IC.
   - The 16x2 LCD display backlight operates best on **5V (VIN)**. Because the PCF8574 I2C adapter has open-drain pullups to 5V, if using an older LCD module with stiff 5V pullups, ensure ESP32 GPIO 21 and 22 are 5V-tolerant or use a logic-level shifter. On standard ESP-WROOM-32 dev boards, the 3.3V I2C levels communicate reliably without issue.

2. **Current Limiting Resistors**:
   - Always place a **220Ω or 330Ω resistor** in series with the Green and Red LEDs. Connecting LEDs directly to ESP32 GPIO pins will draw excessive current (>40mA) and damage the output driver transistors inside the ESP32.

3. **Buzzer Drivers**:
   - For a standard low-power active piezo buzzer (current draw < 15mA), direct connection to GPIO 15 is safe.
   - For high-volume or passive electromagnetic buzzers requiring > 25mA, connect GPIO 15 to the base of an **NPN transistor (e.g. 2N2222 or BC547)** with a 1kΩ base resistor and a flyback diode.

4. **Common Ground**:
   - Ensure all peripherals (RC522, LCD, LEDs, Buzzer) share a **single common ground (GND)** line back to the ESP32 ground pins to prevent floating signal references.
