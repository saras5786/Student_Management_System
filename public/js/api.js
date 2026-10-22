// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & API CLIENT ABSTRACTION (HYBRID CLIENT)
// File: public/js/api.js
// 
// Encapsulates HTTP communication with the Node.js backend.
// In GitHub Pages or offline demo environments, seamlessly falls back to
// the MockBackend client-side engine with persistent localStorage state.
// ==============================================================================

import { MockBackend } from './mockBackend.js';

export class APIClient {
    #token = null;
    static #instance = null;
    #mockBackend = null;
    #isStaticHost = false;

    constructor() {
        if (APIClient.#instance) {
            return APIClient.#instance;
        }
        this.#token = localStorage.getItem('au_sms_token') || null;
        this.#mockBackend = MockBackend.getInstance();

        // Check if running in a static hosting environment like GitHub Pages
        const host = window.location.hostname || '';
        this.#isStaticHost = (
            host.endsWith('github.io') ||
            window.location.protocol === 'file:' ||
            localStorage.getItem('au_sms_force_mock') === 'true'
        );

        if (this.#isStaticHost) {
            console.log('%c[AU-SMS] Running in Standalone / GitHub Pages Mode with Client-Side Engine', 'color: #ff5722; font-weight: bold;');
        }

        APIClient.#instance = this;
    }

    static getInstance() {
        if (!APIClient.#instance) {
            APIClient.#instance = new APIClient();
        }
        return APIClient.#instance;
    }

    setToken(token) {
        this.#token = token;
        if (token) {
            localStorage.setItem('au_sms_token', token);
        } else {
            localStorage.removeItem('au_sms_token');
        }
    }

    getToken() {
        return this.#token;
    }

    clearToken() {
        this.setToken(null);
    }

    isStaticMode() {
        return this.#isStaticHost;
    }

    async request(endpoint, options = {}) {
        const method = (options.method || 'GET').toUpperCase();

        // 1. If explicitly on GitHub Pages or file://, route directly to MockBackend
        if (this.#isStaticHost) {
            return await this.#mockBackend.handleRequest(method, endpoint, options);
        }

        // 2. Otherwise attempt HTTP fetch to the Node.js Express backend
        const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        
        const headers = {
            ...(options.headers || {})
        };

        if (this.#token) {
            headers['Authorization'] = `Bearer ${this.#token}`;
        }

        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);

            // Handle CSV stream downloads
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/csv')) {
                const blob = await response.blob();
                return blob;
            }

            // If 404 or server unavailable, fall back to mock engine
            if (response.status === 404) {
                console.warn(`[APIClient] Server 404 on ${url}, falling back to client-side engine.`);
                this.#isStaticHost = true;
                return await this.#mockBackend.handleRequest(method, endpoint, options);
            }

            const data = await response.json();

            if (!response.ok) {
                const error = new Error(data.error || `HTTP error! status: ${response.status}`);
                error.statusCode = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            // Network failure (server not started or unreachable) -> Fall back to MockBackend
            if (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                console.warn(`[APIClient] Network request failed. Seamlessly falling back to client-side engine.`);
                this.#isStaticHost = true;
                return await this.#mockBackend.handleRequest(method, endpoint, options);
            }

            console.error(`[APIClient Error] ${method} ${url}:`, err);
            throw err;
        }
    }

    get(endpoint, params = {}) {
        const query = new URLSearchParams(params).toString();
        const url = query ? `${endpoint}?${query}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    post(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    put(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    upload(endpoint, formData) {
        return this.request(endpoint, {
            method: 'POST',
            body: formData
        });
    }
}
