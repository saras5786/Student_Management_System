// ==============================================================================
// ERROR HANDLING & RESILIENCE
// File: server/middlewares/errorHandler.js
// 
// Centralized Express error handler that ensures sensible, clean JSON responses
// without leaking raw internal stack traces to the end user.
// ==============================================================================

export function errorHandler(err, req, res, next) {
    console.error(`[Error] ${req.method} ${req.url}:`, err.message);

    const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

    res.status(statusCode).json({
        success: false,
        error: err.message || 'An unexpected internal server error occurred.'
    });
}
