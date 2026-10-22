#pragma once

// ==============================================================================
// DESIGN CONCEPT: REPOSITORY PATTERN & IMMUTABLE AUDIT LOGGING
// File: cpp-backend/src/repositories/AuditRepository.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Repository Pattern: Mediates between the domain logic (services) and data mapping
//    layers (SQLite queries). It acts like an in-memory domain collection.
// 2. Immutable Audit Ledger: In a university administrative system, modifications to
//    grades, student IDs, or attendance must be strictly traceable. Every mutation
//    (create, update, delete, CSV import) is recorded with the administrative user,
//    exact timestamp, previous value, and updated value.
//
// WHY DO WE USE IT HERE?
// Direct SQL calls are isolated inside this repository, making the business code
// in StudentService and AdminController clean, maintainable, and decoupled from SQL.
// ==============================================================================

#include <string>
#include <vector>
#include <optional>
#include <nlohmann/json.hpp>
#include "../database/SQLiteDatabase.hpp"

class AuditRepository {
private:
    // Reference to SQLiteDatabase singleton
    SQLiteDatabase& m_db;

public:
    AuditRepository() : m_db(SQLiteDatabase::getInstance()) {}

    /**
     * Record an administrative event into the audit log.
     */
    void log(const std::string& adminUsername,
             const std::string& action,
             const std::string& studentId = "",
             const std::string& fieldName = "",
             const std::string& oldValue = "",
             const std::string& newValue = "",
             const std::string& details = "") {
        std::string sql = R"(
            INSERT INTO audit_logs (
                admin_username, action, student_id, field_name,
                old_value, new_value, details, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        )";

        std::vector<std::string> params = {
            adminUsername.empty() ? "admin" : adminUsername,
            action,
            studentId,
            fieldName,
            oldValue,
            newValue,
            details
        };

        m_db.run(sql, params);
    }

    /**
     * Query recent audit logs with pagination and optional student/action filters.
     */
    nlohmann::json findLogs(int limit = 50, int offset = 0,
                            const std::string& studentId = "",
                            const std::string& action = "") {
        std::vector<std::string> conditions;
        std::vector<std::string> params;

        if (!studentId.empty()) {
            conditions.push_back("LOWER(student_id) = LOWER(?)");
            params.push_back(studentId);
        }

        if (!action.empty()) {
            conditions.push_back("action = ?");
            params.push_back(action);
        }

        std::string whereClause = "";
        if (!conditions.empty()) {
            whereClause = "WHERE ";
            for (size_t i = 0; i < conditions.size(); ++i) {
                if (i > 0) whereClause += " AND ";
                whereClause += conditions[i];
            }
        }

        // Count total matching logs
        std::string countSql = "SELECT COUNT(*) as total FROM audit_logs " + whereClause;
        nlohmann::json countRow = m_db.queryRow(countSql, params);
        int64_t total = 0;
        if (!countRow.empty() && countRow.contains("total")) {
            total = countRow["total"].get<int64_t>();
        }

        // Fetch paginated logs
        std::string querySql = "SELECT * FROM audit_logs " + whereClause +
                               " ORDER BY id DESC LIMIT ? OFFSET ?";
        std::vector<std::string> queryParams = params;
        queryParams.push_back(std::to_string(limit));
        queryParams.push_back(std::to_string(offset));

        nlohmann::json logs = m_db.queryAll(querySql, queryParams);

        return {
            {"logs", logs},
            {"total", total}
        };
    }
};
