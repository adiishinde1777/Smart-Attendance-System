# Database Documentation & Setup Guide

This directory contains the relational database schema, seed data, and configuration instructions for the **Smart Attendance System - IoT Based College Management Platform**.

---

## 1. Files Included

1. `schema.sql`: Full normalized 3NF MySQL schema DDL containing 19 tables, foreign key constraints, unique constraints, and optimized indexes.
2. `seed.sql`: Rich seed records containing 8 departments, academic years, divisions, subjects, teachers, **105 realistic student accounts**, RFID card pairings, timetables, examinations, internal marks, and devices.

---

## 2. Relational Database Tables Overview

| Table Name | Description | Key Constraints |
| :--- | :--- | :--- |
| `roles` | Role-based access control roles (super_admin, teacher, student) | Unique role name |
| `users` | User credentials, password hash, status | Unique email, FK to roles |
| `departments` | Engineering academic departments | Unique code, unique name |
| `academic_years` | FE, SE, TE, BE year levels | FK to departments, composite unique |
| `divisions` | Class cohorts (Division A, B, C) | FK to academic_years, FK to class teacher |
| `teachers` | Faculty profile, employee code, designation | Unique employee_code, FK to users |
| `students` | Student profile, roll number, PRN, RFID pairing | Unique PRN, Unique RFID card, FK to users |
| `subjects` | Course subjects with credits and total hours | Unique code, FK to departments |
| `student_subjects` | Enrolled subjects per student | FK to students, FK to subjects |
| `rfid_cards` | Physical RFID cards (active, blocked, unassigned) | Unique card_uid |
| `timetables` | Scheduled lecture slots per division | Day, timing, classroom, FK to subjects |
| `attendance` | Automated and manual attendance records | **Unique constraint: student_id + timetable_id + date** |
| `examinations` | Class Test 1, Mid-Sem Exam, Class Test 2 | Max marks validation |
| `marks` | Internal marks out of 40 | Check constraints: marks >= 0 and <= max_marks |
| `esp32_devices` | Registered classroom ESP32 microcontroller devices | Unique device_code, online/offline status |
| `device_credentials` | Secret hardware tokens and API keys | Rotatable token, secret hash |
| `device_scan_logs` | Raw hardware scan events and diagnostic failure logs | Ingestion audit trail |
| `notifications` | In-app alerts for attendance, marks, and bulletins | User unread counter |
| `audit_logs` | Change history tracking delta changes | Old values, new values, IP, timestamp |

---

## 3. Manual Setup in Standalone MySQL / phpMyAdmin

If you prefer to run against a standalone MySQL instance:

1. Log into your MySQL command prompt:
   ```bash
   mysql -u root -p
   ```
2. Execute the schema script:
   ```sql
   SOURCE c:/path/to/MINI PROJECT/database/schema.sql;
   ```
3. Execute the seed script:
   ```sql
   SOURCE c:/path/to/MINI PROJECT/database/seed.sql;
   ```
4. Update `backend/.env` with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=smart_attendance_iot
   ```

---

## 4. Automatic Zero-Configuration Execution

The backend includes a dual-mode database adapter (`backend/src/config/database.js`):
- It tests your local MySQL connection on port 3306 automatically.
- If MySQL is not running or credentials require configuration, it seamlessly initializes the relational database locally with full foreign keys, SQLite relational tables, and automatic seed data so the system runs immediately out of the box with zero setup hurdles!
