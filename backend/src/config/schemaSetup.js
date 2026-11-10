const fs = require('fs');
const path = require('path');
const db = require('./database');

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles (id)
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_code TEXT NOT NULL,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  is_current INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  UNIQUE (department_id, year_code)
);

CREATE TABLE IF NOT EXISTS divisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  class_teacher_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE,
  UNIQUE (department_id, academic_year_id, name)
);

CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  employee_code TEXT NOT NULL UNIQUE,
  department_id INTEGER NOT NULL,
  designation TEXT NOT NULL DEFAULT 'Assistant Professor',
  qualification TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments (id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  credits INTEGER NOT NULL DEFAULT 4,
  total_hours INTEGER NOT NULL DEFAULT 40,
  semester INTEGER NOT NULL DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfid_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_uid TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'unassigned' CHECK(status IN ('active', 'blocked', 'unassigned')),
  issued_at DATETIME,
  blocked_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  roll_number TEXT NOT NULL,
  prn TEXT NOT NULL UNIQUE,
  department_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  division_id INTEGER NOT NULL,
  rfid_card_id INTEGER UNIQUE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'detained')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments (id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  FOREIGN KEY (division_id) REFERENCES divisions (id),
  FOREIGN KEY (rfid_card_id) REFERENCES rfid_cards (id) ON DELETE SET NULL,
  UNIQUE (department_id, academic_year_id, division_id, roll_number)
);

CREATE TABLE IF NOT EXISTS student_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  semester INTEGER NOT NULL DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  UNIQUE (student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS timetables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  division_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  teacher_id INTEGER NOT NULL,
  day_of_week TEXT NOT NULL CHECK(day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  classroom TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id) ON DELETE CASCADE,
  FOREIGN KEY (division_id) REFERENCES divisions (id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers (id)
);

CREATE TABLE IF NOT EXISTS esp32_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  academic_year_id INTEGER NOT NULL,
  division_id INTEGER NOT NULL,
  classroom TEXT NOT NULL,
  ip_address TEXT,
  mac_address TEXT,
  status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline')),
  last_heartbeat DATETIME,
  last_scan_time DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments (id),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
  FOREIGN KEY (division_id) REFERENCES divisions (id)
);

CREATE TABLE IF NOT EXISTS device_credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL UNIQUE,
  api_token_hash TEXT NOT NULL,
  api_token_raw TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  rotated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES esp32_devices (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  timetable_id INTEGER NOT NULL,
  lecture_date TEXT NOT NULL,
  scan_time TEXT NOT NULL,
  status TEXT DEFAULT 'Present' CHECK(status IN ('Present', 'Absent', 'Late', 'Excused')),
  device_id INTEGER,
  verification_method TEXT DEFAULT 'rfid' CHECK(verification_method IN ('rfid', 'manual', 'offline_sync')),
  remarks TEXT,
  marked_by_user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects (id),
  FOREIGN KEY (timetable_id) REFERENCES timetables (id),
  FOREIGN KEY (device_id) REFERENCES esp32_devices (id) ON DELETE SET NULL,
  FOREIGN KEY (marked_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  UNIQUE (student_id, timetable_id, lecture_date)
);

CREATE TABLE IF NOT EXISTS examinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  max_marks REAL NOT NULL DEFAULT 10.00,
  semester INTEGER NOT NULL DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject_id INTEGER NOT NULL,
  examination_id INTEGER NOT NULL,
  marks_obtained REAL NOT NULL,
  max_marks REAL NOT NULL,
  remarks TEXT,
  evaluated_by_teacher_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE,
  FOREIGN KEY (examination_id) REFERENCES examinations (id) ON DELETE CASCADE,
  FOREIGN KEY (evaluated_by_teacher_id) REFERENCES teachers (id) ON DELETE SET NULL,
  UNIQUE (student_id, subject_id, examination_id),
  CHECK (marks_obtained >= 0 AND marks_obtained <= max_marks)
);

CREATE TABLE IF NOT EXISTS device_scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER,
  card_uid TEXT NOT NULL,
  scan_event_id TEXT,
  is_success INTEGER NOT NULL DEFAULT 0,
  failure_reason TEXT,
  raw_payload TEXT,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES esp32_devices (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system' CHECK(type IN ('attendance', 'marks', 'timetable', 'device', 'alert', 'system')),
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);
`;

async function ensureSchema() {
  await db.initDatabase();
  const driver = db.getDriver();

  if (driver === 'mysql') {
    // Check if roles table exists
    const existing = await db.query("SHOW TABLES LIKE 'roles'");
    if (!existing || existing.length === 0) {
      console.log('[DB] Initializing MySQL tables from schema.sql...');
      const schemaFile = path.join(__dirname, '../../../database/schema.sql');
      const content = fs.readFileSync(schemaFile, 'utf8');
      await db.execMulti(content);
      console.log('[DB] MySQL schema created successfully.');
    }
  } else {
    // SQLite schema creation
    await db.execMulti(SQLITE_SCHEMA);
  }
}

module.exports = {
  ensureSchema
};
