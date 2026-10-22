#pragma once

// ==============================================================================
// DESIGN CONCEPT: CONTROLLER PATTERN & MODERN C++ LAMBDAS / CLOSURES
// File: cpp-backend/src/controllers/ApiController.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Controller Pattern: Acts as the intermediary between HTTP requests and backend
//    services. It inspects request headers, path parameters, query strings, and JSON
//    bodies, invokes appropriate business services, and formats responses.
// 2. C++ Lambdas & Closures ([&](const httplib::Request& req, httplib::Response& res)):
//    Modern C++ functions defined inline that capture surrounding references. Used
//    here to register route handlers with cpp-httplib cleanly and declaratively.
// 3. Role-Based Access Control (RBAC): Every protected endpoint checks identity and role
//    before allowing execution (Admin vs Student permissions).
// ==============================================================================

#include <string>
#include <memory>
#include <iostream>
#include <sstream>
#include <httplib.h>
#include <nlohmann/json.hpp>

#include "../services/AuthService.hpp"
#include "../services/StudentService.hpp"
#include "../services/AnalyticsService.hpp"
#include "../services/CSVService.hpp"
#include "../repositories/AuditRepository.hpp"
#include "../utils/Validators.hpp"

class ApiController {
private:
    AuthService m_authService;
    StudentService m_studentService;
    AnalyticsService m_analyticsService;
    CSVService m_csvService;
    AuditRepository m_auditRepo;

    // Helper: Send JSON response
    static void sendJson(httplib::Response& res, int statusCode, const nlohmann::json& j) {
        res.status = statusCode;
        res.set_content(j.dump(), "application/json");
    }

    // Helper: Send standardized error response
    static void sendError(httplib::Response& res, int statusCode, const std::string& msg) {
        res.status = statusCode;
        nlohmann::json err = {
            {"success", false},
            {"error", msg}
        };
        res.set_content(err.dump(), "application/json");
    }

    // Helper: Extract and verify User from Authorization header
    std::shared_ptr<User> authenticate(const httplib::Request& req) {
        std::string authHeader;
        if (req.has_header("Authorization")) {
            authHeader = req.get_header_value("Authorization");
        }
        return m_authService.verifyToken(authHeader);
    }

    // Helper: Parse JSON body safely
    static nlohmann::json parseJsonBody(const httplib::Request& req) {
        if (req.body.empty()) return nlohmann::json::object();
        try {
            return nlohmann::json::parse(req.body);
        } catch (...) {
            return nlohmann::json::object();
        }
    }

public:
    ApiController()
        : m_authService(), m_studentService(), m_analyticsService(), m_csvService(), m_auditRepo() {}

    /**
     * Register all REST API routes onto cpp-httplib server.
     */
    void registerRoutes(httplib::Server& server) {

        // ======================================================================
        // 1. AUTHENTICATION ROUTES
        // ======================================================================

        // POST /api/auth/admin/login
        server.Post("/api/auth/admin/login", [this](const httplib::Request& req, httplib::Response& res) {
            try {
                nlohmann::json body = parseJsonBody(req);
                std::string user = body.value("username", "");
                std::string pass = body.value("password", "");

                nlohmann::json result = m_authService.loginAdmin(user, pass);
                nlohmann::json response = {
                    {"success", true},
                    {"message", "Administrator login successful."},
                    {"token", result["token"]},
                    {"user", result["user"]}
                };
                sendJson(res, 200, response);
            } catch (const std::exception& ex) {
                sendError(res, 401, ex.what());
            }
        });

        // POST /api/auth/student/request-otp
        server.Post("/api/auth/student/request-otp", [this](const httplib::Request& req, httplib::Response& res) {
            try {
                nlohmann::json body = parseJsonBody(req);
                std::string studentId = body.value("studentId", "");
                if (studentId.empty() && body.contains("student_id")) {
                    studentId = body["student_id"].get<std::string>();
                }

                nlohmann::json result = m_authService.requestStudentOTP(studentId);
                sendJson(res, 200, result);
            } catch (const std::exception& ex) {
                std::string msg = ex.what();
                int status = (msg.find("not found") != std::string::npos) ? 404 : 400;
                sendError(res, status, msg);
            }
        });

        // POST /api/auth/student/verify-otp
        server.Post("/api/auth/student/verify-otp", [this](const httplib::Request& req, httplib::Response& res) {
            try {
                nlohmann::json body = parseJsonBody(req);
                std::string studentId = body.value("studentId", "");
                if (studentId.empty() && body.contains("student_id")) {
                    studentId = body["student_id"].get<std::string>();
                }
                std::string otpCode = body.value("otpCode", "");
                if (otpCode.empty() && body.contains("otp_code")) {
                    otpCode = body["otp_code"].get<std::string>();
                }

                nlohmann::json result = m_authService.verifyStudentOTP(studentId, otpCode);
                nlohmann::json response = {
                    {"success", true},
                    {"message", "OTP verified successfully! Welcome to AU-SMS."},
                    {"token", result["token"]},
                    {"user", result["user"]}
                };
                sendJson(res, 200, response);
            } catch (const std::exception& ex) {
                std::string msg = ex.what();
                int status = (msg.find("not found") != std::string::npos) ? 404 : 400;
                sendError(res, status, msg);
            }
        });

        // GET /api/auth/me
        server.Get("/api/auth/me", [this](const httplib::Request& req, httplib::Response& res) {
            auto user = authenticate(req);
            if (!user) {
                return sendError(res, 401, "Not authenticated.");
            }

            sendJson(res, 200, {
                {"success", true},
                {"user", user->toJson()}
            });
        });

        // POST /api/auth/logout
        server.Post("/api/auth/logout", [](const httplib::Request&, httplib::Response& res) {
            sendJson(res, 200, {
                {"success", true},
                {"message", "Logged out successfully."}
            });
        });

        // ======================================================================
        // 2. STUDENT ROUTES
        // ======================================================================

        // GET /api/students/toppers (MUST be registered before regex /api/students/(.*))
        server.Get("/api/students/toppers", [this](const httplib::Request& req, httplib::Response& res) {
            auto user = authenticate(req);
            if (!user) {
                return sendError(res, 401, "Authentication required.");
            }

            int limit = 10;
            if (req.has_param("limit")) {
                try { limit = std::stoi(req.get_param_value("limit")); } catch (...) {}
            }

            nlohmann::json toppers = m_studentService.getTopPerformers(limit);
            sendJson(res, 200, {
                {"success", true},
                {"toppers", toppers}
            });
        });

        // GET /api/students
        server.Get("/api/students", [this](const httplib::Request& req, httplib::Response& res) {
            auto user = authenticate(req);
            if (!user) {
                return sendError(res, 401, "Authentication required.");
            }
            // Strict RBAC: Only ADMIN can list all students
            if (!user->isAdmin()) {
                return sendError(res, 403, "Access denied: Administrator privileges required.");
            }

            nlohmann::json q = nlohmann::json::object();
            for (const auto& param : req.params) {
                q[param.first] = param.second;
            }

            nlohmann::json result = m_studentService.listStudents(q);
            sendJson(res, 200, {
                {"success", true},
                {"students", result["students"]},
                {"pagination", result["pagination"]}
            });
        });

        // POST /api/students
        server.Post("/api/students", [this](const httplib::Request& req, httplib::Response& res) {
            auto user = authenticate(req);
            if (!user) {
                return sendError(res, 401, "Authentication required.");
            }
            if (!user->isAdmin()) {
                return sendError(res, 403, "Access denied: Administrator privileges required.");
            }

            try {
                nlohmann::json body = parseJsonBody(req);
                nlohmann::json created = m_studentService.createStudent(user->getName(), body);
                sendJson(res, 201, {
                    {"success", true},
                    {"message", "Student \"" + created["name"].get<std::string>() + "\" (" + created["student_id"].get<std::string>() + ") created successfully!"},
                    {"student", created}
                });
            } catch (const std::exception& ex) {
                std::string msg = ex.what();
                int status = (msg.find("already exists") != std::string::npos) ? 409 : 400;
                sendError(res, status, msg);
            }
        });

        // GET /api/students/:studentId
        server.Get(R"(/api/students/([a-zA-Z0-9_-]+))", [this](const httplib::Request& req, httplib::Response& res) {
            std::string studentId = req.matches[1];
            if (studentId == "toppers") return; // Handled by /api/students/toppers

            auto user = authenticate(req);
            if (!user) {
                return sendError(res, 401, "Authentication required.");
            }

            // RBAC: Admins can view any student; Students can ONLY view their own record
            if (!user->isAdmin()) {
                auto studentUser = std::dynamic_pointer_cast<StudentUser>(user);
                if (!studentUser || Validators::normalizeStudentId(studentUser->getStudentId()) != Validators::normalizeStudentId(studentId)) {
                    return sendError(res, 403, "Access denied: You are not authorized to view other students' records.");
                }
            }

            try {
                nlohmann::json s = m_studentService.getStudentByStudentId(studentId);
                sendJson(res, 200, {
                    {"success", true},
                    {"student", s}
                });
            } catch (const std::exception& ex) {
                sendError(res, 404, ex.what());
            }
        });

        // PUT /api/students/:studentId
        server.Put(R"(/api/students/([a-zA-Z0-9_-]+))", [this](const httplib::Request& req, httplib::Response& res) {
            std::string studentId = req.matches[1];

            auto user = authenticate(req);
            if (!user) {
                return sendError(res, 401, "Authentication required.");
            }
            if (!user->isAdmin()) {
                return sendError(res, 403, "Access denied: Administrator privileges required.");
            }

            try {
                nlohmann::json body = parseJsonBody(req);
                nlohmann::json updated = m_studentService.updateStudent(user->getName(), studentId, body);
                sendJson(res, 200, {
                    {"success", true},
                    {"message", "Student \"" + updated["name"].get<std::string>() + "\" (" + updated["student_id"].get<std::string>() + ") updated successfully!"},
                    {"student", updated}
                });
            } catch (const std::exception& ex) {
                std::string msg = ex.what();
                int status = (msg.find("not found") != std::string::npos) ? 404 : 400;
                sendError(res, status, msg);
            }
        });

        // DELETE /api/students/:studentId
        server.Delete(R"(/api/students/([a-zA-Z0-9_-]+))", [this](const httplib::Request& req, httplib::Response& res) {
            std::string studentId = req.matches[1];

            auto user = authenticate(req);
            if (!user) {
                return sendError(res, 401, "Authentication required.");
            }
            if (!user->isAdmin()) {
                return sendError(res, 403, "Access denied: Administrator privileges required.");
            }

            try {
                m_studentService.deleteStudent(user->getName(), studentId);
                sendJson(res, 200, {
                    {"success", true},
                    {"message", "Student with ID \"" + studentId + "\" was deleted successfully."}
                });
            } catch (const std::exception& ex) {
                sendError(res, 404, ex.what());
            }
        });

        // ======================================================================
        // 3. ADMIN OPERATIONS & ANALYTICS
        // ======================================================================

        auto handleAnalytics = [this](const httplib::Request& req, httplib::Response& res) {
            auto user = authenticate(req);
            if (!user) return sendError(res, 401, "Authentication required.");
            if (!user->isAdmin()) return sendError(res, 403, "Access denied: Administrator privileges required.");

            nlohmann::json data = m_analyticsService.getDashboardAnalytics();
            sendJson(res, 200, {
                {"success", true},
                {"analytics", data}
            });
        };

        server.Get("/api/analytics", handleAnalytics);
        server.Get("/api/admin/analytics", handleAnalytics);

        auto handleExport = [this](const httplib::Request& req, httplib::Response& res) {
            auto user = authenticate(req);
            if (!user) return sendError(res, 401, "Authentication required.");
            if (!user->isAdmin()) return sendError(res, 403, "Access denied: Administrator privileges required.");

            std::string csvData = m_csvService.exportCSV(user->getName());
            res.status = 200;
            res.set_header("Content-Disposition", "attachment; filename=\"cse_students.csv\"");
            res.set_content(csvData, "text/csv");
        };

        server.Get("/api/export", handleExport);
        server.Get("/api/admin/export", handleExport);

        auto handleImport = [this](const httplib::Request& req, httplib::Response& res) {
            auto user = authenticate(req);
            if (!user) return sendError(res, 401, "Authentication required.");
            if (!user->isAdmin()) return sendError(res, 403, "Access denied: Administrator privileges required.");

            std::string csvText;
            if (req.has_file("file")) {
                csvText = req.get_file_value("file").content;
            } else {
                nlohmann::json body = parseJsonBody(req);
                csvText = body.value("csv", "");
            }

            if (csvText.empty()) {
                return sendError(res, 400, "Please upload a CSV file or provide CSV string content.");
            }

            try {
                nlohmann::json summary = m_csvService.importCSV(user->getName(), csvText);
                std::string msg = "CSV Import complete: " + std::to_string(summary["added"].get<int>()) + " added, " +
                                  std::to_string(summary["updated"].get<int>()) + " updated, " +
                                  std::to_string(summary["errors"].get<int>()) + " errors.";
                sendJson(res, 200, {
                    {"success", true},
                    {"message", msg},
                    {"summary", summary}
                });
            } catch (const std::exception& ex) {
                sendError(res, 400, ex.what());
            }
        };

        server.Post("/api/import", handleImport);
        server.Post("/api/admin/import", handleImport);

        auto handleAuditLogs = [this](const httplib::Request& req, httplib::Response& res) {
            auto user = authenticate(req);
            if (!user) return sendError(res, 401, "Authentication required.");
            if (!user->isAdmin()) return sendError(res, 403, "Access denied: Administrator privileges required.");

            int limit = 50;
            int page = 1;
            if (req.has_param("limit")) {
                try { limit = std::stoi(req.get_param_value("limit")); } catch (...) {}
            }
            if (req.has_param("page")) {
                try { page = std::stoi(req.get_param_value("page")); } catch (...) {}
            }

            limit = std::clamp(limit, 1, 100);
            page = std::max(1, page);
            int offset = (page - 1) * limit;

            std::string studentId = req.has_param("studentId") ? req.get_param_value("studentId") : "";
            std::string action = req.has_param("action") ? req.get_param_value("action") : "";

            nlohmann::json result = m_auditRepo.findLogs(limit, offset, studentId, action);
            int64_t total = result["total"].get<int64_t>();
            int totalPages = static_cast<int>(std::ceil(static_cast<double>(total) / limit));
            if (totalPages <= 0) totalPages = 1;

            sendJson(res, 200, {
                {"success", true},
                {"logs", result["logs"]},
                {"pagination", {
                    {"total", total},
                    {"page", page},
                    {"limit", limit},
                    {"totalPages", totalPages}
                }}
            });
        };

        server.Get("/api/audit-logs", handleAuditLogs);
        server.Get("/api/admin/audit-logs", handleAuditLogs);
    }
};
