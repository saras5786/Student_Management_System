#pragma once

// ==============================================================================
// C++ CONCEPT: RAII (RESOURCE ACQUISITION IS INITIALIZATION) & SINGLETON PATTERN
// C++ CONCEPT: MULTITHREADING CONCURRENCY & std::lock_guard
// File: cpp-backend/src/database/SQLiteDatabase.hpp
//
// WHAT IS RAII?
// RAII is the core idiom of modern C++. It means that resource allocation
// (opening a database file, acquiring memory, opening network sockets) is done
// in the constructor, while resource release (closing database, freeing memory)
// is guaranteed to happen in the destructor. Even if an exception is thrown,
// C++ unwinds the stack and executes the destructor, preventing memory/file leaks!
//
// WHAT IS THE SINGLETON PATTERN?
// Ensures only ONE instance of the database connection manager exists throughout
// the entire lifetime of the backend application, providing a global access point.
//
// WHAT IS THREAD SAFETY HERE?
// cpp-httplib serves HTTP requests across multiple background worker threads.
// SQLite statements and handles cannot be safely accessed concurrently without
// synchronization. We use std::mutex and std::lock_guard to serialize database
// transactions, ensuring 100% thread safety without race conditions.
// ==============================================================================

#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <iostream>
#include <stdexcept>
#include <filesystem>
#include <sqlite3.h>
#include <nlohmann/json.hpp>

class SQLiteDatabase {
private:
    // C++ CONCEPT: RAW POINTER MANAGED BY RAII
    sqlite3* m_db = nullptr;
    std::string m_dbPath;

    // C++ CONCEPT: MUTEX FOR THREAD SYNCHRONIZATION
    mutable std::mutex m_mutex;

    // C++ CONCEPT: PRIVATE CONSTRUCTOR (SINGLETON)
    // External code cannot call 'new SQLiteDatabase()' directly.
    explicit SQLiteDatabase(const std::string& dbPath) : m_dbPath(dbPath) {
        // Open SQLite connection
        int rc = sqlite3_open(m_dbPath.c_str(), &m_db);
        if (rc != SQLITE_OK) {
            std::string errMsg = sqlite3_errmsg(m_db);
            sqlite3_close(m_db);
            throw std::runtime_error("Failed to open SQLite database: " + errMsg);
        }

        // Enable Write-Ahead Logging (WAL) for high-performance concurrent reads
        executeRaw("PRAGMA journal_mode = WAL;");
        executeRaw("PRAGMA foreign_keys = ON;");
    }

public:
    // C++ CONCEPT: RAII DESTRUCTOR
    // Automatically called when the Singleton is destroyed at program termination.
    ~SQLiteDatabase() {
        if (m_db) {
            sqlite3_close(m_db);
            m_db = nullptr;
        }
    }

    // C++ CONCEPT: DELETED COPY CONSTRUCTOR & ASSIGNMENT OPERATOR
    // Prevents making copies of the database singleton (Singletons must be unique).
    SQLiteDatabase(const SQLiteDatabase&) = delete;
    SQLiteDatabase& operator=(const SQLiteDatabase&) = delete;

    // C++ CONCEPT: MEYERS' SINGLETON (THREAD-SAFE STATIC INSTANCE)
    // C++11 guarantees that static local variables are initialized in a thread-safe manner.
    static SQLiteDatabase& getInstance(const std::string& dbPath = "") {
        static std::string activePath;
        if (!dbPath.empty()) {
            activePath = dbPath;
        } else if (activePath.empty()) {
            // Default path relative to application root
            activePath = "database/student_management.db";
        }
        static SQLiteDatabase instance(activePath);
        return instance;
    }

    /**
     * Execute a raw SQL statement (e.g. PRAGMA or multi-statement DDL).
     */
    void executeRaw(const std::string& sql) {
        // C++ CONCEPT: std::lock_guard (RAII MUTEX LOCK)
        // Automatically locks m_mutex upon creation and unlocks it upon exiting the scope!
        std::lock_guard<std::mutex> lock(m_mutex);
        char* err = nullptr;
        int rc = sqlite3_exec(m_db, sql.c_str(), nullptr, nullptr, &err);
        if (rc != SQLITE_OK) {
            std::string msg = err ? err : "Unknown SQL error";
            sqlite3_free(err);
            throw std::runtime_error("SQL executeRaw error: " + msg);
        }
    }

    /**
     * Execute an INSERT, UPDATE, or DELETE query with parameterized bindings.
     * Returns the number of affected rows.
     */
    int run(const std::string& sql, const std::vector<std::string>& params = {}) {
        std::lock_guard<std::mutex> lock(m_mutex);
        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(m_db, sql.c_str(), -1, &stmt, nullptr);
        if (rc != SQLITE_OK) {
            throw std::runtime_error(std::string("Failed to prepare statement: ") + sqlite3_errmsg(m_db));
        }

        // C++ CONCEPT: BINDING PARAMETERS (PREVENT SQL INJECTION)
        for (size_t i = 0; i < params.size(); ++i) {
            sqlite3_bind_text(stmt, static_cast<int>(i + 1), params[i].c_str(), -1, SQLITE_TRANSIENT);
        }

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE && rc != SQLITE_ROW) {
            std::string err = sqlite3_errmsg(m_db);
            sqlite3_finalize(stmt);
            throw std::runtime_error("Failed to execute statement: " + err);
        }

        int changes = sqlite3_changes(m_db);
        sqlite3_finalize(stmt);
        return changes;
    }

    /**
     * Query a single row from the database and return as a dynamic JSON object.
     * Returns an empty json object {} if no rows match.
     */
    nlohmann::json queryRow(const std::string& sql, const std::vector<std::string>& params = {}) {
        std::lock_guard<std::mutex> lock(m_mutex);
        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(m_db, sql.c_str(), -1, &stmt, nullptr);
        if (rc != SQLITE_OK) {
            throw std::runtime_error(std::string("Failed to prepare statement: ") + sqlite3_errmsg(m_db));
        }

        for (size_t i = 0; i < params.size(); ++i) {
            sqlite3_bind_text(stmt, static_cast<int>(i + 1), params[i].c_str(), -1, SQLITE_TRANSIENT);
        }

        nlohmann::json row = nlohmann::json::object();
        rc = sqlite3_step(stmt);
        if (rc == SQLITE_ROW) {
            int colCount = sqlite3_column_count(stmt);
            for (int col = 0; col < colCount; ++col) {
                const char* colName = sqlite3_column_name(stmt, col);
                int colType = sqlite3_column_type(stmt, col);

                if (colType == SQLITE_INTEGER) {
                    row[colName] = sqlite3_column_int64(stmt, col);
                } else if (colType == SQLITE_FLOAT) {
                    row[colName] = sqlite3_column_double(stmt, col);
                } else if (colType == SQLITE_TEXT) {
                    const char* text = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col));
                    row[colName] = text ? std::string(text) : "";
                } else if (colType == SQLITE_NULL) {
                    row[colName] = nullptr;
                }
            }
        }

        sqlite3_finalize(stmt);
        return row;
    }

    /**
     * Query multiple rows and return as a dynamic JSON array.
     */
    nlohmann::json queryAll(const std::string& sql, const std::vector<std::string>& params = {}) {
        std::lock_guard<std::mutex> lock(m_mutex);
        sqlite3_stmt* stmt = nullptr;
        int rc = sqlite3_prepare_v2(m_db, sql.c_str(), -1, &stmt, nullptr);
        if (rc != SQLITE_OK) {
            throw std::runtime_error(std::string("Failed to prepare statement: ") + sqlite3_errmsg(m_db));
        }

        for (size_t i = 0; i < params.size(); ++i) {
            sqlite3_bind_text(stmt, static_cast<int>(i + 1), params[i].c_str(), -1, SQLITE_TRANSIENT);
        }

        nlohmann::json rows = nlohmann::json::array();
        int colCount = sqlite3_column_count(stmt);

        while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
            nlohmann::json row = nlohmann::json::object();
            for (int col = 0; col < colCount; ++col) {
                const char* colName = sqlite3_column_name(stmt, col);
                int colType = sqlite3_column_type(stmt, col);

                if (colType == SQLITE_INTEGER) {
                    row[colName] = sqlite3_column_int64(stmt, col);
                } else if (colType == SQLITE_FLOAT) {
                    row[colName] = sqlite3_column_double(stmt, col);
                } else if (colType == SQLITE_TEXT) {
                    const char* text = reinterpret_cast<const char*>(sqlite3_column_text(stmt, col));
                    row[colName] = text ? std::string(text) : "";
                } else if (colType == SQLITE_NULL) {
                    row[colName] = nullptr;
                }
            }
            rows.push_back(row);
        }

        sqlite3_finalize(stmt);
        return rows;
    }
};
