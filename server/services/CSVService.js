// ==============================================================================
// DESIGN CONCEPT: SERVICE PATTERN & CSV ETL PROCESSING
// File: server/services/CSVService.js
// 
// Handles streaming/batch CSV parsing, validation, batch updates, and dynamic
// CSV export directly reflecting the latest SQLite database values.
// ==============================================================================

import { StudentRepository } from '../repositories/StudentRepository.js';
import { AuditRepository } from '../repositories/AuditRepository.js';
import { AcademicCalculator } from '../utils/AcademicCalculator.js';
import { Validator } from '../utils/validators.js';

export class CSVService {
    #studentRepo;
    #auditRepo;

    constructor() {
        this.#studentRepo = new StudentRepository();
        this.#auditRepo = new AuditRepository();
    }

    /**
     * Parse and import student records from CSV text string or buffer.
     * 
     * @param {string} adminUsername 
     * @param {string} csvText 
     * @returns {{ processed: number, added: number, updated: number, errors: number, errorDetails: Array<string> }}
     */
    importCSV(adminUsername, csvText) {
        if (!csvText || typeof csvText !== 'string') {
            const err = new Error('Invalid or empty CSV content.');
            err.statusCode = 400;
            throw err;
        }

        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length <= 1) {
            const err = new Error('CSV file contains no data records.');
            err.statusCode = 400;
            throw err;
        }

        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));

        // Validate essential headers exist
        const requiredHeaders = ['studentid', 'name', 'attendance', 'mathematics', 'physics', 'english'];
        const missing = requiredHeaders.filter(req => !headers.some(h => h.includes(req)));
        if (missing.length > 0) {
            const err = new Error(`CSV is missing required columns: ${missing.join(', ')}`);
            err.statusCode = 400;
            throw err;
        }

        // Map column indices
        const colIdx = {
            studentId: headers.findIndex(h => h.includes('studentid') || h === 'id'),
            name: headers.findIndex(h => h === 'name'),
            gender: headers.findIndex(h => h === 'gender'),
            branch: headers.findIndex(h => h === 'branch'),
            semester: headers.findIndex(h => h.includes('semester')),
            attendance: headers.findIndex(h => h.includes('attendance')),
            math: headers.findIndex(h => h.includes('math')),
            physics: headers.findIndex(h => h.includes('physics')),
            python: headers.findIndex(h => h.includes('python')),
            dataStructures: headers.findIndex(h => h.includes('datastructure') || h.includes('structures') || h.includes('ds')),
            english: headers.findIndex(h => h.includes('english'))
        };

        let processed = 0;
        let added = 0;
        let updated = 0;
        let errors = 0;
        const errorDetails = [];

        for (let i = 1; i < lines.length; i++) {
            const lineNum = i + 1;
            const line = lines[i];
            const cols = line.split(',').map(c => c.trim());

            if (cols.length < 5) continue;
            processed++;

            const rawId = cols[colIdx.studentId];
            const normalizedId = Validator.normalizeStudentId(rawId);

            if (!Validator.isValidStudentId(normalizedId)) {
                errors++;
                errorDetails.push(`Line ${lineNum}: Invalid Student ID "${rawId}". Expected format: 25b11csXXX.`);
                continue;
            }

            const name = cols[colIdx.name] || 'Unknown';
            const gender = (cols[colIdx.gender] || 'Male').trim();
            const branch = (cols[colIdx.branch] || 'CSE').trim();
            const semester = Validator.normalizeSemester(cols[colIdx.semester]) || 'Semester 1';
            const attendance = parseFloat(cols[colIdx.attendance]) || 0;
            const math = parseFloat(cols[colIdx.math]) || 0;
            const physics = parseFloat(cols[colIdx.physics]) || 0;
            const python = parseFloat(cols[colIdx.python]) || 0;
            const ds = parseFloat(cols[colIdx.dataStructures]) || 0;
            const english = parseFloat(cols[colIdx.english]) || 0;

            // Validate ranges
            if (!Validator.isValidAttendance(attendance) || !Validator.isValidMark(math) ||
                !Validator.isValidMark(physics) || !Validator.isValidMark(python) ||
                !Validator.isValidMark(ds) || !Validator.isValidMark(english)) {
                errors++;
                errorDetails.push(`Line ${lineNum} (${normalizedId}): Marks or attendance out of valid 0-100 range.`);
                continue;
            }

            // Recalculate academic results (Abstraction)
            const evaluation = AcademicCalculator.evaluateAll({
                mathematics: math,
                physics: physics,
                python_programming: python,
                data_structures: ds,
                english: english
            });

            const studentData = {
                student_id: normalizedId,
                name,
                gender: ['Male', 'Female', 'Other'].includes(gender) ? gender : 'Male',
                branch,
                semester,
                attendance,
                mathematics: math,
                physics,
                python_programming: python,
                data_structures: ds,
                english,
                total_marks: evaluation.total_marks,
                percentage: evaluation.percentage,
                grade: evaluation.grade,
                grade_point: evaluation.grade_point,
                status: evaluation.status
            };

            try {
                if (this.#studentRepo.exists(normalizedId)) {
                    this.#studentRepo.update(normalizedId, studentData);
                    updated++;
                } else {
                    this.#studentRepo.create(studentData);
                    added++;
                }
            } catch (err) {
                errors++;
                errorDetails.push(`Line ${lineNum} (${normalizedId}): DB insertion error - ${err.message}`);
            }
        }

        // Log audit event
        this.#auditRepo.log({
            adminUsername: adminUsername || 'admin',
            action: 'IMPORT_CSV',
            details: `CSV Import completed: ${processed} processed, ${added} added, ${updated} updated, ${errors} errors.`
        });

        return {
            processed,
            added,
            updated,
            errors,
            errorDetails: errorDetails.slice(0, 10) // return top 10 error notes
        };
    }

    /**
     * Generate dynamic CSV formatted text from the live SQLite database.
     * 
     * @param {string} adminUsername 
     * @returns {string} CSV text
     */
    exportCSV(adminUsername) {
        const students = this.#studentRepo.findAllForExport();

        const headers = [
            'Student_ID',
            'Name',
            'Gender',
            'Branch',
            'Semester',
            'Attendance',
            'Mathematics',
            'Physics',
            'Python_Programming',
            'Data_Structures',
            'English',
            'Total_Marks',
            'Percentage',
            'Grade',
            'Grade_Point',
            'Status'
        ];

        const rows = [headers.join(',')];

        for (const s of students) {
            const row = [
                s.student_id,
                `"${(s.name || '').replace(/"/g, '""')}"`,
                s.gender,
                s.branch,
                `"${s.semester}"`,
                s.attendance,
                s.mathematics,
                s.physics,
                s.python_programming,
                s.data_structures,
                s.english,
                s.total_marks,
                s.percentage,
                s.grade,
                s.grade_point,
                s.status
            ];
            rows.push(row.join(','));
        }

        // Log audit event
        this.#auditRepo.log({
            adminUsername: adminUsername || 'admin',
            action: 'EXPORT_CSV',
            details: `Exported ${students.length} student records to CSV.`
        });

        return rows.join('\r\n');
    }
}
