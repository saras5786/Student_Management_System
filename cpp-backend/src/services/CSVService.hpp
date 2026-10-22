#pragma once

// ==============================================================================
// DESIGN CONCEPT: SERVICE PATTERN & CSV ETL (EXTRACT, TRANSFORM, LOAD)
// File: cpp-backend/src/services/CSVService.hpp
//
// WHAT IS THIS CONCEPT?
// 1. ETL Pipeline:
//    - Extract: Reading batch student records from uploaded CSV text.
//    - Transform: Normalizing student IDs, parsing numerical marks, recalculating
//      university percentages, letter grades, and PASS/FAIL criteria.
//    - Load: Inserting new records or updating existing records in the SQLite database.
// 2. Dynamic Live Export: Generating a CSV file on-the-fly reflecting the current
//    exact state of the database.
// ==============================================================================

#include <string>
#include <vector>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <nlohmann/json.hpp>
#include "../repositories/StudentRepository.hpp"
#include "../repositories/AuditRepository.hpp"
#include "../utils/AcademicCalculator.hpp"
#include "../utils/Validators.hpp"

class CSVService {
private:
    StudentRepository m_studentRepo;
    AuditRepository m_auditRepo;

    // Helper: Split CSV row taking simple commas into account
    static std::vector<std::string> parseCsvLine(const std::string& line) {
        std::vector<std::string> tokens;
        std::string token;
        bool inQuotes = false;

        for (size_t i = 0; i < line.size(); ++i) {
            char c = line[i];
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                tokens.push_back(Validators::trim(token));
                token.clear();
            } else {
                token += c;
            }
        }
        tokens.push_back(Validators::trim(token));

        // Strip surrounding quotes
        for (auto& t : tokens) {
            if (t.size() >= 2 && t.front() == '"' && t.back() == '"') {
                t = t.substr(1, t.size() - 2);
            }
        }
        return tokens;
    }

public:
    CSVService()
        : m_studentRepo(), m_auditRepo() {}

    /**
     * Parse and import student records from CSV text.
     */
    nlohmann::json importCSV(const std::string& adminUsername, const std::string& csvText) {
        if (csvText.empty()) {
            throw std::runtime_error("Invalid or empty CSV content.");
        }

        std::stringstream ss(csvText);
        std::string line;
        std::vector<std::string> lines;
        while (std::getline(ss, line)) {
            std::string clean = Validators::trim(line);
            if (!clean.empty()) {
                lines.push_back(clean);
            }
        }

        if (lines.size() <= 1) {
            throw std::runtime_error("CSV file contains no data records.");
        }

        // Parse header
        std::vector<std::string> rawHeaders = parseCsvLine(lines[0]);
        std::vector<std::string> headers;
        for (const auto& h : rawHeaders) {
            std::string clean = Validators::toLower(h);
            clean.erase(std::remove_if(clean.begin(), clean.end(), [](char c) {
                return c == ' ' || c == '_' || c == '-';
            }), clean.end());
            headers.push_back(clean);
        }

        auto findCol = [&](const std::string& substr) -> int {
            for (size_t i = 0; i < headers.size(); ++i) {
                if (headers[i].find(substr) != std::string::npos) return static_cast<int>(i);
            }
            return -1;
        };

        int idCol = findCol("studentid");
        if (idCol == -1) idCol = findCol("id");
        int nameCol = findCol("name");
        int genderCol = findCol("gender");
        int branchCol = findCol("branch");
        int semCol = findCol("semester");
        int attCol = findCol("attendance");
        int mathCol = findCol("math");
        int physCol = findCol("physics");
        int pyCol = findCol("python");
        int dsCol = findCol("structure");
        if (dsCol == -1) dsCol = findCol("ds");
        int engCol = findCol("english");

        if (idCol == -1 || nameCol == -1 || attCol == -1 || mathCol == -1 || physCol == -1 || engCol == -1) {
            throw std::runtime_error("CSV is missing required columns (Student_ID, Name, Attendance, Math, Physics, English).");
        }

        int processed = 0;
        int added = 0;
        int updated = 0;
        int errors = 0;
        std::vector<std::string> errorDetails;

        for (size_t i = 1; i < lines.size(); ++i) {
            int lineNum = static_cast<int>(i + 1);
            std::vector<std::string> cols = parseCsvLine(lines[i]);
            if (cols.size() < 5) continue;
            processed++;

            std::string rawId = (idCol < cols.size()) ? cols[idCol] : "";
            std::string normalizedId = Validators::normalizeStudentId(rawId);

            if (!Validators::isValidStudentId(normalizedId)) {
                errors++;
                errorDetails.push_back("Line " + std::to_string(lineNum) + ": Invalid Student ID \"" + rawId + "\".");
                continue;
            }

            std::string name = (nameCol < cols.size()) ? cols[nameCol] : "Unknown";
            std::string gender = (genderCol >= 0 && genderCol < cols.size()) ? cols[genderCol] : "Male";
            std::string branch = (branchCol >= 0 && branchCol < cols.size()) ? cols[branchCol] : "CSE";
            std::string sem = (semCol >= 0 && semCol < cols.size()) ? cols[semCol] : "Semester 1";

            auto parseDouble = [&](int colIdx) -> double {
                if (colIdx >= 0 && colIdx < cols.size()) {
                    try { return std::stod(cols[colIdx]); } catch (...) {}
                }
                return 0.0;
            };

            double att = parseDouble(attCol);
            double math = parseDouble(mathCol);
            double phys = parseDouble(physCol);
            double py = parseDouble(pyCol);
            double ds = parseDouble(dsCol);
            double eng = parseDouble(engCol);

            if (!Validators::isValidAttendance(att) || !Validators::isValidMark(math) ||
                !Validators::isValidMark(phys) || !Validators::isValidMark(py) ||
                !Validators::isValidMark(ds) || !Validators::isValidMark(eng)) {
                errors++;
                errorDetails.push_back("Line " + std::to_string(lineNum) + " (" + normalizedId + "): Marks or attendance out of valid 0-100 range.");
                continue;
            }

            Student s(normalizedId, name, gender, branch, Validators::normalizeSemester(sem),
                      att, math, phys, py, ds, eng);

            try {
                if (m_studentRepo.exists(normalizedId)) {
                    m_studentRepo.update(normalizedId, s);
                    updated++;
                } else {
                    m_studentRepo.create(s);
                    added++;
                }
            } catch (const std::exception& ex) {
                errors++;
                errorDetails.push_back("Line " + std::to_string(lineNum) + " (" + normalizedId + "): DB error - " + ex.what());
            }
        }

        m_auditRepo.log(
            adminUsername.empty() ? "admin" : adminUsername,
            "IMPORT_CSV",
            "", "", "", "",
            "CSV Import completed: " + std::to_string(processed) + " processed, " +
            std::to_string(added) + " added, " + std::to_string(updated) + " updated, " +
            std::to_string(errors) + " errors."
        );

        return {
            {"processed", processed},
            {"added", added},
            {"updated", updated},
            {"errors", errors},
            {"errorDetails", errorDetails}
        };
    }

    /**
     * Generate CSV string from the live SQLite database.
     */
    std::string exportCSV(const std::string& adminUsername) {
        nlohmann::json students = m_studentRepo.findAllForExport();

        std::ostringstream csv;
        csv << "Student_ID,Name,Gender,Branch,Semester,Attendance,Mathematics,Physics,Python_Programming,Data_Structures,English,Total_Marks,Percentage,Grade,Grade_Point,Status\n";

        for (const auto& s : students) {
            std::string name = s.value("name", "");
            // Escape double quotes
            size_t pos = 0;
            while ((pos = name.find('"', pos)) != std::string::npos) {
                name.replace(pos, 1, "\"\"");
                pos += 2;
            }

            auto getNumStr = [&](const std::string& key) -> std::string {
                if (s.contains(key) && !s[key].is_null()) {
                    if (s[key].is_number_float()) {
                        double v = s[key].get<double>();
                        if (std::floor(v) == v) {
                            return std::to_string(static_cast<long long>(v));
                        }
                        std::ostringstream ss;
                        ss << v;
                        return ss.str();
                    }
                    if (s[key].is_number_integer()) {
                        return std::to_string(s[key].get<int64_t>());
                    }
                }
                return "0";
            };

            csv << s.value("student_id", "") << ","
                << "\"" << name << "\","
                << s.value("gender", "Male") << ","
                << s.value("branch", "CSE") << ","
                << "\"" << s.value("semester", "Semester 1") << "\","
                << getNumStr("attendance") << ","
                << getNumStr("mathematics") << ","
                << getNumStr("physics") << ","
                << getNumStr("python_programming") << ","
                << getNumStr("data_structures") << ","
                << getNumStr("english") << ","
                << getNumStr("total_marks") << ","
                << getNumStr("percentage") << ","
                << s.value("grade", "F") << ","
                << getNumStr("grade_point") << ","
                << s.value("status", "FAIL") << "\n";
        }

        m_auditRepo.log(
            adminUsername.empty() ? "admin" : adminUsername,
            "EXPORT_CSV",
            "", "", "", "",
            "Exported " + std::to_string(students.size()) + " student records to CSV."
        );

        return csv.str();
    }
};
