# SMART ATTENDANCE SYSTEM - REST API SPECIFICATION

This document details all available RESTful endpoints for the IoT Smart Attendance and College Management System.

---

## Base URL
```text
http://localhost:5000/api
```

## Authentication & Headers
- Protected routes require a Bearer JWT Token:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- Hardware ESP32 endpoints require device credentials:
  ```http
  X-Device-Id: ESP32-TY-A-01
  X-Device-Token: esp32_secret_token_101
  ```

---

## 1. Authentication APIs

### `POST /api/auth/login`
Authenticate Super Admin, Teacher, or Student. Supports login by email or PRN.

**Request Body:**
```json
{
  "email": "admin@college.edu",
  "password": "Admin@123"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@college.edu",
    "full_name": "Dr. A. K. Gupta (Dean)",
    "role_name": "super_admin"
  }
}
```

### `GET /api/auth/me`
Retrieve currently logged-in user profile with attached student or teacher details.

### `POST /api/auth/logout`
Log out and record audit trail.

---

## 2. Attendance & Hardware APIs

### `POST /api/attendance/scan`
Core automated attendance endpoint. Processes RFID card taps, validates against active timetable schedule, prevents duplicate attendance, emits Socket.IO event, and returns LCD display feedback.

**Request Body:**
```json
{
  "cardUid": "A3B5C821",
  "deviceCode": "ESP32-TY-A-01"
}
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "studentName": "Rahul Patil",
  "rollNumber": "101",
  "subjectName": "VLSI Design",
  "attendanceStatus": "Present",
  "serverTimestamp": "2026-11-02T16:25:37.370Z",
  "displayMessage": "Rahul: Present!"
}
```

**Duplicate Scan Rejected Response (400 Bad Request):**
```json
{
  "success": false,
  "errorCode": "ERR_DUPLICATE_ATTENDANCE",
  "message": "Attendance already recorded for Rahul Patil (VLSI Design) at 21:55:37.",
  "studentName": "Rahul Patil",
  "subjectName": "VLSI Design",
  "displayMessage": "Already Marked"
}
```

### `GET /api/attendance`
Query attendance logs with filters.
- Query Parameters: `date`, `departmentId`, `divisionId`, `subjectId`, `status`, `page`, `limit`.

### `GET /api/attendance/student/:id`
Retrieve personal attendance percentage, subject breakdown, and history log for a specific student.

### `PUT /api/attendance/:id`
Manual attendance correction by teacher. Requires mandatory `remarks` for audit log.

### `POST /api/attendance/finalize`
Finalize lecture attendance. Closes attendance window and auto-marks Absent for students who did not scan.

---

## 3. ESP32 Hardware Endpoints

### `POST /api/devices/heartbeat`
Device periodic keep-alive. Updates online status and IP.
**Headers:** `X-Device-Id`, `X-Device-Token`
**Payload:**
```json
{
  "deviceId": "ESP32-TY-A-01",
  "wifiRssi": -58,
  "freeHeap": 182400
}
```

### `POST /api/devices/scan`
Hardware device scan ingestion with official server clock validation.

### `POST /api/devices/sync-offline`
Batch synchronization of offline scans queued in ESP32 memory when Wi-Fi is restored.

---

## 4. Academic Management APIs

- `GET /api/departments`, `POST /api/departments`, `PUT /api/departments/:id`, `DELETE /api/departments/:id`
- `GET /api/academic-years`, `POST /api/academic-years`, `PUT /api/academic-years/:id`, `DELETE /api/academic-years/:id`
- `GET /api/divisions`, `GET /api/divisions/:id`, `POST /api/divisions`, `PUT /api/divisions/:id`, `DELETE /api/divisions/:id`
- `GET /api/students`, `POST /api/students`, `PUT /api/students/:id`, `DELETE /api/students/:id`, `GET /api/students/export`
- `GET /api/teachers`, `POST /api/teachers`, `PUT /api/teachers/:id`, `DELETE /api/teachers/:id`
- `GET /api/rfid`, `POST /api/rfid/register`, `PUT /api/rfid/:id/assign`, `PUT /api/rfid/:id/status`
- `GET /api/timetable`, `POST /api/timetable`, `PUT /api/timetable/:id`, `DELETE /api/timetable/:id`
- `GET /api/marks`, `GET /api/marks/student/:id`, `POST /api/marks`, `GET /api/marks/export`
- `GET /api/reports/analytics`, `GET /api/reports/export`
- `GET /api/notifications`, `PUT /api/notifications/:id/read`, `POST /api/notifications`
- `GET /api/audit-logs`
