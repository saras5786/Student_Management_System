-- ==============================================================================
-- DATABASE CONCEPT: DDL (DATA DEFINITION LANGUAGE) SCHEMA
-- File: database/schema.sql
-- Project: Aditya University Student Management System (AU-SMS)
-- ==============================================================================

-- 1. Students Table: Single source of truth for all student records
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'CSE',
    semester TEXT NOT NULL,
    attendance REAL NOT NULL,
    mathematics REAL NOT NULL,
    physics REAL NOT NULL,
    python_programming REAL NOT NULL,
    data_structures REAL NOT NULL,
    english REAL NOT NULL,
    total_marks REAL NOT NULL,
    percentage REAL NOT NULL,
    grade TEXT NOT NULL,
    grade_point REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- Performance indices for search, filtering, and sorting
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_semester ON students(semester);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_percentage ON students(percentage);
CREATE INDEX IF NOT EXISTS idx_students_attendance ON students(attendance);

-- 2. Administrators Table
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'ADMIN',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 3. Audit Logs Table: Tracks every admin action (Add, Edit, Delete, Import, Export)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_username TEXT NOT NULL,
    action TEXT NOT NULL,
    student_id TEXT,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    details TEXT,
    timestamp TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_student_id ON audit_logs(student_id);

-- 4. OTP Sessions Table: Simulates demo OTP life-cycle (60s TTL)
CREATE TABLE IF NOT EXISTS otp_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_otp_student_id ON otp_sessions(student_id);
