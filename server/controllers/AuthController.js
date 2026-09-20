// ==============================================================================
// DESIGN CONCEPT: CONTROLLER PATTERN & SEPARATION OF CONCERNS
// File: server/controllers/AuthController.js
// 
// Bridges HTTP requests with AuthService business logic.
// ==============================================================================

import { AuthService } from '../services/AuthService.js';
import { StudentRepository } from '../repositories/StudentRepository.js';

export class AuthController {
    #authService;
    #studentRepo;

    constructor() {
        this.#authService = new AuthService();
        this.#studentRepo = new StudentRepository();
    }

    /**
     * POST /api/auth/admin/login
     */
    loginAdmin = async (req, res, next) => {
        try {
            const { username, password } = req.body;
            const result = await this.#authService.loginAdmin(username, password);

            res.json({
                success: true,
                message: 'Administrator login successful.',
                ...result
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * POST /api/auth/student/request-otp
     */
    requestStudentOTP = async (req, res, next) => {
        try {
            const { studentId } = req.body;
            const result = this.#authService.requestStudentOTP(studentId);

            res.json(result);
        } catch (err) {
            next(err);
        }
    };

    /**
     * POST /api/auth/student/verify-otp
     */
    verifyStudentOTP = async (req, res, next) => {
        try {
            const { studentId, otpCode } = req.body;
            const result = this.#authService.verifyStudentOTP(studentId, otpCode);

            res.json({
                success: true,
                message: 'OTP verified successfully! Welcome to AU-SMS.',
                ...result
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * GET /api/auth/me
     */
    getCurrentUser = async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'Not authenticated.' });
            }

            if (req.user.role === 'STUDENT') {
                const student = this.#studentRepo.findByStudentId(req.user.studentId);
                return res.json({
                    success: true,
                    user: {
                        ...req.user,
                        profile: student ? student.toJSON() : null
                    }
                });
            }

            res.json({
                success: true,
                user: req.user
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * POST /api/auth/logout
     */
    logout = async (req, res) => {
        res.clearCookie('token');
        res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    };
}
