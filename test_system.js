// Automated Verification Script for AU-SMS (Idempotent)
const baseUrl = 'http://localhost:3000/api';

async function runTests() {
    console.log('🧪 ========================================================');
    console.log('   STARTING AU-SMS FULL-STACK AUTOMATED VERIFICATION');
    console.log('   ========================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✓ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ✕ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        // Admin Login first to setup idempotent baseline
        const adminLoginRes = await fetch(`${baseUrl}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        });
        const adminLoginData = await adminLoginRes.json();
        const adminToken = adminLoginData.token;

        // Reset 25b11cs001 attendance to baseline 94.5 for testing
        await fetch(`${baseUrl}/students/25b11cs001`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                name: 'Kalyanam Mukundha',
                gender: 'Male',
                branch: 'CSE',
                semester: 'Semester 1',
                attendance: 94.5,
                mathematics: 93.2,
                physics: 91.7,
                python_programming: 93.6,
                data_structures: 95.8,
                english: 91.4
            })
        });

        // Clean up test student 25b11cs841 if exists from prior run
        try {
            await fetch(`${baseUrl}/students/25b11cs841`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
        } catch { }

        // TEST 1: Student Request OTP
        console.log('🔹 Test 1: Student Request OTP (ID: 25b11cs001)...');
        const otpReqRes = await fetch(`${baseUrl}/auth/student/request-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: '25b11cs001' })
        });
        const otpReqData = await otpReqRes.json();
        assert(otpReqData.success === true, 'Request OTP returned success = true');
        assert(typeof otpReqData.demoOtp === 'string' && otpReqData.demoOtp.length === 6, 'Generated 6-digit Demo OTP');
        assert(otpReqData.expiresIn === 60, 'Demo OTP has 60-second TTL');
        const demoOtp = otpReqData.demoOtp;

        // TEST 2: Student Verify OTP
        console.log('\n🔹 Test 2: Student Verify OTP...');
        const verifyRes = await fetch(`${baseUrl}/auth/student/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: '25b11cs001', otpCode: demoOtp })
        });
        const verifyData = await verifyRes.json();
        assert(verifyData.success === true, 'OTP verified successfully');
        assert(typeof verifyData.token === 'string', 'Received student JWT token');
        assert(verifyData.user.role === 'STUDENT', 'User role is STUDENT');
        const studentToken = verifyData.token;

        // TEST 3: Student View Own Profile (Initial Attendance: 94.5)
        console.log('\n🔹 Test 3: Student Access Own Record (Initial Attendance check)...');
        const studentProfileRes = await fetch(`${baseUrl}/students/25b11cs001`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const studentProfileData = await studentProfileRes.json();
        assert(studentProfileData.success === true, 'Student fetched their own record');
        assert(studentProfileData.student.name === 'Kalyanam Mukundha', 'Student name is Kalyanam Mukundha');
        assert(studentProfileData.student.attendance === 94.5, 'Initial attendance is 94.5%');

        // TEST 4: Student RBAC Protection (Student trying to view /api/students must be 403 Forbidden)
        console.log('\n🔹 Test 4: RBAC Protection (Student attempting to list all students)...');
        const rbacRes = await fetch(`${baseUrl}/students`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        assert(rbacRes.status === 403, 'Student access to all students list is 403 Forbidden');

        // TEST 5: Admin Login verification
        console.log('\n🔹 Test 5: Admin Login (admin / admin123)...');
        assert(adminLoginData.success === true, 'Admin login successful');
        assert(adminLoginData.user.role === 'ADMIN', 'User role is ADMIN');

        // TEST 6: Admin Lists Students & Filters
        console.log('\n🔹 Test 6: Admin Table Query with Search & Filter...');
        const filterRes = await fetch(`${baseUrl}/students?search=Kalyanam&semester=Semester 1`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const filterData = await filterRes.json();
        assert(filterData.success === true, 'Admin query returned success');
        assert(filterData.students.length >= 1, 'Found Kalyanam in Semester 1');
        assert(filterData.students[0].student_id === '25b11cs001', 'First match is 25b11cs001');

        // TEST 7: CRITICAL STEP - Admin Updates Student Attendance 94.5 -> 97.0
        console.log('\n🔹 Test 7: CRITICAL STEP - Admin Updates Attendance (94.5 -> 97.0)...');
        const studentToUpdate = { ...studentProfileData.student, attendance: 97.0 };
        const updateRes = await fetch(`${baseUrl}/students/25b11cs001`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(studentToUpdate)
        });
        const updateData = await updateRes.json();
        assert(updateData.success === true, 'Admin PUT update returned success');
        assert(updateData.student.attendance === 97, 'Updated attendance in DB response is 97%');

        // TEST 8: Check Audit Log was recorded
        console.log('\n🔹 Test 8: Verify Audit Log for the Attendance Change...');
        const auditRes = await fetch(`${baseUrl}/audit-logs?studentId=25b11cs001`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const auditData = await auditRes.json();
        assert(auditData.success === true, 'Audit log endpoint returned success');
        const attendanceLog = auditData.logs.find(l => l.field_name === 'attendance');
        assert(attendanceLog !== undefined, 'Found audit log entry for field "attendance"');
        if (attendanceLog) {
            assert(String(attendanceLog.old_value) === '94.5', 'Audit old_value is 94.5');
            assert(String(attendanceLog.new_value) === '97', 'Audit new_value is 97');
        }

        // TEST 9: SINGLE SOURCE OF TRUTH - Student re-fetches profile and sees 97%
        console.log('\n🔹 Test 9: SINGLE SOURCE OF TRUTH - Student Views Updated Attendance...');
        const studentRefetchRes = await fetch(`${baseUrl}/students/25b11cs001`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const studentRefetchData = await studentRefetchRes.json();
        assert(studentRefetchData.success === true, 'Student successfully re-fetched profile');
        assert(studentRefetchData.student.attendance === 97, '★ CRITICAL: Student now sees updated Attendance = 97%!');

        // TEST 10: Admin Adds Student with ID beyond 500 (e.g. 25b11cs841)
        console.log('\n🔹 Test 10: Admin Adds Future Student (ID: 25b11cs841)...');
        const newStudentPayload = {
            student_id: '25b11cs841',
            name: 'Vikram Aditya',
            gender: 'Male',
            branch: 'CSE',
            semester: 'Semester 4',
            attendance: 91.5,
            mathematics: 95.0,
            physics: 92.0,
            python_programming: 98.0,
            data_structures: 96.0,
            english: 94.0
        };
        const addStudentRes = await fetch(`${baseUrl}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(newStudentPayload)
        });
        const addStudentData = await addStudentRes.json();
        assert(addStudentData.success === true, 'Successfully added student 25b11cs841');
        assert(addStudentData.student && addStudentData.student.percentage === 95, 'AcademicCalculator auto-computed percentage = 95%');
        assert(addStudentData.student && addStudentData.student.grade === 'A+', 'AcademicCalculator auto-computed grade = A+');
        assert(addStudentData.student && addStudentData.student.status === 'PASS', 'AcademicCalculator auto-computed status = PASS');

        // TEST 11: Analytics Dashboard KPIs
        console.log('\n🔹 Test 11: Analytics KPIs Verification...');
        const analyticsRes = await fetch(`${baseUrl}/analytics`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const analyticsData = await analyticsRes.json();
        assert(analyticsData.success === true, 'Analytics endpoint returned success');
        assert(analyticsData.analytics.kpis.totalStudents >= 501, 'Total students dynamically reflects added student (>= 501)');
        assert(typeof analyticsData.analytics.kpis.avgPercentage === 'number', 'Average percentage is calculated');
        assert(analyticsData.analytics.gradeDistribution.length > 0, 'Grade distribution data populated');

        // TEST 12: CSV Export Contains Live Values
        console.log('\n🔹 Test 12: CSV Export Verification...');
        const exportRes = await fetch(`${baseUrl}/export`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const exportCsvText = await exportRes.text();
        assert(exportCsvText.includes('Student_ID,Name,Gender'), 'CSV Export has standard headers');
        assert(exportCsvText.includes('25b11cs001'), 'CSV Export contains 25b11cs001');
        assert(exportCsvText.includes('25b11cs841'), 'CSV Export contains future student 25b11cs841');
        const line001 = exportCsvText.split('\n').find(l => l.includes('25b11cs001'));
        assert(line001 && line001.includes('97'), 'CSV Export contains updated Attendance: 97 for 25b11cs001');
        // TEST 13: Dean's List / Toppers Leaderboard API Verification
        console.log('\n🔹 Test 13: Dean\'s List / Leaderboard Verification...');
        const toppersRes = await fetch(`${baseUrl}/students/toppers?limit=10`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const toppersData = await toppersRes.json();
        assert(toppersRes.status === 200, 'Student can access Dean\'s List toppers');
        assert(toppersData.success === true, 'Toppers response success = true');
        assert(Array.isArray(toppersData.toppers) && toppersData.toppers.length === 10, 'Returns top 10 CSE department performers');
        assert(toppersData.toppers[0].percentage >= toppersData.toppers[1].percentage, 'Rank 1 percentage >= Rank 2 percentage');

        console.log('\n========================================================');
        console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log('========================================================');
    } catch (err) {
        console.error('Test Execution Error:', err);
    }
}

runTests();
