#pragma once

// ==============================================================================
// DESIGN CONCEPT: SERVICE PATTERN & ANALYTICS AGGREGATION
// File: cpp-backend/src/services/AnalyticsService.hpp
//
// WHAT IS THIS CONCEPT?
// 1. Service Pattern: Computes executive department-level KPIs and distributions.
// 2. Dynamic Real-Time Aggregation: Every KPI (pass rate, average attendance,
//    grade distributions) is queried live from the SQLite database. If an admin
//    edits a student mark or adds 10 students, all dashboard charts and KPI cards
//    instantly reflect the new reality.
// ==============================================================================

#include <string>
#include <cmath>
#include <nlohmann/json.hpp>
#include "../repositories/StudentRepository.hpp"

class AnalyticsService {
private:
    StudentRepository m_studentRepo;

public:
    AnalyticsService() : m_studentRepo() {}

    /**
     * Compute comprehensive university department analytics and KPI metrics.
     */
    nlohmann::json getDashboardAnalytics() {
        nlohmann::json aggregates = m_studentRepo.getAggregateMetrics();
        nlohmann::json distributions = m_studentRepo.getAnalyticsDistributions();

        int64_t total = aggregates.value("total_students", 0LL);
        int64_t passCount = aggregates.value("pass_count", 0LL);
        int64_t failCount = aggregates.value("fail_count", 0LL);

        double passRate = 0.0;
        if (total > 0) {
            passRate = std::round((static_cast<double>(passCount) / total) * 10000.0) / 100.0;
        }

        return {
            {"kpis", {
                {"totalStudents", total},
                {"avgPercentage", aggregates.value("avg_percentage", 0.0)},
                {"avgAttendance", aggregates.value("avg_attendance", 0.0)},
                {"passCount", passCount},
                {"failCount", failCount},
                {"passRate", passRate},
                {"maxPercentage", aggregates.value("max_percentage", 0.0)},
                {"minPercentage", aggregates.value("min_percentage", 0.0)}
            }},
            {"subjectAverages", {
                {"mathematics", aggregates.value("avg_mathematics", 0.0)},
                {"physics", aggregates.value("avg_physics", 0.0)},
                {"python_programming", aggregates.value("avg_python", 0.0)},
                {"data_structures", aggregates.value("avg_data_structures", 0.0)},
                {"english", aggregates.value("avg_english", 0.0)}
            }},
            {"gradeDistribution", distributions["grades"]},
            {"semesterDistribution", distributions["semesters"]},
            {"attendanceDistribution", distributions["attendanceRanges"]},
            {"topPerformers", m_studentRepo.getTopPerformers(10)}
        };
    }
};
