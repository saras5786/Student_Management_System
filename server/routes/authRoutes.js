// ==============================================================================
// REST API ROUTING: AUTHENTICATION
// File: server/routes/authRoutes.js
// ==============================================================================

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();
const controller = new AuthController();

// Admin login via credentials
router.post('/admin/login', controller.loginAdmin);

// Student simulated OTP authentication flow
router.post('/student/request-otp', controller.requestStudentOTP);
router.post('/student/verify-otp', controller.verifyStudentOTP);

// Token session status & identity resolver
router.get('/me', authenticateToken, controller.getCurrentUser);
router.post('/logout', controller.logout);

export default router;
