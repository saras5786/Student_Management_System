// ==============================================================================
// DESIGN CONCEPT: REPOSITORY PATTERN & AUDIT LOGGING
// File: server/repositories/AuditRepository.js
// 
// Persists an immutable ledger of administrative operations for accountability,
// security monitoring, and regulatory compliance.
// ==============================================================================

import { DatabaseManager } from '../config/database.js';

export class AuditRepository {
    #db;

    constructor() {
        this.#db = DatabaseManager.getInstance();
    }

    /**
     * Record an audit event.
     * 
     * @param {Object} log
     * @param {string} log.adminUsername
     * @param {string} log.action e.g., 'ADD_STUDENT', 'UPDATE_STUDENT', 'DELETE_STUDENT', 'IMPORT_CSV'
     * @param {string} [log.studentId]
     * @param {string} [log.fieldName]
     * @param {string} [log.oldValue]
     * @param {string} [log.newValue]
     * @param {string} [log.details]
     */
    log({
        adminUsername = 'admin',
        action,
        studentId = null,
        fieldName = null,
        oldValue = null,
        newValue = null,
        details = null
    }) {
        const sql = `
            INSERT INTO audit_logs (
                admin_username, action, student_id, field_name,
                old_value, new_value, details, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        `;

        this.#db.run(sql, [
            adminUsername,
            action,
            studentId,
            fieldName,
            oldValue !== null ? String(oldValue) : null,
            newValue !== null ? String(newValue) : null,
            details
        ]);
    }

    /**
     * Fetch recent audit logs with pagination and optional student filter.
     * 
     * @param {Object} options
     * @returns {{ logs: Array<Object>, total: number }}
     */
    findLogs({ limit = 50, offset = 0, studentId = null, action = null } = {}) {
        const conditions = [];
        const params = [];

        if (studentId) {
            conditions.push(`LOWER(student_id) = LOWER(?)`);
            params.push(studentId.trim().toLowerCase());
        }

        if (action) {
            conditions.push(`action = ?`);
            params.push(action);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countSql = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
        const countRow = this.#db.get(countSql, params);
        const total = countRow ? countRow.total : 0;

        const querySql = `
            SELECT * FROM audit_logs
            ${whereClause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        `;

        const logs = this.#db.all(querySql, [...params, limit, offset]);

        return {
            logs,
            total
        };
    }
}
