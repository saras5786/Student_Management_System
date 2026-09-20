// ==============================================================================
// OOP CONCEPT: INHERITANCE & POLYMORPHISM
// File: server/models/AdminUser.js
// 
// AdminUser extends User with full university administrative privileges.
// ==============================================================================

import { User } from './User.js';

export class AdminUser extends User {
    #department;

    /**
     * @param {number|string} id 
     * @param {string} username 
     * @param {string} name 
     * @param {string} department 
     */
    constructor(id, username, name, department = 'Computer Science & Engineering') {
        super(id, username, name);
        this.#department = department;
    }

    get department() {
        return this.#department;
    }

    // ==============================================================================
    // OOP CONCEPT: POLYMORPHISM / METHOD OVERRIDING
    // ==============================================================================
    getRole() {
        return 'ADMIN';
    }

    getPermissions() {
        return [
            'view_admin_dashboard',
            'students_read_all',
            'student_create',
            'student_update',
            'student_delete',
            'analytics_view',
            'csv_import',
            'csv_export',
            'audit_logs_view',
            'settings_manage'
        ];
    }

    toJSON() {
        const base = super.toJSON();
        return {
            ...base,
            department: this.#department
        };
    }
}
