// ==============================================================================
// DESIGN CONCEPT: SERVICE PATTERN & SEPARATION OF CONCERNS
// File: server/services/StudentService.js
// 
// Encapsulates business logic, orchestrating between StudentRepository,
// AuditRepository, and the AcademicCalculator abstraction.
// ==============================================================================

import { StudentRepository } from '../repositories/StudentRepository.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { AcademicCalculator } from '../utils/AcademicCalculator.js';
import { Validator } from '../utils/validators.js';

export class StudentService {
    // OOP CONCEPT: COMPOSITION
    // StudentService is composed of repository instances.
    #studentRepo;
    #auditRepo;

    constructor() {
        this.#studentRepo = new StudentRepository();
        this.#auditRepo = new AuditRepository();
    }

    /**
     * Retrieve paginated and filtered list of students.
     * 
     * @param {Object} queryParams 
     * @returns {Object}
     */
    listStudents(queryParams) {
        const page = Math.max(1, parseInt(queryParams.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(queryParams.limit) || 20));
        const offset = (page - 1) * limit;

        const result = this.#studentRepo.findWithFilters({
            search: queryParams.search || '',
            semester: queryParams.semester || '',
            gender: queryParams.gender || '',
            grade: queryParams.grade || '',
            status: queryParams.status || '',
            branch: queryParams.branch || '',
            sortBy: queryParams.sortBy || 'student_id',
            sortOrder: queryParams.sortOrder || 'ASC',
            limit,
            offset
        });

        const totalPages = Math.ceil(result.total / limit) || 1;

        return {
            students: result.students.map(s => s.toJSON()),
            pagination: {
                total: result.total,
                page,
                limit,
                totalPages,
                from: result.total === 0 ? 0 : offset + 1,
                to: Math.min(offset + limit, result.total)
            }
        };
    }

    /**
     * Get a single student record by their university ID.
     * 
     * @param {string} studentId 
     * @returns {Object}
     */
    getStudentByStudentId(studentId) {
        const normalized = Validator.normalizeStudentId(studentId);
        const student = this.#studentRepo.findByStudentId(normalized);
        if (!student) {
            const err = new Error(`Student with ID "${studentId}" not found.`);
            err.statusCode = 404;
            throw err;
        }
        return student.toJSON();
    }

    /**
     * Add a new student record.
     * 
     * @param {string} adminUsername 
     * @param {Object} payload 
     * @returns {Object}
     */
    createStudent(adminUsername, payload) {
        // Step 1: Validate payload
        const validation = Validator.validateStudentPayload(payload, false);
        if (!validation.valid) {
            const err = new Error(validation.errors.join(' '));
            err.statusCode = 400;
            throw err;
        }

        const normalizedId = Validator.normalizeStudentId(payload.student_id);

        // Step 2: Check duplicate ID
        if (this.#studentRepo.exists(normalizedId)) {
            const err = new Error(`Student ID ${normalizedId} already exists in database.`);
            err.statusCode = 409;
            throw err;
        }

        // Step 3: Compute academic metrics (Abstraction)
        const evaluation = AcademicCalculator.evaluateAll({
            mathematics: payload.mathematics,
            physics: payload.physics,
            python_programming: payload.python_programming,
            data_structures: payload.data_structures,
            english: payload.english
        });

        // Step 4: Insert via Repository
        const record = this.#studentRepo.create({
            student_id: normalizedId,
            name: payload.name.trim(),
            gender: payload.gender.trim(),
            branch: payload.branch ? payload.branch.trim() : 'CSE',
            semester: Validator.normalizeSemester(payload.semester),
            attendance: parseFloat(payload.attendance),
            mathematics: parseFloat(payload.mathematics),
            physics: parseFloat(payload.physics),
            python_programming: parseFloat(payload.python_programming),
            data_structures: parseFloat(payload.data_structures),
            english: parseFloat(payload.english),
            total_marks: evaluation.total_marks,
            percentage: evaluation.percentage,
            grade: evaluation.grade,
            grade_point: evaluation.grade_point,
            status: evaluation.status
        });

        // Step 5: Write Audit Log
        this.#auditRepo.log({
            adminUsername: adminUsername || 'admin',
            action: 'ADD_STUDENT',
            studentId: normalizedId,
            details: `Added new student: ${payload.name} (${normalizedId}), Percentage: ${evaluation.percentage}%`
        });

        return record.toJSON();
    }

    /**
     * Update an existing student record in SQLite.
     * 
     * @param {string} adminUsername 
     * @param {string} studentId 
     * @param {Object} payload 
     * @returns {Object}
     */
    updateStudent(adminUsername, studentId, payload) {
        const normalizedId = Validator.normalizeStudentId(studentId);
        const existingStudent = this.#studentRepo.findByStudentId(normalizedId);

        if (!existingStudent) {
            const err = new Error(`Student with ID "${studentId}" not found.`);
            err.statusCode = 404;
            throw err;
        }

        // Validate payload for update
        const validation = Validator.validateStudentPayload(payload, true);
        if (!validation.valid) {
            const err = new Error(validation.errors.join(' '));
            err.statusCode = 400;
            throw err;
        }

        // Compute new academic values
        const evaluation = AcademicCalculator.evaluateAll({
            mathematics: payload.mathematics,
            physics: payload.physics,
            python_programming: payload.python_programming,
            data_structures: payload.data_structures,
            english: payload.english
        });

        const updatedData = {
            name: payload.name.trim(),
            gender: payload.gender.trim(),
            branch: payload.branch ? payload.branch.trim() : 'CSE',
            semester: Validator.normalizeSemester(payload.semester),
            attendance: parseFloat(payload.attendance),
            mathematics: parseFloat(payload.mathematics),
            physics: parseFloat(payload.physics),
            python_programming: parseFloat(payload.python_programming),
            data_structures: parseFloat(payload.data_structures),
            english: parseFloat(payload.english),
            total_marks: evaluation.total_marks,
            percentage: evaluation.percentage,
            grade: evaluation.grade,
            grade_point: evaluation.grade_point,
            status: evaluation.status
        };

        // Detect differences for Audit Logging
        const existingJSON = existingStudent.toJSON();
        const trackedFields = [
            'name', 'gender', 'semester', 'attendance',
            'mathematics', 'physics', 'python_programming',
            'data_structures', 'english'
        ];

        for (const f of trackedFields) {
            const oldVal = existingJSON[f];
            const newVal = updatedData[f];
            if (oldVal !== undefined && newVal !== undefined && String(oldVal) !== String(newVal)) {
                this.#auditRepo.log({
                    adminUsername: adminUsername || 'admin',
                    action: 'UPDATE_STUDENT',
                    studentId: normalizedId,
                    fieldName: f,
                    oldValue: oldVal,
                    newValue: newVal,
                    details: `Field ${f} updated from ${oldVal} to ${newVal}`
                });
            }
        }

        // Update database record
        const updatedStudent = this.#studentRepo.update(normalizedId, updatedData);

        return updatedStudent.toJSON();
    }

    /**
     * Delete a student record by student ID.
     * 
     * @param {string} adminUsername 
     * @param {string} studentId 
     * @returns {boolean}
     */
    deleteStudent(adminUsername, studentId) {
        const normalizedId = Validator.normalizeStudentId(studentId);
        const existing = this.#studentRepo.findByStudentId(normalizedId);

        if (!existing) {
            const err = new Error(`Student with ID "${studentId}" not found.`);
            err.statusCode = 404;
            throw err;
        }

        const success = this.#studentRepo.delete(normalizedId);

        if (success) {
            this.#auditRepo.log({
                adminUsername: adminUsername || 'admin',
                action: 'DELETE_STUDENT',
                studentId: normalizedId,
                details: `Deleted student: ${existing.name} (${normalizedId})`
            });
        }

        return success;
    }
}
