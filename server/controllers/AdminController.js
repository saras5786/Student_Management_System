// ==============================================================================
// DESIGN CONCEPT: CONTROLLER PATTERN & ADMIN OPERATIONS
// File: server/controllers/AdminController.js
// 
// Endpoints for department analytics, CSV ETL operations, and audit ledger.
// ==============================================================================

import { AnalyticsService } from '../services/AnalyticsService.js';
import { CSVService } from '../services/CSVService.js';
import { AuditRepository } from '../repositories/AuditRepository.js';

export class AdminController {
    #analyticsService;
    #csvService;
    #auditRepo;

    constructor() {
        this.#analyticsService = new AnalyticsService();
        this.#csvService = new CSVService();
        this.#auditRepo = new AuditRepository();
    }

    /**
     * GET /api/analytics
     */
    getAnalytics = async (req, res, next) => {
        try {
            const data = this.#analyticsService.getDashboardAnalytics();
            res.json({
                success: true,
                analytics: data
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * POST /api/import
     * Accepts multipart/form-data CSV file or raw body text
     */
    importCSV = async (req, res, next) => {
        try {
            let csvText = '';
            if (req.file) {
                csvText = req.file.buffer.toString('utf8');
            } else if (req.body && req.body.csv) {
                csvText = req.body.csv;
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'Please upload a CSV file or provide CSV string content.'
                });
            }

            const adminUser = req.user ? req.user.username : 'admin';
            const result = this.#csvService.importCSV(adminUser, csvText);

            res.json({
                success: true,
                message: `CSV Import complete: ${result.added} added, ${result.updated} updated, ${result.errors} errors.`,
                summary: result
            });
        } catch (err) {
            next(err);
        }
    };

    /**
     * GET /api/export
     */
    exportCSV = async (req, res, next) => {
        try {
            const adminUser = req.user ? req.user.username : 'admin';
            const csvOutput = this.#csvService.exportCSV(adminUser);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `cse_students_${timestamp}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.status(200).send(csvOutput);
        } catch (err) {
            next(err);
        }
    };

    /**
     * GET /api/audit-logs
     */
    getAuditLogs = async (req, res, next) => {
        try {
            const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const offset = (page - 1) * limit;

            const result = this.#auditRepo.findLogs({
                limit,
                offset,
                studentId: req.query.studentId,
                action: req.query.action
            });

            res.json({
                success: true,
                logs: result.logs,
                pagination: {
                    total: result.total,
                    page,
                    limit,
                    totalPages: Math.ceil(result.total / limit) || 1
                }
            });
        } catch (err) {
            next(err);
        }
    };
}
