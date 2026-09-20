// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & SINGLETON PATTERN
// DATABASE CONCEPT: CONNECTION POOLING / MANAGER
// File: server/config/database.js
//
// The DatabaseManager class encapsulates the database connection and exposes
// uniform query methods. Internal DB drivers are abstracted away from repositories.
// ==============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseManager {
    // OOP CONCEPT: PRIVATE FIELDS (ENCAPSULATION)
    // The database handle cannot be accessed or corrupted from external code.
    static #instance = null;
    #db = null;
    #dbPath = null;

    constructor() {
        if (DatabaseManager.#instance) {
            return DatabaseManager.#instance;
        }

        const projectRoot = path.resolve(__dirname, '../../');
        const dbDir = path.join(projectRoot, 'database');
        
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.#dbPath = path.join(dbDir, 'student_management.db');
        this.#db = new DatabaseSync(this.#dbPath);
        
        // Optimize SQLite for concurrent reads and resilient transactions
        this.#db.exec('PRAGMA journal_mode = WAL;');
        this.#db.exec('PRAGMA foreign_keys = ON;');

        this.#initializeSchema();
        this.#ensureDefaultAdmin();

        DatabaseManager.#instance = this;
    }

    /**
     * Singleton accessor method.
     * 
     * @returns {DatabaseManager}
     */
    static getInstance() {
        if (!DatabaseManager.#instance) {
            DatabaseManager.#instance = new DatabaseManager();
        }
        return DatabaseManager.#instance;
    }

    /**
     * Initialize table schemas from schema.sql.
     */
    #initializeSchema() {
        const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            this.#db.exec(schemaSql);
        }
    }

    /**
     * Seed initial demo administrator if none exists.
     * DEMO CREDENTIALS:
     * Username: admin
     * Password: admin123
     */
    #ensureDefaultAdmin() {
        const checkStmt = this.#db.prepare('SELECT COUNT(*) as count FROM admins WHERE username = ?');
        const result = checkStmt.get('admin');

        if (result.count === 0) {
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync('admin123', salt);

            const insertStmt = this.#db.prepare(`
                INSERT INTO admins (username, password_hash, name, role)
                VALUES (?, ?, ?, ?)
            `);
            insertStmt.run('admin', hash, 'CSE Department Administrator', 'ADMIN');
            console.log('✓ Default Demo Admin initialized: admin / admin123');
        }
    }

    /**
     * Execute SQL statements with optional parameterized binding.
     * 
     * @param {string} sql 
     * @param {Array} params 
     * @returns {{ changes: number, lastInsertRowid: number|bigint }}
     */
    run(sql, params = []) {
        const stmt = this.#db.prepare(sql);
        return stmt.run(...params);
    }

    /**
     * Query a single record.
     * 
     * @param {string} sql 
     * @param {Array} params 
     * @returns {Object|null}
     */
    get(sql, params = []) {
        const stmt = this.#db.prepare(sql);
        return stmt.get(...params) || null;
    }

    /**
     * Query multiple records.
     * 
     * @param {string} sql 
     * @param {Array} params 
     * @returns {Array<Object>}
     */
    all(sql, params = []) {
        const stmt = this.#db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Execute raw multi-statement SQL script.
     * 
     * @param {string} sql 
     */
    exec(sql) {
        this.#db.exec(sql);
    }

    /**
     * Get underlying database filepath.
     */
    getDbPath() {
        return this.#dbPath;
    }
}
