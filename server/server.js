// ==============================================================================
// ADITYA UNIVERSITY STUDENT MANAGEMENT SYSTEM (AU-SMS)
// File: server/server.js
// Main Express Application Entry Point
// ==============================================================================

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DatabaseManager } from './config/database.js';
import { DatabaseSeeder } from './config/seed.js';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database & Auto-Seed 500 initial students if empty
console.log('📦 Initializing SQLite Database Layer...');
DatabaseManager.getInstance();
DatabaseSeeder.seedStudentsIfEmpty(false);

// Core Middlewares
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve Static Frontend Assets
const publicDir = path.join(projectRoot, 'public');
app.use(express.static(publicDir));

// Logging Middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (!req.url.startsWith('/css') && !req.url.startsWith('/js') && !req.url.startsWith('/assets')) {
            console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        }
    });
    next();
});

// REST API Route Registration
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);

// Direct API Aliases for prompt section 45 compliance
app.use('/api', adminRoutes);

// SPA Fallback to public/index.html for any unmatched non-API routes
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'API endpoint not found.' });
    }
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
    console.log('===========================================================');
    console.log('  🎓 ADITYA UNIVERSITY - STUDENT MANAGEMENT SYSTEM (AU-SMS) ');
    console.log('  Department of Computer Science & Engineering            ');
    console.log('===========================================================');
    console.log(`  🌐 Server running at: http://localhost:${PORT}`);
    console.log(`  👤 Demo Admin Account: admin / admin123`);
    console.log(`  🎓 Student Login: 25b11cs001 to 25b11cs841 (via Demo OTP)`);
    console.log('===========================================================');
});
