// Main app controller

window.currentUser = null;

const pages = {
    dashboard: { title: 'Dashboard', render: renderDashboard },
    donors: { title: 'Donors', render: renderDonors },
    donations: { title: 'Donation Records', render: renderDonations },
    inventory: { title: 'Blood Inventory', render: renderInventory },
    requests: { title: 'Blood Requests', render: renderRequests },
    hospitals: { title: 'Hospitals', render: renderHospitals },
    camps: { title: 'Blood Camps', render: renderCamps },
    reports: { title: 'Reports & Analytics', render: renderReports },
    audit: { title: 'Audit Log', render: renderAudit }
};

function navigate(pageName) {
    const page = pages[pageName];
    if (!page) return;

    // Update nav highlight
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === pageName);
    });

    document.getElementById('page-title').textContent = page.title;
    document.getElementById('page-content').innerHTML = '';
    page.render();

    // Close sidebar on mobile
    if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function logout() {
    if (!confirm('Sign out?')) return;
    window.currentUser = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

// Login
document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';

    try {
        const res = await api.post('/auth/login', { email, password });
        window.currentUser = res.staff;
        document.getElementById('user-name').textContent = res.staff.full_name;
        document.getElementById('user-role').textContent = res.staff.role === 'admin' ? 'Administrator' : 'Staff';
        document.getElementById('user-avatar').textContent = res.staff.full_name.charAt(0).toUpperCase();

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        navigate('dashboard');
    } catch (err) {
        errEl.textContent = err.message || 'Invalid email or password';
        errEl.style.display = 'block';
    }
});

// Nav click handlers
document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        navigate(el.dataset.page);
    });
});

// Current date in topbar
document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
});

// Keyboard close modal
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
