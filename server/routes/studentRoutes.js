// ==============================================================================
// REST API ROUTING: STUDENTS (CRUD & ACCESS CONTROL)
// File: server/routes/studentRoutes.js
// ==============================================================================

import { Router } from 'express';
import { StudentController } from '../controllers/StudentController.js';
import { authenticateToken, requireRole, requireSelfOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();
const controller = new StudentController();

// Only ADMIN can list all students or query filtered tables
router.get('/', authenticateToken, requireRole('ADMIN'), controller.listStudents);

// Retrieve Dean's List / Top Performers (accessible by both authenticated students and admins)
router.get('/toppers', authenticateToken, controller.getToppers);

// Both ADMIN and the authenticating STUDENT can retrieve the specific student's record
router.get('/:studentId', authenticateToken, requireSelfOrAdmin, controller.getStudentById);

// Admin-only mutation operations (Create, Update, Delete)
router.post('/', authenticateToken, requireRole('ADMIN'), controller.createStudent);
router.put('/:studentId', authenticateToken, requireRole('ADMIN'), controller.updateStudent);
router.delete('/:studentId', authenticateToken, requireRole('ADMIN'), controller.deleteStudent);

export default router;
