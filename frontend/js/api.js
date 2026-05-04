// API base URL - auto-detect
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://localhost:3000/api`
    : `/api`;

async function apiFetch(endpoint, options = {}) {
    try {
        const res = await fetch(`${API}${endpoint}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error');
        return data;
    } catch (err) {
        throw err;
    }
}

const api = {
    get: (ep) => apiFetch(ep),
    post: (ep, body) => apiFetch(ep, { method: 'POST', body: JSON.stringify(body) }),
    put: (ep, body) => apiFetch(ep, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (ep) => apiFetch(ep, { method: 'DELETE' })
};
