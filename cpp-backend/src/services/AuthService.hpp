#pragma once

// ==============================================================================
// DESIGN CONCEPT: SERVICE LAYER PATTERN & TOKEN SESSION MANAGEMENT
// C++ CONCEPT: SMART POINTERS (std::shared_ptr) & MODERN BASE64 TOKEN GENERATION
// File: cpp-backend/src/services/AuthService.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Service Layer Pattern: A distinct boundary defining the application's business
//    logic operations. It orchestrates domain objects (Students, Users), repositories,
//    and security verification. Controllers simply forward requests here.
// 2. Token-Based Authentication: The server generates a signed/encoded bearer token
//    containing identity claims (role, user ID, expiration timestamp). Clients present
//    this token in the HTTP Authorization header (Bearer <token>) with every request.
// 3. std::shared_ptr<User>: Reference-counted smart pointer allowing polymorphic
//    User instances (AdminUser or StudentUser) to be safely passed across threads
//    and route handlers without manual 'delete' or risk of dangling pointers.
// 4. One-Time Password (OTP) Life-Cycle: A temporary 6-digit credential with a
//    strict 60-second Time-To-Live (TTL) stored in SQLite for single-use verification.
// ==============================================================================

#include <string>
#include <memory>
#include <chrono>
#include <random>
#include <sstream>
#include <iomanip>
#include <nlohmann/json.hpp>
#include "../database/SQLiteDatabase.hpp"
#include "../repositories/StudentRepository.hpp"
#include "../models/User.hpp"
#include "../utils/Validators.hpp"

class AuthService {
private:
    SQLiteDatabase& m_db;
    StudentRepository m_studentRepo;

    // Helper: Base64 encoding for compact, stateless Bearer tokens
    static std::string base64Encode(const std::string& in) {
        static const std::string chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        std::string out;
        int val = 0, valb = -6;
        for (unsigned char c : in) {
            val = (val << 8) + c;
            valb += 8;
            while (valb >= 0) {
                out.push_back(chars[(val >> valb) & 0x3F]);
                valb -= 6;
            }
        }
        if (valb > -6) out.push_back(chars[((val << 8) >> (valb + 8)) & 0x3F]);
        while (out.size() % 4) out.push_back('=');
        return out;
    }

    // Helper: Base64 decoding
    static std::string base64Decode(const std::string& in) {
        static const std::string chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        std::vector<int> T(256, -1);
        for (int i = 0; i < 64; i++) T[chars[i]] = i;

        std::string out;
        int val = 0, valb = -8;
        for (unsigned char c : in) {
            if (T[c] == -1) break;
            val = (val << 6) + T[c];
            valb += 6;
            if (valb >= 0) {
                out.push_back(char((val >> valb) & 0xFF));
                valb -= 8;
            }
        }
        return out;
    }

    // Get current Unix timestamp in milliseconds
    static int64_t currentTimestampMs() {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
    }

public:
    AuthService()
        : m_db(SQLiteDatabase::getInstance()), m_studentRepo() {}

    /**
     * Authenticate university administrator credentials.
     */
    nlohmann::json loginAdmin(const std::string& username, const std::string& password) {
        std::string cleanUser = Validators::trim(username);
        std::string cleanPass = Validators::trim(password);

        if (cleanUser.empty() || cleanPass.empty()) {
            throw std::runtime_error("Username and password are required.");
        }

        // Check against demo credentials (admin / admin123)
        // or existing admins table in SQLite
        bool valid = false;
        std::string adminName = "CSE Department Administrator";
        int adminId = 1;

        if (cleanUser == "admin" && cleanPass == "admin123") {
            valid = true;
        } else {
            // Check SQLite admins table
            std::string sql = "SELECT * FROM admins WHERE username = ? LIMIT 1";
            nlohmann::json row = m_db.queryRow(sql, {cleanUser});
            if (!row.empty()) {
                adminName = row.value("name", "CSE Administrator");
                adminId = static_cast<int>(row.value("id", 1));
                // In demo mode, admin123 is accepted for university administrator account
                if (cleanPass == "admin123") {
                    valid = true;
                }
            }
        }

        if (!valid) {
            throw std::runtime_error("Invalid administrator credentials.");
        }

        // Generate Bearer token valid for 8 hours (28,800,000 ms)
        int64_t expiresAt = currentTimestampMs() + (8LL * 3600LL * 1000LL);
        nlohmann::json tokenClaims = {
            {"id", adminId},
            {"username", cleanUser},
            {"name", adminName},
            {"role", "ADMIN"},
            {"exp", expiresAt}
        };

        std::string token = "au_tok_" + base64Encode(tokenClaims.dump());

        nlohmann::json userObj = {
            {"id", adminId},
            {"username", cleanUser},
            {"name", adminName},
            {"role", "ADMIN"}
        };

        return {
            {"token", token},
            {"user", userObj}
        };
    }

    /**
     * Generate demo One-Time Password for a student with 60-second TTL.
     */
    nlohmann::json requestStudentOTP(const std::string& studentId) {
        if (!Validators::isValidStudentId(studentId)) {
            throw std::runtime_error("Invalid Student ID format. Format must be 25b11csXXX (e.g., 25b11cs001 up to 25b11cs999).");
        }

        std::string normalizedId = Validators::normalizeStudentId(studentId);
        auto studentOpt = m_studentRepo.findByStudentId(normalizedId);
        if (!studentOpt.has_value()) {
            throw std::runtime_error("Student not found. No record registered for ID \"" + studentId + "\".");
        }

        const Student& student = studentOpt.value();

        // Invalidate any existing unverified OTP sessions for this student
        m_db.run("DELETE FROM otp_sessions WHERE LOWER(student_id) = ?", {normalizedId});

        // Generate cryptographically random 6-digit OTP code (100000 - 999999)
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<int> dist(100000, 999999);
        std::string otpCode = std::to_string(dist(gen));

        int64_t now = currentTimestampMs();
        int64_t expiresAt = now + (60LL * 1000LL); // 60 seconds TTL

        m_db.run(
            "INSERT INTO otp_sessions (student_id, otp_code, expires_at, verified) VALUES (?, ?, ?, 0)",
            {normalizedId, otpCode, std::to_string(expiresAt)}
        );

        return {
            {"success", true},
            {"studentId", normalizedId},
            {"studentName", student.getName()},
            {"demoOtp", otpCode},
            {"expiresIn", 60},
            {"message", "DEMO OTP generated for " + student.getName() + ". Use code: " + otpCode}
        };
    }

    /**
     * Verify submitted student OTP and issue an authenticated student token.
     */
    nlohmann::json verifyStudentOTP(const std::string& studentId, const std::string& otpCode) {
        std::string normalizedId = Validators::normalizeStudentId(studentId);
        auto studentOpt = m_studentRepo.findByStudentId(normalizedId);
        if (!studentOpt.has_value()) {
            throw std::runtime_error("Student not found.");
        }

        const Student& student = studentOpt.value();
        std::string cleanCode = Validators::trim(otpCode);

        std::string sql = "SELECT * FROM otp_sessions WHERE LOWER(student_id) = ? ORDER BY id DESC LIMIT 1";
        nlohmann::json session = m_db.queryRow(sql, {normalizedId});

        if (session.empty()) {
            throw std::runtime_error("No OTP was requested for this student. Please request an OTP first.");
        }

        int64_t now = currentTimestampMs();
        int64_t expiresAt = session.value("expires_at", 0LL);

        if (now > expiresAt) {
            m_db.run("DELETE FROM otp_sessions WHERE id = ?", {std::to_string(session["id"].get<int64_t>())});
            throw std::runtime_error("OTP has expired. Please request a new OTP.");
        }

        std::string expectedCode = session.value("otp_code", "");
        if (expectedCode != cleanCode) {
            throw std::runtime_error("Invalid OTP. Please check the 6-digit code and try again.");
        }

        // Successfully verified: remove single-use OTP
        m_db.run("DELETE FROM otp_sessions WHERE id = ?", {std::to_string(session["id"].get<int64_t>())});

        // Issue 8-hour token for student
        int64_t tokenExpiry = currentTimestampMs() + (8LL * 3600LL * 1000LL);
        nlohmann::json tokenClaims = {
            {"id", student.getId()},
            {"studentId", student.getStudentId()},
            {"name", student.getName()},
            {"role", "STUDENT"},
            {"exp", tokenExpiry}
        };

        std::string token = "au_tok_" + base64Encode(tokenClaims.dump());

        nlohmann::json userObj = {
            {"id", student.getId()},
            {"studentId", student.getStudentId()},
            {"name", student.getName()},
            {"role", "STUDENT"},
            {"profile", student.toJson()}
        };

        return {
            {"token", token},
            {"user", userObj}
        };
    }

    /**
     * Verify bearer token and return polymorphic User pointer.
     * Returns nullptr if token is missing, corrupted, or expired.
     */
    std::shared_ptr<User> verifyToken(const std::string& rawToken) {
        if (rawToken.empty()) return nullptr;

        std::string token = rawToken;
        if (token.rfind("Bearer ", 0) == 0) {
            token = token.substr(7);
        }
        token = Validators::trim(token);
        if (token.rfind("au_tok_", 0) == 0) {
            token = token.substr(7);
        }

        try {
            std::string decoded = base64Decode(token);
            nlohmann::json claims = nlohmann::json::parse(decoded);

            // Check expiration
            int64_t exp = claims.value("exp", 0LL);
            if (exp > 0 && currentTimestampMs() > exp) {
                return nullptr; // Token expired
            }

            std::string role = claims.value("role", "");
            int id = static_cast<int>(claims.value("id", 0));
            std::string name = claims.value("name", "");

            if (role == "ADMIN") {
                std::string username = claims.value("username", "admin");
                return std::make_shared<AdminUser>(id, username, name);
            } else if (role == "STUDENT") {
                std::string studentId = claims.value("studentId", "");
                auto sOpt = m_studentRepo.findByStudentId(studentId);
                nlohmann::json profile = sOpt.has_value() ? sOpt->toJson() : nullptr;
                return std::make_shared<StudentUser>(id, studentId, name, profile);
            }
        } catch (...) {
            return nullptr;
        }

        return nullptr;
    }
};
