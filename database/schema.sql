-- =====================================================================
-- SMART ATTENDANCE SYSTEM - IoT BASED COLLEGE MANAGEMENT PLATFORM
-- Relational MySQL Schema (Normalized 3NF, Foreign Keys & Constraints)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS smart_attendance_iot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_attendance_iot;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES TABLE
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS device_scan_logs;
DROP TABLE IF EXISTS device_credentials;
DROP TABLE IF EXISTS esp32_devices;
DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS examinations;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS timetables;
DROP TABLE IF EXISTS rfid_cards;
DROP TABLE IF EXISTS student_subjects;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS divisions;
DROP TABLE IF EXISTS academic_years;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. USERS TABLE
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(25) NULL,
  avatar_url VARCHAR(500) NULL,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. DEPARTMENTS TABLE
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL UNIQUE,
  description TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. ACADEMIC YEARS TABLE
CREATE TABLE academic_years (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year_code VARCHAR(20) NOT NULL,
  name VARCHAR(50) NOT NULL,
  department_id INT NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ay_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  UNIQUE KEY uq_dept_year (department_id, year_code)
) ENGINE=InnoDB;

-- 5. DIVISIONS TABLE
CREATE TABLE divisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  department_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  class_teacher_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_div_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT fk_div_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE,
  UNIQUE KEY uq_dept_ay_div (department_id, academic_year_id, name)
) ENGINE=InnoDB;

-- 6. TEACHERS TABLE
CREATE TABLE teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  designation VARCHAR(100) NOT NULL DEFAULT 'Assistant Professor',
  qualification VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teacher_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Add FK for class_teacher_id in divisions
ALTER TABLE divisions
  ADD CONSTRAINT fk_div_teacher FOREIGN KEY (class_teacher_id) REFERENCES teachers (id) ON DELETE SET NULL;

-- 7. SUBJECTS TABLE
CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  department_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  credits INT NOT NULL DEFAULT 4,
  total_hours INT NOT NULL DEFAULT 40,
  semester INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. RFID CARDS TABLE
CREATE TABLE rfid_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_uid VARCHAR(50) NOT NULL UNIQUE,
  status ENUM('active', 'blocked', 'unassigned') DEFAULT 'unassigned',
  issued_at TIMESTAMP NULL,
  blocked_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. STUDENTS TABLE
CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  roll_number VARCHAR(30) NOT NULL,
  prn VARCHAR(40) NOT NULL UNIQUE,
  department_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  division_id INT NOT NULL,
  rfid_card_id INT NULL UNIQUE,
  status ENUM('active', 'inactive', 'detained') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_student_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_div FOREIGN KEY (division_id) REFERENCES divisions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_student_rfid FOREIGN KEY (rfid_card_id) REFERENCES rfid_cards (id) ON DELETE SET NULL,
  UNIQUE KEY uq_dept_ay_div_roll (department_id, academic_year_id, division_id, roll_number)
) ENGINE=InnoDB;

-- 10. STUDENT SUBJECTS ENROLLMENT
CREATE TABLE student_subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  semester INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ss_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_ss_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  UNIQUE KEY uq_student_subject (student_id, subject_id)
) ENGINE=InnoDB;

-- 11. TIMETABLES TABLE
CREATE TABLE timetables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  division_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  classroom VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tt_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_div FOREIGN KEY (division_id) REFERENCES divisions (id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_sub FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  CONSTRAINT fk_tt_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON DELETE RESTRICT,
  INDEX idx_tt_slot (day_of_week, start_time, end_time),
  INDEX idx_tt_div (division_id, day_of_week)
) ENGINE=InnoDB;

-- 12. ESP32 DEVICES TABLE
CREATE TABLE esp32_devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  department_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  division_id INT NOT NULL,
  classroom VARCHAR(50) NOT NULL,
  ip_address VARCHAR(50) NULL,
  mac_address VARCHAR(50) NULL,
  status ENUM('online', 'offline') DEFAULT 'offline',
  last_heartbeat TIMESTAMP NULL,
  last_scan_time TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dev_dept FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT,
  CONSTRAINT fk_dev_ay FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE RESTRICT,
  CONSTRAINT fk_dev_div FOREIGN KEY (division_id) REFERENCES divisions (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 13. DEVICE CREDENTIALS TABLE
CREATE TABLE device_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NOT NULL UNIQUE,
  api_token_hash VARCHAR(255) NOT NULL,
  api_token_raw VARCHAR(100) NOT NULL,
  secret_key VARCHAR(100) NOT NULL,
  rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dc_device FOREIGN KEY (device_id) REFERENCES esp32_devices (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 14. ATTENDANCE TABLE
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  timetable_id INT NOT NULL,
  lecture_date DATE NOT NULL,
  scan_time TIME NOT NULL,
  status ENUM('Present', 'Absent', 'Late', 'Excused') NOT NULL DEFAULT 'Present',
  device_id INT NULL,
  verification_method ENUM('rfid', 'manual', 'offline_sync') DEFAULT 'rfid',
  remarks VARCHAR(255) NULL,
  marked_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_att_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT,
  CONSTRAINT fk_att_tt FOREIGN KEY (timetable_id) REFERENCES timetables (id) ON DELETE RESTRICT,
  CONSTRAINT fk_att_device FOREIGN KEY (device_id) REFERENCES esp32_devices (id) ON DELETE SET NULL,
  CONSTRAINT fk_att_markedby FOREIGN KEY (marked_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  UNIQUE KEY uq_student_lecture (student_id, timetable_id, lecture_date),
  INDEX idx_att_date_sub (lecture_date, subject_id),
  INDEX idx_att_student_date (student_id, lecture_date)
) ENGINE=InnoDB;

-- 15. EXAMINATIONS TABLE
CREATE TABLE examinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  max_marks DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  semester INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 16. MARKS TABLE
CREATE TABLE marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  examination_id INT NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  remarks VARCHAR(255) NULL,
  evaluated_by_teacher_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_sub FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_exam FOREIGN KEY (examination_id) REFERENCES examinations (id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_evaluator FOREIGN KEY (evaluated_by_teacher_id) REFERENCES teachers (id) ON DELETE SET NULL,
  UNIQUE KEY uq_student_subject_exam (student_id, subject_id, examination_id),
  CONSTRAINT chk_marks_non_negative CHECK (marks_obtained >= 0),
  CONSTRAINT chk_marks_not_exceed_max CHECK (marks_obtained <= max_marks)
) ENGINE=InnoDB;

-- 17. DEVICE SCAN LOGS TABLE
CREATE TABLE device_scan_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id INT NULL,
  card_uid VARCHAR(50) NOT NULL,
  scan_event_id VARCHAR(100) NULL,
  is_success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason VARCHAR(255) NULL,
  raw_payload TEXT NULL,
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dsl_device FOREIGN KEY (device_id) REFERENCES esp32_devices (id) ON DELETE SET NULL,
  INDEX idx_dsl_device_time (device_id, scanned_at)
) ENGINE=InnoDB;

-- 18. NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('attendance', 'marks', 'timetable', 'device', 'alert', 'system') DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  INDEX idx_notif_user_unread (user_id, is_read)
) ENGINE=InnoDB;

-- 19. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(50) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  INDEX idx_audit_time (created_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
