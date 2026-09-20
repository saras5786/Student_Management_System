// ==============================================================================
// DESIGN CONCEPT: SERVICE PATTERN & AUTHENTICATION MANAGER
// File: server/services/AuthService.js
// 
// Handles authentication life-cycle for both user personas:
// 1. Admin authentication using password hashing (bcrypt).
// 2. Student authentication using demo OTP verification.
// ==============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminRepository } from '../repositories/AdminRepository.js';
import { StudentRepository } from '../repositories/StudentRepository.js';
import { OTPService } from './OTPService.js';
import { Validator } from '../utils/validators.js';

export class AuthService {
    #adminRepo;
    #studentRepo;
    #otpService;
    #jwtSecret;

    constructor() {
        this.#adminRepo = new AdminRepository();
        this.#studentRepo = new StudentRepository();
        this.#otpService = new OTPService();
        this.#jwtSecret = process.env.JWT_SECRET || 'aditya-university-secret-key-cse-2026';
    }

    /**
     * Authenticate administrator credentials.
     * 
     * @param {string} username 
     * @param {string} password 
     * @returns {{ token: string, user: Object }}
     */
    async loginAdmin(username, password) {
        if (!username || !password) {
            const err = new Error('Username and password are required.');
            err.statusCode = 400;
            throw err;
        }

        const admin = this.#adminRepo.findByUsername(username.trim());
        if (!admin) {
            const err = new Error('Invalid administrator credentials.');
            err.statusCode = 401;
            throw err;
        }

        const passwordValid = bcrypt.compareSync(password, admin.password_hash);
        if (!passwordValid) {
            const err = new Error('Invalid administrator credentials.');
            err.statusCode = 401;
            throw err;
        }

        // Generate JWT token with ADMIN role
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: 'ADMIN'
            },
            this.#jwtSecret,
            { expiresIn: '8h' }
        );

        return {
            token,
            user: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: 'ADMIN'
            }
        };
    }

    /**
     * Request a simulated OTP for a student.
     * 
     * @param {string} studentId 
     * @returns {{ success: boolean, studentId: string, studentName: string, demoOtp: string, expiresIn: number }}
     */
    requestStudentOTP(studentId) {
        if (!Validator.isValidStudentId(studentId)) {
            const err = new Error('Invalid Student ID format. Format must be 25b11csXXX (e.g., 25b11cs001 up to 25b11cs999).');
            err.statusCode = 400;
            throw err;
        }

        const normalizedId = Validator.normalizeStudentId(studentId);
        const student = this.#studentRepo.findByStudentId(normalizedId);

        if (!student) {
            const err = new Error(`Student not found. No record registered for ID "${studentId}".`);
            err.statusCode = 404;
            throw err;
        }

        // Generate demo OTP via OTPService
        const otpData = this.#otpService.generateOTP(normalizedId);

        return {
            success: true,
            studentId: normalizedId,
            studentName: student.name,
            demoOtp: otpData.otpCode,
            expiresIn: otpData.expiresIn,
            message: `DEMO OTP generated for ${student.name}. Use code: ${otpData.otpCode}`
        };
    }

    /**
     * Verify submitted OTP and issue authenticated student session token.
     * 
     * @param {string} studentId 
     * @param {string} otpCode 
     * @returns {{ token: string, user: Object }}
     */
    verifyStudentOTP(studentId, otpCode) {
        const normalizedId = Validator.normalizeStudentId(studentId);
        const student = this.#studentRepo.findByStudentId(normalizedId);

        if (!student) {
            const err = new Error(`Student not found.`);
            err.statusCode = 404;
            throw err;
        }

        const verification = this.#otpService.verifyOTP(normalizedId, otpCode);
        if (!verification.valid) {
            const err = new Error(verification.error || 'Invalid OTP code.');
            err.statusCode = 400;
            throw err;
        }

        // Issue JWT token with STUDENT role
        const token = jwt.sign(
            {
                id: student.id,
                studentId: student.studentId,
                name: student.name,
                role: 'STUDENT'
            },
            this.#jwtSecret,
            { expiresIn: '8h' }
        );

        return {
            token,
            user: {
                id: student.id,
                studentId: student.studentId,
                name: student.name,
                role: 'STUDENT',
                profile: student.toJSON()
            }
        };
    }

    /**
     * Verify and decode a JWT token string.
     * 
     * @param {string} token 
     * @returns {Object}
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.#jwtSecret);
        } catch {
            return null;
        }
    }
}
