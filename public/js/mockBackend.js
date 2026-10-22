// ==============================================================================
// CLIENT-SIDE ENGINE / STANDALONE MOCK BACKEND
// File: public/js/mockBackend.js
//
// Powers 100% interactive standalone operation for GitHub Pages and offline demos.
// Mimics Node.js/Express SQLite backend using localStorage and initial_data.json.
// ==============================================================================

export class MockBackend {
    static #instance = null;
    #initialized = false;
    #students = [];
    #auditLogs = [];
    #pendingOtps = new Map(); // studentId -> { otp, expiresAt }
    #currentUser = null;

    constructor() {
        if (MockBackend.#instance) {
            return MockBackend.#instance;
        }
        MockBackend.#instance = this;
    }

    static getInstance() {
        if (!MockBackend.#instance) {
            MockBackend.#instance = new MockBackend();
        }
        return MockBackend.#instance;
    }

    async init() {
        if (this.#initialized) return;

        try {
            const stored = localStorage.getItem('au_sms_db_v1');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.#students = parsed.students || [];
                this.#auditLogs = parsed.auditLogs || [];
            } else {
                // Fetch pre-seeded 501 students dataset
                const res = await fetch('./data/initial_data.json');
                if (res.ok) {
                    const data = await res.json();
                    this.#students = data.students || [];
                    this.#auditLogs = data.audit_logs || [];
                    this.#saveState();
                }
            }
        } catch (err) {
            console.warn('[MockBackend] Failed to load initial dataset, using empty state:', err);
        }

        // Restore logged in user if stored
        try {
            const userStr = localStorage.getItem('au_sms_mock_user');
            if (userStr) {
                this.#currentUser = JSON.parse(userStr);
            }
        } catch {
            this.#currentUser = null;
        }

        this.#initialized = true;
    }

    #saveState() {
        try {
            localStorage.setItem('au_sms_db_v1', JSON.stringify({
                students: this.#students,
                auditLogs: this.#auditLogs
            }));
        } catch (err) {
            console.warn('[MockBackend] localStorage quota exceeded:', err);
        }
    }

    // Calculation helper mirroring AcademicCalculator
    #calculateMetrics(marks) {
        const math = parseFloat(marks.mathematics) || 0;
        const physics = parseFloat(marks.physics) || 0;
        const python = parseFloat(marks.python_programming || marks.python) || 0;
        const ds = parseFloat(marks.data_structures) || 0;
        const english = parseFloat(marks.english) || 0;

        const total = Math.round((math + physics + python + ds + english) * 10) / 10;
        const percentage = Math.round((total / 5) * 100) / 100;

        let grade = 'F';
        let gradePoint = 0;
        if (percentage >= 90) { grade = 'A+'; gradePoint = 10; }
        else if (percentage >= 80) { grade = 'A'; gradePoint = 9; }
        else if (percentage >= 70) { grade = 'B'; gradePoint = 8; }
        else if (percentage >= 60) { grade = 'C'; gradePoint = 7; }
        else if (percentage >= 50) { grade = 'D'; gradePoint = 6; }
        else { grade = 'F'; gradePoint = 0; }

        const status = percentage >= 50 ? 'PASS' : 'FAIL';

        return {
            total_marks: total,
            percentage,
            grade,
            grade_point: gradePoint,
            status
        };
    }

    async handleRequest(method, fullUrl, options = {}) {
        await this.init();

        const [path, queryString] = fullUrl.split('?');
        const params = {};
        if (queryString) {
            const searchParams = new URLSearchParams(queryString);
            for (const [key, val] of searchParams.entries()) {
                params[key] = val;
            }
        }

        let body = {};
        if (options.body) {
            if (typeof options.body === 'string') {
                try { body = JSON.parse(options.body); } catch { body = {}; }
            } else {
                body = options.body;
            }
        }

        // Clean endpoint path
        const endpoint = path.replace(/^(\/api)?\/?/, '/');

        // ROUTING
        // -------------------------------------------------------------
        // AUTHENTICATION
        // -------------------------------------------------------------
        if (endpoint === '/auth/me' && method === 'GET') {
            if (this.#currentUser) {
                return { success: true, user: this.#currentUser };
            }
            const err = new Error('No active session');
            err.statusCode = 401;
            throw err;
        }

        if (endpoint === '/auth/student/request-otp' && method === 'POST') {
            const sid = (body.studentId || '').trim().toLowerCase();
            const student = this.#students.find(s => (s.student_id || '').toLowerCase() === sid);
            if (!student) {
                const err = new Error(`Student record not found for ID '${body.studentId}'. Format: 25b11cs001 to 25b11cs999.`);
                err.statusCode = 404;
                throw err;
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            this.#pendingOtps.set(sid, { otp, expiresAt: Date.now() + 60000 });

            return {
                success: true,
                message: 'Demo OTP generated successfully.',
                demoOtp: otp,
                studentName: student.name,
                expiresIn: 60
            };
        }

        if (endpoint === '/auth/student/verify-otp' && method === 'POST') {
            const sid = (body.studentId || '').trim().toLowerCase();
            const enteredOtp = (body.otp || '').trim();

            const pending = this.#pendingOtps.get(sid);
            // Allow master demo OTP '123456' as well as dynamic OTP
            if (!pending && enteredOtp !== '123456') {
                const err = new Error('OTP has expired or was not requested. Please request a new OTP.');
                err.statusCode = 400;
                throw err;
            }

            if (pending && pending.otp !== enteredOtp && enteredOtp !== '123456') {
                const err = new Error('Invalid OTP. Please enter the 6-digit code shown on screen.');
                err.statusCode = 400;
                throw err;
            }

            this.#pendingOtps.delete(sid);
            const student = this.#students.find(s => (s.student_id || '').toLowerCase() === sid);
            const user = {
                id: student ? student.id : 1,
                studentId: student ? student.student_id : sid,
                name: student ? student.name : 'Student',
                role: 'STUDENT'
            };

            this.#currentUser = user;
            localStorage.setItem('au_sms_mock_user', JSON.stringify(user));

            return {
                success: true,
                message: 'Student authentication successful.',
                token: `demo-token-student-${Date.now()}`,
                user
            };
        }

        if (endpoint === '/auth/admin/login' && method === 'POST') {
            const username = (body.username || '').trim();
            const password = (body.password || '').trim();

            // Default credentials: admin / admin123
            if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
                const user = {
                    id: 1,
                    username: 'admin',
                    name: 'System Administrator',
                    role: 'ADMIN'
                };
                this.#currentUser = user;
                localStorage.setItem('au_sms_mock_user', JSON.stringify(user));

                return {
                    success: true,
                    message: 'Admin authentication successful.',
                    token: `demo-token-admin-${Date.now()}`,
                    user
                };
            }

            const err = new Error('Invalid administrator credentials. (Default: admin / admin123)');
            err.statusCode = 401;
            throw err;
        }

        if (endpoint === '/auth/logout' && method === 'POST') {
            this.#currentUser = null;
            localStorage.removeItem('au_sms_mock_user');
            return { success: true, message: 'Logged out successfully.' };
        }

        // -------------------------------------------------------------
        // STUDENTS ENDPOINTS
        // -------------------------------------------------------------
        if (endpoint === '/students/toppers' && method === 'GET') {
            const limit = parseInt(params.limit, 10) || 10;
            const sorted = [...this.#students].sort((a, b) => (b.total_marks || 0) - (a.total_marks || 0));
            return {
                success: true,
                toppers: sorted.slice(0, limit)
            };
        }

        // Single student profile
        const studentMatch = endpoint.match(/^\/students\/([^\/]+)$/);
        if (studentMatch && method === 'GET') {
            const identifier = studentMatch[1].toLowerCase();
            const student = this.#students.find(s =>
                (s.student_id || '').toLowerCase() === identifier || String(s.id) === identifier
            );

            if (!student) {
                const err = new Error(`Student '${identifier}' not found.`);
                err.statusCode = 404;
                throw err;
            }

            // Compute rank
            const sorted = [...this.#students].sort((a, b) => (b.total_marks || 0) - (a.total_marks || 0));
            const rank = sorted.findIndex(s => s.id === student.id) + 1;

            return {
                success: true,
                student,
                rank,
                totalStudents: this.#students.length
            };
        }

        // Update student
        if (studentMatch && method === 'PUT') {
            const identifier = studentMatch[1].toLowerCase();
            const index = this.#students.findIndex(s =>
                (s.student_id || '').toLowerCase() === identifier || String(s.id) === identifier
            );

            if (index === -1) {
                const err = new Error(`Student '${identifier}' not found.`);
                err.statusCode = 404;
                throw err;
            }

            const existing = this.#students[index];
            const updatedData = { ...existing, ...body };

            // Recalculate marks and grade
            const computed = this.#calculateMetrics(updatedData);
            const updated = {
                ...updatedData,
                ...computed,
                updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };

            this.#students[index] = updated;

            // Audit log
            this.#auditLogs.unshift({
                id: this.#auditLogs.length + 1,
                admin_username: (this.#currentUser && this.#currentUser.username) || 'admin',
                action: 'UPDATE',
                student_id: updated.student_id,
                field_name: 'Academic Record',
                old_value: `${existing.total_marks} marks (${existing.percentage}%)`,
                new_value: `${updated.total_marks} marks (${updated.percentage}%)`,
                details: `Updated marks & attendance (${updated.attendance}%)`,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
            });

            this.#saveState();
            return { success: true, message: 'Student updated successfully.', student: updated };
        }

        // Delete student
        if (studentMatch && method === 'DELETE') {
            const identifier = studentMatch[1].toLowerCase();
            const index = this.#students.findIndex(s =>
                (s.student_id || '').toLowerCase() === identifier || String(s.id) === identifier
            );

            if (index === -1) {
                const err = new Error(`Student '${identifier}' not found.`);
                err.statusCode = 404;
                throw err;
            }

            const deleted = this.#students.splice(index, 1)[0];

            this.#auditLogs.unshift({
                id: this.#auditLogs.length + 1,
                admin_username: (this.#currentUser && this.#currentUser.username) || 'admin',
                action: 'DELETE',
                student_id: deleted.student_id,
                field_name: 'Student Record',
                old_value: deleted.name,
                new_value: null,
                details: `Deleted student ${deleted.name} (${deleted.student_id})`,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
            });

            this.#saveState();
            return { success: true, message: 'Student deleted successfully.' };
        }

        // List students (with filtering, sorting, pagination)
        if (endpoint === '/students' && method === 'GET') {
            let filtered = [...this.#students];

            if (params.search) {
                const query = params.search.trim().toLowerCase();
                filtered = filtered.filter(s =>
                    (s.student_id || '').toLowerCase().includes(query) ||
                    (s.name || '').toLowerCase().includes(query)
                );
            }

            if (params.semester) {
                filtered = filtered.filter(s => s.semester === params.semester);
            }

            if (params.gender) {
                filtered = filtered.filter(s => (s.gender || '').toLowerCase() === params.gender.toLowerCase());
            }

            if (params.grade) {
                filtered = filtered.filter(s => s.grade === params.grade);
            }

            if (params.status) {
                filtered = filtered.filter(s => (s.status || '').toUpperCase() === params.status.toUpperCase());
            }

            // Sorting
            const sortField = params.sort || 'id';
            const order = (params.order || 'ASC').toUpperCase();

            filtered.sort((a, b) => {
                let valA = a[sortField];
                let valB = b[sortField];

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return order === 'DESC' ? 1 : -1;
                if (valA > valB) return order === 'DESC' ? -1 : 1;
                return 0;
            });

            // Pagination
            const page = Math.max(1, parseInt(params.page, 10) || 1);
            const limit = Math.max(1, parseInt(params.limit, 10) || 20);
            const total = filtered.length;
            const totalPages = Math.ceil(total / limit) || 1;
            const startIndex = (page - 1) * limit;
            const pagedStudents = filtered.slice(startIndex, startIndex + limit);

            return {
                success: true,
                students: pagedStudents,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasPrev: page > 1,
                    hasNext: page < totalPages
                }
            };
        }

        // Create student
        if (endpoint === '/students' && method === 'POST') {
            const sid = (body.student_id || body.studentId || '').trim().toLowerCase();
            if (!sid) {
                const err = new Error('Student ID is required.');
                err.statusCode = 400;
                throw err;
            }

            if (this.#students.some(s => (s.student_id || '').toLowerCase() === sid)) {
                const err = new Error(`Student ID '${sid}' already exists.`);
                err.statusCode = 409;
                throw err;
            }

            const computed = this.#calculateMetrics(body);
            const maxId = this.#students.reduce((max, s) => Math.max(max, s.id || 0), 0);

            const newStudent = {
                id: maxId + 1,
                student_id: sid,
                name: (body.name || '').trim(),
                gender: body.gender || 'Male',
                branch: body.branch || 'CSE',
                semester: body.semester || 'Semester 1',
                attendance: parseFloat(body.attendance) || 0,
                mathematics: parseFloat(body.mathematics) || 0,
                physics: parseFloat(body.physics) || 0,
                python_programming: parseFloat(body.python_programming || body.python) || 0,
                data_structures: parseFloat(body.data_structures) || 0,
                english: parseFloat(body.english) || 0,
                ...computed,
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };

            this.#students.unshift(newStudent);

            this.#auditLogs.unshift({
                id: this.#auditLogs.length + 1,
                admin_username: (this.#currentUser && this.#currentUser.username) || 'admin',
                action: 'INSERT',
                student_id: newStudent.student_id,
                field_name: 'Student Registration',
                old_value: null,
                new_value: newStudent.name,
                details: `Registered new student ${newStudent.name} (${newStudent.student_id})`,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
            });

            this.#saveState();
            return { success: true, message: 'Student registered successfully.', student: newStudent };
        }

        // -------------------------------------------------------------
        // ANALYTICS & AUDIT LOGS
        // -------------------------------------------------------------
        if (endpoint === '/analytics' && method === 'GET') {
            const total = this.#students.length;
            const passCount = this.#students.filter(s => (s.status || '').toUpperCase() === 'PASS').length;
            const failCount = total - passCount;
            const passRate = total > 0 ? Math.round((passCount / total) * 10000) / 100 : 0;

            const sumPct = this.#students.reduce((acc, s) => acc + (parseFloat(s.percentage) || 0), 0);
            const avgPct = total > 0 ? Math.round((sumPct / total) * 100) / 100 : 0;

            const sumAtt = this.#students.reduce((acc, s) => acc + (parseFloat(s.attendance) || 0), 0);
            const avgAtt = total > 0 ? Math.round((sumAtt / total) * 100) / 100 : 0;

            const maxPct = this.#students.reduce((max, s) => Math.max(max, s.percentage || 0), 0);
            const minPct = this.#students.reduce((min, s) => Math.min(min, s.percentage || 100), 100);

            // Subject averages
            const avgSub = (sub) => {
                const sum = this.#students.reduce((acc, s) => acc + (parseFloat(s[sub]) || 0), 0);
                return total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
            };

            // Grade distribution
            const gradeOrder = ['A+', 'A', 'B', 'C', 'D', 'F'];
            const gradeCounts = {};
            gradeOrder.forEach(g => { gradeCounts[g] = 0; });
            this.#students.forEach(s => {
                const g = s.grade || 'F';
                gradeCounts[g] = (gradeCounts[g] || 0) + 1;
            });
            const gradeDistribution = gradeOrder.map(grade => ({ grade, count: gradeCounts[grade] || 0 }));

            // Semester distribution
            const semCounts = {};
            this.#students.forEach(s => {
                const sem = s.semester || 'Semester 1';
                semCounts[sem] = (semCounts[sem] || 0) + 1;
            });
            const semesterDistribution = Object.keys(semCounts).sort().map(sem => ({
                semester: sem,
                count: semCounts[sem]
            }));

            // Attendance distribution
            const attendanceDistribution = {
                range_90_100: this.#students.filter(s => (s.attendance || 0) >= 90).length,
                range_80_89: this.#students.filter(s => (s.attendance || 0) >= 80 && (s.attendance || 0) < 90).length,
                range_70_79: this.#students.filter(s => (s.attendance || 0) >= 70 && (s.attendance || 0) < 80).length,
                range_60_69: this.#students.filter(s => (s.attendance || 0) >= 60 && (s.attendance || 0) < 70).length,
                range_below_60: this.#students.filter(s => (s.attendance || 0) < 60).length
            };

            // Top performers
            const topPerformers = [...this.#students]
                .sort((a, b) => (b.total_marks || 0) - (a.total_marks || 0))
                .slice(0, 10);

            return {
                success: true,
                analytics: {
                    kpis: {
                        totalStudents: total,
                        avgPercentage: avgPct,
                        avgAttendance: avgAtt,
                        passCount,
                        failCount,
                        passRate,
                        maxPercentage: maxPct,
                        minPercentage: total > 0 ? minPct : 0
                    },
                    subjectAverages: {
                        mathematics: avgSub('mathematics'),
                        physics: avgSub('physics'),
                        python_programming: avgSub('python_programming'),
                        data_structures: avgSub('data_structures'),
                        english: avgSub('english')
                    },
                    gradeDistribution,
                    semesterDistribution,
                    attendanceDistribution,
                    topPerformers
                }
            };
        }

        if (endpoint === '/audit-logs' && method === 'GET') {
            const limit = parseInt(params.limit, 10) || 50;
            return {
                success: true,
                logs: this.#auditLogs.slice(0, limit)
            };
        }

        // CSV Export
        if (endpoint === '/export' && method === 'GET') {
            const headers = [
                'Student_ID', 'Name', 'Gender', 'Branch', 'Semester', 'Attendance',
                'Mathematics', 'Physics', 'Python', 'Data Structures', 'English',
                'Total_Marks', 'Percentage', 'Grade', 'Grade_Point', 'Status'
            ];

            const rows = [headers.join(',')];
            this.#students.forEach(s => {
                const line = [
                    `"${s.student_id || ''}"`,
                    `"${(s.name || '').replace(/"/g, '""')}"`,
                    `"${s.gender || 'Male'}"`,
                    `"${s.branch || 'CSE'}"`,
                    `"${s.semester || 'Semester 1'}"`,
                    s.attendance || 0,
                    s.mathematics || 0,
                    s.physics || 0,
                    s.python_programming || 0,
                    s.data_structures || 0,
                    s.english || 0,
                    s.total_marks || 0,
                    s.percentage || 0,
                    `"${s.grade || 'F'}"`,
                    s.grade_point || 0,
                    `"${s.status || 'FAIL'}"`
                ];
                rows.push(line.join(','));
            });

            const csvString = rows.join('\r\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            return blob;
        }

        // CSV Import
        if (endpoint === '/import' && method === 'POST') {
            return {
                success: true,
                message: 'Import processed in browser mode.',
                processed: 0,
                added: 0,
                updated: 0,
                errors: []
            };
        }

        const err = new Error(`Mock endpoint ${method} ${endpoint} not implemented`);
        err.statusCode = 404;
        throw err;
    }
}
