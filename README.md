# Aditya University Student Management System (AU-SMS)
### Department of Computer Science & Engineering

![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)
![Node](https://img.shields.io/badge/node->=20.0.0-green.svg)
![Database](https://img.shields.io/badge/database-SQLite-00d2ff.svg)
![Architecture](https://img.shields.io/badge/architecture-OOP%20Layered-purple.svg)

A complete, production-grade, interactive full-stack **Student Management System** developed for **Aditya University – Computer Science & Engineering Department**.

Built from the ground up to showcase **Object-Oriented Programming (OOP)**, **Single Source of Truth** persistence via SQLite, **Role-Based Access Control (RBAC)**, an **interactive 60FPS Canvas particle physics engine**, **dynamic gradient color interpolation**, **live student filtering/sorting/pagination**, and **real-time Chart.js analytics**.

---

## 1. Key Features

- 🎓 **Single Source of Truth**: SQLite (`database/student_management.db`) is the authoritative datastore. Any change made by an administrator immediately reflects in the student portal upon subsequent login.
- 🔐 **Two Distinct Authentication Modes**:
  - **Student Login**: Authenticates via Student ID (`25b11cs001` through `25b11cs999`) using a simulated 60-second Demo OTP system with a live countdown timer.
  - **Admin Login**: Secure administrator portal verified via bcrypt password hashing (`admin` / `admin123`).
- 🎨 **Modern Interactive UI/UX**:
  - Animated startup loading screen with university branding and pulsing loader.
  - Interactive HTML5 Canvas particle network responding to mouse repulsion and proximity connections.
  - Dynamic, non-distracting background color transition cycling through dark blue, deep purple, and cyan.
  - Dark-mode glassmorphism cards (`backdrop-filter: blur(14px)`).
  - Floating toast notification manager with countdown progress lines.
- 📊 **Dynamic University Analytics**:
  - Grade distribution, semester distribution, subject averages, and attendance distribution powered by Chart.js.
  - Animated dashboard number counters ($0 \rightarrow 500$).
- 🗄 **Comprehensive Student Administration**:
  - Live search by Student ID or Name (debounced).
  - Multi-filtering by Semester, Gender, Grade, and PASS/FAIL Status.
  - Column sorting with ascending/descending indicators.
  - Configurable pagination ($10, 20, 50, 100$ per page).
  - Full CRUD operations with modal interfaces and real-time `AcademicCalculator` live previews.
  - Audit logging recording who modified what, old vs. new values, and timestamps.
- 📁 **CSV Operations**:
  - Pre-seeded with the 500-record dataset (`data/cse_students_500.csv`).
  - Batch CSV Import with validation and error reporting.
  - Live CSV Export dynamically generated from current database records.

---

## 2. Technology Stack

- **Backend**: Node.js (v20+ / v24+), Express.js (ES Modules).
- **Database**: SQLite via Node.js built-in `node:sqlite` (`DatabaseSync`), parameterized queries, WAL mode.
- **Frontend**: HTML5, CSS3 Custom Properties, Vanilla JavaScript (ES6+ Classes), Canvas 2D API.
- **Data Visualizations**: Chart.js.
- **Security**: bcrypt password hashing, JSON Web Tokens (JWT), Role-Based Access Control.

---

## 3. Project Directory Structure

```text
Student_Management_System/
├── package.json                         # Node.js manifest with dependencies & scripts
├── README.md                            # Comprehensive project overview & setup guide
├── .gitignore
│
├── server/
│   ├── server.js                        # Express server entry point & static asset mount
│   ├── config/
│   │   ├── database.js                  # DatabaseManager singleton & SQLite connection
│   │   └── seed.js                      # DatabaseSeeder (imports 500 CSV records)
│   ├── models/
│   │   ├── User.js                      # Base User class (Encapsulation & Abstraction)
│   │   ├── StudentUser.js               # Subclass StudentUser (Inheritance & Polymorphism)
│   │   ├── AdminUser.js                 # Subclass AdminUser (Inheritance & Polymorphism)
│   │   └── Student.js                   # Student domain entity with private fields (#)
│   ├── repositories/
│   │   ├── StudentRepository.js         # Student SQL queries, search, filter & stats
│   │   ├── AdminRepository.js           # Admin authentication queries
│   │   └── AuditRepository.js           # Immutable audit log persistence
│   ├── services/
│   │   ├── StudentService.js            # Business logic, validations & audit triggering
│   │   ├── AuthService.js               # Admin login & student OTP coordinator
│   │   ├── OTPService.js                # 60s Demo OTP generation, storage & expiry
│   │   ├── AnalyticsService.js          # Computes distributions & KPIs
│   │   └── CSVService.js                # CSV parsing, batch ETL & streaming export
│   ├── controllers/
│   │   ├── AuthController.js            # REST handlers for login and OTP
│   │   ├── StudentController.js         # REST handlers for student CRUD
│   │   └── AdminController.js           # REST handlers for analytics, CSV & audit
│   ├── routes/
│   │   ├── authRoutes.js                # /api/auth endpoints
│   │   ├── studentRoutes.js             # /api/students endpoints
│   │   └── adminRoutes.js               # /api/admin, /api/analytics, /api/export
│   ├── middlewares/
│   │   ├── authMiddleware.js            # JWT verification & RBAC authorization
│   │   └── errorHandler.js              # Centralized JSON error handler
│   └── utils/
│       ├── AcademicCalculator.js        # Grade, GPA, Percentage calculation abstraction
│       └── validators.js                # Student ID regex, mark range sanitizers
│
├── database/
│   ├── schema.sql                       # DDL table schemas & B-Tree indexes
│   └── student_management.db            # SQLite physical database file
│
├── data/
│   └── cse_students_500.csv             # Initial dataset of 500 CSE students
│
├── public/
│   ├── index.html                       # Single Page Application container
│   ├── css/
│   │   ├── style.css                    # Design tokens, dark theme, layout, buttons
│   │   ├── animations.css               # Loading screen, 60fps keyframes, transitions
│   │   ├── dashboard.css                # Cards, tables, modals, scorecards
│   │   └── responsive.css               # Responsive media queries (Desktop, Laptop, Tablet, Mobile)
│   ├── js/
│   │   ├── app.js                       # Main orchestrator & dynamic color loop
│   │   ├── api.js                       # APIClient abstraction for fetch calls
│   │   ├── auth.js                      # AuthenticationManager (Student OTP + Admin)
│   │   ├── student.js                   # StudentDashboardManager (Scorecard, marks, attendance)
│   │   ├── admin.js                     # AdminDashboardManager (Table, modals, CSV, audit)
│   │   ├── particles.js                 # ParticleAnimation (60FPS Canvas physics engine)
│   │   ├── notifications.js             # NotificationManager (Toast alerts)
│   │   └── charts.js                    # ChartManager (Chart.js wrappers)
│   └── assets/
│       └── aditya-university-logo.png   # Aditya University CSE official emblem
│
└── docs/
    ├── OOP_CONCEPTS.md                  # Complete Viva guide & concept code mappings
    ├── ARCHITECTURE.md                  # Layered architecture & Single Source of Truth
    ├── DATABASE.md                      # Schema design, indexes & data dictionary
    ├── API.md                           # REST API specification & payloads
    └── ANIMATIONS.md                    # Canvas particle physics & color math
```

---

## 4. Quick Start & Installation

### Prerequisites
- **Node.js**: Version `20.0.0` or higher (tested on Node `24.20.0`).
- **npm**: Version `10.0.0` or higher.

### Step 1: Clone or Navigate to Project
```bash
cd d:/Student_Management_System
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Launch the Application
```bash
npm start
```
*Alternatively, for hot-reload development:*
```bash
npm run dev
```

### Step 4: Open in Browser
Navigate to:
```
http://localhost:3000
```

The server automatically initializes the SQLite schema and seeds the 500 students from `data/cse_students_500.csv` on first launch!

---

## 5. Demo Credentials

### 1. Faculty / Admin Login
- **Username**: `admin`
- **Password**: `admin123`
*(Clearly marked as DEMO ADMIN ACCOUNT on the login portal)*

### 2. Student Login
- Enter any valid university Student ID between `25b11cs001` and `25b11cs999`.
- *Example IDs from initial dataset*:
  - `25b11cs001` (Kalyanam Mukundha)
  - `25b11cs002` (Salagrama S V N S S Saraschandra)
  - `25b11cs050`
  - `25b11cs500`
  - Supports new students up to `25b11cs841` and `25b11cs999`!
- Click **SEND OTP**: The simulated 6-digit code will appear in the **DEMO OTP SIMULATION** card along with a 60-second countdown timer. Enter the code and click **VERIFY OTP**.

---

## 6. Exact Step-by-Step Viva Demonstration Script
*(Demonstrating the Single Source of Truth Principle)*

Follow these exact 11 steps during your academic project demonstration:

1. **Step 1 — Startup**: Open `http://localhost:3000`. Observe the animated Aditya University loading screen with pulsating emblem and ellipsis progress dots smoothly transitioning to the login screen.
2. **Step 2 — Visuals**: Move the cursor over the login background. Observe the canvas particles glowing and gently repelling from the mouse cursor, and note the slow, subtle dynamic background hue shifts.
3. **Step 3 — Student Login**: Select **Student Login**. Enter `25b11cs001`. Click **SEND OTP**. Observe the simulated OTP notification banner appear with the 6-digit code and a 60-second countdown timer. Enter the OTP and click **VERIFY OTP**.
4. **Step 4 — Student Dashboard**: Observe the student dashboard. Note the logged-in student's details: **Kalyanam Mukundha**, Initial Attendance: **94.5%**, Initial Percentage: **93.14%**, Grade: **A+**. Notice that the student has no edit controls.
5. **Step 5 — Logout**: Click **Logout** in the top right header.
6. **Step 6 — Admin Login**: Select **Admin Login**. Enter `admin` / `admin123`. Click **LOGIN**.
7. **Step 7 — Admin Dashboard & Search**: Observe the dashboard KPI counters smoothly animating from $0 \rightarrow 500$. Navigate to the **Students** tab. In the live search box, type `25b11cs001` or `Kalyanam`. The table instantly filters without a page refresh.
8. **Step 8 — Edit Student**: Click the **Edit** action button on `25b11cs001`. Change the **Attendance** from `94.5` to `97.0`. Observe the real-time calculation preview. Click **Save Student**.
9. **Step 9 — Verification**: Observe the success toast notification (`✓ Student updated successfully!`). In the admin table, note that Attendance now reads `97%`. Open the **Audit Logs** tab to show the recorded change with old value `94.5` and new value `97.0`.
10. **Step 10 — Admin Logout**: Click **Logout**.
11. **Step 11 — Student Re-Login Verification**: Log in again as student `25b11cs001` using the simulated OTP. The student dashboard immediately displays **Attendance: 97%**! This conclusively proves that SQLite is the single source of truth and data is never duplicated or hardcoded.

---

## 7. Documentation Index

Detailed technical guides are available in the `docs/` folder:
- 📘 [OOP Concepts & Viva Reference](docs/OOP_CONCEPTS.md)
- 🏗 [System Architecture & Data Flow](docs/ARCHITECTURE.md)
- 🗄 [Database Schema & Relational Integrity](docs/DATABASE.md)
- 🔌 [REST API Documentation](docs/API.md)
- 🎨 [Animation Engine & Mathematical Physics](docs/ANIMATIONS.md)

---

## 8. License
Developed for educational demonstration at **Aditya University – Department of Computer Science & Engineering**.
Released under the MIT License.
