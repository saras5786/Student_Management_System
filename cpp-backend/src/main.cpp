// ==============================================================================
// ADITYA UNIVERSITY STUDENT MANAGEMENT SYSTEM (AU-SMS)
// File: cpp-backend/src/main.cpp
//
// C++ CONCEPTS DEMONSTRATED IN THIS APPLICATION:
// 1. RAII (Resource Acquisition Is Initialization): Guaranteed cleanup of DB handles and sockets.
// 2. OOP Encapsulation: Private member variables with validated getters and setters.
// 3. OOP Inheritance & Polymorphism: Abstract User base with AdminUser and StudentUser derivatives.
// 4. Design Patterns:
//    - Repository Pattern (StudentRepository, AuditRepository)
//    - Service Layer Pattern (AuthService, StudentService, CSVService, AnalyticsService)
//    - Controller Pattern (ApiController)
//    - Singleton Pattern (SQLiteDatabase)
// 5. Modern C++ Features (C++20):
//    - std::shared_ptr, std::unique_ptr for automatic memory management
//    - std::optional for safe query results
//    - Lambda functions & closures for declarative REST route dispatch
//    - std::mutex & std::lock_guard for thread-safe SQLite operations
// ==============================================================================

#include <iostream>
#include <fstream>
#include <string>
#include <filesystem>
#include <csignal>

#include <httplib.h>
#include <nlohmann/json.hpp>

#include "database/SQLiteDatabase.hpp"
#include "controllers/ApiController.hpp"

namespace fs = std::filesystem;

// Global pointer for graceful shutdown signal handling
static httplib::Server* g_server = nullptr;

void signalHandler(int signum) {
    std::cout << "\n[AU-SMS C++] Received termination signal (" << signum << "). Shutting down gracefully...\n";
    if (g_server) {
        g_server->stop();
    }
}

int main(int argc, char* argv[]) {
    std::cout << "===========================================================\n";
    std::cout << "  * ADITYA UNIVERSITY - STUDENT MANAGEMENT SYSTEM (AU-SMS)\n";
    std::cout << "  * High-Performance C++20 Backend Architecture\n";
    std::cout << "  * Department of Computer Science & Engineering\n";
    std::cout << "===========================================================\n";

    // Register signal handlers for clean CTRL+C shutdown
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);

    // Determine working directories
    fs::path currentDir = fs::current_path();
    fs::path dbPath = currentDir / "database" / "student_management.db";
    fs::path publicDir = currentDir / "public";

    // If executed from within cpp-backend folder, adjust paths
    if (!fs::exists(publicDir) && fs::exists(currentDir.parent_path() / "public")) {
        currentDir = currentDir.parent_path();
        dbPath = currentDir / "database" / "student_management.db";
        publicDir = currentDir / "public";
    }

    std::cout << "[Init] Working directory : " << currentDir.string() << "\n";
    std::cout << "[Init] Database file     : " << dbPath.string() << "\n";
    std::cout << "[Init] Static public dir : " << publicDir.string() << "\n";

    // Initialize SQLite Database Singleton
    try {
        std::cout << "[Init] Connecting to SQLite Database Layer...\n";
        SQLiteDatabase& db = SQLiteDatabase::getInstance(dbPath.string());

        // Ensure schema exists if starting fresh
        fs::path schemaPath = currentDir / "database" / "schema.sql";
        if (fs::exists(schemaPath)) {
            std::ifstream schemaFile(schemaPath);
            std::string schemaSql((std::istreambuf_iterator<char>(schemaFile)),
                                   std::istreambuf_iterator<char>());
            db.executeRaw(schemaSql);
        }

        // Ensure default demo administrator account
        nlohmann::json adminCheck = db.queryRow("SELECT COUNT(*) as count FROM admins WHERE username = 'admin'");
        if (adminCheck.empty() || adminCheck.value("count", 0LL) == 0) {
            db.run("INSERT INTO admins (username, password_hash, name, role) VALUES ('admin', 'admin123', 'CSE Department Administrator', 'ADMIN')");
            std::cout << "[Init] Default Demo Admin created: admin / admin123\n";
        }
        std::cout << "[Init] Database initialized successfully.\n";
    } catch (const std::exception& ex) {
        std::cerr << "[Error] Database initialization failed: " << ex.what() << "\n";
        return 1;
    }

    // Initialize HTTP Server
    httplib::Server server;
    g_server = &server;

    // C++ CONCEPT: PRE-ROUTING HANDLER (CORS & PREFLIGHT INTERCEPTOR)
    server.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        res.set_header("Access-Control-Max-Age", "86400");

        if (req.method == "OPTIONS") {
            res.status = 204;
            return httplib::Server::HandlerResponse::Handled;
        }
        return httplib::Server::HandlerResponse::Unhandled;
    });

    // Register all API REST endpoints via Controller
    ApiController apiController;
    apiController.registerRoutes(server);

    // Mount static web frontend files (HTML, CSS, JS, Assets)
    if (fs::exists(publicDir)) {
        server.set_mount_point("/", publicDir.string());
    } else {
        std::cerr << "[Warning] Public directory not found at: " << publicDir.string() << "\n";
    }

    // SPA Fallback Handler: Any non-API route returns public/index.html
    server.set_error_handler([&publicDir](const httplib::Request& req, httplib::Response& res) {
        if (res.status == 404) {
            if (req.path.rfind("/api", 0) == 0) {
                res.status = 404;
                nlohmann::json err = {
                    {"success", false},
                    {"error", "API endpoint not found."}
                };
                res.set_content(err.dump(), "application/json");.
            } else {
                fs::path indexPath = publicDir / "index.html";
                if (fs::exists(indexPath)) {
                    std::ifstream indexFile(indexPath, std::ios::binary);
                    std::string html((std::istreambuf_iterator<char>(indexFile)),
                                       std::istreambuf_iterator<char>());
                    res.status = 200;
                    res.set_content(html, "text/html");
                }
            }
        }
    });

    // Server Port Configuration
    int port = 3000;
    const char* envPort = std::getenv("PORT");
    if (envPort) {
        try { port = std::stoi(envPort); } catch (...) {}
    }

    std::cout << "===========================================================\n";
    std::cout << "  * C++ Server listening on : http://localhost:" << port << "\n";
    std::cout << "  * Demo Admin Account     : admin / admin123\n";
    std::cout << "  * Student Demo Access    : 25b11cs001 to 25b11cs841\n";
    std::cout << "===========================================================\n";

    if (!server.listen("0.0.0.0", port)) {
        std::cerr << "[Fatal] Failed to bind server to port " << port << ". Check if port is already in use.\n";
        return 1;
    }

    std::cout << "[AU-SMS C++] Server stopped.\n";
    return 0;
}
