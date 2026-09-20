// ==============================================================================
// OOP CONCEPT: APPLICATION ORCHESTRATION & SINGLETON PATTERN
// File: public/js/app.js
// 
// Main application entry point orchestrating:
// - Animated startup loading screen with university branding.
// - 60FPS Canvas particle physics and smooth multi-colored ambient background cycling.
// - Dynamic view routing between Auth Portal, Student Dashboard, and Admin Suite.
// ==============================================================================

import { ParticleAnimation } from './particles.js';
import { AuthenticationManager } from './auth.js';
import { StudentDashboardManager } from './student.js';
import { AdminDashboardManager } from './admin.js';

class App {
    #particles;
    #authManager;
    #studentManager;
    #adminManager;
    #currentHue = 215;

    constructor() {
        this.#initVisualEngine();
        this.#initManagers();
        this.#initLifecycle();
    }

    #initVisualEngine() {
        // Initialize HTML5 Canvas Particle System
        const canvas = document.getElementById('particle-canvas');
        if (canvas) {
            this.#particles = new ParticleAnimation(canvas);
            this.#particles.initialize();
        }

        // Ambient Dynamic Multicolored Hue Transition Loop
        // Continuously cycles smoothly through the entire 360-degree color spectrum:
        // Azure Blue -> Deep Violet -> Rose Pink -> Amber Gold -> Emerald Mint -> Azure Blue
        setInterval(() => {
            this.#currentHue = (this.#currentHue + 0.12) % 360;

            document.documentElement.style.setProperty('--bg-hue', Math.round(this.#currentHue));
            if (this.#particles) {
                this.#particles.setHue(Math.round(this.#currentHue));
            }
        }, 60);
    }

    #initManagers() {
        this.#authManager = new AuthenticationManager();
        this.#studentManager = new StudentDashboardManager();
        this.#adminManager = new AdminDashboardManager();

        // Listen for successful login events
        this.#authManager.onLoginSuccess((user) => {
            this.#navigateBasedOnRole(user);
        });
    }

    async #initLifecycle() {
        // Check for existing session token
        const existingUser = await this.#authManager.checkExistingSession();

        // Startup Screen Display: smooth loading animation
        setTimeout(() => {
            const loader = document.getElementById('loading-screen');
            if (loader) {
                loader.classList.add('fade-out');
                setTimeout(() => loader.remove(), 800);
            }

            if (existingUser) {
                this.#navigateBasedOnRole(existingUser);
            } else {
                this.#showView('view-auth');
            }
        }, 1200);
    }

    #navigateBasedOnRole(user) {
        if (!user) {
            this.#showView('view-auth');
            return;
        }

        if (user.role === 'STUDENT') {
            this.#showView('view-student');
            const studentId = user.studentId || (user.profile ? user.profile.student_id : null);
            if (studentId) {
                this.#studentManager.loadStudentData(studentId);
            }
        } else if (user.role === 'ADMIN') {
            this.#showView('view-admin');
            this.#adminManager.initialize();
        } else {
            this.#showView('view-auth');
        }
    }

    #showView(viewId) {
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.remove('active');
        });
        const target = document.getElementById(viewId);
        target?.classList.add('active');
    }
}

// Bootstrap Application once DOM is fully parsed
document.addEventListener('DOMContentLoaded', () => {
    new App();
});
