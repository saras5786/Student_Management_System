// ==============================================================================
// DESIGN CONCEPT: REPOSITORY PATTERN
// File: server/repositories/AdminRepository.js
// 
// Encapsulates administrative credential queries against the 'admins' table.
// ==============================================================================

import { DatabaseManager } from '../config/database.js';

export class AdminRepository {
    #db;

    constructor() {
        this.#db = DatabaseManager.getInstance();
    }

    /**
     * Find admin record by username.
     * 
     * @param {string} username 
     * @returns {Object|null}
     */
    findByUsername(username) {
        const sql = `SELECT * FROM admins WHERE LOWER(username) = LOWER(?) LIMIT 1`;
        return this.#db.get(sql, [(username || '').trim().toLowerCase()]);
    }

    /**
     * Find admin record by primary key ID.
     * 
     * @param {number} id 
     * @returns {Object|null}
     */
    findById(id) {
        const sql = `SELECT id, username, name, role, created_at FROM admins WHERE id = ?`;
        return this.#db.get(sql, [id]);
    }
}
