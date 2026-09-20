# System Architecture & Data Flow
## Aditya University Student Management System (AU-SMS)

---

## 1. System Architecture Overview

The system follows a classic **N-Tier Enterprise Architecture** adhering strictly to the **Separation of Concerns (SoC)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT PRESENTATION TIER                        │
│   HTML5 • Vanilla JS (ES Modules) • CSS3 Variables • Chart.js • Canvas │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST API (JSON / JWT)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        EXPRESS APPLICATION TIER                        │
│                                                                        │
│   Routes Layer          [authRoutes, studentRoutes, adminRoutes]       │
│        ↓                                                               │
│   Middleware Layer      [authenticateToken, requireRole, errorHandler] │
│        ↓                                                               │
│   Controller Layer      [AuthController, StudentController, ...]       │
│        ↓                                                               │
│   Service Layer         [StudentService, AuthService, OTPService, ...] │
│        ↓                                                               │
│   Utility Engine        [AcademicCalculator, Validator]                │
│        ↓                                                               │
│   Repository Layer      [StudentRepository, AdminRepository, ...]      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Parameterized SQL (node:sqlite)
┌───────────────────────────────────▼────────────────────────────────────┐
│                        DATA PERSISTENCE TIER                           │
│                 SQLite (database/student_management.db)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Single Source of Truth Principle

One of the most critical architectural requirements is that **SQLite is the sole, authoritative source of truth**. No client-side caching or separate JSON stores exist between the student and administrator views.

### Verification Scenario:
```
1. Admin edits Student 25b11cs001 Attendance: 94.5% → 97.0%
                        ↓
2. Admin Dashboard sends: PUT /api/students/25b11cs001
                        ↓
3. StudentService computes academic standing & calls StudentRepository
                        ↓
4. SQLite 'students' table is updated & Audit entry recorded in 'audit_logs'
                        ↓
5. Student logs in again with 25b11cs001 (or reloads dashboard)
                        ↓
6. Student Portal sends: GET /api/students/25b11cs001
                        ↓
7. Backend reads fresh record directly from SQLite
                        ↓
8. Student immediately views updated Attendance: 97.0%
```

---

## 3. Dual Authentication Flow

### Student Authentication Flow (Simulated OTP)
```
Student enters ID (e.g. 25b11cs001)
               ↓
POST /api/auth/student/request-otp
               ↓
StudentService verifies student exists in SQLite
               ↓
OTPService generates cryptographically random 6-digit OTP (TTL: 60 seconds)
               ↓
Returns Demo OTP in API response
               ↓
UI renders live 60s visual timer and banner: [DEMO OTP: 482913]
               ↓
Student submits OTP → POST /api/auth/student/verify-otp
               ↓
Server verifies active OTP and generates JWT token with role: "STUDENT"
```

### Administrator Authentication Flow
```
Admin enters Username & Password (admin / admin123)
               ↓
POST /api/auth/admin/login
               ↓
AdminService retrieves record from SQLite 'admins' table
               ↓
Verifies hash using bcrypt.compareSync()
               ↓
Generates JWT token with role: "ADMIN"
```
