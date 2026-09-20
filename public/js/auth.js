// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & AUTHENTICATION MANAGER
// File: public/js/auth.js
// 
// Handles login workflows for both Student (simulated OTP) and Administrator personas.
// Encapsulates countdown timers, token storage, and session resolution.
// ==============================================================================

import { APIClient } from './api.js';
import { NotificationManager } from './notifications.js';

export class AuthenticationManager {
    #api;
    #notifications;
    #currentUser = null;
    #otpTimer = null;
    #otpSecondsRemaining = 0;
    #onLoginSuccessCallback = null;

    constructor() {
        this.#api = APIClient.getInstance();
        this.#notifications = NotificationManager.getInstance();
        this.#bindDOM();
    }

    onLoginSuccess(callback) {
        this.#onLoginSuccessCallback = callback;
    }

    getCurrentUser() {
        return this.#currentUser;
    }

    #bindDOM() {
        // Tab switcher buttons
        const tabStudent = document.getElementById('tab-btn-student');
        const tabAdmin = document.getElementById('tab-btn-admin');
        const paneStudent = document.getElementById('student-login-pane');
        const paneAdmin = document.getElementById('admin-login-pane');

        tabStudent?.addEventListener('click', () => {
            tabStudent.classList.add('active');
            tabAdmin?.classList.remove('active');
            paneStudent?.classList.add('active');
            paneAdmin?.classList.remove('active');
        });

        tabAdmin?.addEventListener('click', () => {
            tabAdmin.classList.add('active');
            tabStudent?.classList.remove('active');
            paneAdmin?.classList.add('active');
            paneStudent?.classList.remove('active');
        });

        // Student Send OTP button
        const btnSendOtp = document.getElementById('btn-send-otp');
        btnSendOtp?.addEventListener('click', () => this.handleStudentRequestOTP());

        // Student Verify OTP button
        const btnVerifyOtp = document.getElementById('btn-verify-otp');
        btnVerifyOtp?.addEventListener('click', () => this.handleStudentVerifyOTP());

        // Admin Login button
        const btnAdminLogin = document.getElementById('btn-admin-login');
        btnAdminLogin?.addEventListener('click', () => this.handleAdminLogin());

        // Enter key listeners
        document.getElementById('student-id-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleStudentRequestOTP();
        });
        document.getElementById('otp-code-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleStudentVerifyOTP();
        });
        document.getElementById('admin-password-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleAdminLogin();
        });

        // Logout button in header
        document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());
    }

    /**
     * Request simulated 60-second OTP for student ID.
     */
    async handleStudentRequestOTP() {
        const idInput = document.getElementById('student-id-input');
        const btn = document.getElementById('btn-send-otp');
        const studentId = (idInput?.value || '').trim().toLowerCase();

        if (!studentId) {
            this.#notifications.error('Please enter your University Student ID.');
            idInput?.focus();
            return;
        }

        // Validate ID format: 25b11cs001 to 25b11cs999
        if (!/^25b11cs\d{3}$/i.test(studentId)) {
            this.#notifications.error('Invalid ID format. Expected format: 25b11csXXX (e.g., 25b11cs001).');
            idInput?.focus();
            return;
        }

        this.#setBtnLoading(btn, true);

        try {
            const data = await this.#api.post('/auth/student/request-otp', { studentId });

            // Display Demo OTP Banner
            const banner = document.getElementById('otp-demo-banner');
            const otpCodeSpan = document.getElementById('demo-otp-code');
            const otpSection = document.getElementById('otp-input-section');
            const otpInput = document.getElementById('otp-code-input');

            if (banner && otpCodeSpan) {
                otpCodeSpan.textContent = data.demoOtp;
                banner.classList.remove('hidden');
            }

            if (otpSection) {
                otpSection.classList.remove('hidden');
                otpInput?.focus();
            }

            this.#startOTPTimer(data.expiresIn || 60);
            this.#notifications.info(`DEMO OTP Generated: ${data.demoOtp} (Expires in 60s)`);
        } catch (err) {
            this.#notifications.error(err.message || 'Failed to generate OTP.');
        } finally {
            this.#setBtnLoading(btn, false);
        }
    }

    /**
     * Start live 60-second visual countdown.
     */
    #startOTPTimer(seconds) {
        if (this.#otpTimer) clearInterval(this.#otpTimer);
        this.#otpSecondsRemaining = seconds;

        const countdownText = document.getElementById('otp-countdown-text');
        const timerBar = document.getElementById('timer-bar-fill');
        const totalDuration = seconds;

        const updateVisuals = () => {
            if (countdownText) {
                countdownText.textContent = `Expires in ${this.#otpSecondsRemaining}s`;
            }
            if (timerBar) {
                const pct = (this.#otpSecondsRemaining / totalDuration) * 100;
                timerBar.style.width = `${pct}%`;
            }
        };

        updateVisuals();

        this.#otpTimer = setInterval(() => {
            this.#otpSecondsRemaining--;
            if (this.#otpSecondsRemaining <= 0) {
                clearInterval(this.#otpTimer);
                this.#otpTimer = null;
                if (countdownText) countdownText.textContent = 'OTP Expired. Please request a new OTP.';
                if (timerBar) timerBar.style.width = '0%';
                this.#notifications.warning('Demo OTP has expired. Please click "SEND OTP" again.');
            } else {
                updateVisuals();
            }
        }, 1000);
    }

    /**
     * Verify submitted student OTP.
     */
    async handleStudentVerifyOTP() {
        const idInput = document.getElementById('student-id-input');
        const otpInput = document.getElementById('otp-code-input');
        const btn = document.getElementById('btn-verify-otp');

        const studentId = (idInput?.value || '').trim().toLowerCase();
        const otpCode = (otpInput?.value || '').trim();

        if (!otpCode || otpCode.length !== 6) {
            this.#notifications.error('Please enter the valid 6-digit OTP code.');
            otpInput?.focus();
            return;
        }

        this.#setBtnLoading(btn, true);

        try {
            const data = await this.#api.post('/auth/student/verify-otp', {
                studentId,
                otpCode
            });

            this.#api.setToken(data.token);
            this.#currentUser = data.user;
            this.#updateHeaderUser(data.user);

            // Clean up OTP countdown
            if (this.#otpTimer) clearInterval(this.#otpTimer);

            this.#notifications.success(data.message || 'Logged in successfully!');
            if (this.#onLoginSuccessCallback) {
                this.#onLoginSuccessCallback(data.user);
            }
        } catch (err) {
            this.#notifications.error(err.message || 'Invalid or expired OTP.');
        } finally {
            this.#setBtnLoading(btn, false);
        }
    }

    /**
     * Handle Admin username/password authentication.
     */
    async handleAdminLogin() {
        const userInput = document.getElementById('admin-username-input');
        const passInput = document.getElementById('admin-password-input');
        const btn = document.getElementById('btn-admin-login');

        const username = (userInput?.value || '').trim();
        const password = (passInput?.value || '').trim();

        if (!username || !password) {
            this.#notifications.error('Please enter both username and password.');
            return;
        }

        this.#setBtnLoading(btn, true);

        try {
            const data = await this.#api.post('/auth/admin/login', {
                username,
                password
            });

            this.#api.setToken(data.token);
            this.#currentUser = data.user;
            this.#updateHeaderUser(data.user);

            this.#notifications.success('Welcome back, Administrator!');
            if (this.#onLoginSuccessCallback) {
                this.#onLoginSuccessCallback(data.user);
            }
        } catch (err) {
            this.#notifications.error(err.message || 'Invalid administrator credentials.');
        } finally {
            this.#setBtnLoading(btn, false);
        }
    }

    /**
     * Check if user already has an active valid token.
     */
    async checkExistingSession() {
        const token = this.#api.getToken();
        if (!token) return null;

        try {
            const res = await this.#api.get('/auth/me');
            if (res && res.success && res.user) {
                this.#currentUser = res.user;
                this.#updateHeaderUser(res.user);
                return res.user;
            }
        } catch {
            this.#api.clearToken();
        }
        return null;
    }

    /**
     * Log out current user session.
     */
    async logout() {
        try {
            await this.#api.post('/auth/logout');
        } catch {
            // Ignore network errors during logout
        }

        this.#api.clearToken();
        this.#currentUser = null;

        // Reset UI state
        const badge = document.getElementById('user-session-badge');
        badge?.classList.add('hidden');

        const banner = document.getElementById('otp-demo-banner');
        banner?.classList.add('hidden');

        const otpSection = document.getElementById('otp-input-section');
        otpSection?.classList.add('hidden');

        if (this.#otpTimer) clearInterval(this.#otpTimer);

        this.#notifications.info('You have logged out.');
        
        // Reload or transition to auth screen
        window.location.reload();
    }

    #updateHeaderUser(user) {
        const badge = document.getElementById('user-session-badge');
        const avatar = document.getElementById('header-avatar');
        const nameSpan = document.getElementById('header-username');
        const roleSpan = document.getElementById('header-role');

        if (!badge || !user) return;

        badge.classList.remove('hidden');
        if (avatar) avatar.textContent = (user.name || user.username || 'U').charAt(0).toUpperCase();
        if (nameSpan) nameSpan.textContent = user.name || user.username;
        if (roleSpan) roleSpan.textContent = user.role;
    }

    #setBtnLoading(btn, isLoading) {
        if (!btn) return;
        const text = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');

        if (isLoading) {
            btn.disabled = true;
            text?.classList.add('hidden');
            spinner?.classList.remove('hidden');
        } else {
            btn.disabled = false;
            text?.classList.remove('hidden');
            spinner?.classList.add('hidden');
        }
    }
}
