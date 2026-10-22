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
        this.#bindSimulator();
        this.#bindMarksheetModal();
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

        // 7. Initialize What-If Simulator with actual marks
        this.#initSimulator(student);

        // 8. Load Dean's List / Toppers Leaderboard
        this.loadToppersLeaderboard();
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

    // ==============================================================================
    // 7. WHAT-IF ACADEMIC SIMULATOR
    // ==============================================================================
    #bindSimulator() {
        const subjects = ['math', 'physics', 'python', 'ds', 'english'];

        subjects.forEach(sub => {
            const rangeEl = document.getElementById(`sim-range-${sub}`);
            const valEl = document.getElementById(`sim-val-${sub}`);

            rangeEl?.addEventListener('input', () => {
                if (valEl) valEl.value = rangeEl.value;
                this.#updateSimulation();
            });

            valEl?.addEventListener('input', () => {
                let num = parseFloat(valEl.value) || 0;
                if (num < 0) num = 0;
                if (num > 100) num = 100;
                if (rangeEl) rangeEl.value = num;
                this.#updateSimulation();
            });
        });

        // Preset buttons
        document.getElementById('btn-sim-reset')?.addEventListener('click', () => {
            if (this.#currentStudent) this.#initSimulator(this.#currentStudent);
        });

        document.getElementById('btn-sim-target-a-plus')?.addEventListener('click', () => {
            this.#setSimValues(90, 90, 90, 90, 90);
        });

        document.getElementById('btn-sim-target-a')?.addEventListener('click', () => {
            this.#setSimValues(80, 80, 80, 80, 80);
        });
    }

    #setSimValues(m, p, py, ds, eng) {
        const setVal = (sub, val) => {
            const rangeEl = document.getElementById(`sim-range-${sub}`);
            const valEl = document.getElementById(`sim-val-${sub}`);
            if (rangeEl) rangeEl.value = val;
            if (valEl) valEl.value = val;
        };

        setVal('math', m);
        setVal('physics', p);
        setVal('python', py);
        setVal('ds', ds);
        setVal('english', eng);

        this.#updateSimulation();
    }

    #initSimulator(student) {
        this.#setSimValues(
            student.mathematics,
            student.physics,
            student.python_programming,
            student.data_structures,
            student.english
        );
    }

    #updateSimulation() {
        if (!this.#currentStudent) return;

        const getVal = (sub) => parseFloat(document.getElementById(`sim-val-${sub}`)?.value) || 0;
        const m = getVal('math');
        const p = getVal('physics');
        const py = getVal('python');
        const ds = getVal('ds');
        const eng = getVal('english');

        const total = Math.round((m + p + py + ds + eng) * 100) / 100;
        const percentage = Math.round((total / 5) * 100) / 100;

        let grade = 'F';
        let gradePoint = 0.0;
        if (percentage >= 90) { grade = 'A+'; gradePoint = 10.0; }
        else if (percentage >= 80) { grade = 'A'; gradePoint = 9.0; }
        else if (percentage >= 70) { grade = 'B'; gradePoint = 8.0; }
        else if (percentage >= 60) { grade = 'C'; gradePoint = 7.0; }
        else if (percentage >= 50) { grade = 'D'; gradePoint = 6.0; }
        else { grade = 'F'; gradePoint = 0.0; }

        const isPass = m >= 50 && p >= 50 && py >= 50 && ds >= 50 && eng >= 50;
        const status = isPass ? 'PASS' : 'FAIL';

        // Update DOM elements
        const totalEl = document.getElementById('sim-stat-total');
        const pctEl = document.getElementById('sim-stat-pct');
        const gradeEl = document.getElementById('sim-stat-grade');
        const gpaEl = document.getElementById('sim-stat-gpa');
        const statusEl = document.getElementById('sim-stat-status');
        const totalDiffEl = document.getElementById('sim-stat-total-diff');
        const pctDiffEl = document.getElementById('sim-stat-pct-diff');
        const remarksEl = document.getElementById('sim-stat-remarks');

        if (totalEl) totalEl.textContent = `${total} / 500`;
        if (pctEl) pctEl.textContent = `${percentage.toFixed(2)}%`;
        if (gradeEl) gradeEl.textContent = grade;
        if (gpaEl) gpaEl.textContent = `Grade Point: ${gradePoint.toFixed(1)} / 10`;

        if (statusEl) {
            statusEl.textContent = status;
            statusEl.className = `stat-val font-mono ${isPass ? 'text-green' : 'text-red'}`;
        }

        const totalDelta = Math.round((total - this.#currentStudent.total_marks) * 100) / 100;
        const pctDelta = Math.round((percentage - this.#currentStudent.percentage) * 100) / 100;

        if (totalDiffEl) {
            totalDiffEl.textContent = `Delta: ${totalDelta >= 0 ? '+' : ''}${totalDelta} marks`;
            totalDiffEl.style.color = totalDelta >= 0 ? 'var(--status-pass)' : 'var(--status-fail)';
        }

        if (pctDiffEl) {
            pctDiffEl.textContent = `Delta: ${pctDelta >= 0 ? '+' : ''}${pctDelta.toFixed(2)}%`;
            pctDiffEl.style.color = pctDelta >= 0 ? 'var(--status-pass)' : 'var(--status-fail)';
        }

        if (remarksEl) {
            if (percentage >= 90) remarksEl.textContent = '🌟 Potential Gold Medalist / High Distinction!';
            else if (percentage >= 80) remarksEl.textContent = '⭐ Dean’s Honor List Qualified';
            else if (isPass) remarksEl.textContent = '✓ Clear of prerequisites & standing';
            else remarksEl.textContent = '⚠ Subject score below minimum passing threshold (50)';
        }
    }

    // ==============================================================================
    // 8. DEAN'S LIST / TOPPERS LEADERBOARD
    // ==============================================================================
    async loadToppersLeaderboard() {
        const container = document.getElementById('toppers-container');
        if (!container) return;

        try {
            const data = await this.#api.get('/students/toppers?limit=10');
            if (!data || !data.toppers || data.toppers.length === 0) {
                container.innerHTML = `<p style="padding: 1rem; color: var(--text-muted);">No leaderboard records available.</p>`;
                return;
            }

            container.innerHTML = data.toppers.map((t, idx) => {
                let medal = `#${idx + 1}`;
                let rankClass = '';
                if (idx === 0) { medal = '🥇'; rankClass = 'rank-1'; }
                else if (idx === 1) { medal = '🥈'; rankClass = 'rank-2'; }
                else if (idx === 2) { medal = '🥉'; rankClass = 'rank-3'; }

                return `
                    <div class="topper-card animate-card-${(idx % 4) + 1}">
                        <div class="topper-rank-badge ${rankClass}">
                            <span>${medal}</span>
                        </div>
                        <div class="topper-details">
                            <span class="topper-name" title="${t.name}">${t.name}</span>
                            <span class="topper-id font-mono">${t.student_id} • ${t.semester}</span>
                            <span style="font-size: 0.76rem; color: var(--text-muted);">Attendance: ${t.attendance}%</span>
                        </div>
                        <div style="text-align: right;">
                            <div class="topper-score">${t.percentage}%</div>
                            <span class="badge-status-pill pass" style="font-size: 0.72rem; padding: 2px 6px;">${t.grade}</span>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Failed to load toppers leaderboard:', err);
        }
    }

    // ==============================================================================
    // 9. OFFICIAL MARKSHEET / GRADE CARD MODAL & PRINTING
    // ==============================================================================
    #bindMarksheetModal() {
        // Button in Welcome Card
        document.getElementById('btn-print-official-marksheet')?.addEventListener('click', () => {
            if (this.#currentStudent) this.openOfficialMarksheet(this.#currentStudent);
        });

        // Close handlers
        const modal = document.getElementById('modal-official-marksheet');
        const backdrop = document.getElementById('modal-backdrop');
        const closeModal = () => {
            modal?.classList.add('hidden');
            backdrop?.classList.add('hidden');
        };

        document.getElementById('btn-close-marksheet-modal')?.addEventListener('click', closeModal);
        document.getElementById('btn-close-marksheet-footer')?.addEventListener('click', closeModal);

        // Print button inside modal
        document.getElementById('btn-trigger-print-doc')?.addEventListener('click', () => {
            window.print();
        });

        // Leaderboard refresh button
        document.getElementById('btn-refresh-toppers')?.addEventListener('click', () => {
            this.loadToppersLeaderboard();
        });
    }

    openOfficialMarksheet(student) {
        const container = document.getElementById('marksheet-document-container');
        const modal = document.getElementById('modal-official-marksheet');
        const backdrop = document.getElementById('modal-backdrop');

        if (!container || !student) return;

        const subjects = [
            { code: 'CS101', name: 'Mathematics for Computing', score: student.mathematics },
            { code: 'CS102', name: 'Applied Engineering Physics', score: student.physics },
            { code: 'CS103', name: 'Python Programming & Problem Solving', score: student.python_programming },
            { code: 'CS104', name: 'Data Structures & Algorithms', score: student.data_structures },
            { code: 'CS105', name: 'Professional English & Technical Writing', score: student.english }
        ];

        const computeSubGrade = (score) => {
            if (score >= 90) return { grade: 'A+', gp: 10.0, status: 'PASS' };
            if (score >= 80) return { grade: 'A', gp: 9.0, status: 'PASS' };
            if (score >= 70) return { grade: 'B', gp: 8.0, status: 'PASS' };
            if (score >= 60) return { grade: 'C', gp: 7.0, status: 'PASS' };
            if (score >= 50) return { grade: 'D', gp: 6.0, status: 'PASS' };
            return { grade: 'F', gp: 0.0, status: 'FAIL' };
        };

        const rowsHtml = subjects.map(s => {
            const g = computeSubGrade(s.score);
            return `
                <tr>
                    <td class="font-mono" style="font-weight: 600;">${s.code}</td>
                    <td>${s.name}</td>
                    <td style="text-align: center;">100</td>
                    <td style="text-align: center; font-weight: 700; font-family: var(--font-mono);">${s.score}</td>
                    <td style="text-align: center; font-weight: 700;">${g.grade}</td>
                    <td style="text-align: center; font-family: var(--font-mono);">${g.gp.toFixed(1)}</td>
                    <td style="text-align: center; font-weight: 700; color: ${g.status === 'PASS' ? '#059669' : '#dc2626'}">${g.status}</td>
                </tr>
            `;
        }).join('');

        const division = student.percentage >= 70
            ? 'First Class with Distinction'
            : (student.percentage >= 60 ? 'First Class' : 'Second Class');

        const nowFormatted = new Date().toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        container.innerHTML = `
            <div id="official-marksheet-printable" class="marksheet-card-paper">
                <div class="marksheet-header-block">
                    <img src="./assets/aditya-university-logo.png" alt="Aditya University Logo" class="marksheet-logo-img">
                    <div class="marksheet-title-main">ADITYA UNIVERSITY</div>
                    <div class="marksheet-sub-title">DEPARTMENT OF COMPUTER SCIENCE &amp; ENGINEERING</div>
                    <div style="font-size: 0.96rem; font-weight: 850; color: #003b71; margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase;">
                        OFFICIAL SEMESTER GRADE CARD &amp; ACADEMIC TRANSCRIPT
                    </div>
                    <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                        Autonomous Institution • Approved by AICTE • NAAC 'A++' Accredited • ADB Road, Surampalem, AP
                    </div>
                </div>

                <div class="marksheet-meta-grid">
                    <div><strong>Student Full Name:</strong> ${student.name}</div>
                    <div><strong>University Roll No:</strong> <span class="font-mono">${student.student_id}</span></div>
                    <div><strong>Degree / Program:</strong> Bachelor of Technology (B.Tech)</div>
                    <div><strong>Department &amp; Branch:</strong> CSE (Computer Science &amp; Engineering)</div>
                    <div><strong>Academic Semester:</strong> ${student.semester}</div>
                    <div><strong>Gender:</strong> ${student.gender}</div>
                    <div><strong>Attendance Tracked:</strong> ${student.attendance}% (${student.attendance >= 75 ? 'Satisfactory' : 'Shortage'})</div>
                    <div><strong>Issue Date:</strong> ${nowFormatted}</div>
                </div>

                <table class="marksheet-table">
                    <thead>
                        <tr>
                            <th style="width: 12%;">Course Code</th>
                            <th>Course Title</th>
                            <th style="width: 12%; text-align: center;">Max Marks</th>
                            <th style="width: 14%; text-align: center;">Marks Awarded</th>
                            <th style="width: 10%; text-align: center;">Grade</th>
                            <th style="width: 12%; text-align: center;">Grade Point</th>
                            <th style="width: 10%; text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #003b71;">
                            <td colspan="2">AGGREGATE SCORE &amp; FINAL RESULT</td>
                            <td style="text-align: center;">500</td>
                            <td style="text-align: center; color: #003b71; font-family: var(--font-mono); font-size: 0.95rem;">${student.total_marks}</td>
                            <td style="text-align: center;">${student.grade}</td>
                            <td style="text-align: center; font-family: var(--font-mono);">${student.grade_point}</td>
                            <td style="text-align: center; color: ${student.status === 'PASS' ? '#059669' : '#dc2626'}">${student.status}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="display: flex; justify-content: space-between; align-items: center; background: #fffaf0; border: 1px dashed #f26522; padding: 10px 16px; border-radius: 6px; font-size: 0.85rem; margin-top: 0.8rem;">
                    <div><strong>Aggregate Percentage:</strong> <span style="color: #f26522; font-weight: 800; font-family: var(--font-mono);">${student.percentage}%</span></div>
                    <div><strong>Semester Grade Point Average (SGPA):</strong> <span style="color: #003b71; font-weight: 800; font-family: var(--font-mono);">${student.grade_point} / 10.0</span></div>
                    <div><strong>Division Awarded:</strong> <strong>${division}</strong></div>
                </div>

                <div class="marksheet-footer-signatures">
                    <div style="text-align: center;">
                        <div style="height: 38px;"></div>
                        <div style="border-top: 1px solid #334155; width: 160px; padding-top: 4px;">Student Signature</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-family: cursive; font-size: 1.1rem; color: #003b71; height: 38px; line-height: 38px;">AU Exam Cell</div>
                        <div style="border-top: 1px solid #334155; width: 180px; padding-top: 4px;">Verified by Section In-charge</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-family: serif; font-size: 1.1rem; font-weight: bold; color: #003b71; height: 38px; line-height: 38px;">Dr. S. K. Rao</div>
                        <div style="border-top: 1px solid #334155; width: 200px; padding-top: 4px;">Controller of Examinations</div>
                    </div>
                </div>
            </div>
        `;

        modal?.classList.remove('hidden');
        backdrop?.classList.remove('hidden');
    }
}

