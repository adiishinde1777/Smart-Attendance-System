# SMART ATTENDANCE SYSTEM – IoT BASED COLLEGE MANAGEMENT PLATFORM

A complete, production-grade, responsive, real-time IoT-based Smart Attendance and Student Academic Management Platform for engineering colleges.

The platform integrates physical **RFID RC522** hardware and **ESP32 microcontrollers** with a comprehensive college academic management web application. It automates student attendance recording in milliseconds, validates scans against authoritative server clocks and dynamic timetables, prevents duplicate attendance, drives an I2C 16x2 LCD screen, and streams real-time updates to teacher and student dashboards using WebSockets.

---

## 1. Key Features

- **Automated RFID Attendance Engine**: Validates card UID, student active status, division assignment, active timetable session, and late arrival rules.
- **Anti-Duplicate Protection**: Enforces database and application-level constraints preventing duplicate attendance for the same lecture session.
- **Hardware Peripherals Support**: ESP32 firmware running SPI for RC522 RFID, I2C for 16x2 LCD, digital output for Green and Red LEDs, and audible buzzer patterns.
- **Offline Scan Queue**: ESP32 firmware buffers scans when offline and synchronizes automatically upon Wi-Fi reconnection.
- **Virtual IoT RFID Simulator**: Built-in interactive hardware bench with animated 16x2 LCD character matrix screen, glowing LEDs, and synthesized audio beeps for full evaluation without physical hardware.
- **Subject-Wise Attendance & Shortage Alerts**: Automatically calculates percentage: `(Present / Total Eligible) × 100` with 75% threshold warning indicators.
- **Internal Marks Management**: Complete matrix for Class Test 1 (10M), Mid-Semester Exam (20M), Class Test 2 (10M) totaling 40 marks with validation rules.
- **Dynamic Timetable Management**: Collision detection preventing teacher or classroom overlap.
- **Multi-Role Access Control**: Super Admin, Teacher, and Student roles with JWT authentication and bcrypt password hashing.
- **Reports & Analytics**: Comprehensive export to Excel, client-side PDF generation, and printable reports.
- **Full Seed Dataset**: Pre-populated with 8 engineering departments, academic levels, divisions, subjects, teachers, and **105 realistic student accounts**.

---

## 2. Technology Stack

### Frontend
- **Framework**: React.js with Vite
- **Styling**: Tailwind CSS (Tailored Navy Blue `#0f172a` & Emerald/Cyan palette)
- **Routing**: React Router v6
- **HTTP Client**: Axios with request/response interceptors
- **Visual Analytics**: Chart.js & React-Chartjs-2
- **Iconography**: Lucide React Icons
- **Real-Time Client**: Socket.IO Client
- **Document Export**: jsPDF, jspdf-autotable, SheetJS (XLSX)

### Backend
- **Runtime**: Node.js
- **Web Framework**: Express.js REST API
- **Real-Time Transport**: Socket.IO WebSockets
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **Security**: Hardware Device Token Headers (`X-Device-Id`, `X-Device-Token`)
- **Audit System**: In-memory and persistent transaction audit logs

### Database
- **Database Engine**: MySQL 8.0 (with automatic relational SQLite fallback for zero-configuration out-of-the-box local execution)
- **Structure**: 19 normalized 3NF relational tables, foreign key cascades, unique constraints, and check validations.

### Hardware & Firmware
- **Microcontroller**: ESP32 Development Board (30-pin / 38-pin DevKit V1)
- **RFID Reader**: MFRC522 (13.56 MHz SPI mode, 3.3V power)
- **Display**: 16x2 LCD with PCF8574 I2C backpack (Address 0x27 / 0x3F)
- **Feedback**: Green LED (Success), Red LED (Reject), 5V Active Piezo Buzzer
- **Firmware Environment**: Arduino IDE C++ with ArduinoJson 6.x

---

## 3. Project Directory Structure

```text
MINI PROJECT/
├── backend/
│   ├── .env.example              # Environment variables template
│   ├── .env                      # Local server configuration
│   ├── package.json              # Backend dependencies
│   ├── server.js                 # Express server & WebSocket initiator
│   ├── scripts/
│   │   ├── initDb.js             # Database setup runner
│   │   ├── seedDb.js             # Seeding utility
│   │   └── generateSqlSeed.js    # SQL seed exporter
│   └── src/
│       ├── config/               # DB driver, JWT, Socket.IO, Schema & Seed runners
│       ├── controllers/          # 14 REST API controllers
│       ├── middleware/           # JWT Auth, RBAC, Device Hardware Auth, Audit logger
│       ├── routes/               # API route definitions
│       ├── services/             # Attendance engine & offline sync
│       └── utils/                # Seed data definitions & name generators
├── frontend/
│   ├── index.html                # HTML template with Google Fonts (Outfit & Inter)
│   ├── package.json              # Frontend dependencies
│   ├── vite.config.js            # Vite configuration with proxy
│   ├── tailwind.config.js        # Tailwind styling system
│   └── src/
│       ├── App.jsx               # Route definitions & protected layouts
│       ├── main.jsx              # Application bootstrap
│       ├── index.css             # Design tokens & LCD screen simulator styles
│       ├── components/           # Navbar, Sidebar, StatCard, LiveScanToast, Simulator
│       ├── context/              # AuthContext & SocketContext (Audio synthesizer)
│       ├── services/             # Axios API client & WebSocket listener
│       └── pages/                # 22 Complete Pages
│           ├── LandingPage.jsx   # College portal landing page
│           ├── LoginPage.jsx     # Dual-tab login with 1-click demo buttons
│           ├── teacher/          # 15 Teacher & Administrative management pages
│           └── student/          # 5 Student academic portal pages
├── database/
│   ├── schema.sql                # Complete 19-table normalized MySQL DDL
│   ├── seed.sql                  # Comprehensive SQL insert statements (105 students)
│   └── README.md                 # Database documentation
├── esp32/
│   ├── smart_attendance_firmware/
│   │   └── smart_attendance_firmware.ino # Complete production Arduino C++ firmware
│   ├── WIRING_DIAGRAM.md         # Circuit diagram & pin connection mapping table
│   └── HARDWARE_SETUP.md         # Arduino IDE board setup & flashing guide
├── docs/
│   └── API_DOCUMENTATION.md      # Detailed REST API endpoint documentation
└── README.md                     # Master project documentation
```

---

## 4. Default Demo Credentials

For quick evaluation, pre-filled one-click demo buttons are provided on the login page:

| Role | Username / Email | Password | PRN / Notes |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@college.edu` | `Admin@123` | Full system control |
| **Teacher (Faculty)** | `teacher@college.edu` | `Teacher@123` | Faculty academic console |
| **Student (Rahul Patil)** | `student@college.edu` | `Student@123` | PRN: `PRN2024001`, Roll: `101`, RFID: `A3B5C821` |
| **Any Student #2 - #105** | `student<roll>@college.edu` | `Student@123` | Unique PRN and card UIDs |

---

## 5. Localhost Execution Instructions

### Prerequisites
- Node.js (v18.x or newer)
- npm (v9.x or newer)

### Step 1: Start the Backend Server
```bash
cd backend
npm install
npm run db:init
npm start
```
*The backend automatically binds to port 5000 and establishes WebSocket listeners.*

### Step 2: Start the React Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Open your browser and navigate to **`http://localhost:3000`**.*

---

## 6. Testing RFID Attendance via Virtual Simulator

Even before connecting physical ESP32 hardware, the web application includes an interactive **IoT Hardware Simulator**:

1. Log in as **Super Admin** (`admin@college.edu` / `Admin@123`) or **Teacher**.
2. Click the **"Launch RFID Simulator"** button in the top navigation bar or on the dashboard.
3. Select a registered ESP32 terminal (e.g. `ESP32-TY-A-01` in Classroom 101).
4. Choose an RFID Card:
   - **Rahul Patil (`A3B5C821`)**: Confirms attendance, triggers green LED, plays success chime, displays message on simulated 16x2 LCD screen, and updates the dashboard instantly!
   - **Tap Again (Duplicate Test)**: Immediately rejected by the backend with `"Already Marked"` feedback.
   - **Blocked Card (`BLOCKED99`)**: Triggers red LED, sounds 3 warning beeps, and displays `"Card Blocked"`.
   - **Unknown Card (`UNKNOWN_9A7B`)**: Rejected with `"Card Unknown"`.
5. Check the Student Dashboard (`student@college.edu` / `Student@123`) to see attendance reflected in real time!

---

## 7. Connecting Physical ESP32 Hardware

1. Follow the hardware wiring instructions in [`esp32/WIRING_DIAGRAM.md`](file:///c:/Users/ADITYA/Desktop/MINI%20PROJECT/esp32/WIRING_DIAGRAM.md).
2. Open [`esp32/smart_attendance_firmware/smart_attendance_firmware.ino`](file:///c:/Users/ADITYA/Desktop/MINI%20PROJECT/esp32/smart_attendance_firmware/smart_attendance_firmware.ino) in Arduino IDE.
3. Update `WIFI_SSID`, `WIFI_PASSWORD`, and `SERVER_BASE_URL` with your local Wi-Fi and computer IP address.
4. Flash firmware onto the ESP32 following [`esp32/HARDWARE_SETUP.md`](file:///c:/Users/ADITYA/Desktop/MINI%20PROJECT/esp32/HARDWARE_SETUP.md).
5. Swipe real RFID cards near the RC522 module to record verified attendance.

---

## 8. License & Attribution

Developed as a college mini-project for **IoT Based Smart Attendance and Student Academic Management Platform**. All modules are open and configurable for educational institutional deployments.
