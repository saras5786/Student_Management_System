// ==============================================================================
// OOP CONCEPT: ABSTRACTION & CHART MANAGER (LIGHT THEME)
// File: public/js/charts.js
// 
// Encapsulates Chart.js rendering logic with light mode palette, high-contrast
// labels, and subtle grid dividers.
// ==============================================================================

export class ChartManager {
    #charts = new Map();

    destroy(canvasId) {
        if (this.#charts.has(canvasId)) {
            const chart = this.#charts.get(canvasId);
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
            this.#charts.delete(canvasId);
        }
    }

    renderStudentRadar(canvasId, marks) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        this.destroy(canvasId);

        const labels = ['Mathematics', 'Physics', 'Python', 'Data Structures', 'English'];
        const data = [
            marks.mathematics || 0,
            marks.physics || 0,
            marks.python_programming || 0,
            marks.data_structures || 0,
            marks.english || 0
        ];

        const chart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels,
                datasets: [{
                    label: 'Subject Score',
                    data,
                    backgroundColor: 'rgba(2, 132, 199, 0.2)',
                    borderColor: '#0284c7',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#0284c7',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { stepSize: 20, color: '#64748b', backdropColor: 'transparent' },
                        grid: { color: 'rgba(0, 0, 0, 0.08)' },
                        angleLines: { color: 'rgba(0, 0, 0, 0.08)' },
                        pointLabels: { color: '#0f172a', font: { size: 11, weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        this.#charts.set(canvasId, chart);
    }

    renderStudentBar(canvasId, marks) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        this.destroy(canvasId);

        const labels = ['Maths', 'Physics', 'Python', 'Data Struct', 'English'];
        const data = [
            marks.mathematics || 0,
            marks.physics || 0,
            marks.python_programming || 0,
            marks.data_structures || 0,
            marks.english || 0
        ];

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Score (out of 100)',
                    data,
                    backgroundColor: [
                        'rgba(2, 132, 199, 0.8)',
                        'rgba(37, 99, 235, 0.8)',
                        'rgba(124, 58, 237, 0.8)',
                        'rgba(219, 39, 119, 0.8)',
                        'rgba(5, 150, 105, 0.8)'
                    ],
                    borderColor: 'rgba(0, 0, 0, 0.04)',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(0, 0, 0, 0.06)' },
                        ticks: { color: '#475569' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#0f172a', font: { weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        this.#charts.set(canvasId, chart);
    }

    renderGradeDistribution(canvasId, gradeData = []) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        this.destroy(canvasId);

        const labels = gradeData.map(g => g.grade);
        const counts = gradeData.map(g => g.count);

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Students',
                    data: counts,
                    backgroundColor: 'rgba(2, 132, 199, 0.82)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.06)' },
                        ticks: { color: '#475569', precision: 0 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#0f172a', font: { weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        this.#charts.set(canvasId, chart);
    }

    renderSemesterDistribution(canvasId, semesterData = []) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        this.destroy(canvasId);

        const labels = semesterData.map(s => s.semester);
        const counts = semesterData.map(s => s.count);

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Students',
                    data: counts,
                    backgroundColor: 'rgba(124, 58, 237, 0.82)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.06)' },
                        ticks: { color: '#475569', precision: 0 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#0f172a', font: { weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        this.#charts.set(canvasId, chart);
    }

    renderSubjectAverages(canvasId, averages = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        this.destroy(canvasId);

        const labels = ['Mathematics', 'Physics', 'Python', 'Data Structures', 'English'];
        const data = [
            averages.mathematics || 0,
            averages.physics || 0,
            averages.python_programming || 0,
            averages.data_structures || 0,
            averages.english || 0
        ];

        const chart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Class Average (%)',
                    data,
                    indexAxis: 'y',
                    backgroundColor: 'rgba(5, 150, 105, 0.82)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(0, 0, 0, 0.06)' },
                        ticks: { color: '#475569' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#0f172a', font: { weight: 'bold' } }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        this.#charts.set(canvasId, chart);
    }

    renderAttendanceDistribution(canvasId, ranges = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        this.destroy(canvasId);

        const labels = ['90% - 100%', '80% - 89%', '70% - 79%', '60% - 69%', 'Below 60%'];
        const data = [
            ranges.range_90_100 || 0,
            ranges.range_80_89 || 0,
            ranges.range_70_79 || 0,
            ranges.range_60_69 || 0,
            ranges.range_below_60 || 0
        ];

        const chart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: [
                        '#059669',
                        '#0284c7',
                        '#2563eb',
                        '#d97706',
                        '#dc2626'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#0f172a', boxWidth: 12, padding: 14, font: { weight: '600' } }
                    }
                }
            }
        });

        this.#charts.set(canvasId, chart);
    }
}
