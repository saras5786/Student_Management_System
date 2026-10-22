// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & ADMIN WORKFLOW CONTROLLER
// File: public/js/admin.js
// 
// Manages the complete administrative suite:
// - Live data table with search, multi-filtering, sorting, and pagination.
// - Modals for Add, Edit, View, and Delete operations.
// - Real-time client-side AcademicCalculator preview matching backend logic.
// - Dynamic Chart.js analytics and animated KPI counters (0 -> 500).
// - CSV batch import and dynamic snapshot export.
// - Audit log inspections.
// ==============================================================================

import { APIClient } from './api.js';
import { ChartManager } from './charts.js';
import { NotificationManager } from './notifications.js';

export class AdminDashboardManager {
    #api;
    #charts;
    #notifications;

    // Table state
    #currentPage = 1;
    #limit = 20;
    #search = '';
    #semester = '';
    #gender = '';
    #grade = '';
    #status = '';
    #sortBy = 'student_id';
    #sortOrder = 'ASC';
    #searchDebounceTimer = null;

    // Delete target buffer
    #studentToDelete = null;

    // View scorecard buffer
    #currentViewedStudent = null;

    constructor() {
        this.#api = APIClient.getInstance();
        this.#charts = new ChartManager();
        this.#notifications = NotificationManager.getInstance();

        this.#bindSidebar();
        this.#bindFilters();
        this.#bindStudentModals();
        this.#bindCSVModals();
    }

    /**
     * Initialize administrator views and load dashboard data.
     */
    async initialize() {
        await Promise.all([
            this.loadDashboardStats(),
            this.loadStudentsTable()
        ]);
    }

    // ==============================================================================
    // 1. SIDEBAR & NAVIGATION
    // ==============================================================================
    #bindSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        const toggleBtn = document.getElementById('btn-toggle-sidebar');

        toggleBtn?.addEventListener('click', () => {
            sidebar?.classList.toggle('collapsed');
        });

        // Navigation tab buttons
        document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetViewId = btn.dataset.view;
                if (!targetViewId) return;

                document.querySelectorAll('.sidebar-nav .nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.admin-pane').forEach(p => p.classList.remove('active'));
                const activePane = document.getElementById(targetViewId);
                activePane?.classList.add('active');

                if (targetViewId === 'admin-tab-analytics') {
                    this.loadAnalytics();
                } else if (targetViewId === 'admin-tab-audit') {
                    this.loadAuditLogs();
                } else if (targetViewId === 'admin-tab-dashboard') {
                    this.loadDashboardStats();
                } else if (targetViewId === 'admin-tab-students') {
                    this.loadStudentsTable();
                }
            });
        });

        // Quick add buttons
        document.getElementById('btn-sidebar-add-student')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('btn-dash-add-student')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('btn-open-add-student')?.addEventListener('click', () => this.openAddModal());

        // CSV export buttons
        document.getElementById('btn-sidebar-export')?.addEventListener('click', () => this.handleExportCSV());
        document.getElementById('btn-dash-export')?.addEventListener('click', () => this.handleExportCSV());

        // CSV import button
        document.getElementById('btn-sidebar-import')?.addEventListener('click', () => this.openImportModal());
    }

    // ==============================================================================
    // 2. DASHBOARD KPI METRICS & COUNTERS
    // ==============================================================================
    async loadDashboardStats() {
        try {
            const data = await this.#api.get('/analytics');
            if (data && data.analytics) {
                const kpis = data.analytics.kpis;
                
                // Smooth Count-Up Animation (e.g., 0 -> 500)
                this.#animateCounter('kpi-total-students', kpis.totalStudents || 0);
                this.#animateCounter('kpi-pass-count', kpis.passCount || 0);
                this.#animateCounter('kpi-fail-count', kpis.failCount || 0);

                const avgPct = document.getElementById('kpi-avg-percentage');
                if (avgPct) avgPct.textContent = `${kpis.avgPercentage}%`;

                const avgAtt = document.getElementById('kpi-avg-attendance');
                if (avgAtt) avgAtt.textContent = `${kpis.avgAttendance}%`;

                const passRate = document.getElementById('kpi-pass-rate');
                if (passRate) passRate.textContent = `${kpis.passRate}% Pass Rate`;

                // Render Dashboard Quick Charts
                this.#charts.renderGradeDistribution('chart-admin-grades', data.analytics.gradeDistribution);
                this.#charts.renderSemesterDistribution('chart-admin-semesters', data.analytics.semesterDistribution);
            }
        } catch (err) {
            console.error('Failed to load dashboard metrics:', err);
        }
    }

    #animateCounter(elementId, targetValue, duration = 1200) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const start = 0;
        const startTime = performance.now();

        const step = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(start + (targetValue - start) * easeProgress);

            el.textContent = currentVal.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = targetValue.toLocaleString();
            }
        };

        requestAnimationFrame(step);
    }

    // ==============================================================================
    // 3. STUDENT TABLE, LIVE SEARCH, FILTERS & PAGINATION
    // ==============================================================================
    #bindFilters() {
        const searchInput = document.getElementById('filter-search');
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(this.#searchDebounceTimer);
            this.#searchDebounceTimer = setTimeout(() => {
                this.#search = e.target.value.trim();
                this.#currentPage = 1;
                this.loadStudentsTable();
            }, 250);
        });

        const semSelect = document.getElementById('filter-semester');
        semSelect?.addEventListener('change', (e) => {
            this.#semester = e.target.value;
            this.#currentPage = 1;
            this.loadStudentsTable();
        });

        const genderSelect = document.getElementById('filter-gender');
        genderSelect?.addEventListener('change', (e) => {
            this.#gender = e.target.value;
            this.#currentPage = 1;
            this.loadStudentsTable();
        });

        const gradeSelect = document.getElementById('filter-grade');
        gradeSelect?.addEventListener('change', (e) => {
            this.#grade = e.target.value;
            this.#currentPage = 1;
            this.loadStudentsTable();
        });

        const statusSelect = document.getElementById('filter-status');
        statusSelect?.addEventListener('change', (e) => {
            this.#status = e.target.value;
            this.#currentPage = 1;
            this.loadStudentsTable();
        });

        // Quick filter preset pills
        document.querySelectorAll('.filter-presets-bar .preset-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                document.querySelectorAll('.filter-presets-bar .preset-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                const preset = pill.dataset.preset;

                // Clear input elements first
                if (searchInput) searchInput.value = '';
                if (semSelect) semSelect.value = '';
                if (genderSelect) genderSelect.value = '';
                if (gradeSelect) gradeSelect.value = '';
                if (statusSelect) statusSelect.value = '';

                this.#search = '';
                this.#semester = '';
                this.#gender = '';
                this.#grade = '';
                this.#status = '';

                if (preset === 'toppers') {
                    if (gradeSelect) gradeSelect.value = 'A+';
                    this.#grade = 'A+';
                    this.#sortBy = 'percentage';
                    this.#sortOrder = 'DESC';
                } else if (preset === 'low-attendance') {
                    this.#sortBy = 'attendance';
                    this.#sortOrder = 'ASC';
                } else if (preset === 'fail') {
                    if (statusSelect) statusSelect.value = 'FAIL';
                    this.#status = 'FAIL';
                    this.#sortBy = 'percentage';
                    this.#sortOrder = 'ASC';
                } else if (preset === 'pass') {
                    if (statusSelect) statusSelect.value = 'PASS';
                    this.#status = 'PASS';
                    this.#sortBy = 'percentage';
                    this.#sortOrder = 'DESC';
                } else {
                    this.#sortBy = 'student_id';
                    this.#sortOrder = 'ASC';
                }

                this.#currentPage = 1;
                this.loadStudentsTable();
            });
        });

        document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (semSelect) semSelect.value = '';
            if (genderSelect) genderSelect.value = '';
            if (gradeSelect) gradeSelect.value = '';
            if (statusSelect) statusSelect.value = '';

            document.querySelectorAll('.filter-presets-bar .preset-pill').forEach(p => p.classList.remove('active'));
            document.querySelector('.filter-presets-bar .preset-pill[data-preset="all"]')?.classList.add('active');

            this.#search = '';
            this.#semester = '';
            this.#gender = '';
            this.#grade = '';
            this.#status = '';
            this.#sortBy = 'student_id';
            this.#sortOrder = 'ASC';
            this.#currentPage = 1;
            this.loadStudentsTable();
        });

        // Page size selector
        document.getElementById('select-page-size')?.addEventListener('change', (e) => {
            this.#limit = parseInt(e.target.value) || 20;
            this.#currentPage = 1;
            this.loadStudentsTable();
        });

        // Column sort headers
        document.querySelectorAll('#table-students th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (this.#sortBy === col) {
                    this.#sortOrder = this.#sortOrder === 'ASC' ? 'DESC' : 'ASC';
                } else {
                    this.#sortBy = col;
                    this.#sortOrder = 'ASC';
                }

                // Update sort icons
                document.querySelectorAll('#table-students th.sortable .sort-icon').forEach(icon => {
                    icon.textContent = '↕';
                });
                const currentIcon = th.querySelector('.sort-icon');
                if (currentIcon) {
                    currentIcon.textContent = this.#sortOrder === 'ASC' ? '↑' : '↓';
                }

                this.loadStudentsTable();
            });
        });
    }

    async loadStudentsTable() {
        const tbody = document.getElementById('students-table-body');
        if (!tbody) return;

        try {
            const params = {
                page: this.#currentPage,
                limit: this.#limit,
                search: this.#search,
                semester: this.#semester,
                gender: this.#gender,
                grade: this.#grade,
                status: this.#status,
                sortBy: this.#sortBy,
                sortOrder: this.#sortOrder
            };

            const data = await this.#api.get('/students', params);

            if (!data.students || data.students.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                            No students match the current filter criteria.
                        </td>
                    </tr>
                `;
                this.#renderPagination(data.pagination || { total: 0, page: 1, limit: this.#limit, totalPages: 1 });
                return;
            }

            tbody.innerHTML = data.students.map(s => {
                const statusClass = s.status.toUpperCase() === 'PASS' ? 'pass' : 'fail';
                return `
                    <tr>
                        <td class="font-mono text-cyan" style="font-weight: 600;">${s.student_id}</td>
                        <td style="font-weight: 600;">${s.name}</td>
                        <td>${s.gender}</td>
                        <td>${s.branch}</td>
                        <td>${s.semester}</td>
                        <td class="font-mono">${s.attendance}%</td>
                        <td class="font-mono">${s.percentage}%</td>
                        <td><strong>${s.grade}</strong></td>
                        <td class="font-mono">${s.grade_point}</td>
                        <td><span class="badge-status-pill ${statusClass}">${s.status}</span></td>
                        <td class="text-right">
                            <div class="table-action-btns">
                                <button class="btn-icon-action btn-view-student" data-id="${s.student_id}" title="View Scorecard">View</button>
                                <button class="btn-icon-action btn-edit-student" data-id="${s.student_id}" title="Edit Record">Edit</button>
                                <button class="btn-icon-action delete btn-delete-student" data-id="${s.student_id}" data-name="${s.name}" title="Delete Student">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            // Attach action handlers
            tbody.querySelectorAll('.btn-view-student').forEach(b => {
                b.addEventListener('click', () => this.handleViewStudent(b.dataset.id));
            });
            tbody.querySelectorAll('.btn-edit-student').forEach(b => {
                b.addEventListener('click', () => this.handleEditStudent(b.dataset.id));
            });
            tbody.querySelectorAll('.btn-delete-student').forEach(b => {
                b.addEventListener('click', () => this.handleDeletePrompt(b.dataset.id, b.dataset.name));
            });

            this.#renderPagination(data.pagination);
        } catch (err) {
            this.#notifications.error(`Failed to load student records: ${err.message}`);
        }
    }

    #renderPagination(pagination) {
        const showingEl = document.getElementById('page-showing-text');
        const controlsEl = document.getElementById('pagination-controls');
        if (!controlsEl) return;

        const { total, page, limit, totalPages, from, to } = pagination;
        if (showingEl) {
            showingEl.textContent = total > 0 ? `Showing ${from}–${to} of ${total}` : 'Showing 0 records';
        }

        let html = '';

        // Previous button
        html += `<button class="btn-page" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">‹ Prev</button>`;

        // Smart pagination range
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);

        if (startPage > 1) {
            html += `<button class="btn-page" data-page="1">1</button>`;
            if (startPage > 2) html += `<span style="padding: 6px; color: var(--text-muted);">…</span>`;
        }

        for (let p = startPage; p <= endPage; p++) {
            html += `<button class="btn-page ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span style="padding: 6px; color: var(--text-muted);">…</span>`;
            html += `<button class="btn-page" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        html += `<button class="btn-page" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">Next ›</button>`;

        controlsEl.innerHTML = html;

        controlsEl.querySelectorAll('.btn-page').forEach(b => {
            b.addEventListener('click', () => {
                if (!b.disabled && b.dataset.page) {
                    this.#currentPage = parseInt(b.dataset.page);
                    this.loadStudentsTable();
                }
            });
        });
    }

    // ==============================================================================
    // 4. ADD / EDIT STUDENT MODAL LOGIC & ACADEMIC CALCULATOR PREVIEW
    // ==============================================================================
    #bindStudentModals() {
        const modal = document.getElementById('modal-student-form');
        const backdrop = document.getElementById('modal-backdrop');
        const closeBtn = document.getElementById('btn-close-student-modal');
        const cancelBtn = document.getElementById('btn-cancel-student-modal');
        const form = document.getElementById('form-student-mutation');

        const closeModal = () => {
            modal?.classList.add('hidden');
            backdrop?.classList.add('hidden');
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        // Real-time calculation preview when typing marks
        const markInputs = document.querySelectorAll('.mark-input');
        markInputs.forEach(input => {
            input.addEventListener('input', () => this.#updateLiveAcademicPreview());
        });

        // Form submission (Add or Edit)
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.#handleSaveStudent();
        });

        // Delete Modal bindings
        document.getElementById('btn-close-delete-modal')?.addEventListener('click', () => this.#closeDeleteModal());
        document.getElementById('btn-cancel-delete')?.addEventListener('click', () => this.#closeDeleteModal());
        document.getElementById('btn-confirm-delete')?.addEventListener('click', () => this.#executeDeleteStudent());

        // View Scorecard Modal bindings
        document.getElementById('btn-close-view-modal')?.addEventListener('click', () => {
            document.getElementById('modal-view-student')?.classList.add('hidden');
            backdrop?.classList.add('hidden');
        });
        document.getElementById('btn-close-view-student')?.addEventListener('click', () => {
            document.getElementById('modal-view-student')?.classList.add('hidden');
            backdrop?.classList.add('hidden');
        });

        // View Scorecard -> Print Marksheet binding
        document.getElementById('btn-view-print-transcript')?.addEventListener('click', () => {
            if (this.#currentViewedStudent) {
                document.getElementById('modal-view-student')?.classList.add('hidden');
                this.#openMarksheetForStudent(this.#currentViewedStudent);
            }
        });
    }

    /**
     * Client-side AcademicCalculator implementation (Abstraction)
     * Matches backend AcademicCalculator.js logic.
     */
    #updateLiveAcademicPreview() {
        const math = parseFloat(document.getElementById('inp-math')?.value) || 0;
        const physics = parseFloat(document.getElementById('inp-physics')?.value) || 0;
        const python = parseFloat(document.getElementById('inp-python')?.value) || 0;
        const ds = parseFloat(document.getElementById('inp-ds')?.value) || 0;
        const english = parseFloat(document.getElementById('inp-english')?.value) || 0;

        const total = Math.round((math + physics + python + ds + english) * 10) / 10;
        const percentage = Math.round((total / 5) * 100) / 100;

        let grade = 'F';
        let gp = 0;
        if (percentage >= 90) { grade = 'A+'; gp = 10; }
        else if (percentage >= 80) { grade = 'A'; gp = 9; }
        else if (percentage >= 70) { grade = 'B'; gp = 8; }
        else if (percentage >= 60) { grade = 'C'; gp = 7; }
        else if (percentage >= 50) { grade = 'D'; gp = 6; }
        else { grade = 'F'; gp = 0; }

        const status = percentage >= 50 ? 'PASS' : 'FAIL';

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('prev-total', `${total} / 500`);
        set('prev-percentage', `${percentage}%`);
        set('prev-grade', grade);
        set('prev-gp', `${gp} / 10`);
        set('prev-status', status);
    }

    openAddModal() {
        const modal = document.getElementById('modal-student-form');
        const backdrop = document.getElementById('modal-backdrop');
        const title = document.getElementById('modal-form-title');
        const isEditInp = document.getElementById('form-is-edit');
        const idInp = document.getElementById('inp-student-id');

        if (title) title.textContent = 'Add New Student';
        if (isEditInp) isEditInp.value = '0';
        if (idInp) {
            idInp.disabled = false;
            idInp.value = '';
        }

        // Reset form inputs
        document.getElementById('inp-name').value = '';
        document.getElementById('inp-gender').value = 'Male';
        document.getElementById('inp-branch').value = 'CSE';
        document.getElementById('inp-semester').value = 'Semester 1';
        document.getElementById('inp-attendance').value = '';
        document.getElementById('inp-math').value = '';
        document.getElementById('inp-physics').value = '';
        document.getElementById('inp-python').value = '';
        document.getElementById('inp-ds').value = '';
        document.getElementById('inp-english').value = '';

        this.#updateLiveAcademicPreview();

        modal?.classList.remove('hidden');
        backdrop?.classList.remove('hidden');
    }

    async handleEditStudent(studentId) {
        try {
            const data = await this.#api.get(`/students/${studentId}`);
            if (!data || !data.student) return;

            const s = data.student;
            const modal = document.getElementById('modal-student-form');
            const backdrop = document.getElementById('modal-backdrop');
            const title = document.getElementById('modal-form-title');
            const isEditInp = document.getElementById('form-is-edit');
            const idInp = document.getElementById('inp-student-id');

            if (title) title.textContent = `Edit Student (${s.student_id})`;
            if (isEditInp) isEditInp.value = '1';
            if (idInp) {
                idInp.value = s.student_id;
                idInp.disabled = true; // Student ID immutable on edit
            }

            document.getElementById('inp-name').value = s.name;
            document.getElementById('inp-gender').value = s.gender;
            document.getElementById('inp-branch').value = s.branch;
            document.getElementById('inp-semester').value = s.semester;
            document.getElementById('inp-attendance').value = s.attendance;
            document.getElementById('inp-math').value = s.mathematics;
            document.getElementById('inp-physics').value = s.physics;
            document.getElementById('inp-python').value = s.python_programming;
            document.getElementById('inp-ds').value = s.data_structures;
            document.getElementById('inp-english').value = s.english;

            this.#updateLiveAcademicPreview();

            modal?.classList.remove('hidden');
            backdrop?.classList.remove('hidden');
        } catch (err) {
            this.#notifications.error(`Failed to load student details: ${err.message}`);
        }
    }

    async #handleSaveStudent() {
        const isEdit = document.getElementById('form-is-edit')?.value === '1';
        const studentId = document.getElementById('inp-student-id')?.value.trim().toLowerCase();
        const btn = document.getElementById('btn-save-student');

        const payload = {
            student_id: studentId,
            name: document.getElementById('inp-name')?.value.trim(),
            gender: document.getElementById('inp-gender')?.value,
            branch: document.getElementById('inp-branch')?.value.trim(),
            semester: document.getElementById('inp-semester')?.value,
            attendance: parseFloat(document.getElementById('inp-attendance')?.value),
            mathematics: parseFloat(document.getElementById('inp-math')?.value),
            physics: parseFloat(document.getElementById('inp-physics')?.value),
            python_programming: parseFloat(document.getElementById('inp-python')?.value),
            data_structures: parseFloat(document.getElementById('inp-ds')?.value),
            english: parseFloat(document.getElementById('inp-english')?.value)
        };

        const btnText = btn?.querySelector('.btn-text');
        const spinner = btn?.querySelector('.spinner');
        if (btn) btn.disabled = true;
        btnText?.classList.add('hidden');
        spinner?.classList.remove('hidden');

        try {
            if (isEdit) {
                await this.#api.put(`/students/${studentId}`, payload);
                this.#notifications.success(`✓ Student "${payload.name}" updated successfully!`);
            } else {
                await this.#api.post('/students', payload);
                this.#notifications.success(`✓ Student "${payload.name}" added successfully!`);
            }

            // Close modal
            document.getElementById('modal-student-form')?.classList.add('hidden');
            document.getElementById('modal-backdrop')?.classList.add('hidden');

            // Refresh table and live stats without reloading browser
            await Promise.all([
                this.loadStudentsTable(),
                this.loadDashboardStats()
            ]);
        } catch (err) {
            this.#notifications.error(err.message || 'Error saving student record.');
        } finally {
            if (btn) btn.disabled = false;
            btnText?.classList.remove('hidden');
            spinner?.classList.add('hidden');
        }
    }

    // ==============================================================================
    // 5. VIEW SCORECARD MODAL
    // ==============================================================================
    async handleViewStudent(studentId) {
        try {
            const data = await this.#api.get(`/students/${studentId}`);
            if (!data || !data.student) return;

            const s = data.student;
            this.#currentViewedStudent = s;
            const body = document.getElementById('view-student-modal-body');
            const modal = document.getElementById('modal-view-student');
            const backdrop = document.getElementById('modal-backdrop');

            if (body) {
                body.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-card);">
                        <div style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, var(--aditya-orange), var(--aditya-navy)); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: bold; color: white; box-shadow: 0 4px 10px rgba(242,101,34,0.3);">
                            ${(s.name || 'S').charAt(0)}
                        </div>
                        <div>
                            <h3 style="font-size: 1.25rem; color: var(--aditya-navy); font-weight: 800;">${s.name}</h3>
                            <span class="font-mono text-orange" style="font-size: 0.9rem; font-weight: 700;">${s.student_id}</span> • <span>${s.semester}</span> • <span class="badge-tag">CSE</span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.2rem;">
                        <div class="stat-card glass-panel" style="padding: 12px 14px; background: #ffffff;">
                            <span class="stat-title">Attendance</span>
                            <div class="stat-val font-mono" style="font-size: 1.4rem; color: ${s.attendance >= 75 ? 'var(--status-pass)' : 'var(--status-fail)'};">${s.attendance}%</div>
                            <div class="stat-sub">${s.attendance >= 75 ? 'Eligible for Exams' : 'Attendance Shortage'}</div>
                        </div>
                        <div class="stat-card glass-panel" style="padding: 12px 14px; background: #ffffff;">
                            <span class="stat-title">Overall Percentage</span>
                            <div class="stat-val font-mono text-orange" style="font-size: 1.4rem;">${s.percentage}%</div>
                            <div class="stat-sub">Grade ${s.grade} (${s.grade_point} GP)</div>
                        </div>
                    </div>

                    <h4 style="font-size: 0.9rem; color: var(--aditya-navy); font-weight: 750; margin-bottom: 0.8rem;">Core Subject Breakdown:</h4>
                    <div class="details-table" style="font-size: 0.88rem;">
                        <div class="detail-row"><span class="lbl">Mathematics:</span><span class="val font-mono">${s.mathematics} / 100</span></div>
                        <div class="detail-row"><span class="lbl">Physics:</span><span class="val font-mono">${s.physics} / 100</span></div>
                        <div class="detail-row"><span class="lbl">Python Programming:</span><span class="val font-mono">${s.python_programming} / 100</span></div>
                        <div class="detail-row"><span class="lbl">Data Structures:</span><span class="val font-mono">${s.data_structures} / 100</span></div>
                        <div class="detail-row"><span class="lbl">English:</span><span class="val font-mono">${s.english} / 100</span></div>
                        <div class="detail-row" style="margin-top: 6px; font-weight: bold; border-top: 1px solid #cbd5e1; padding-top: 6px;"><span class="lbl">Total Marks:</span><span class="val font-mono text-orange">${s.total_marks} / 500</span></div>
                        <div class="detail-row"><span class="lbl">Letter Grade:</span><span class="val font-mono"><strong>${s.grade}</strong> (SGPA: ${s.grade_point})</span></div>
                        <div class="detail-row"><span class="lbl">Academic Status:</span><span class="val badge-status-pill ${s.status.toUpperCase() === 'PASS' ? 'pass' : 'fail'}">${s.status}</span></div>
                    </div>
                `;
            }

            modal?.classList.remove('hidden');
            backdrop?.classList.remove('hidden');
        } catch (err) {
            this.#notifications.error(`Failed to load student scorecard: ${err.message}`);
        }
    }

    #openMarksheetForStudent(student) {
        const container = document.getElementById('marksheet-document-container');
        const marksheetModal = document.getElementById('modal-official-marksheet');
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

        marksheetModal?.classList.remove('hidden');
        backdrop?.classList.remove('hidden');
    }

    // ==============================================================================
    // 6. DELETE STUDENT CONFIRMATION
    // ==============================================================================
    handleDeletePrompt(studentId, studentName) {
        this.#studentToDelete = studentId;
        const modal = document.getElementById('modal-delete-confirm');
        const backdrop = document.getElementById('modal-backdrop');
        const idSpan = document.getElementById('del-student-id');
        const nameStrong = document.getElementById('del-student-name');

        if (idSpan) idSpan.textContent = studentId;
        if (nameStrong) nameStrong.textContent = studentName || '';

        modal?.classList.remove('hidden');
        backdrop?.classList.remove('hidden');
    }

    #closeDeleteModal() {
        this.#studentToDelete = null;
        document.getElementById('modal-delete-confirm')?.classList.add('hidden');
        document.getElementById('modal-backdrop')?.classList.add('hidden');
    }

    async #executeDeleteStudent() {
        if (!this.#studentToDelete) return;

        const btn = document.getElementById('btn-confirm-delete');
        const btnText = btn?.querySelector('.btn-text');
        const spinner = btn?.querySelector('.spinner');

        if (btn) btn.disabled = true;
        btnText?.classList.add('hidden');
        spinner?.classList.remove('hidden');

        try {
            await this.#api.delete(`/students/${this.#studentToDelete}`);
            this.#notifications.success(`Student ${this.#studentToDelete} deleted successfully.`);
            this.#closeDeleteModal();

            await Promise.all([
                this.loadStudentsTable(),
                this.loadDashboardStats()
            ]);
        } catch (err) {
            this.#notifications.error(err.message || 'Failed to delete student.');
        } finally {
            if (btn) btn.disabled = false;
            btnText?.classList.remove('hidden');
            spinner?.classList.add('hidden');
        }
    }

    // ==============================================================================
    // 7. CSV IMPORT & EXPORT
    // ==============================================================================
    #bindCSVModals() {
        const modal = document.getElementById('modal-csv-import');
        const backdrop = document.getElementById('modal-backdrop');
        const closeBtn = document.getElementById('btn-close-import-modal');
        const cancelBtn = document.getElementById('btn-cancel-import');
        const fileInput = document.getElementById('csv-file-input');
        const dropZone = document.getElementById('csv-drop-zone');
        const executeBtn = document.getElementById('btn-execute-import');
        const fileNameEl = document.getElementById('selected-file-name');

        let selectedFile = null;

        const closeImportModal = () => {
            modal?.classList.add('hidden');
            backdrop?.classList.add('hidden');
            selectedFile = null;
            if (fileInput) fileInput.value = '';
            if (fileNameEl) fileNameEl.textContent = '';
            if (executeBtn) executeBtn.disabled = true;
            document.getElementById('import-summary-box')?.classList.add('hidden');
        };

        closeBtn?.addEventListener('click', closeImportModal);
        cancelBtn?.addEventListener('click', closeImportModal);

        // File selection
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                selectedFile = e.target.files[0];
                if (fileNameEl) fileNameEl.textContent = `Selected: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
                if (executeBtn) executeBtn.disabled = false;
            }
        });

        // Drag & drop
        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone?.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                selectedFile = e.dataTransfer.files[0];
                if (fileNameEl) fileNameEl.textContent = `Selected: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
                if (executeBtn) executeBtn.disabled = false;
            }
        });

        // Execute import
        executeBtn?.addEventListener('click', async () => {
            if (!selectedFile) return;

            const btnText = executeBtn.querySelector('.btn-text');
            const spinner = executeBtn.querySelector('.spinner');
            executeBtn.disabled = true;
            btnText?.classList.add('hidden');
            spinner?.classList.remove('hidden');

            const formData = new FormData();
            formData.append('file', selectedFile);

            try {
                const res = await this.#api.upload('/import', formData);
                this.#notifications.success(res.message || 'CSV imported successfully!');

                const summaryBox = document.getElementById('import-summary-box');
                if (summaryBox && res.summary) {
                    summaryBox.classList.remove('hidden');
                    document.getElementById('imp-proc').textContent = res.summary.processed;
                    document.getElementById('imp-added').textContent = res.summary.added;
                    document.getElementById('imp-upd').textContent = res.summary.updated;
                    document.getElementById('imp-err').textContent = res.summary.errors;

                    const errList = document.getElementById('import-errors-list');
                    if (errList && res.summary.errorDetails) {
                        errList.innerHTML = res.summary.errorDetails.map(err => `<li>${err}</li>`).join('');
                    }
                }

                await Promise.all([
                    this.loadStudentsTable(),
                    this.loadDashboardStats()
                ]);
            } catch (err) {
                this.#notifications.error(err.message || 'CSV import failed.');
            } finally {
                executeBtn.disabled = false;
                btnText?.classList.remove('hidden');
                spinner?.classList.add('hidden');
            }
        });
    }

    openImportModal() {
        const modal = document.getElementById('modal-csv-import');
        const backdrop = document.getElementById('modal-backdrop');
        modal?.classList.remove('hidden');
        backdrop?.classList.remove('hidden');
    }

    async handleExportCSV() {
        try {
            this.#notifications.info('Generating dynamic CSV snapshot from SQLite...');
            const blob = await this.#api.get('/export');

            // Trigger browser download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `cse_students_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            this.#notifications.success('✓ CSV exported successfully!');
        } catch (err) {
            this.#notifications.error(`Export failed: ${err.message}`);
        }
    }

    // ==============================================================================
    // 8. ANALYTICS & AUDIT LOGS
    // ==============================================================================
    async loadAnalytics() {
        try {
            const data = await this.#api.get('/analytics');
            if (data && data.analytics) {
                const a = data.analytics;
                this.#charts.renderSubjectAverages('chart-subject-averages', a.subjectAverages);
                this.#charts.renderAttendanceDistribution('chart-attendance-distribution', a.attendanceDistribution);
                this.#charts.renderGradeDistribution('chart-grade-frequency', a.gradeDistribution);
                this.#charts.renderSemesterDistribution('chart-semester-population', a.semesterDistribution);
            }
        } catch (err) {
            this.#notifications.error(`Failed to load analytics: ${err.message}`);
        }
    }

    async loadAuditLogs() {
        const tbody = document.getElementById('audit-table-body');
        if (!tbody) return;

        try {
            const data = await this.#api.get('/audit-logs', { limit: 50 });
            if (!data || !data.logs || data.logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No audit logs recorded yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.logs.map(log => `
                <tr>
                    <td class="font-mono" style="font-size: 0.8rem; color: var(--text-muted);">${log.timestamp}</td>
                    <td><strong>${log.admin_username}</strong></td>
                    <td><span class="badge-tag text-cyan">${log.action}</span></td>
                    <td class="font-mono text-cyan">${log.student_id || '-'}</td>
                    <td>${log.field_name || '-'}</td>
                    <td class="text-red font-mono">${log.old_value !== null ? log.old_value : '-'}</td>
                    <td class="text-green font-mono">${log.new_value !== null ? log.new_value : '-'}</td>
                    <td style="color: var(--text-secondary); font-size: 0.82rem;">${log.details || ''}</td>
                </tr>
            `).join('');
        } catch (err) {
            this.#notifications.error(`Failed to load audit logs: ${err.message}`);
        }
    }
}
