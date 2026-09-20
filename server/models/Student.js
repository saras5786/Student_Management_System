// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & DOMAIN ENTITY
// File: server/models/Student.js
// 
// Represents the core Student entity. All internal state is strictly protected
// behind private fields (#). Changes must go through controlled setters that
// perform validation, ensuring invariants are preserved.
// ==============================================================================

import { AcademicCalculator } from '../utils/AcademicCalculator.js';
import { Validator } from '../utils/validators.js';

export class Student {
    // OOP CONCEPT: PRIVATE FIELDS (STRICT ENCAPSULATION)
    #id;
    #studentId;
    #name;
    #gender;
    #branch;
    #semester;
    #attendance;
    #mathematics;
    #physics;
    #pythonProgramming;
    #dataStructures;
    #english;
    #createdAt;
    #updatedAt;

    constructor({
        id = null,
        student_id,
        name,
        gender = 'Male',
        branch = 'CSE',
        semester = 'Semester 1',
        attendance = 0,
        mathematics = 0,
        physics = 0,
        python_programming = 0,
        data_structures = 0,
        english = 0,
        created_at = null,
        updated_at = null
    }) {
        this.#id = id;
        this.studentId = student_id; // uses setter validation
        this.name = name;
        this.gender = gender;
        this.branch = branch;
        this.semester = semester;
        this.attendance = attendance;
        this.mathematics = mathematics;
        this.physics = physics;
        this.pythonProgramming = python_programming;
        this.dataStructures = data_structures;
        this.english = english;
        this.#createdAt = created_at;
        this.#updatedAt = updated_at;
    }

    // OOP CONCEPT: GETTERS & SETTERS
    get id() { return this.#id; }

    get studentId() { return this.#studentId; }
    set studentId(val) {
        const normalized = Validator.normalizeStudentId(val);
        if (!Validator.isValidStudentId(normalized)) {
            throw new Error(`Invalid Student ID format: ${val}. Expected format: 25b11csXXX`);
        }
        this.#studentId = normalized;
    }

    get name() { return this.#name; }
    set name(val) {
        if (!val || typeof val !== 'string' || val.trim().length < 2) {
            throw new Error('Name must be at least 2 characters long.');
        }
        this.#name = val.trim();
    }

    get gender() { return this.#gender; }
    set gender(val) {
        const g = (val || '').trim();
        if (!['Male', 'Female', 'Other'].includes(g)) {
            throw new Error('Gender must be Male, Female, or Other.');
        }
        this.#gender = g;
    }

    get branch() { return this.#branch; }
    set branch(val) { this.#branch = (val || 'CSE').trim(); }

    get semester() { return this.#semester; }
    set semester(val) {
        if (!Validator.isValidSemester(val)) {
            throw new Error('Semester must be between Semester 1 and Semester 8.');
        }
        this.#semester = Validator.normalizeSemester(val);
    }

    get attendance() { return this.#attendance; }
    set attendance(val) {
        if (!Validator.isValidAttendance(val)) {
            throw new Error('Attendance must be between 0 and 100.');
        }
        this.#attendance = parseFloat(val);
    }

    get mathematics() { return this.#mathematics; }
    set mathematics(val) {
        if (!Validator.isValidMark(val)) throw new Error('Mathematics mark must be between 0 and 100.');
        this.#mathematics = parseFloat(val);
    }

    get physics() { return this.#physics; }
    set physics(val) {
        if (!Validator.isValidMark(val)) throw new Error('Physics mark must be between 0 and 100.');
        this.#physics = parseFloat(val);
    }

    get pythonProgramming() { return this.#pythonProgramming; }
    set pythonProgramming(val) {
        if (!Validator.isValidMark(val)) throw new Error('Python mark must be between 0 and 100.');
        this.#pythonProgramming = parseFloat(val);
    }

    get dataStructures() { return this.#dataStructures; }
    set dataStructures(val) {
        if (!Validator.isValidMark(val)) throw new Error('Data Structures mark must be between 0 and 100.');
        this.#dataStructures = parseFloat(val);
    }

    get english() { return this.#english; }
    set english(val) {
        if (!Validator.isValidMark(val)) throw new Error('English mark must be between 0 and 100.');
        this.#english = parseFloat(val);
    }

    get createdAt() { return this.#createdAt; }
    get updatedAt() { return this.#updatedAt; }

    // ==============================================================================
    // COMPUTED PROPERTIES VIA ACADEMIC CALCULATOR (ABSTRACTION)
    // ==============================================================================
    get totalMarks() {
        return AcademicCalculator.calculateTotalMarks({
            mathematics: this.#mathematics,
            physics: this.#physics,
            python_programming: this.#pythonProgramming,
            data_structures: this.#dataStructures,
            english: this.#english
        });
    }

    get percentage() {
        return AcademicCalculator.calculatePercentage({
            mathematics: this.#mathematics,
            physics: this.#physics,
            python_programming: this.#pythonProgramming,
            data_structures: this.#dataStructures,
            english: this.#english
        });
    }

    get grade() {
        return AcademicCalculator.calculateGrade(this.percentage);
    }

    get gradePoint() {
        return AcademicCalculator.calculateGradePoint(this.grade);
    }

    get status() {
        return AcademicCalculator.calculateStatus(this.percentage);
    }

    /**
     * Factory method to instantiate Student from raw database row.
     * 
     * @param {Object} row 
     * @returns {Student}
     */
    static fromRow(row) {
        if (!row) return null;
        return new Student({
            id: row.id,
            student_id: row.student_id,
            name: row.name,
            gender: row.gender,
            branch: row.branch,
            semester: row.semester,
            attendance: row.attendance,
            mathematics: row.mathematics,
            physics: row.physics,
            python_programming: row.python_programming,
            data_structures: row.data_structures,
            english: row.english,
            created_at: row.created_at,
            updated_at: row.updated_at
        });
    }

    /**
     * Convert instance to serializable object matching database / API format.
     * 
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.#id,
            student_id: this.#studentId,
            name: this.#name,
            gender: this.#gender,
            branch: this.#branch,
            semester: this.#semester,
            attendance: this.#attendance,
            mathematics: this.#mathematics,
            physics: this.#physics,
            python_programming: this.#pythonProgramming,
            data_structures: this.#dataStructures,
            english: this.#english,
            total_marks: this.totalMarks,
            percentage: this.percentage,
            grade: this.grade,
            grade_point: this.gradePoint,
            status: this.status,
            created_at: this.#createdAt,
            updated_at: this.#updatedAt
        };
    }
}
