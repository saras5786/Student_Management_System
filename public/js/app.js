// ==============================================================================
// OOP CONCEPT: APPLICATION ORCHESTRATION & SINGLETON PATTERN
// File: public/js/app.js
// 
// Main application entry point orchestrating:
// - Animated startup loading screen with official Aditya University emblem.
// - 60FPS Canvas particle physics tuned to Aditya Orange and Navy Blue palette.
// - Ultra-slow, smooth ambient background oscillation in the light tints of the logo.
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
    #animStep = 0;

    constructor() {
        this.#initVisualEngine();
        this.#initManagers();
        this.#initLifecycle();
    }

    #initVisualEngine() {
        // Initialize HTML5 Canvas Particle System in official Aditya University colors
        const canvas = document.getElementById('particle-canvas');
        if (canvas) {
            this.#particles = new ParticleAnimation(canvas);
            this.#particles.initialize();
            // Official Aditya University Orange and Navy Blue hues
            this.#particles.setBrandHues(24, 214);
        }

        // Set fixed official Aditya University brand design hues
        const rootStyle = document.documentElement.style;
        rootStyle.setProperty('--brand-orange-hue', '24');
        rootStyle.setProperty('--brand-gold-hue', '42');
        rootStyle.setProperty('--brand-blue-hue', '214');
        rootStyle.setProperty('--brand-sky-hue', '198');

        // Interactive 3D floating physics for the moving Aditya Logo on login page
        this.#initMovingLogo();
    }

    #initMovingLogo() {
        const wrapper = document.querySelector('.living-solar-orrery-wrap');
        const authView = document.getElementById('view-auth');
        if (!wrapper || !authView) return;

        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;

        window.addEventListener('mousemove', (e) => {
            if (!authView.classList.contains('active')) return;
            const rect = wrapper.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
            const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

            targetX = Math.max(-1, Math.min(1, deltaX)) * 18;
            targetY = Math.max(-1, Math.min(1, deltaY)) * 12;
        });

        const updateMotion = () => {
            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;

            wrapper.style.transform = `translate(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px) rotateY(${(currentX * 0.8).toFixed(2)}deg) rotateX(${(-currentY * 0.8).toFixed(2)}deg)`;

            requestAnimationFrame(updateMotion);
        };
        requestAnimationFrame(updateMotion);
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

        // Startup Screen Display
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
