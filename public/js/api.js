// ==============================================================================
// OOP CONCEPT: ENCAPSULATION & API CLIENT ABSTRACTION
// File: public/js/api.js
// 
// Encapsulates HTTP communication with the Node.js backend.
// Token headers, JSON payloads, and network error reporting are managed here.
// ==============================================================================

export class APIClient {
    #token = null;
    static #instance = null;

    constructor() {
        if (APIClient.#instance) {
            return APIClient.#instance;
        }
        this.#token = localStorage.getItem('au_sms_token') || null;
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

    async request(endpoint, options = {}) {
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

            const data = await response.json();

            if (!response.ok) {
                const error = new Error(data.error || `HTTP error! status: ${response.status}`);
                error.statusCode = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            console.error(`[APIClient Error] ${options.method || 'GET'} ${url}:`, err);
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
