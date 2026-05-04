// Shared utility functions

function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    el.style.display = 'block';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.style.display = 'none', 3500);
}

function showModal(title, bodyHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysAgo(d) {
    if (!d) return '';
    const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
}

function priorityBadge(p) {
    const map = { critical: 'badge-red', urgent: 'badge-amber', normal: 'badge-gray' };
    return `<span class="badge ${map[p] || 'badge-gray'}">${p?.toUpperCase() || ''}</span>`;
}

function statusBadge(s) {
    const map = {
        available: 'badge-green', issued: 'badge-gray', expired: 'badge-red', discarded: 'badge-red',
        pending: 'badge-amber', fulfilled: 'badge-green', rejected: 'badge-red',
        partially_fulfilled: 'badge-blue', approved: 'badge-blue', cancelled: 'badge-gray',
        upcoming: 'badge-blue', ongoing: 'badge-green', completed: 'badge-green'
    };
    return `<span class="badge ${map[s] || 'badge-gray'}">${(s || '').replace(/_/g, ' ')}</span>`;
}

function bloodGroupOptions(selected = '') {
    const groups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
    return groups.map(g => `<option value="${g}" ${g === selected ? 'selected' : ''}>${g}</option>`).join('');
}

function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function loading(msg = 'Loading...') {
    return `<div class="loading">⏳ ${msg}</div>`;
}

function emptyState(icon, title, sub = '') {
    return `<div class="empty-state"><div class="empty-state-icon">${icon}</div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>`;
}
