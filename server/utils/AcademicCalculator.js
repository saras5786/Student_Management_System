// ==============================================================================
// OOP CONCEPT: ABSTRACTION & STATIC UTILITY CLASS
// File: server/utils/AcademicCalculator.js
// 
// Academic calculation logic is abstracted away from database, controllers, and UI.
// The consumer does not need to know internal grading boundary algorithms.
// Static methods are used because calculations depend purely on input arguments
// without requiring instances of this class to maintain state.
// ==============================================================================

export class AcademicCalculator {
    /**
     * Calculate total marks across the 5 core CSE curriculum subjects.
     * 
     * @param {Object} marks
     * @param {number} marks.mathematics
     * @param {number} marks.physics
     * @param {number} marks.python_programming
     * @param {number} marks.data_structures
     * @param {number} marks.english
     * @returns {number} Total marks rounded to 1 decimal place
     */
    static calculateTotalMarks(marks) {
        const math = parseFloat(marks.mathematics) || 0;
        const physics = parseFloat(marks.physics) || 0;
        const python = parseFloat(marks.python_programming || marks.python) || 0;
        const ds = parseFloat(marks.data_structures) || 0;
        const english = parseFloat(marks.english) || 0;

        const total = math + physics + python + ds + english;
        return Math.round(total * 10) / 10;
    }

    /**
     * Calculate percentage from marks (5 subjects, total maximum = 500).
     * 
     * @param {Object} marks
     * @returns {number} Percentage rounded to 2 decimal places
     */
    static calculatePercentage(marks) {
        const total = this.calculateTotalMarks(marks);
        const percentage = total / 5;
        return Math.round(percentage * 100) / 100;
    }

    /**
     * Determine university letter grade based on percentage.
     * Grading criteria:
     * - >= 90%: A+ (Outstanding)
     * - >= 80%: A  (Excellent)
     * - >= 70%: B  (Very Good)
     * - >= 60%: C  (Good)
     * - >= 50%: D  (Satisfactory)
     * - < 50%:  F  (Fail)
     * 
     * @param {number} percentage
     * @returns {string} Letter grade
     */
    static calculateGrade(percentage) {
        const p = parseFloat(percentage);
        if (p >= 90) return 'A+';
        if (p >= 80) return 'A';
        if (p >= 70) return 'B';
        if (p >= 60) return 'C';
        if (p >= 50) return 'D';
        return 'F';
    }

    /**
     * Determine university Grade Point (10-point scale).
     * 
     * @param {string} grade
     * @returns {number} Grade point (0 - 10)
     */
    static calculateGradePoint(grade) {
        switch (grade) {
            case 'A+': return 10;
            case 'A':  return 9;
            case 'B':  return 8;
            case 'C':  return 7;
            case 'D':  return 6;
            case 'F':  
            default:   return 0;
        }
    }

    /**
     * Calculate PASS / FAIL status based on overall percentage and subject criteria.
     * Minimum 50% required for Pass in CSE curriculum.
     * 
     * @param {number} percentage
     * @returns {string} 'PASS' | 'FAIL'
     */
    static calculateStatus(percentage) {
        return parseFloat(percentage) >= 50 ? 'PASS' : 'FAIL';
    }

    /**
     * Comprehensive evaluation returning all calculated metrics at once.
     * 
     * @param {Object} marks
     * @returns {Object} { total_marks, percentage, grade, grade_point, status }
     */
    static evaluateAll(marks) {
        const total_marks = this.calculateTotalMarks(marks);
        const percentage = this.calculatePercentage(marks);
        const grade = this.calculateGrade(percentage);
        const grade_point = this.calculateGradePoint(grade);
        const status = this.calculateStatus(percentage);

        return {
            total_marks,
            percentage,
            grade,
            grade_point,
            status
        };
    }
}
