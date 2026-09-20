# REST API Specification
## Aditya University Student Management System (AU-SMS)

Base URL: `http://localhost:3000/api`

All authenticated endpoints require the `Authorization: Bearer <JWT_TOKEN>` header.

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Administrator Login
- **Endpoint**: `POST /auth/admin/login`
- **Access**: Public
- **Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "Administrator login successful.",
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "CSE Department Administrator",
    "role": "ADMIN"
  }
}
```

### 1.2 Student Request OTP
- **Endpoint**: `POST /auth/student/request-otp`
- **Access**: Public
- **Request Body**:
```json
{
  "studentId": "25b11cs001"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "studentId": "25b11cs001",
  "studentName": "Kalyanam Mukundha",
  "demoOtp": "482913",
  "expiresIn": 60,
  "message": "DEMO OTP generated for Kalyanam Mukundha. Use code: 482913"
}
```

### 1.3 Student Verify OTP
- **Endpoint**: `POST /auth/student/verify-otp`
- **Access**: Public
- **Request Body**:
```json
{
  "studentId": "25b11cs001",
  "otpCode": "482913"
}
```
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "OTP verified successfully! Welcome to AU-SMS.",
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "studentId": "25b11cs001",
    "name": "Kalyanam Mukundha",
    "role": "STUDENT",
    "profile": { ... }
  }
}
```

### 1.4 Get Current Session Profile
- **Endpoint**: `GET /auth/me`
- **Access**: Authenticated (`STUDENT` or `ADMIN`)
- **Response** (200 OK):
```json
{
  "success": true,
  "user": { ... }
}
```

---

## 2. Student Endpoints (`/api/students`)

### 2.1 List & Filter Students
- **Endpoint**: `GET /students`
- **Access**: `ADMIN` only
- **Query Parameters**:
  - `page`: Page number (default `1`)
  - `limit`: Items per page (default `20`)
  - `search`: Matches Student ID or Name
  - `semester`: Filter by semester (e.g. `Semester 4`)
  - `gender`: Filter by gender (`Male` / `Female`)
  - `grade`: Filter by grade (`A+`, `A`, `B`, `C`, `D`, `F`)
  - `status`: Filter by status (`PASS` / `FAIL`)
  - `sortBy`: Column name (`name`, `attendance`, `percentage`, `grade`, `semester`, `student_id`)
  - `sortOrder`: `ASC` or `DESC`
- **Response** (200 OK):
```json
{
  "success": true,
  "students": [ ... ],
  "pagination": {
    "total": 500,
    "page": 1,
    "limit": 20,
    "totalPages": 25,
    "from": 1,
    "to": 20
  }
}
```

### 2.2 Get Student Details
- **Endpoint**: `GET /students/:studentId`
- **Access**: `ADMIN` OR matching authenticating `STUDENT`
- **Response** (200 OK):
```json
{
  "success": true,
  "student": {
    "id": 1,
    "student_id": "25b11cs001",
    "name": "Kalyanam Mukundha",
    "gender": "Male",
    "branch": "CSE",
    "semester": "Semester 1",
    "attendance": 94.5,
    "mathematics": 93.2,
    "physics": 91.7,
    "python_programming": 93.6,
    "data_structures": 95.8,
    "english": 91.4,
    "total_marks": 465.7,
    "percentage": 93.14,
    "grade": "A+",
    "grade_point": 10,
    "status": "PASS"
  }
}
```

### 2.3 Create Student
- **Endpoint**: `POST /students`
- **Access**: `ADMIN` only
- **Request Body**:
```json
{
  "student_id": "25b11cs501",
  "name": "Praveen Kumar",
  "gender": "Male",
  "branch": "CSE",
  "semester": "Semester 1",
  "attendance": 88.0,
  "mathematics": 85.0,
  "physics": 82.0,
  "python_programming": 90.0,
  "data_structures": 88.0,
  "english": 84.0
}
```
*(Computed columns total_marks, percentage, grade, grade_point, status are automatically calculated on the server)*
- **Response** (201 Created):
```json
{
  "success": true,
  "message": "Student \"Praveen Kumar\" (25b11cs501) created successfully!",
  "student": { ... }
}
```

### 2.4 Update Student
- **Endpoint**: `PUT /students/:studentId`
- **Access**: `ADMIN` only
- **Request Body**: Updated student fields.
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "Student updated successfully!",
  "student": { ... }
}
```

### 2.5 Delete Student
- **Endpoint**: `DELETE /students/:studentId`
- **Access**: `ADMIN` only
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "Student with ID \"25b11cs501\" was deleted successfully."
}
```

---

## 3. Administrative & Analytics Endpoints (`/api/admin` or `/api`)

### 3.1 Get University Department Analytics
- **Endpoint**: `GET /analytics`
- **Access**: `ADMIN` only
- **Response** (200 OK):
```json
{
  "success": true,
  "analytics": {
    "kpis": {
      "totalStudents": 500,
      "avgPercentage": 72.85,
      "avgAttendance": 81.42,
      "passCount": 425,
      "failCount": 75,
      "passRate": 85.0
    },
    "subjectAverages": { ... },
    "gradeDistribution": [ ... ],
    "semesterDistribution": [ ... ],
    "attendanceDistribution": { ... }
  }
}
```

### 3.2 Import CSV
- **Endpoint**: `POST /import`
- **Access**: `ADMIN` only
- **Payload**: `multipart/form-data` with `file` field containing CSV.
- **Response** (200 OK):
```json
{
  "success": true,
  "message": "CSV Import complete: 1 added, 499 updated, 0 errors.",
  "summary": {
    "processed": 500,
    "added": 1,
    "updated": 499,
    "errors": 0,
    "errorDetails": []
  }
}
```

### 3.3 Export Live CSV
- **Endpoint**: `GET /export`
- **Access**: `ADMIN` only
- **Response**: Streamed `text/csv` file containing the latest records from SQLite.

### 3.4 Get Audit Logs
- **Endpoint**: `GET /audit-logs`
- **Access**: `ADMIN` only
- **Response** (200 OK):
```json
{
  "success": true,
  "logs": [ ... ],
  "pagination": { ... }
}
```
