// ==============================================================================
// OOP / SERVICE CONCEPT: OTP MANAGEMENT SERVICE
// File: server/services/OTPService.js
// 
// Encapsulates the complete life-cycle of demo One-Time Passwords (OTPs):
// Generation, 60-second countdown expiration, and single-use verification.
// ==============================================================================

import crypto from 'node:crypto';
import { DatabaseManager } from '../config/database.js';

export class OTPService {
    #db;
    static OTP_EXPIRY_SECONDS = 60; // 60-second TTL as per project specifications

    constructor() {
        this.#db = DatabaseManager.getInstance();
    }

    /**
     * Generate a cryptographically random 6-digit OTP code for a student.
     * 
     * @param {string} studentId 
     * @returns {{ otpCode: string, expiresAt: number, expiresIn: number }}
     */
    generateOTP(studentId) {
        const normalizedId = (studentId || '').trim().toLowerCase();
        
        // Invalidate any existing unverified OTP sessions for this student
        this.#db.run(
            `DELETE FROM otp_sessions WHERE LOWER(student_id) = ?`,
            [normalizedId]
        );

        // Generate 6-digit numeric string (100000 - 999999)
        const codeNum = crypto.randomInt(100000, 999999);
        const otpCode = String(codeNum);

        const now = Date.now();
        const expiresAt = now + (OTPService.OTP_EXPIRY_SECONDS * 1000);

        this.#db.run(
            `INSERT INTO otp_sessions (student_id, otp_code, expires_at, verified) VALUES (?, ?, ?, 0)`,
            [normalizedId, otpCode, expiresAt]
        );

        return {
            otpCode,
            expiresAt,
            expiresIn: OTPService.OTP_EXPIRY_SECONDS
        };
    }

    /**
     * Validate submitted OTP code against active session.
     * 
     * @param {string} studentId 
     * @param {string} submittedCode 
     * @returns {{ valid: boolean, error?: string }}
     */
    verifyOTP(studentId, submittedCode) {
        const normalizedId = (studentId || '').trim().toLowerCase();
        const code = (submittedCode || '').trim();

        const session = this.#db.get(
            `SELECT * FROM otp_sessions WHERE LOWER(student_id) = ? ORDER BY id DESC LIMIT 1`,
            [normalizedId]
        );

        if (!session) {
            return {
                valid: false,
                error: 'No OTP was requested for this student. Please request an OTP first.'
            };
        }

        const now = Date.now();

        if (now > session.expires_at) {
            // Delete expired session
            this.#db.run(`DELETE FROM otp_sessions WHERE id = ?`, [session.id]);
            return {
                valid: false,
                error: 'OTP has expired. Please request a new OTP.'
            };
        }

        if (session.otp_code !== code) {
            return {
                valid: false,
                error: 'Invalid OTP. Please check the 6-digit code and try again.'
            };
        }

        // Successfully verified: mark as verified and clear session
        this.#db.run(`DELETE FROM otp_sessions WHERE id = ?`, [session.id]);

        return {
            valid: true
        };
    }
}
