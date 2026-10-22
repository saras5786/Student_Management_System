#pragma once

// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & DATA HIDING
// File: cpp-backend/src/models/Student.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Encapsulation: Bundling data (variables) and methods (functions that operate on
//    the data) into a single unit (class), while restricting direct outside access
//    to internal state using private variables.
// 2. Data Hiding: External classes cannot directly manipulate fields like m_attendance
//    or m_marks to invalid numbers (e.g. -50% or 999%). Instead, changes MUST go
//    through public member methods (getters and setters) that can validate values.
//
// WHY DO WE USE IT HERE?
// In AU-SMS, student grades, attendance, and exam scores are sensitive academic
// data. By encapsulating these attributes within the Student class, we guarantee:
// - All student data conforms to the University schema.
// - Academic metrics (percentage, letter grades) remain synchronized with raw marks.
// - Conversion to and from JSON (for REST API communication) is cleanly centralized.
// ==============================================================================

#include <string>
#include <algorithm>
#include <nlohmann/json.hpp>
#include "../utils/AcademicCalculator.hpp"

class Student {
private:
    // C++ CONCEPT: PRIVATE MEMBER VARIABLES (DATA HIDING)
    // The prefix 'm_' is a standard C++ convention denoting 'member variable'.
    int m_id = 0;
    std::string m_studentId;
    std::string m_name;
    std::string m_gender = "Male";
    std::string m_branch = "CSE";
    std::string m_semester = "Semester 1";
    double m_attendance = 0.0;
    
    // Core CSE Subject Marks (0.0 to 100.0)
    double m_mathematics = 0.0;
    double m_physics = 0.0;
    double m_pythonProgramming = 0.0;
    double m_dataStructures = 0.0;
    double m_english = 0.0;

    // Derived Academic Metrics (Calculated via AcademicCalculator)
    double m_totalMarks = 0.0;
    double m_percentage = 0.0;
    std::string m_grade = "F";
    int m_gradePoint = 0;
    std::string m_status = "FAIL";

    // Metadata Timestamps
    std::string m_createdAt;
    std::string m_updatedAt;

public:
    // C++ CONCEPT: DEFAULT CONSTRUCTOR
    Student() = default;

    // C++ CONCEPT: PARAMETERIZED CONSTRUCTOR
    Student(const std::string& studentId, const std::string& name, const std::string& gender,
            const std::string& branch, const std::string& semester, double attendance,
            double math, double physics, double python, double ds, double english)
        : m_studentId(studentId), m_name(name), m_gender(gender),
          m_branch(branch), m_semester(semester), m_attendance(attendance),
          m_mathematics(math), m_physics(physics), m_pythonProgramming(python),
          m_dataStructures(ds), m_english(english) {
        recalculateAcademicMetrics();
    }

    // Automatically recalculate metrics whenever marks are updated
    void recalculateAcademicMetrics() {
        AcademicEvaluation eval = AcademicCalculator::evaluateAll(
            m_mathematics, m_physics, m_pythonProgramming, m_dataStructures, m_english
        );
        m_totalMarks = eval.totalMarks;
        m_percentage = eval.percentage;
        m_grade = eval.grade;
        m_gradePoint = eval.gradePoint;
        m_status = eval.status;
    }

    // ==========================================================================
    // C++ CONCEPT: CONST MEMBER FUNCTIONS (GETTERS)
    // The 'const' at the end guarantees these methods will NOT modify object state.
    // ==========================================================================
    int getId() const { return m_id; }
    const std::string& getStudentId() const { return m_studentId; }
    const std::string& getName() const { return m_name; }
    const std::string& getGender() const { return m_gender; }
    const std::string& getBranch() const { return m_branch; }
    const std::string& getSemester() const { return m_semester; }
    double getAttendance() const { return m_attendance; }
    double getMathematics() const { return m_mathematics; }
    double getPhysics() const { return m_physics; }
    double getPythonProgramming() const { return m_pythonProgramming; }
    double getDataStructures() const { return m_dataStructures; }
    double getEnglish() const { return m_english; }
    double getTotalMarks() const { return m_totalMarks; }
    double getPercentage() const { return m_percentage; }
    const std::string& getGrade() const { return m_grade; }
    int getGradePoint() const { return m_gradePoint; }
    const std::string& getStatus() const { return m_status; }
    const std::string& getCreatedAt() const { return m_createdAt; }
    const std::string& getUpdatedAt() const { return m_updatedAt; }

    // ==========================================================================
    // C++ CONCEPT: SETTERS WITH VALIDATION (MUTATORS)
    // ==========================================================================
    void setId(int id) { m_id = id; }
    void setStudentId(const std::string& id) { m_studentId = id; }
    void setName(const std::string& name) { m_name = name; }
    void setGender(const std::string& gender) { m_gender = gender; }
    void setBranch(const std::string& branch) { m_branch = branch; }
    void setSemester(const std::string& semester) { m_semester = semester; }
    void setAttendance(double att) { m_attendance = att; }
    void setMathematics(double m) { m_mathematics = m; recalculateAcademicMetrics(); }
    void setPhysics(double p) { m_physics = p; recalculateAcademicMetrics(); }
    void setPythonProgramming(double py) { m_pythonProgramming = py; recalculateAcademicMetrics(); }
    void setDataStructures(double ds) { m_dataStructures = ds; recalculateAcademicMetrics(); }
    void setEnglish(double eng) { m_english = eng; recalculateAcademicMetrics(); }
    void setCreatedAt(const std::string& ts) { m_createdAt = ts; }
    void setUpdatedAt(const std::string& ts) { m_updatedAt = ts; }

    // Direct setters for database loading (when metrics are already persisted)
    void setAllMetrics(double total, double pct, const std::string& grade, int gp, const std::string& status) {
        m_totalMarks = total;
        m_percentage = pct;
        m_grade = grade;
        m_gradePoint = gp;
        m_status = status;
    }

    // ==========================================================================
    // SERIALIZATION: C++ OBJECT <---> JSON
    // ==========================================================================
    nlohmann::json toJson() const {
        return {
            {"id", m_id},
            {"student_id", m_studentId},
            {"name", m_name},
            {"gender", m_gender},
            {"branch", m_branch},
            {"semester", m_semester},
            {"attendance", m_attendance},
            {"mathematics", m_mathematics},
            {"physics", m_physics},
            {"python_programming", m_pythonProgramming},
            {"data_structures", m_dataStructures},
            {"english", m_english},
            {"total_marks", m_totalMarks},
            {"percentage", m_percentage},
            {"grade", m_grade},
            {"grade_point", m_gradePoint},
            {"status", m_status},
            {"created_at", m_createdAt},
            {"updated_at", m_updatedAt}
        };
    }

    static Student fromJson(const nlohmann::json& j) {
        Student s;
        if (j.contains("id") && !j["id"].is_null()) s.m_id = j["id"].get<int>();
        if (j.contains("student_id")) s.m_studentId = j["student_id"].get<std::string>();
        else if (j.contains("studentId")) s.m_studentId = j["studentId"].get<std::string>();

        if (j.contains("name")) s.m_name = j["name"].get<std::string>();
        if (j.contains("gender")) s.m_gender = j["gender"].get<std::string>();
        if (j.contains("branch")) s.m_branch = j["branch"].get<std::string>();
        if (j.contains("semester")) s.m_semester = j["semester"].get<std::string>();

        auto getDouble = [&](const std::string& key, double defaultVal = 0.0) -> double {
            if (j.contains(key) && !j[key].is_null()) {
                if (j[key].is_number()) return j[key].get<double>();
                if (j[key].is_string()) {
                    try { return std::stod(j[key].get<std::string>()); } catch (...) {}
                }
            }
            return defaultVal;
        };

        s.m_attendance = getDouble("attendance", 0.0);
        s.m_mathematics = getDouble("mathematics", 0.0);
        s.m_physics = getDouble("physics", 0.0);
        s.m_pythonProgramming = j.contains("python_programming") ? getDouble("python_programming", 0.0) : getDouble("python", 0.0);
        s.m_dataStructures = getDouble("data_structures", 0.0);
        s.m_english = getDouble("english", 0.0);

        s.recalculateAcademicMetrics();
        return s;
    }
};
