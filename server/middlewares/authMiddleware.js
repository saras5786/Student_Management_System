// ==============================================================================
// SECURITY & MIDDLEWARE: ROLE-BASED ACCESS CONTROL (RBAC)
// File: server/middlewares/authMiddleware.js
// 
// Enforces token verification and authorization boundaries between ADMIN and STUDENT.
// Students cannot access administrative routes or other students' private records.
// ==============================================================================

import { AuthService } from '../services/AuthService.js';
import { Validator } from '../utils/validators.js';

const authService = new AuthService();

/**
 * Middleware: Verify Bearer JWT Token.
 */
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : (req.cookies ? req.cookies.token : null);

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Access denied. No authentication token provided.'
        });
    }

    const decoded = authService.verifyToken(token);
    if (!decoded) {
        return res.status(401).json({
            success: false,
            error: 'Session expired or invalid token. Please log in again.'
        });
    }

    req.user = decoded;
    next();
}

/**
 * Middleware: Restrict route strictly to a specific role (e.g., 'ADMIN').
 * 
 * @param {string} role 
 */
export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({
                success: false,
                error: `Forbidden: This operation requires "${role}" administrative privileges.`
            });
        }
        next();
    };
}

/**
 * Middleware: Permit ADMIN to access any student, but restrict STUDENT to their own record.
 */
export function requireSelfOrAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    if (req.user.role === 'ADMIN') {
        return next();
    }

    if (req.user.role === 'STUDENT') {
        const targetStudentId = Validator.normalizeStudentId(req.params.studentId);
        const loggedInStudentId = Validator.normalizeStudentId(req.user.studentId);

        if (targetStudentId === loggedInStudentId) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'Access forbidden. You can only view your own student records.'
        });
    }

    return res.status(403).json({ success: false, error: 'Unauthorized access.' });
}
