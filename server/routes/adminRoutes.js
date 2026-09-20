// ==============================================================================
// REST API ROUTING: ADMIN OPERATIONS & ANALYTICS
// File: server/routes/adminRoutes.js
// ==============================================================================

import { Router } from 'express';
import multer from 'multer';
import { AdminController } from '../controllers/AdminController.js';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();
const controller = new AdminController();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// All routes here strictly require ADMIN role
router.use(authenticateToken, requireRole('ADMIN'));

// Analytics metrics and distributions
router.get('/analytics', controller.getAnalytics);

// CSV operations
router.post('/import', upload.single('file'), controller.importCSV);
router.get('/export', controller.exportCSV);

// Audit history ledger
router.get('/audit-logs', controller.getAuditLogs);

export default router;
