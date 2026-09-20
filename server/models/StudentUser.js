// ==============================================================================
// OOP CONCEPT: INHERITANCE & METHOD OVERRIDING (POLYMORPHISM)
// File: server/models/StudentUser.js
// 
// StudentUser extends the base User class.
// It inherits base properties (id, username, name) and specializes behavior
// by overriding getRole() and getPermissions().
// ==============================================================================

import { User } from './User.js';

export class StudentUser extends User {
    // OOP CONCEPT: ENCAPSULATION
    #studentId;
    #studentProfile;

    /**
     * @param {number|string} id 
     * @param {string} studentId e.g., '25b11cs001'
     * @param {string} name 
     * @param {Object} studentProfile Academic and personal attributes from database
     */
    constructor(id, studentId, name, studentProfile = null) {
        // OOP CONCEPT: SUPER CALL (Calling base class constructor)
        super(id, studentId, name);
        this.#studentId = studentId;
        this.#studentProfile = studentProfile;
    }

    get studentId() {
        return this.#studentId;
    }

    get studentProfile() {
        return this.#studentProfile;
    }

    set studentProfile(profile) {
        this.#studentProfile = profile;
    }

    // ==============================================================================
    // OOP CONCEPT: POLYMORPHISM / METHOD OVERRIDING
    // ==============================================================================
    getRole() {
        return 'STUDENT';
    }

    getPermissions() {
        return [
            'view_own_dashboard',
            'view_own_profile',
            'view_own_marks',
            'view_own_attendance',
            'view_own_performance'
        ];
    }

    /**
     * Override toJSON to include student-specific fields
     */
    toJSON() {
        const base = super.toJSON();
        return {
            ...base,
            studentId: this.#studentId,
            profile: this.#studentProfile
        };
    }
}
