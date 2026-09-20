// ==============================================================================
// OOP / UTILITY CONCEPT: DATA VALIDATION & INPUT SANITIZATION
// File: server/utils/validators.js
//
// Centralizes all system-wide validation rules ensuring integrity at the backend
// boundary before data reaches the repository or database layers.
// ==============================================================================

export class Validator {
    /**
     * Validates Aditya University CSE Student ID format:
     * e.g., 25b11cs001 through 25b11cs999 (case-insensitive).
     * Must accommodate at least up to 25b11cs841 and beyond.
     * 
     * @param {string} id 
     * @returns {boolean}
     */
    static isValidStudentId(id) {
        if (!id || typeof id !== 'string') return false;
        return /^25b11cs\d{3}$/i.test(id.trim());
    }

    /**
     * Normalize student ID to lowercase standard format: e.g. "25b11cs001"
     * 
     * @param {string} id 
     * @returns {string}
     */
    static normalizeStudentId(id) {
        return (id || '').trim().toLowerCase();
    }

    /**
     * Validate subject marks (0 - 100 scale).
     * 
     * @param {number|string} mark 
     * @returns {boolean}
     */
    static isValidMark(mark) {
        const num = parseFloat(mark);
        return !isNaN(num) && num >= 0 && num <= 100;
    }

    /**
     * Validate attendance percentage (0 - 100 scale).
     * 
     * @param {number|string} attendance 
     * @returns {boolean}
     */
    static isValidAttendance(attendance) {
        const num = parseFloat(attendance);
        return !isNaN(num) && num >= 0 && num <= 100;
    }

    /**
     * Validate semester (1 through 8, or "Semester 1" - "Semester 8").
     * 
     * @param {string|number} sem 
     * @returns {boolean}
     */
    static isValidSemester(sem) {
        if (!sem) return false;
        const str = String(sem).trim();
        const match = str.match(/^(?:Semester\s*)?([1-8])$/i);
        return !!match;
    }

    /**
     * Standardize semester representation (e.g., "Semester 4")
     * 
     * @param {string|number} sem 
     * @returns {string}
     */
    static normalizeSemester(sem) {
        const str = String(sem).trim();
        const match = str.match(/^(?:Semester\s*)?([1-8])$/i);
        return match ? `Semester ${match[1]}` : str;
    }

    /**
     * Validate full student record payload.
     * 
     * @param {Object} data 
     * @param {boolean} isUpdate If true, student_id cannot be changed or is validated conditionally
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validateStudentPayload(data, isUpdate = false) {
        const errors = [];

        if (!isUpdate) {
            if (!this.isValidStudentId(data.student_id)) {
                errors.push('Student ID must match format 25b11csXXX (e.g., 25b11cs001 up to 25b11cs999).');
            }
        }

        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
            errors.push('Student name is required and must be at least 2 characters.');
        }

        if (!data.gender || !['Male', 'Female', 'Other'].includes(data.gender.trim())) {
            errors.push('Gender must be "Male", "Female", or "Other".');
        }

        if (!this.isValidSemester(data.semester)) {
            errors.push('Semester must be between Semester 1 and Semester 8.');
        }

        if (!this.isValidAttendance(data.attendance)) {
            errors.push('Attendance must be a valid percentage between 0 and 100.');
        }

        const subjects = [
            { key: 'mathematics', label: 'Mathematics' },
            { key: 'physics', label: 'Physics' },
            { key: 'python_programming', label: 'Python Programming' },
            { key: 'data_structures', label: 'Data Structures' },
            { key: 'english', label: 'English' }
        ];

        for (const subj of subjects) {
            const val = data[subj.key];
            if (!this.isValidMark(val)) {
                errors.push(`${subj.label} marks must be a number between 0 and 100.`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}
