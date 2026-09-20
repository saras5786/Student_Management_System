// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & STUDENT VIEW MANAGER
// File: public/js/student.js
// 
// Encapsulates all presentation logic for the Student Portal.
// Always queries the backend API to guarantee the single source of truth from SQLite.
// ==============================================================================

import { APIClient } from './api.js';
import { ChartManager } from './charts.js';
import { NotificationManager } from './notifications.js';

export class StudentDashboardManager {
    #api;
    #charts;
    #notifications;
    #currentStudent = null;

    constructor() {
        this.#api = APIClient.getInstance();
        this.#charts = new ChartManager();
        this.#notifications = NotificationManager.getInstance();
        this.#bindNavigation();
    }

    #bindNavigation() {
        const navLinks = document.getElementById('student-nav-links');
        navLinks?.addEventListener('click', (e) => {
            const btn = e.target.closest('.sub-nav-item');
            if (!btn) return;

            // Remove active from all nav buttons
            navLinks.querySelectorAll('.sub-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.dataset.target;
            document.querySelectorAll('.student-tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });

            const activePane = document.getElementById(targetId);
            activePane?.classList.add('active');

            // Trigger chart layout recalculation on tab switch
            if (targetId === 'std-tab-performance' && this.#currentStudent) {
                this.#renderPerformanceCharts(this.#currentStudent);
            }
        });
    }

    /**
     * Load student data dynamically from SQLite via API.
     * 
     * @param {string} studentId 
     */
    async loadStudentData(studentId) {
        try {
            const data = await this.#api.get(`/students/${studentId}`);
            if (data && data.student) {
                this.#currentStudent = data.student;
                this.renderDashboard(data.student);
            }
        } catch (err) {
            this.#notifications.error(`Failed to load student record: ${err.message}`);
        }
    }

    /**
     * Bind and render student record across all dashboard tabs.
     * 
     * @param {Object} student 
     */
    renderDashboard(student) {
        this.#currentStudent = student;

        // 1. Welcome Card & Metadata
        const nameEl = document.getElementById('std-welcome-name');
        const idEl = document.getElementById('std-card-id');
        const semEl = document.getElementById('std-card-sem');
        if (nameEl) nameEl.textContent = `Welcome, ${student.name}`;
        if (idEl) idEl.textContent = student.student_id;
        if (semEl) semEl.textContent = student.semester;

        // 2. Animated KPI Summary Cards
        const attEl = document.getElementById('std-stat-attendance');
        const pctEl = document.getElementById('std-stat-percentage');
        const gradeEl = document.getElementById('std-stat-grade');
        const gpaEl = document.getElementById('std-stat-gpa');
        const statusEl = document.getElementById('std-stat-status');
        const attSubEl = document.getElementById('std-stat-att-sub');

        if (attEl) attEl.textContent = `${student.attendance}%`;
        if (pctEl) pctEl.textContent = `${student.percentage}%`;
        if (gradeEl) gradeEl.textContent = student.grade;
        if (gpaEl) gpaEl.textContent = `Grade Point: ${student.grade_point} / 10`;
        
        if (statusEl) {
            statusEl.textContent = student.status;
            statusEl.className = `stat-val ${student.status.toUpperCase() === 'PASS' ? 'text-green' : 'text-red'}`;
        }

        if (attSubEl) {
            attSubEl.textContent = student.attendance >= 75
                ? 'Eligible for final examinations'
                : '⚠ Below 75% attendance threshold';
        }

        // 3. Subject Progress Bars (Overview & Marks Tabs)
        this.#renderSubjectBars(student);

        // 4. Circular Attendance Gauge
        this.#renderAttendanceRing(student.attendance);

        // 5. Profile Tab
        this.#renderProfileTab(student);

        // 6. Performance Charts
        this.#renderPerformanceCharts(student);
    }

    #renderSubjectBars(student) {
        const subjects = [
            { name: 'Mathematics', score: student.mathematics, color: '#00d2ff' },
            { name: 'Physics', score: student.physics, color: '#3a86ff' },
            { name: 'Python Programming', score: student.python_programming, color: '#8b5cf6' },
            { name: 'Data Structures', score: student.data_structures, color: '#ec4899' },
            { name: 'English', score: student.english, color: '#00e676' }
        ];

        // Overview Tab Bars
        const overviewContainer = document.getElementById('std-bars-container');
        if (overviewContainer) {
            overviewContainer.innerHTML = subjects.map(s => `
                <div class="subject-bar-row">
                    <div class="subject-bar-labels">
                        <span class="subject-name">${s.name}</span>
                        <span class="subject-score">${s.score} / 100</span>
                    </div>
                    <div class="subject-progress-track">
                        <div class="subject-progress-fill" style="width: 0%; background: ${s.color};" data-target-width="${s.score}%"></div>
                    </div>
                </div>
            `).join('');

            // Trigger animation
            setTimeout(() => {
                overviewContainer.querySelectorAll('.subject-progress-fill').forEach(bar => {
                    bar.style.width = bar.dataset.targetWidth;
                });
            }, 60);
        }

        // Detailed Marks Tab
        const marksList = document.getElementById('marks-tab-list');
        const marksTotal = document.getElementById('marks-tab-total');
        if (marksTotal) marksTotal.textContent = `${student.total_marks} / 500 (${student.percentage}%)`;

        if (marksList) {
            marksList.innerHTML = subjects.map(s => {
                const statusTag = s.score >= 50
                    ? '<span class="badge-status-pill pass">PASS</span>'
                    : '<span class="badge-status-pill fail">FAIL</span>';

                return `
                    <div class="subject-bar-row" style="margin-bottom: 1.5rem; background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-card);">
                        <div class="subject-bar-labels" style="margin-bottom: 0.6rem;">
                            <span class="subject-name" style="font-weight: 600; font-size: 0.95rem;">${s.name}</span>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                ${statusTag}
                                <span class="subject-score" style="font-size: 1.05rem;">${s.score} / 100</span>
                            </div>
                        </div>
                        <div class="subject-progress-track" style="height: 10px;">
                            <div class="subject-progress-fill" style="width: 0%; background: ${s.color};" data-target-width="${s.score}%"></div>
                        </div>
                    </div>
                `;
            }).join('');

            setTimeout(() => {
                marksList.querySelectorAll('.subject-progress-fill').forEach(bar => {
                    bar.style.width = bar.dataset.targetWidth;
                });
            }, 80);
        }
    }

    #renderAttendanceRing(attendance) {
        const ringValue = document.getElementById('att-ring-value');
        const ringBar = document.getElementById('att-ring-bar');
        const statusCard = document.getElementById('att-status-card');
        const statusIcon = document.getElementById('att-status-icon');
        const statusTitle = document.getElementById('att-status-title');
        const statusDesc = document.getElementById('att-status-desc');

        if (ringValue) ringValue.textContent = `${attendance}%`;

        if (ringBar) {
            // Circumference: 2 * Math.PI * 90 ≈ 565.48
            const circumference = 565.48;
            const offset = circumference - (attendance / 100) * circumference;
            setTimeout(() => {
                ringBar.style.strokeDashoffset = offset;
            }, 100);
        }

        if (statusCard) {
            const isEligible = attendance >= 75;
            if (isEligible) {
                statusCard.className = 'attendance-status-card';
                if (statusIcon) statusIcon.textContent = '✓';
                if (statusTitle) statusTitle.textContent = 'Eligible for Final Examinations';
                if (statusDesc) statusDesc.textContent = `Your attendance of ${attendance}% satisfies university regulations.`;
            } else {
                statusCard.className = 'attendance-status-card low';
                if (statusIcon) statusIcon.textContent = '⚠';
                if (statusTitle) statusTitle.textContent = 'Attendance Shortage Alert';
                if (statusDesc) statusDesc.textContent = `Your attendance of ${attendance}% is below the mandatory 75% requirement. Contact the HOD office.`;
            }
        }
    }

    #renderProfileTab(student) {
        const pAvatar = document.getElementById('std-profile-avatar');
        const pHeaderName = document.getElementById('std-profile-name');
        const pHeaderId = document.getElementById('std-profile-id');

        const initials = (student.name || 'S').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        if (pAvatar) pAvatar.textContent = initials;
        if (pHeaderName) pHeaderName.textContent = student.name;
        if (pHeaderId) pHeaderId.textContent = student.student_id;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('p-id', student.student_id);
        set('p-name', student.name);
        set('p-gender', student.gender);
        set('p-branch', student.branch);
        set('p-sem', student.semester);
        set('p-total', `${student.total_marks} / 500`);
        set('p-pct', `${student.percentage}%`);
        set('p-grade', student.grade);
        set('p-gp', `${student.grade_point} / 10`);
        set('p-att', `${student.attendance}%`);

        const pStatus = document.getElementById('p-status');
        if (pStatus) {
            pStatus.textContent = student.status;
            pStatus.className = `val badge-status-pill ${student.status.toUpperCase() === 'PASS' ? 'pass' : 'fail'}`;
        }
    }

    #renderPerformanceCharts(student) {
        // Overview Radar
        this.#charts.renderStudentRadar('chart-student-radar', student);

        // Performance Tab Bar & Radar
        this.#charts.renderStudentBar('chart-student-bar', student);
        this.#charts.renderStudentRadar('chart-student-radar-full', student);
    }
}
