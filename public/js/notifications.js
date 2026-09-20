// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & UI NOTIFICATION MANAGER
// File: public/js/notifications.js
// 
// Manages dynamic floating toast notifications across all user views.
// ==============================================================================

export class NotificationManager {
    #container;
    static #instance = null;

    constructor() {
        if (NotificationManager.#instance) {
            return NotificationManager.#instance;
        }
        this.#container = document.getElementById('toast-container');
        if (!this.#container) {
            this.#container = document.createElement('div');
            this.#container.id = 'toast-container';
            this.#container.className = 'toast-container';
            document.body.appendChild(this.#container);
        }
        NotificationManager.#instance = this;
    }

    static getInstance() {
        if (!NotificationManager.#instance) {
            NotificationManager.#instance = new NotificationManager();
        }
        return NotificationManager.#instance;
    }

    /**
     * Display a toast notification.
     * 
     * @param {string} message 
     * @param {'success'|'error'|'warning'|'info'} type 
     * @param {number} duration In milliseconds
     */
    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const colors = {
            success: 'var(--status-pass)',
            error: 'var(--status-fail)',
            warning: 'var(--status-warn)',
            info: 'var(--accent-primary)'
        };

        toast.innerHTML = `
            <div class="toast-icon" style="color: ${colors[type] || colors.info}; font-size: 1.1rem; font-weight: bold;">
                ${icons[type] || 'ℹ'}
            </div>
            <div class="toast-content" style="flex: 1; font-size: 0.88rem; color: var(--text-primary); word-break: break-word;">
                ${message}
            </div>
            <button class="toast-close" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem;">✕</button>
            <div class="toast-progress" style="background: ${colors[type] || colors.info}; animation-duration: ${duration}ms;"></div>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        let dismissTimer = null;

        const dismiss = () => {
            if (dismissTimer) clearTimeout(dismissTimer);
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        };

        closeBtn.addEventListener('click', dismiss);
        dismissTimer = setTimeout(dismiss, duration);

        this.#container.appendChild(toast);
    }

    success(message, duration) {
        this.show(message, 'success', duration);
    }

    error(message, duration) {
        this.show(message, 'error', duration);
    }

    warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    info(message, duration) {
        this.show(message, 'info', duration);
    }
}
