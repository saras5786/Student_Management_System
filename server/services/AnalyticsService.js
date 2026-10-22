// ==============================================================================
// DESIGN CONCEPT: SERVICE PATTERN & ANALYTICS AGGREGATION
// File: server/services/AnalyticsService.js
// 
// Computes real-time analytical metrics, academic distributions, and KPI summaries
// dynamically queried directly from the SQLite database.
// ==============================================================================

import { StudentRepository } from '../repositories/StudentRepository.js';

export class AnalyticsService {
    #studentRepo;

    constructor() {
        this.#studentRepo = new StudentRepository();
    }

    /**
     * Compute comprehensive university department metrics.
     * 
     * @returns {Object}
     */
    getDashboardAnalytics() {
        const aggregates = this.#studentRepo.getAggregateMetrics();
        const distributions = this.#studentRepo.getAnalyticsDistributions();

        const total = aggregates.total_students || 0;
        const passCount = aggregates.pass_count || 0;
        const failCount = aggregates.fail_count || 0;
        const passRate = total > 0 ? Math.round((passCount / total) * 10000) / 100 : 0;

        return {
            kpis: {
                totalStudents: total,
                avgPercentage: aggregates.avg_percentage || 0,
                avgAttendance: aggregates.avg_attendance || 0,
                passCount,
                failCount,
                passRate,
                maxPercentage: aggregates.max_percentage || 0,
                minPercentage: aggregates.min_percentage || 0
            },
            subjectAverages: {
                mathematics: aggregates.avg_mathematics || 0,
                physics: aggregates.avg_physics || 0,
                python_programming: aggregates.avg_python || 0,
                data_structures: aggregates.avg_data_structures || 0,
                english: aggregates.avg_english || 0
            },
            gradeDistribution: distributions.grades,
            semesterDistribution: distributions.semesters,
            attendanceDistribution: distributions.attendanceRanges,
            topPerformers: this.#studentRepo.getTopPerformers(10)
        };
    }
}
