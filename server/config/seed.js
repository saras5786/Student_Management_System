// ==============================================================================
// DATABASE SEEDER & CSV IMPORT LOGIC
// File: server/config/seed.js
// 
// Imports the initial cse_students_500.csv dataset into SQLite.
// Demonstrates ETL (Extract, Transform, Load) and batch database insertion.
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseManager } from './database.js';
import { AcademicCalculator } from '../utils/AcademicCalculator.js';
import { Validator } from '../utils/validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseSeeder {
    /**
     * Seeds the students table from cse_students_500.csv if empty.
     * 
     * @param {boolean} force If true, clears table before seeding
     * @returns {{ imported: number, skipped: number, errors: number }}
     */
    static seedStudentsIfEmpty(force = false) {
        const db = DatabaseManager.getInstance();
        const checkStmt = db.get('SELECT COUNT(*) as count FROM students');
        
        if (!force && checkStmt && checkStmt.count > 0) {
            console.log(`ℹ Database already populated with ${checkStmt.count} students. Skipping auto-seed.`);
            return { imported: checkStmt.count, skipped: 0, errors: 0 };
        }

        if (force) {
            db.run('DELETE FROM students');
            console.log('⚠ Students table cleared for force re-seed.');
        }

        const csvPath = path.resolve(__dirname, '../../data/cse_students_500.csv');
        if (!fs.existsSync(csvPath)) {
            console.warn(`⚠ Seed file not found at ${csvPath}.`);
            return { imported: 0, skipped: 0, errors: 0 };
        }

        console.log(`🔄 Reading seed dataset from ${csvPath}...`);
        const fileContent = fs.readFileSync(csvPath, 'utf8');
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim().length > 0);

        if (lines.length <= 1) {
            console.warn('⚠ CSV file contains only headers or is empty.');
            return { imported: 0, skipped: 0, errors: 0 };
        }

        // Header: Student_ID,Name,Gender,Branch,Semester,Attendance,Mathematics,Physics,Python,Data Structures,English,Total_Marks,Percentage,Grade,Grade,Status
        const dataLines = lines.slice(1);
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        const insertStmt = db.prepare ? db.prepare : null; // Will use direct db.run inside loop
        
        db.exec('BEGIN TRANSACTION;');

        try {
            for (const line of dataLines) {
                // Split handling potential commas in quotes
                const parts = line.split(',');
                if (parts.length < 11) {
                    skipped++;
                    continue;
                }

                const rawId = parts[0].trim();
                const studentId = Validator.normalizeStudentId(rawId);
                const name = parts[1].trim();
                const gender = parts[2].trim() || 'Male';
                const branch = parts[3].trim() || 'CSE';
                const semester = Validator.normalizeSemester(parts[4].trim()) || 'Semester 1';
                const attendance = parseFloat(parts[5]) || 0;
                const math = parseFloat(parts[6]) || 0;
                const physics = parseFloat(parts[7]) || 0;
                const python = parseFloat(parts[8]) || 0;
                const ds = parseFloat(parts[9]) || 0;
                const english = parseFloat(parts[10]) || 0;

                // OOP CONCEPT: ABSTRACTION
                // Derive all computed columns consistently using the academic calculation engine
                const evaluation = AcademicCalculator.evaluateAll({
                    mathematics: math,
                    physics: physics,
                    python_programming: python,
                    data_structures: ds,
                    english: english
                });

                try {
                    db.run(`
                        INSERT OR REPLACE INTO students (
                            student_id, name, gender, branch, semester, attendance,
                            mathematics, physics, python_programming, data_structures, english,
                            total_marks, percentage, grade, grade_point, status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        studentId,
                        name,
                        gender,
                        branch,
                        semester,
                        attendance,
                        math,
                        physics,
                        python,
                        ds,
                        english,
                        evaluation.total_marks,
                        evaluation.percentage,
                        evaluation.grade,
                        evaluation.grade_point,
                        evaluation.status
                    ]);
                    imported++;
                } catch (rowErr) {
                    console.error(`Error inserting row for ${studentId}:`, rowErr.message);
                    errors++;
                }
            }

            db.exec('COMMIT;');
            console.log(`✓ Database seeding completed! Imported: ${imported}, Skipped: ${skipped}, Errors: ${errors}`);
        } catch (txnErr) {
            db.exec('ROLLBACK;');
            console.error('Failed to commit seed transaction:', txnErr.message);
            throw txnErr;
        }

        return { imported, skipped, errors };
    }
}

// Allow direct CLI execution: node server/config/seed.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    console.log('🌱 Running standalone database seeder...');
    DatabaseSeeder.seedStudentsIfEmpty(true);
}
