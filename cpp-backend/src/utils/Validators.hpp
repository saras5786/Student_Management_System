#pragma once

// ==============================================================================
// DESIGN CONCEPT: DEFENSIVE PROGRAMMING & DATA SANITIZATION
// File: cpp-backend/src/utils/Validators.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Defensive Programming: Writing code that proactively checks for unexpected,
//    malformed, or out-of-range inputs before processing them into core logic.
// 2. Data Sanitization: Cleaning up strings (trimming whitespace, converting IDs to
//    lowercase, normalizing semester strings) so comparisons and lookups are reliable.
//
// WHY DO WE USE IT HERE?
// When students or admins submit forms or CSV files, small human errors (trailing
// spaces, mixed capitalization like "25B11CS001" vs "25b11cs001", marks above 100)
// are caught immediately and rejected with user-friendly error messages.
// ==============================================================================

#include <string>
#include <vector>
#include <regex>
#include <algorithm>
#include <cctype>

class Validators {
public:
    Validators() = delete;

    /**
     * Trim leading and trailing whitespace from a string.
     */
    static std::string trim(const std::string& str) {
        auto start = str.begin();
        while (start != str.end() && std::isspace(static_cast<unsigned char>(*start))) {
            start++;
        }

        auto end = str.end();
        do {
            end--;
        } while (std::distance(start, end) > 0 && std::isspace(static_cast<unsigned char>(*end)));

        return std::string(start, end + 1);
    }

    /**
     * Convert string to lowercase.
     */
    static std::string toLower(const std::string& str) {
        std::string res = str;
        std::transform(res.begin(), res.end(), res.begin(), [](unsigned char c) {
            return std::tolower(c);
        });
        return res;
    }

    /**
     * Normalize Student ID (trim whitespace, lowercased).
     * e.g. "  25B11CS001  " -> "25b11cs001"
     */
    static std::string normalizeStudentId(const std::string& id) {
        return toLower(trim(id));
    }

    /**
     * Check if Student ID matches university format: 25b11csXXX (e.g. 25b11cs001).
     */
    static bool isValidStudentId(const std::string& id) {
        std::string clean = normalizeStudentId(id);
        static const std::regex pattern("^25b11cs[0-9]{3}$", std::regex::icase);
        return std::regex_match(clean, pattern);
    }

    /**
     * Validate that marks are within 0.0 and 100.0 inclusive.
     */
    static bool isValidMark(double mark) {
        return !std::isnan(mark) && mark >= 0.0 && mark <= 100.0;
    }

    /**
     * Validate attendance percentage between 0.0 and 100.0.
     */
    static bool isValidAttendance(double att) {
        return !std::isnan(att) && att >= 0.0 && att <= 100.0;
    }

    /**
     * Normalize semester format (e.g. "1" or "Sem 1" -> "Semester 1").
     */
    static std::string normalizeSemester(const std::string& sem) {
        std::string s = trim(sem);
        if (s.empty()) return "Semester 1";

        // Extract digit
        for (char c : s) {
            if (c >= '1' && c <= '8') {
                return "Semester " + std::string(1, c);
            }
        }
        return s;
    }
};
