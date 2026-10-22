// ==============================================================================
// DESIGN CONCEPT: REPOSITORY PATTERN
// File: server/repositories/StudentRepository.js
// 
// Encapsulates all data access logic for the 'students' table.
// Higher layers (Services, Controllers) do not write raw SQL queries.
// Uses parameterized SQL statements to guard against SQL Injection.
// ==============================================================================

import { DatabaseManager } from '../config/database.js';
import { Student } from '../models/Student.js';

export class StudentRepository {
    #db;

    constructor() {
        this.#db = DatabaseManager.getInstance();
    }

    /**
     * Find a student by their unique University Student ID.
     * 
     * @param {string} studentId e.g., '25b11cs001'
     * @returns {Student|null}
     */
    findByStudentId(studentId) {
        const sql = `SELECT * FROM students WHERE LOWER(student_id) = LOWER(?) LIMIT 1`;
        const row = this.#db.get(sql, [(studentId || '').trim().toLowerCase()]);
        return row ? Student.fromRow(row) : null;
    }

    /**
     * Check if a student ID already exists.
     * 
     * @param {string} studentId 
     * @returns {boolean}
     */
    exists(studentId) {
        const sql = `SELECT COUNT(*) as count FROM students WHERE LOWER(student_id) = LOWER(?)`;
        const result = this.#db.get(sql, [(studentId || '').trim().toLowerCase()]);
        return result && result.count > 0;
    }

    /**
     * Query students with dynamic filtering, live search, sorting, and pagination.
     * 
     * @param {Object} options
     * @param {string} options.search Search query (matches Student ID or Name)
     * @param {string} options.semester Filter by semester
     * @param {string} options.gender Filter by gender
     * @param {string} options.grade Filter by grade
     * @param {string} options.status Filter by PASS / FAIL status
     * @param {string} options.branch Filter by branch
     * @param {string} options.sortBy Sort column (name, attendance, percentage, grade, semester, student_id)
     * @param {string} options.sortOrder ASC or DESC
     * @param {number} options.limit Number of items per page
     * @param {number} options.offset Page offset
     * @returns {{ students: Student[], total: number, page: number, totalPages: number }}
     */
    findWithFilters({
        search = '',
        semester = '',
        gender = '',
        grade = '',
        status = '',
        branch = '',
        sortBy = 'student_id',
        sortOrder = 'ASC',
        limit = 20,
        offset = 0
    } = {}) {
        const conditions = [];
        const params = [];

        if (search && search.trim().length > 0) {
            conditions.push(`(LOWER(student_id) LIKE ? OR LOWER(name) LIKE ?)`);
            const term = `%${search.trim().toLowerCase()}%`;
            params.push(term, term);
        }

        if (semester && semester !== 'ALL') {
            conditions.push(`LOWER(semester) = LOWER(?)`);
            params.push(semester);
        }

        if (gender && gender !== 'ALL') {
            conditions.push(`LOWER(gender) = LOWER(?)`);
            params.push(gender);
        }

        if (grade && grade !== 'ALL') {
            conditions.push(`UPPER(grade) = UPPER(?)`);
            params.push(grade);
        }

        if (status && status !== 'ALL') {
            conditions.push(`UPPER(status) = UPPER(?)`);
            params.push(status);
        }

        if (branch && branch !== 'ALL') {
            conditions.push(`UPPER(branch) = UPPER(?)`);
            params.push(branch);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count total matching records
        const countSql = `SELECT COUNT(*) as total FROM students ${whereClause}`;
        const countRow = this.#db.get(countSql, params);
        const total = countRow ? countRow.total : 0;

        // Whitelist sort columns to prevent SQL injection in ORDER BY clause
        const allowedSortCols = {
            'student_id': 'student_id',
            'name': 'name',
            'attendance': 'attendance',
            'percentage': 'percentage',
            'grade': 'percentage', // sort by percentage for accurate grade order
            'grade_point': 'grade_point',
            'semester': 'semester',
            'status': 'status',
            'total_marks': 'total_marks'
        };

        const safeSortCol = allowedSortCols[sortBy] || 'student_id';
        const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        const querySql = `
            SELECT * FROM students
            ${whereClause}
            ORDER BY ${safeSortCol} ${safeSortOrder}
            LIMIT ? OFFSET ?
        `;

        const queryParams = [...params, limit, offset];
        const rows = this.#db.all(querySql, queryParams);
        const students = rows.map(r => Student.fromRow(r));

        return {
            students,
            total,
            limit,
            offset
        };
    }

    /**
     * Create a new student record in SQLite.
     * 
     * @param {Object} data 
     * @returns {Student}
     */
    create(data) {
        const sql = `
            INSERT INTO students (
                student_id, name, gender, branch, semester, attendance,
                mathematics, physics, python_programming, data_structures, english,
                total_marks, percentage, grade, grade_point, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
        `;

        this.#db.run(sql, [
            data.student_id,
            data.name,
            data.gender,
            data.branch,
            data.semester,
            data.attendance,
            data.mathematics,
            data.physics,
            data.python_programming,
            data.data_structures,
            data.english,
            data.total_marks,
            data.percentage,
            data.grade,
            data.grade_point,
            data.status
        ]);

        return this.findByStudentId(data.student_id);
    }

    /**
     * Update an existing student record in SQLite.
     * 
     * @param {string} studentId 
     * @param {Object} data 
     * @returns {Student}
     */
    update(studentId, data) {
        const sql = `
            UPDATE students SET
                name = ?,
                gender = ?,
                branch = ?,
                semester = ?,
                attendance = ?,
                mathematics = ?,
                physics = ?,
                python_programming = ?,
                data_structures = ?,
                english = ?,
                total_marks = ?,
                percentage = ?,
                grade = ?,
                grade_point = ?,
                status = ?,
                updated_at = datetime('now', 'localtime')
            WHERE LOWER(student_id) = LOWER(?)
        `;

        this.#db.run(sql, [
            data.name,
            data.gender,
            data.branch,
            data.semester,
            data.attendance,
            data.mathematics,
            data.physics,
            data.python_programming,
            data.data_structures,
            data.english,
            data.total_marks,
            data.percentage,
            data.grade,
            data.grade_point,
            data.status,
            studentId.trim().toLowerCase()
        ]);

        return this.findByStudentId(studentId);
    }

    /**
     * Delete a student by student ID.
     * 
     * @param {string} studentId 
     * @returns {boolean}
     */
    delete(studentId) {
        const sql = `DELETE FROM students WHERE LOWER(student_id) = LOWER(?)`;
        const res = this.#db.run(sql, [studentId.trim().toLowerCase()]);
        return res.changes > 0;
    }

    /**
     * Retrieve all students for CSV export.
     * 
     * @returns {Array<Object>}
     */
    findAllForExport() {
        const sql = `SELECT * FROM students ORDER BY student_id ASC`;
        return this.#db.all(sql);
    }

    /**
     * Aggregate system-wide statistics dynamically from SQLite.
     * 
     * @returns {Object}
     */
    getAggregateMetrics() {
        const sql = `
            SELECT 
                COUNT(*) as total_students,
                ROUND(AVG(percentage), 2) as avg_percentage,
                ROUND(AVG(attendance), 2) as avg_attendance,
                MAX(percentage) as max_percentage,
                MIN(percentage) as min_percentage,
                SUM(CASE WHEN UPPER(status) = 'PASS' THEN 1 ELSE 0 END) as pass_count,
                SUM(CASE WHEN UPPER(status) = 'FAIL' THEN 1 ELSE 0 END) as fail_count,
                ROUND(AVG(mathematics), 2) as avg_mathematics,
                ROUND(AVG(physics), 2) as avg_physics,
                ROUND(AVG(python_programming), 2) as avg_python,
                ROUND(AVG(data_structures), 2) as avg_data_structures,
                ROUND(AVG(english), 2) as avg_english
            FROM students
        `;
        return this.#db.get(sql) || {};
    }

    /**
     * Get distribution arrays for analytics charts.
     */
    getAnalyticsDistributions() {
        // Grade counts
        const gradeSql = `
            SELECT grade, COUNT(*) as count 
            FROM students 
            GROUP BY grade 
            ORDER BY 
                CASE grade
                    WHEN 'A+' THEN 1
                    WHEN 'A'  THEN 2
                    WHEN 'B'  THEN 3
                    WHEN 'C'  THEN 4
                    WHEN 'D'  THEN 5
                    WHEN 'F'  THEN 6
                    ELSE 7
                END
        `;
        const grades = this.#db.all(gradeSql);

        // Semester distribution
        const semSql = `SELECT semester, COUNT(*) as count FROM students GROUP BY semester ORDER BY semester ASC`;
        const semesters = this.#db.all(semSql);

        // Attendance ranges
        const attSql = `
            SELECT 
                SUM(CASE WHEN attendance >= 90 THEN 1 ELSE 0 END) as range_90_100,
                SUM(CASE WHEN attendance >= 80 AND attendance < 90 THEN 1 ELSE 0 END) as range_80_89,
                SUM(CASE WHEN attendance >= 70 AND attendance < 80 THEN 1 ELSE 0 END) as range_70_79,
                SUM(CASE WHEN attendance >= 60 AND attendance < 70 THEN 1 ELSE 0 END) as range_60_69,
                SUM(CASE WHEN attendance < 60 THEN 1 ELSE 0 END) as range_below_60
            FROM students
        `;
        const attendanceRanges = this.#db.get(attSql);

        return {
            grades,
            semesters,
            attendanceRanges
        };
    }

    /**
     * Retrieve top academic performers for CSE Hall of Fame / Dean's List.
     * 
     * @param {number} limit 
     * @returns {Array<Object>}
     */
    getTopPerformers(limit = 10) {
        const sql = `
            SELECT student_id, name, semester, attendance, percentage, grade, grade_point, status
            FROM students 
            WHERE UPPER(status) = 'PASS'
            ORDER BY percentage DESC 
            LIMIT ?
        `;
        return this.#db.all(sql, [limit]);
    }
}
