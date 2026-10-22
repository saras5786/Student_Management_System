// ==============================================================================
// DESIGN CONCEPT: CONTROLLER PATTERN
// File: server/controllers/StudentController.js
// 
// Bridges HTTP requests with StudentService methods.
// ==============================================================================

import { StudentService } from '../services/StudentService.js';

export class StudentController {
    #studentService;

    constructor() {
        this.#studentService = new StudentService();
    }

    /**
     * GET /api/students
     * Query: page, limit, search, semester, gender, grade, status, branch, sortBy, sortOrder
     */
    listStudents = async (req, res, next) => {
        try {
            const data = this.#studentService.listStudents(req.query);
            res.json({
                success: true,
                ...data
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * GET /api/students/:studentId
     */
    getStudentById = async (req, res, next) => {
        try {
            const student = this.#studentService.getStudentByStudentId(req.params.studentId);
            res.json({
                success: true,
                student
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * POST /api/students
     */
    createStudent = async (req, res, next) => {
        try {
            const adminUser = req.user ? req.user.username : 'admin';
            const student = this.#studentService.createStudent(adminUser, req.body);
            res.status(201).json({
                success: true,
                message: `Student "${student.name}" (${student.student_id}) created successfully!`,
                student
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * PUT /api/students/:studentId
     */
    updateStudent = async (req, res, next) => {
        try {
            const adminUser = req.user ? req.user.username : 'admin';
            const student = this.#studentService.updateStudent(adminUser, req.params.studentId, req.body);
            res.json({
                success: true,
                message: `Student "${student.name}" (${student.student_id}) updated successfully!`,
                student
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * DELETE /api/students/:studentId
     */
    deleteStudent = async (req, res, next) => {
        try {
            const adminUser = req.user ? req.user.username : 'admin';
            this.#studentService.deleteStudent(adminUser, req.params.studentId);
            res.json({
                success: true,
                message: `Student with ID "${req.params.studentId}" was deleted successfully.`
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * GET /api/students/toppers
     * Retrieve Dean's list / Top 10 academic achievers
     */
    getToppers = async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const toppers = this.#studentService.getTopPerformers(limit);
            res.json({
                success: true,
                toppers
            });
        } catch (err) {
            next(err);
        }
    };
}
