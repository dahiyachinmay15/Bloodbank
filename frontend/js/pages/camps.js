// CAMPS ======================

async function renderCamps() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-header">
            <div><h2>Blood Donation Camps</h2><p>Upcoming and past donation drives</p></div>
            <button class="btn btn-primary" onclick="showAddCampModal()">+ Schedule Camp</button>
        </div>
        <div class="card" id="camps-wrap">${loading()}</div>
    `;
    loadCamps();
}

async function loadCamps() {
    try {
        const rows = await api.get('/camps');
        document.getElementById('camps-wrap').innerHTML = rows.length === 0
            ? emptyState('⛺', 'No camps scheduled')
            : `<div class="table-container"><table>
                <thead><tr><th>Camp Name</th><th>Location</th><th>City</th><th>Date</th><th>Organizer</th><th>Status</th><th>Donations</th></tr></thead>
                <tbody>${rows.map(c => `<tr>
                    <td><strong>${escHtml(c.camp_name)}</strong></td>
                    <td>${escHtml(c.location)}</td>
                    <td>${escHtml(c.city)}</td>
                    <td>${formatDate(c.camp_date)}</td>
                    <td>${escHtml(c.organizer) || '—'}</td>
                    <td>${statusBadge(c.status)}</td>
                    <td>${c.total_donations}</td>
                </tr>`).join('')}</tbody></table></div>`;
    } catch (err) {
        document.getElementById('camps-wrap').innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function showAddCampModal() {
    showModal('Schedule Blood Camp', `
        <div id="camp-msg"></div>
        <div class="form-group"><label>Camp Name *</label><input type="text" id="c-name" placeholder="NSS Blood Drive 2026"></div>
        <div class="form-group"><label>Location *</label><input type="text" id="c-loc" placeholder="Thapar Institute Auditorium"></div>
        <div class="form-row">
            <div class="form-group"><label>City *</label><input type="text" id="c-city" placeholder="Patiala"></div>
            <div class="form-group"><label>Date *</label><input type="date" id="c-date"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Organizer</label><input type="text" id="c-org" placeholder="NSS Thapar"></div>
            <div class="form-group"><label>Contact Phone</label><input type="tel" id="c-phone" placeholder="9876500000"></div>
        </div>
        <button class="btn btn-primary btn-full" onclick="submitCamp()">Schedule Camp</button>
    `);
}

async function submitCamp() {
    const msg = document.getElementById('camp-msg');
    const name = document.getElementById('c-name').value.trim();
    const loc = document.getElementById('c-loc').value.trim();
    const city = document.getElementById('c-city').value.trim();
    const date = document.getElementById('c-date').value;
    if (!name || !loc || !city || !date) { msg.innerHTML = '<div class="error-msg">All starred fields are required.</div>'; return; }
    try {
        await api.post('/camps', { camp_name: name, location: loc, city, camp_date: date, organizer: document.getElementById('c-org').value, contact_phone: document.getElementById('c-phone').value });
        toast('Camp scheduled!', 'success');
        closeModal();
        loadCamps();
    } catch (err) {
        msg.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

