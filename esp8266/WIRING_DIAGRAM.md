# ESP8266 (NodeMCU) Smart Attendance System - Hardware Wiring Guide

This guide shows the exact wiring for **NodeMCU ESP8266 (ESP-12E)** with an **RFID RC522 Module**, **3 Status LEDs** (Green, Red, Blue/Yellow), and a **Piezo Buzzer** (no LCD required).

---

## 1. Complete Pinout Connection Table

| Component | Component Pin | NodeMCU Pin | ESP8266 GPIO | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **RFID RC522** | **3.3V** | **3V3** | — | **Strictly 3.3V ONLY! Never connect to 5V / VIN.** |
| | **GND** | **GND** | — | Common Ground |
| | **RST** | **D3** | **GPIO 0** | Reset pin (kept HIGH at boot) |
| | **SDA (SS)** | **D4** | **GPIO 2** | SPI Chip Select (kept HIGH at boot) |
| | **SCK** | **D5** | **GPIO 14** | Hardware SPI Clock |
| | **MISO** | **D6** | **GPIO 12** | Hardware SPI MISO |
| | **MOSI** | **D7** | **GPIO 13** | Hardware SPI MOSI |
| | **IRQ** | *Not Connected* | — | Leave floating |
| **Green LED (Success)** | **Anode (+)** | **D1** | **GPIO 5** | Connect via **220Ω / 330Ω resistor** |
| | **Cathode (-)** | **GND** | — | Common Ground |
| **Red LED (Error/Reject)** | **Anode (+)** | **D2** | **GPIO 4** | Connect via **220Ω / 330Ω resistor** |
| | **Cathode (-)** | **GND** | — | Common Ground |
| **Blue/Yellow LED (Wi-Fi/Ready)** | **Anode (+)** | **D0** | **GPIO 16** | Connect via **220Ω / 330Ω resistor** |
| | **Cathode (-)** | **GND** | — | Common Ground |
| **Piezo Buzzer** | **Positive (+)** | **D8** | **GPIO 15** | Boot-safe LOW pin (NodeMCU has onboard pull-down) |
| | **Negative (-)** | **GND** | — | Common Ground |

---

## 2. Wiring Schematic (ASCII)

```text
                       +-----------------------------+
                       |      NodeMCU ESP8266        |
                       |                             |
[RC522 3.3V] --------->| 3V3                         |
[ALL GND]    --------->| GND                         |
                       |                             |
                       |         [SPI BUS]           |
[RC522 RST]  --------->| D3  (GPIO 0)                |
[RC522 SDA]  --------->| D4  (GPIO 2)                |
[RC522 SCK]  --------->| D5  (GPIO 14)               |
[RC522 MISO] --------->| D6  (GPIO 12)               |
[RC522 MOSI] --------->| D7  (GPIO 13)               |
                       |                             |
                       |       [3 LEDs + BUZZER]     |
[GREEN LED]  <---------| D1  (GPIO 5)  --[220Ω]--> (+) LED (-) --> [GND]
[RED LED]    <---------| D2  (GPIO 4)  --[220Ω]--> (+) LED (-) --> [GND]
[STATUS LED] <---------| D0  (GPIO 16) --[220Ω]--> (+) LED (-) --> [GND]
[BUZZER]     <---------| D8  (GPIO 15) ----------> (+) BUZ (-) --> [GND]
                       +-----------------------------+
```

---

## 3. LED & Buzzer Indicators

| Event | Green LED (`D1`) | Red LED (`D2`) | Status LED (`D0`) | Buzzer (`D8`) |
| :--- | :--- | :--- | :--- | :--- |
| **Connecting to Wi-Fi** | OFF | OFF | Blinking | Silent |
| **Wi-Fi Connected** | OFF | OFF | **Blinks 3 times**, then stays **ON (Ready)** | 3 short connect beeps |
| **Device Ready (Idle)** | OFF | OFF | **ON (Ready to tap)** | Silent |
| **Attendance Marked (Valid)** | **Blinks 3x** | OFF | OFF during scan | 1 success beep |
| **Rejected / Error** | OFF | **Blinks 2x** | OFF during scan | 2 error beeps |
| **Busy Cooldown (3.5s after tap)** | OFF | **Blinks continuously** (Do NOT tap!) | OFF (turns ON when ready again) | Silent |

---

## 4. Important Boot & Safety Notes

1. **Always power RC522 with `3V3`**, never `VIN` / `5V`. Also ensure the RC522 `3V3` wire is connected firmly before powering the ESP8266 (an unpowered RC522 wired to `D3`/`D4` can hold boot pins low and stop ESP8266 from booting).
2. **Always use 220Ω–330Ω resistors** in series with all 3 LEDs to protect the ESP8266 GPIO pins.
3. **Never pull `D3` (GPIO 0) or `D4` (GPIO 2) to GND** with an LED or buzzer—that is why only the RC522 high-impedance `RST`/`SDA` lines are placed on `D3`/`D4`, while the 3 LEDs use `D1`, `D2`, `D0` and the buzzer uses `D8`.
4. **If code fails to upload**, temporarily unplug the `D3` (GPIO 0) and `D8` (GPIO 15) jumper wires, upload the sketch, and reconnect them.

