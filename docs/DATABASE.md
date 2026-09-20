# Database Architecture & Schema Specification
## Aditya University Student Management System (AU-SMS)

---

## 1. Overview
The persistence layer of AU-SMS is powered by **SQLite** using Node.js's built-in `node:sqlite` engine. The database is initialized and stored at `database/student_management.db`.

---

## 2. Table Specifications

### 2.1 `students` Table
Stores authoritative student demographic and academic records.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | System surrogate key |
| `student_id` | TEXT | UNIQUE NOT NULL | University Roll No (e.g. `25b11cs001`) |
| `name` | TEXT | NOT NULL | Full name of the student |
| `gender` | TEXT | NOT NULL | `Male`, `Female`, `Other` |
| `branch` | TEXT | NOT NULL DEFAULT 'CSE' | Academic branch |
| `semester` | TEXT | NOT NULL | E.g. `Semester 1` through `Semester 8` |
| `attendance` | REAL | NOT NULL | Attendance percentage (0.0 to 100.0) |
| `mathematics` | REAL | NOT NULL | Marks out of 100 |
| `physics` | REAL | NOT NULL | Marks out of 100 |
| `python_programming`| REAL | NOT NULL | Marks out of 100 |
| `data_structures` | REAL | NOT NULL | Marks out of 100 |
| `english` | REAL | NOT NULL | Marks out of 100 |
| `total_marks` | REAL | NOT NULL | Sum of 5 subjects (max 500) |
| `percentage` | REAL | NOT NULL | Computed percentage |
| `grade` | TEXT | NOT NULL | `A+`, `A`, `B`, `C`, `D`, `F` |
| `grade_point` | REAL | NOT NULL | 10-point scale (0 to 10) |
| `status` | TEXT | NOT NULL | `PASS` or `FAIL` |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

### 2.2 `admins` Table
Stores credential hashes for department administrators.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Primary key |
| `username` | TEXT | UNIQUE NOT NULL | Administrator username |
| `password_hash` | TEXT | NOT NULL | bcrypt password hash (salt rounds: 10) |
| `name` | TEXT | NOT NULL | Administrator full name |
| `role` | TEXT | NOT NULL DEFAULT 'ADMIN'| Role identifier |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

### 2.3 `audit_logs` Table
Maintains an immutable historical audit trail of all changes made by administrators.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Primary key |
| `admin_username` | TEXT | NOT NULL | Admin who performed the action |
| `action` | TEXT | NOT NULL | `ADD_STUDENT`, `UPDATE_STUDENT`, `DELETE_STUDENT`, `IMPORT_CSV`, `EXPORT_CSV` |
| `student_id` | TEXT | NULLABLE | Affected student ID |
| `field_name` | TEXT | NULLABLE | Specific column modified (e.g. `attendance`) |
| `old_value` | TEXT | NULLABLE | Previous value before update |
| `new_value` | TEXT | NULLABLE | New value after update |
| `details` | TEXT | NULLABLE | Human-readable explanation |
| `timestamp` | TEXT | DEFAULT CURRENT_TIMESTAMP | Timestamp of mutation |

### 2.4 `otp_sessions` Table
Tracks active demo OTP verification lifecycles with 60-second time-to-live (TTL).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Primary key |
| `student_id` | TEXT | NOT NULL | Student requesting OTP |
| `otp_code` | TEXT | NOT NULL | 6-digit numeric verification code |
| `expires_at` | INTEGER | NOT NULL | Unix epoch timestamp (ms) |
| `verified` | INTEGER | DEFAULT 0 | Verification status |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Request timestamp |

---

## 3. Database Indexes
To ensure sub-millisecond query performance across 500+ records during live search and filtering, the following B-Tree indexes are maintained:
- `idx_students_student_id` on `students(student_id)`
- `idx_students_name` on `students(name)`
- `idx_students_semester` on `students(semester)`
- `idx_students_grade` on `students(grade)`
- `idx_students_status` on `students(status)`
- `idx_audit_timestamp` on `audit_logs(timestamp DESC)`
