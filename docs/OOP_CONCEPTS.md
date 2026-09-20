# Object-Oriented Programming (OOP) Guide & Viva Reference
## Aditya University Student Management System (AU-SMS)

This document provides an educational reference for all Object-Oriented Programming (OOP) concepts, software design patterns, and architectural principles implemented across the **AU-SMS** project. It is formatted to help students master both the theoretical definitions and the exact code implementations during academic viva examinations.

---

## 1. Summary of OOP Concepts Mapped to Code

| Concept | Primary File(s) | Key Classes / Constructs |
| :--- | :--- | :--- |
| **Classes & Objects** | `server/models/*.js`, `public/js/*.js` | `Student`, `User`, `StudentService`, `ParticleAnimation` |
| **Encapsulation** | `server/models/Student.js`, `User.js` | Private fields (`#studentId`, `#attendance`, `#db`), getters, setters |
| **Inheritance** | `server/models/StudentUser.js`, `AdminUser.js` | `class StudentUser extends User`, `super()` |
| **Polymorphism** | `server/models/User.js`, Subclasses | Method overriding: `getRole()`, `getPermissions()` |
| **Abstraction** | `server/utils/AcademicCalculator.js` | Isolating grading formulas and SQL operations from consumers |
| **Composition** | `server/services/*.js`, `public/js/app.js` | `StudentService` possesses repository instances |
| **Static Methods** | `AcademicCalculator.js`, `DatabaseManager.js` | Pure computation utilities without instantiation overhead |
| **Repository Pattern**| `server/repositories/*.js` | `StudentRepository`, `AdminRepository`, `AuditRepository` |
| **Service Pattern** | `server/services/*.js` | `StudentService`, `AuthService`, `AnalyticsService` |
| **Separation of Concerns**| Full Stack | Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Repositories $\rightarrow$ SQLite |

---

## 2. Deep Dive into Concepts

### A. Encapsulation
**Concept Definition**: Encapsulation is the bundling of data attributes and the methods that operate on that data into a single unit (class), while hiding internal state from arbitrary direct mutation by external code.

**Implementation in AU-SMS**:
In `server/models/Student.js` and `server/models/User.js`, all internal fields are marked with `#` (JavaScript private instance fields).

```javascript
// File: server/models/Student.js
export class Student {
    // OOP CONCEPT: ENCAPSULATION (PRIVATE FIELDS)
    #id;
    #studentId;
    #name;
    #attendance;
    #mathematics;

    constructor({ student_id, name, attendance, mathematics, ... }) {
        this.studentId = student_id; // invokes setter validation
        this.name = name;
        this.attendance = attendance;
        this.mathematics = mathematics;
    }

    // Controlled Getter
    get studentId() {
        return this.#studentId;
    }

    // Controlled Setter with Business Invariant Validation
    set studentId(val) {
        const normalized = Validator.normalizeStudentId(val);
        if (!Validator.isValidStudentId(normalized)) {
            throw new Error(`Invalid Student ID format: ${val}`);
        }
        this.#studentId = normalized;
    }
}
```

**Why it is used**:
- Prevents corrupt data (such as negative marks, attendance exceeding 100%, or invalid roll numbers) from ever being assigned to a student object.
- Code outside the `Student` class cannot execute `student.#attendance = -50`.

---

### B. Inheritance
**Concept Definition**: Inheritance is a mechanism where a new class (subclass/derived class) derives properties and behaviors from an existing class (base/parent class), enabling code reuse and establishing an *is-a* relationship.

**Implementation in AU-SMS**:
`User` acts as the fundamental base class, which is extended by `StudentUser` and `AdminUser`.

```javascript
// File: server/models/User.js
export class User {
    #id;
    #username;
    #name;

    constructor(id, username, name) {
        this.#id = id;
        this.#username = username;
        this.#name = name;
    }

    getRole() {
        return 'USER';
    }
}

// File: server/models/StudentUser.js
export class StudentUser extends User {
    #studentId;
    #profile;

    constructor(id, studentId, name, profile) {
        // OOP CONCEPT: SUPER CALL (calls parent constructor)
        super(id, studentId, name);
        this.#studentId = studentId;
        this.#profile = profile;
    }

    // Subclass specializes behavior
    getRole() {
        return 'STUDENT';
    }
}
```

**Why it is used**:
- Eliminates code duplication for core user properties (ID, name, session handling).
- Represents the academic domain model cleanly: a `StudentUser` *is a* `User`, and an `AdminUser` *is a* `User`.

---

### C. Polymorphism
**Concept Definition**: Polymorphism ("many forms") is the ability of different classes to respond to the same method call in distinct, specialized ways, typically achieved via method overriding.

**Implementation in AU-SMS**:
Both `StudentUser` and `AdminUser` override `getRole()` and `getPermissions()` declared in `User`:

```javascript
// Base class
user.getRole(); // returns 'USER'

// Student instance
studentUser.getRole(); // returns 'STUDENT'
studentUser.getPermissions(); // ['view_own_dashboard', 'view_own_marks']

// Admin instance
adminUser.getRole(); // returns 'ADMIN'
adminUser.getPermissions(); // ['students_read_all', 'student_create', ...]
```

**Why it is used**:
The authentication middleware can inspect any incoming `User` object and invoke `user.getRole()` or `user.getPermissions()` uniformly without needing messy `if (user.type === 1)` branches.

---

### D. Abstraction
**Concept Definition**: Abstraction is the practice of hiding complex internal implementation details and exposing only an intuitive, high-level interface to the caller.

**Implementation in AU-SMS**:
1. **Academic Calculation Abstraction** (`server/utils/AcademicCalculator.js`):
   The frontend, controllers, and seeders simply call `AcademicCalculator.evaluateAll(marks)`. They do not need to know the threshold percentages for `A+` versus `A`, nor the formula for computing Grade Points.
2. **Database Abstraction** (`server/repositories/StudentRepository.js`):
   The `StudentService` invokes `studentRepo.findByStudentId('25b11cs001')`. The service does not know whether the data is retrieved from SQLite, PostgreSQL, or an in-memory cache.

---

### E. Composition
**Concept Definition**: Composition is a design principle where a class contains references to objects of other classes to achieve functionality (*has-a* relationship), offering greater flexibility than inheritance.

**Implementation in AU-SMS**:
`StudentService` is composed of `StudentRepository` and `AuditRepository`:

```javascript
// File: server/services/StudentService.js
export class StudentService {
    // OOP CONCEPT: COMPOSITION
    #studentRepo;
    #auditRepo;

    constructor() {
        this.#studentRepo = new StudentRepository();
        this.#auditRepo = new AuditRepository();
    }
}
```

Similarly, `ParticleAnimation` (*has-a*) pool of `Particle` objects.

---

### F. Static Methods & Utility Classes
**Concept Definition**: Methods defined with the `static` keyword belong to the class itself rather than to instances created from that class. They are executed without instantiating the class using `new`.

**Implementation in AU-SMS**:
```javascript
// File: server/utils/AcademicCalculator.js
export class AcademicCalculator {
    static calculateTotalMarks(marks) { ... }
    static calculatePercentage(marks) { ... }
    static calculateGrade(percentage) { ... }
}

// Caller usage:
const grade = AcademicCalculator.calculateGrade(88.5); // 'A'
```

---

## 3. Software Architectural Patterns

### 1. Repository Pattern
- **Purpose**: Decouples business logic from data storage mechanisms.
- **Classes**: `StudentRepository`, `AdminRepository`, `AuditRepository`.
- **Advantage**: If Aditya University switches from SQLite to PostgreSQL or MySQL in the future, only the Repository files need modification. The controllers and services remain unchanged.

### 2. Service Pattern
- **Purpose**: Encapsulates university business workflows, validation, and multi-repository coordination.
- **Classes**: `StudentService`, `AuthService`, `OTPService`, `AnalyticsService`, `CSVService`.
- **Advantage**: Centralizes actions like "When a student record is updated, recalculate grades and insert an audit log entry."

---

## 4. Viva Preparation: Sample Questions & Answers

**Q1: Where is encapsulation used in your backend?**
> *Answer*: In `server/models/Student.js`, all properties such as `#studentId`, `#attendance`, and `#mathematics` use ECMAScript private field syntax (`#`). External code cannot directly overwrite these variables. They can only be read via getters and updated via setters that enforce university validation rules (e.g., marks between 0 and 100).

**Q2: How does your project demonstrate polymorphism?**
> *Answer*: The `User` base class defines `getRole()` and `getPermissions()`. `StudentUser` and `AdminUser` inherit from `User` and override these methods. In our authorization middleware, we can treat any authenticated principal as a `User` and invoke `.getRole()` polymorphically to enforce permissions.

**Q3: Why did you separate StudentRepository and StudentService?**
> *Answer*: This follows the Single Responsibility Principle and Separation of Concerns. `StudentRepository` only handles SQL queries and database CRUD operations. `StudentService` handles business logic: validating inputs, running the `AcademicCalculator`, and writing entries to `AuditRepository`.
