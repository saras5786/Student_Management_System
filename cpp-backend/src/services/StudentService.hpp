#pragma once

// ==============================================================================
// DESIGN CONCEPT: SERVICE PATTERN & COMPOSITION (AUDIT TRAIL & BUSINESS RULES)
// File: cpp-backend/src/services/StudentService.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Service Pattern: Business logic orchestration. It coordinates between the
//    StudentRepository (data storage), AuditRepository (compliance ledger), and
//    AcademicCalculator (grading algorithms).
// 2. Composition: Rather than inheriting from repositories, StudentService HAS-A
//    StudentRepository and HAS-A AuditRepository. This provides loose coupling.
// 3. Field-Level Change Tracking: When an administrator updates a record (e.g. changing
//    attendance from 94.5% to 97%), the service compares the before-and-after states
//    and emits granular audit events into the database.
// ==============================================================================

#include <string>
#include <vector>
#include <cmath>
#include <sstream>
#include <stdexcept>
#include <nlohmann/json.hpp>
#include "../repositories/StudentRepository.hpp"
#include "../repositories/AuditRepository.hpp"
#include "../utils/AcademicCalculator.hpp"
#include "../utils/Validators.hpp"

class StudentService {
private:
    StudentRepository m_studentRepo;
    AuditRepository m_auditRepo;

public:
    StudentService()
        : m_studentRepo(), m_auditRepo() {}

    /**
     * Retrieve paginated and filtered list of students.
     */
    nlohmann::json listStudents(const nlohmann::json& queryParams) {
        int page = 1;
        int limit = 20;

        if (queryParams.contains("page")) {
            try {
                if (queryParams["page"].is_number()) page = queryParams["page"].get<int>();
                else if (queryParams["page"].is_string()) page = std::stoi(queryParams["page"].get<std::string>());
            } catch (...) {}
        }
        if (queryParams.contains("limit")) {
            try {
                if (queryParams["limit"].is_number()) limit = queryParams["limit"].get<int>();
                else if (queryParams["limit"].is_string()) limit = std::stoi(queryParams["limit"].get<std::string>());
            } catch (...) {}
        }

        page = std::max(1, page);
        limit = std::clamp(limit, 1, 100);
        int offset = (page - 1) * limit;

        StudentFilterOptions opts;
        opts.search = queryParams.value("search", "");
        opts.semester = queryParams.value("semester", "");
        opts.gender = queryParams.value("gender", "");
        opts.grade = queryParams.value("grade", "");
        opts.status = queryParams.value("status", "");
        opts.branch = queryParams.value("branch", "");
        opts.sortBy = queryParams.value("sortBy", "student_id");
        opts.sortOrder = queryParams.value("sortOrder", "ASC");
        opts.limit = limit;
        opts.offset = offset;

        nlohmann::json res = m_studentRepo.findWithFilters(opts);
        int64_t total = res["total"].get<int64_t>();
        int totalPages = static_cast<int>(std::ceil(static_cast<double>(total) / limit));
        if (totalPages <= 0) totalPages = 1;

        int from = (total == 0) ? 0 : offset + 1;
        int to = static_cast<int>(std::min<int64_t>(offset + limit, total));

        return {
            {"students", res["students"]},
            {"pagination", {
                {"total", total},
                {"page", page},
                {"limit", limit},
                {"totalPages", totalPages},
                {"from", from},
                {"to", to}
            }}
        };
    }

    /**
     * Get a single student record by university Student ID.
     */
    nlohmann::json getStudentByStudentId(const std::string& studentId) {
        std::string normalized = Validators::normalizeStudentId(studentId);
        auto sOpt = m_studentRepo.findByStudentId(normalized);
        if (!sOpt.has_value()) {
            throw std::runtime_error("Student with ID \"" + studentId + "\" not found.");
        }
        return sOpt->toJson();
    }

    /**
     * Add a new student record to the system.
     */
    nlohmann::json createStudent(const std::string& adminUsername, const nlohmann::json& payload) {
        std::string rawId = payload.value("student_id", "");
        if (rawId.empty() && payload.contains("studentId")) {
            rawId = payload["studentId"].get<std::string>();
        }

        std::string normalizedId = Validators::normalizeStudentId(rawId);
        if (!Validators::isValidStudentId(normalizedId)) {
            throw std::runtime_error("Invalid Student ID format. Expected format: 25b11csXXX (e.g., 25b11cs001 up to 25b11cs999).");
        }

        if (m_studentRepo.exists(normalizedId)) {
            throw std::runtime_error("Student ID " + normalizedId + " already exists in database.");
        }

        std::string name = Validators::trim(payload.value("name", ""));
        if (name.empty()) {
            throw std::runtime_error("Student name is required.");
        }

        std::string gender = payload.value("gender", "Male");
        std::string branch = payload.value("branch", "CSE");
        std::string semester = Validators::normalizeSemester(payload.value("semester", "Semester 1"));

        auto getNum = [&](const std::string& key) -> double {
            if (payload.contains(key) && !payload[key].is_null()) {
                if (payload[key].is_number()) return payload[key].get<double>();
                if (payload[key].is_string()) {
                    try { return std::stod(payload[key].get<std::string>()); } catch (...) {}
                }
            }
            return 0.0;
        };

        double att = getNum("attendance");
        double math = getNum("mathematics");
        double phys = getNum("physics");
        double py = payload.contains("python_programming") ? getNum("python_programming") : getNum("python");
        double ds = getNum("data_structures");
        double eng = getNum("english");

        if (!Validators::isValidAttendance(att) || !Validators::isValidMark(math) ||
            !Validators::isValidMark(phys) || !Validators::isValidMark(py) ||
            !Validators::isValidMark(ds) || !Validators::isValidMark(eng)) {
            throw std::runtime_error("Marks and attendance must be valid numbers between 0 and 100.");
        }

        Student s(normalizedId, name, gender, branch, semester, att, math, phys, py, ds, eng);
        Student created = m_studentRepo.create(s);

        // Record audit trail
        m_auditRepo.log(
            adminUsername.empty() ? "admin" : adminUsername,
            "ADD_STUDENT",
            normalizedId,
            "", "", "",
            "Added new student: " + name + " (" + normalizedId + "), Percentage: " + std::to_string(created.getPercentage()) + "%"
        );

        return created.toJson();
    }

    /**
     * Update an existing student record with granular audit logging for modified fields.
     */
    nlohmann::json updateStudent(const std::string& adminUsername, const std::string& studentId, const nlohmann::json& payload) {
        std::string normalizedId = Validators::normalizeStudentId(studentId);
        auto existingOpt = m_studentRepo.findByStudentId(normalizedId);
        if (!existingOpt.has_value()) {
            throw std::runtime_error("Student with ID \"" + studentId + "\" not found.");
        }

        const Student& oldStudent = existingOpt.value();
        Student newStudent = oldStudent;

        if (payload.contains("name")) newStudent.setName(Validators::trim(payload["name"].get<std::string>()));
        if (payload.contains("gender")) newStudent.setGender(payload["gender"].get<std::string>());
        if (payload.contains("branch")) newStudent.setBranch(payload["branch"].get<std::string>());
        if (payload.contains("semester")) newStudent.setSemester(Validators::normalizeSemester(payload["semester"].get<std::string>()));

        auto getNum = [&](const std::string& key, double fallback) -> double {
            if (payload.contains(key) && !payload[key].is_null()) {
                if (payload[key].is_number()) return payload[key].get<double>();
                if (payload[key].is_string()) {
                    try { return std::stod(payload[key].get<std::string>()); } catch (...) {}
                }
            }
            return fallback;
        };

        if (payload.contains("attendance")) newStudent.setAttendance(getNum("attendance", oldStudent.getAttendance()));
        if (payload.contains("mathematics")) newStudent.setMathematics(getNum("mathematics", oldStudent.getMathematics()));
        if (payload.contains("physics")) newStudent.setPhysics(getNum("physics", oldStudent.getPhysics()));
        if (payload.contains("python_programming") || payload.contains("python")) {
            double py = payload.contains("python_programming") ? getNum("python_programming", oldStudent.getPythonProgramming()) : getNum("python", oldStudent.getPythonProgramming());
            newStudent.setPythonProgramming(py);
        }
        if (payload.contains("data_structures")) newStudent.setDataStructures(getNum("data_structures", oldStudent.getDataStructures()));
        if (payload.contains("english")) newStudent.setEnglish(getNum("english", oldStudent.getEnglish()));

        newStudent.recalculateAcademicMetrics();

        // Detect modifications for granular audit logging
        auto formatVal = [](double v) -> std::string {
            std::ostringstream ss;
            // If whole number, format without .0
            if (std::floor(v) == v) {
                ss << static_cast<long long>(v);
            } else {
                ss << v;
            }
            return ss.str();
        };

        if (std::abs(oldStudent.getAttendance() - newStudent.getAttendance()) > 0.001) {
            m_auditRepo.log(
                adminUsername.empty() ? "admin" : adminUsername,
                "UPDATE_STUDENT",
                normalizedId,
                "attendance",
                formatVal(oldStudent.getAttendance()),
                formatVal(newStudent.getAttendance()),
                "Field attendance updated from " + formatVal(oldStudent.getAttendance()) + " to " + formatVal(newStudent.getAttendance())
            );
        }

        if (oldStudent.getName() != newStudent.getName()) {
            m_auditRepo.log(
                adminUsername.empty() ? "admin" : adminUsername,
                "UPDATE_STUDENT",
                normalizedId,
                "name",
                oldStudent.getName(),
                newStudent.getName(),
                "Field name updated from " + oldStudent.getName() + " to " + newStudent.getName()
            );
        }

        Student updated = m_studentRepo.update(normalizedId, newStudent);
        return updated.toJson();
    }

    /**
     * Delete a student record by student ID.
     */
    bool deleteStudent(const std::string& adminUsername, const std::string& studentId) {
        std::string normalizedId = Validators::normalizeStudentId(studentId);
        auto existing = m_studentRepo.findByStudentId(normalizedId);
        if (!existing.has_value()) {
            throw std::runtime_error("Student with ID \"" + studentId + "\" not found.");
        }

        bool success = m_studentRepo.deleteStudent(normalizedId);
        if (success) {
            m_auditRepo.log(
                adminUsername.empty() ? "admin" : adminUsername,
                "DELETE_STUDENT",
                normalizedId,
                "", "", "",
                "Deleted student: " + existing->getName() + " (" + normalizedId + ")"
            );
        }
        return success;
    }

    /**
     * Retrieve top academic performers for Dean's List.
     */
    nlohmann::json getTopPerformers(int limit = 10) {
        return m_studentRepo.getTopPerformers(limit);
    }
};
