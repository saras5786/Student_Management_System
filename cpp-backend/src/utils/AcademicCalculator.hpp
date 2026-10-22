#pragma once

// ==============================================================================
// OOP CONCEPT: ABSTRACTION & STATIC UTILITY CLASS (SINGLE RESPONSIBILITY PRINCIPLE)
// File: cpp-backend/src/utils/AcademicCalculator.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Abstraction: Hiding internal calculation formulas and business rules from the
//    rest of the system. The callers (controllers, repositories, UI) simply ask
//    "what is the grade for these marks?" without needing to know the grading thresholds.
// 2. Static Utility Class: A class composed purely of static methods. Since academic
//    calculations do not require maintaining internal object state (they are purely
//    input -> output transformations), creating class instances is unnecessary.
// 3. Single Responsibility Principle (SRP): This class has one and only one job:
//    performing university grading and academic metric calculations.
//
// WHY DO WE USE IT HERE?
// When an administrator enters student marks in the UI, or uploads a CSV file, or
// creates a student via the API, the percentages, letter grades (A+, A, B, etc.),
// grade points (10-point scale), and PASS/FAIL status must be calculated in exactly
// the same, consistent way across the entire university platform.
// ==============================================================================

#include <string>
#include <cmath>
#include <nlohmann/json.hpp>

// Structure to bundle the calculated academic metrics together
struct AcademicEvaluation {
    double totalMarks = 0.0;
    double percentage = 0.0;
    std::string grade = "F";
    int gradePoint = 0;
    std::string status = "FAIL";

    // Convert to JSON object matching API response structure
    nlohmann::json toJson() const {
        return {
            {"total_marks", totalMarks},
            {"percentage", percentage},
            {"grade", grade},
            {"grade_point", gradePoint},
            {"status", status}
        };
    }
};

class AcademicCalculator {
public:
    // C++ CONCEPT: DELETE DEFAULT CONSTRUCTOR
    // Prevents instantiation of this class because it only contains static utility methods.
    AcademicCalculator() = delete;

    /**
     * Round a double value to a specified number of decimal places.
     * C++ CONCEPT: HELPER UTILITY FUNCTION
     */
    static double roundTo(double value, int decimals) {
        double factor = std::pow(10.0, decimals);
        return std::round(value * factor) / factor;
    }

    /**
     * Calculate total marks across the 5 core CSE curriculum subjects.
     * Max possible marks = 500 (100 per subject).
     */
    static double calculateTotalMarks(double math, double physics, double python, double ds, double english) {
        double total = math + physics + python + ds + english;
        return roundTo(total, 1);
    }

    /**
     * Calculate percentage from the 5 subjects.
     */
    static double calculatePercentage(double totalMarks) {
        double pct = totalMarks / 5.0;
        return roundTo(pct, 2);
    }

    /**
     * Determine university letter grade based on percentage:
     * - >= 90%: A+ (Outstanding)
     * - >= 80%: A  (Excellent)
     * - >= 70%: B  (Very Good)
     * - >= 60%: C  (Good)
     * - >= 50%: D  (Satisfactory)
     * - < 50%:  F  (Fail)
     */
    static std::string calculateGrade(double percentage) {
        if (percentage >= 90.0) return "A+";
        if (percentage >= 80.0) return "A";
        if (percentage >= 70.0) return "B";
        if (percentage >= 60.0) return "C";
        if (percentage >= 50.0) return "D";
        return "F";
    }

    /**
     * Determine university Grade Point on a 10-point scale.
     */
    static int calculateGradePoint(const std::string& grade) {
        if (grade == "A+") return 10;
        if (grade == "A")  return 9;
        if (grade == "B")  return 8;
        if (grade == "C")  return 7;
        if (grade == "D")  return 6;
        return 0; // Grade F has 0 grade points
    }

    /**
     * Determine PASS or FAIL status based on overall percentage.
     * Minimum 50% required to PASS in CSE curriculum.
     */
    static std::string calculateStatus(double percentage) {
        return (percentage >= 50.0) ? "PASS" : "FAIL";
    }

    /**
     * Comprehensive evaluation returning all calculated metrics at once.
     */
    static AcademicEvaluation evaluateAll(double math, double physics, double python, double ds, double english) {
        AcademicEvaluation eval;
        eval.totalMarks = calculateTotalMarks(math, physics, python, ds, english);
        eval.percentage = calculatePercentage(eval.totalMarks);
        eval.grade = calculateGrade(eval.percentage);
        eval.gradePoint = calculateGradePoint(eval.grade);
        eval.status = calculateStatus(eval.percentage);
        return eval;
    }
};
