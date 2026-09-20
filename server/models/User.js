// ==============================================================================
// OOP CONCEPT: BASE CLASS & ABSTRACTION
// File: server/models/User.js
// 
// Represents the fundamental User entity in the system.
// Common properties and behavioral contracts are established here, allowing
// derived subclasses (StudentUser, AdminUser) to inherit and customize behavior.
// ==============================================================================

export class User {
    // OOP CONCEPT: ENCAPSULATION (PRIVATE FIELDS)
    // Internal state is hidden from direct outside mutation.
    #id;
    #username;
    #name;
    #createdAt;

    /**
     * Constructor for User base class.
     * 
     * @param {number|string} id 
     * @param {string} username 
     * @param {string} name 
     */
    constructor(id, username, name, createdAt = new Date().toISOString()) {
        if (new.target === User) {
            // OOP CONCEPT: ABSTRACT CLASS ENFORCEMENT
            // Preventing direct instantiation of abstract base class if desired
            // Or allow base instantiation for generic user sessions
        }
        this.#id = id;
        this.#username = username;
        this.#name = name;
        this.#createdAt = createdAt;
    }

    // OOP CONCEPT: GETTERS (READ-ONLY PROPERTY ACCESS)
    get id() {
        return this.#id;
    }

    get username() {
        return this.#username;
    }

    get name() {
        return this.#name;
    }

    get createdAt() {
        return this.#createdAt;
    }

    // ==============================================================================
    // OOP CONCEPT: POLYMORPHISM (POLYMORPHIC BASE METHOD)
    // Subclasses will override this method to provide role-specific identifiers.
    // ==============================================================================
    getRole() {
        return 'USER';
    }

    /**
     * Polymorphic method determining authorization permissions.
     * 
     * @returns {string[]}
     */
    getPermissions() {
        return [];
    }

    /**
     * Convert instance to a clean JSON representation safe for client transmission.
     * 
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this.#id,
            username: this.#username,
            name: this.#name,
            role: this.getRole(),
            permissions: this.getPermissions(),
            createdAt: this.#createdAt
        };
    }
}
