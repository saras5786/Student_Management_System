#pragma once

// ==============================================================================
// DESIGN CONCEPT: REPOSITORY PATTERN & PARAMETERIZED QUERIES (SQL INJECTION DEFENSE)
// C++ CONCEPT: OPTIONAL (std::optional) & STRUCTURED TYPES
// File: cpp-backend/src/repositories/StudentRepository.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Repository Pattern: Isolates the domain layer from database implementation details.
//    If we ever migrate from SQLite to PostgreSQL or MySQL, only this repository
//    needs to be modified, without breaking controllers or services.
// 2. Parameterized Queries: Rather than concatenating strings into SQL queries
//    (e.g. "SELECT * FROM students WHERE id = '" + id + "'"), parameters are bound
//    separately using placeholders (?). This completely prevents SQL Injection attacks!
// 3. std::optional<Student>: Represents a value that may or may not exist (e.g. when
//    searching for a student who might not be in the database). Avoids returning null pointers.
// ==============================================================================

#include <string>
#include <vector>
#include <optional>
#include <algorithm>
#include <map>
#include <nlohmann/json.hpp>
#include "../database/SQLiteDatabase.hpp"
#include "../models/Student.hpp"

// Filter options structure
struct StudentFilterOptions {
    std::string search = "";
    std::string semester = "";
    std::string gender = "";
    std::string grade = "";
    std::string status = "";
    std::string branch = "";
    std::string sortBy = "student_id";
    std::string sortOrder = "ASC";
    int limit = 20;
    int offset = 0;
};

class StudentRepository {
private:
    SQLiteDatabase& m_db;

    // Helper to convert database row JSON to Student object
    static Student rowToStudent(const nlohmann::json& r) {
        Student s;
        if (r.contains("id") && !r["id"].is_null()) s.setId(r["id"].get<int>());
        if (r.contains("student_id") && !r["student_id"].is_null()) s.setStudentId(r["student_id"].get<std::string>());
        if (r.contains("name") && !r["name"].is_null()) s.setName(r["name"].get<std::string>());
        if (r.contains("gender") && !r["gender"].is_null()) s.setGender(r["gender"].get<std::string>());
        if (r.contains("branch") && !r["branch"].is_null()) s.setBranch(r["branch"].get<std::string>());
        if (r.contains("semester") && !r["semester"].is_null()) s.setSemester(r["semester"].get<std::string>());

        auto getDouble = [&](const std::string& key) -> double {
            if (r.contains(key) && !r[key].is_null()) {
                if (r[key].is_number()) return r[key].get<double>();
            }
            return 0.0;
        };

        s.setAttendance(getDouble("attendance"));
        s.setMathematics(getDouble("mathematics"));
        s.setPhysics(getDouble("physics"));
        s.setPythonProgramming(getDouble("python_programming"));
        s.setDataStructures(getDouble("data_structures"));
        s.setEnglish(getDouble("english"));

        double total = getDouble("total_marks");
        double pct = getDouble("percentage");
        std::string grade = (r.contains("grade") && !r["grade"].is_null()) ? r["grade"].get<std::string>() : "F";
        int gp = (r.contains("grade_point") && !r["grade_point"].is_null()) ? r["grade_point"].get<int>() : 0;
        std::string status = (r.contains("status") && !r["status"].is_null()) ? r["status"].get<std::string>() : "FAIL";

        s.setAllMetrics(total, pct, grade, gp, status);

        if (r.contains("created_at") && !r["created_at"].is_null()) s.setCreatedAt(r["created_at"].get<std::string>());
        if (r.contains("updated_at") && !r["updated_at"].is_null()) s.setUpdatedAt(r["updated_at"].get<std::string>());

        return s;
    }

public:
    StudentRepository() : m_db(SQLiteDatabase::getInstance()) {}

    /**
     * Find a student by unique University Student ID.
     */
    std::optional<Student> findByStudentId(const std::string& studentId) {
        std::string sql = "SELECT * FROM students WHERE LOWER(student_id) = LOWER(?) LIMIT 1";
        nlohmann::json row = m_db.queryRow(sql, {studentId});
        if (row.empty() || !row.contains("student_id")) {
            return std::nullopt;
        }
        return rowToStudent(row);
    }

    /**
     * Check if a student ID already exists in the database.
     */
    bool exists(const std::string& studentId) {
        std::string sql = "SELECT COUNT(*) as count FROM students WHERE LOWER(student_id) = LOWER(?)";
        nlohmann::json row = m_db.queryRow(sql, {studentId});
        if (!row.empty() && row.contains("count")) {
            return row["count"].get<int64_t>() > 0;
        }
        return false;
    }

    /**
     * Query students with dynamic filtering, live search, sorting, and pagination.
     */
    nlohmann::json findWithFilters(const StudentFilterOptions& opts) {
        std::vector<std::string> conditions;
        std::vector<std::string> params;

        if (!opts.search.empty()) {
            conditions.push_back("(LOWER(student_id) LIKE ? OR LOWER(name) LIKE ?)");
            std::string term = "%" + opts.search + "%";
            // Transform term to lowercase
            std::transform(term.begin(), term.end(), term.begin(), ::tolower);
            params.push_back(term);
            params.push_back(term);
        }

        if (!opts.semester.empty() && opts.semester != "ALL") {
            conditions.push_back("LOWER(semester) = LOWER(?)");
            params.push_back(opts.semester);
        }

        if (!opts.gender.empty() && opts.gender != "ALL") {
            conditions.push_back("LOWER(gender) = LOWER(?)");
            params.push_back(opts.gender);
        }

        if (!opts.grade.empty() && opts.grade != "ALL") {
            conditions.push_back("UPPER(grade) = UPPER(?)");
            params.push_back(opts.grade);
        }

        if (!opts.status.empty() && opts.status != "ALL") {
            conditions.push_back("UPPER(status) = UPPER(?)");
            params.push_back(opts.status);
        }

        if (!opts.branch.empty() && opts.branch != "ALL") {
            conditions.push_back("UPPER(branch) = UPPER(?)");
            params.push_back(opts.branch);
        }

        std::string whereClause = "";
        if (!conditions.empty()) {
            whereClause = "WHERE ";
            for (size_t i = 0; i < conditions.size(); ++i) {
                if (i > 0) whereClause += " AND ";
                whereClause += conditions[i];
            }
        }

        // Count total matching records
        std::string countSql = "SELECT COUNT(*) as total FROM students " + whereClause;
        nlohmann::json countRow = m_db.queryRow(countSql, params);
        int64_t total = 0;
        if (!countRow.empty() && countRow.contains("total")) {
            total = countRow["total"].get<int64_t>();
        }

        // Whitelist sort columns to prevent SQL injection in ORDER BY
        static const std::map<std::string, std::string> allowedSort = {
            {"student_id", "student_id"},
            {"name", "name"},
            {"attendance", "attendance"},
            {"percentage", "percentage"},
            {"grade", "percentage"},
            {"grade_point", "grade_point"},
            {"semester", "semester"},
            {"status", "status"},
            {"total_marks", "total_marks"}
        };

        std::string sortCol = "student_id";
        auto it = allowedSort.find(opts.sortBy);
        if (it != allowedSort.end()) {
            sortCol = it->second;
        }

        std::string sortDir = "ASC";
        std::string upperOrder = opts.sortOrder;
        std::transform(upperOrder.begin(), upperOrder.end(), upperOrder.begin(), ::toupper);
        if (upperOrder == "DESC") {
            sortDir = "DESC";
        }

        std::string querySql = "SELECT * FROM students " + whereClause +
                               " ORDER BY " + sortCol + " " + sortDir +
                               " LIMIT ? OFFSET ?";

        std::vector<std::string> queryParams = params;
        queryParams.push_back(std::to_string(opts.limit));
        queryParams.push_back(std::to_string(opts.offset));

        nlohmann::json rows = m_db.queryAll(querySql, queryParams);

        nlohmann::json studentsArray = nlohmann::json::array();
        for (const auto& r : rows) {
            studentsArray.push_back(rowToStudent(r).toJson());
        }

        return {
            {"students", studentsArray},
            {"total", total},
            {"limit", opts.limit},
            {"offset", opts.offset}
        };
    }

    /**
     * Create a new student record in SQLite.
     */
    Student create(const Student& s) {
        std::string sql = R"(
            INSERT INTO students (
                student_id, name, gender, branch, semester, attendance,
                mathematics, physics, python_programming, data_structures, english,
                total_marks, percentage, grade, grade_point, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
        )";

        std::vector<std::string> params = {
            s.getStudentId(),
            s.getName(),
            s.getGender(),
            s.getBranch(),
            s.getSemester(),
            std::to_string(s.getAttendance()),
            std::to_string(s.getMathematics()),
            std::to_string(s.getPhysics()),
            std::to_string(s.getPythonProgramming()),
            std::to_string(s.getDataStructures()),
            std::to_string(s.getEnglish()),
            std::to_string(s.getTotalMarks()),
            std::to_string(s.getPercentage()),
            s.getGrade(),
            std::to_string(s.getGradePoint()),
            s.getStatus()
        };

        m_db.run(sql, params);
        return findByStudentId(s.getStudentId()).value_or(s);
    }

    /**
     * Update an existing student record in SQLite.
     */
    Student update(const std::string& studentId, const Student& s) {
        std::string sql = R"(
            UPDATE students SET
                name = ?,
                gender = ?,
                branch = ?,
                semester = ?,
                attendance = ?,
                mathematics = ?,
                physics = ?,
                python_programming = ?,
                data_structures = ?,
                english = ?,
                total_marks = ?,
                percentage = ?,
                grade = ?,
                grade_point = ?,
                status = ?,
                updated_at = datetime('now', 'localtime')
            WHERE LOWER(student_id) = LOWER(?)
        )";

        std::vector<std::string> params = {
            s.getName(),
            s.getGender(),
            s.getBranch(),
            s.getSemester(),
            std::to_string(s.getAttendance()),
            std::to_string(s.getMathematics()),
            std::to_string(s.getPhysics()),
            std::to_string(s.getPythonProgramming()),
            std::to_string(s.getDataStructures()),
            std::to_string(s.getEnglish()),
            std::to_string(s.getTotalMarks()),
            std::to_string(s.getPercentage()),
            s.getGrade(),
            std::to_string(s.getGradePoint()),
            s.getStatus(),
            studentId
        };

        m_db.run(sql, params);
        return findByStudentId(studentId).value_or(s);
    }

    /**
     * Delete a student by student ID.
     */
    bool deleteStudent(const std::string& studentId) {
        std::string sql = "DELETE FROM students WHERE LOWER(student_id) = LOWER(?)";
        int changes = m_db.run(sql, {studentId});
        return changes > 0;
    }

    /**
     * Retrieve all students for CSV export.
     */
    nlohmann::json findAllForExport() {
        std::string sql = "SELECT * FROM students ORDER BY student_id ASC";
        return m_db.queryAll(sql);
    }

    /**
     * Aggregate system-wide statistics dynamically from SQLite.
     */
    nlohmann::json getAggregateMetrics() {
        std::string sql = R"(
            SELECT 
                COUNT(*) as total_students,
                ROUND(AVG(percentage), 2) as avg_percentage,
                ROUND(AVG(attendance), 2) as avg_attendance,
                MAX(percentage) as max_percentage,
                MIN(percentage) as min_percentage,
                SUM(CASE WHEN UPPER(status) = 'PASS' THEN 1 ELSE 0 END) as pass_count,
                SUM(CASE WHEN UPPER(status) = 'FAIL' THEN 1 ELSE 0 END) as fail_count,
                ROUND(AVG(mathematics), 2) as avg_mathematics,
                ROUND(AVG(physics), 2) as avg_physics,
                ROUND(AVG(python_programming), 2) as avg_python,
                ROUND(AVG(data_structures), 2) as avg_data_structures,
                ROUND(AVG(english), 2) as avg_english
            FROM students
        )";
        return m_db.queryRow(sql);
    }

    /**
     * Get distribution arrays for analytics charts.
     */
    nlohmann::json getAnalyticsDistributions() {
        // Grade counts
        std::string gradeSql = R"(
            SELECT grade, COUNT(*) as count 
            FROM students 
            GROUP BY grade 
            ORDER BY 
                CASE grade
                    WHEN 'A+' THEN 1
                    WHEN 'A'  THEN 2
                    WHEN 'B'  THEN 3
                    WHEN 'C'  THEN 4
                    WHEN 'D'  THEN 5
                    WHEN 'F'  THEN 6
                    ELSE 7
                END
        )";
        nlohmann::json grades = m_db.queryAll(gradeSql);

        // Semester distribution
        std::string semSql = "SELECT semester, COUNT(*) as count FROM students GROUP BY semester ORDER BY semester ASC";
        nlohmann::json semesters = m_db.queryAll(semSql);

        // Attendance ranges
        std::string attSql = R"(
            SELECT 
                SUM(CASE WHEN attendance >= 90 THEN 1 ELSE 0 END) as range_90_100,
                SUM(CASE WHEN attendance >= 80 AND attendance < 90 THEN 1 ELSE 0 END) as range_80_89,
                SUM(CASE WHEN attendance >= 70 AND attendance < 80 THEN 1 ELSE 0 END) as range_70_79,
                SUM(CASE WHEN attendance >= 60 AND attendance < 70 THEN 1 ELSE 0 END) as range_60_69,
                SUM(CASE WHEN attendance < 60 THEN 1 ELSE 0 END) as range_below_60
            FROM students
        )";
        nlohmann::json attendanceRanges = m_db.queryRow(attSql);

        return {
            {"grades", grades},
            {"semesters", semesters},
            {"attendanceRanges", attendanceRanges}
        };
    }

    /**
     * Retrieve top academic performers for Dean's List / Hall of Fame.
     */
    nlohmann::json getTopPerformers(int limit = 10) {
        std::string sql = R"(
            SELECT student_id, name, semester, attendance, percentage, grade, grade_point, status
            FROM students 
            WHERE UPPER(status) = 'PASS'
            ORDER BY percentage DESC 
            LIMIT ?
        )";
        return m_db.queryAll(sql, {std::to_string(limit)});
    }
};
