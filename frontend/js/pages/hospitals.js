// HOSPITALS ======================

async function renderHospitals() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-header">
            <div><h2>Hospitals</h2><p>Registered hospitals and partner institutions</p></div>
            <button class="btn btn-primary" onclick="showAddHospitalModal()">+ Add Hospital</button>
        </div>
        <div class="card" id="hospitals-wrap">${loading()}</div>
    `;
    loadHospitals();
}

async function loadHospitals() {
    try {
        const rows = await api.get('/hospitals');
        document.getElementById('hospitals-wrap').innerHTML = rows.length === 0
            ? emptyState('🏥', 'No hospitals registered')
            : `<div class="table-container"><table>
                <thead><tr><th>ID</th><th>Hospital Name</th><th>City</th><th>Contact Person</th><th>Phone</th><th>Email</th></tr></thead>
                <tbody>${rows.map(h => `<tr>
                    <td>#${h.hospital_id}</td>
                    <td><strong>${escHtml(h.hospital_name)}</strong></td>
                    <td>${escHtml(h.city)}</td>
                    <td>${escHtml(h.contact_person) || '—'}</td>
                    <td>${escHtml(h.phone)}</td>
                    <td>${escHtml(h.email) || '—'}</td>
                </tr>`).join('')}</tbody></table></div>`;
    } catch (err) {
        document.getElementById('hospitals-wrap').innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function showAddHospitalModal() {
    showModal('Add Hospital', `
        <div id="hosp-msg"></div>
        <div class="form-group"><label>Hospital Name *</label><input type="text" id="h-name" placeholder="AIIMS Hospital"></div>
        <div class="form-row">
            <div class="form-group"><label>City *</label><input type="text" id="h-city" placeholder="Patiala"></div>
            <div class="form-group"><label>Phone *</label><input type="tel" id="h-phone" placeholder="0175-2212027"></div>
        </div>
        <div class="form-group"><label>Address</label><textarea id="h-addr" rows="2"></textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Contact Person</label><input type="text" id="h-person" placeholder="Dr. Sharma"></div>
            <div class="form-group"><label>Email</label><input type="email" id="h-email"></div>
        </div>
        <button class="btn btn-primary btn-full" onclick="submitHospital()">Add Hospital</button>
    `);
}

async function submitHospital() {
    const msg = document.getElementById('hosp-msg');
    const name = document.getElementById('h-name').value.trim();
    const city = document.getElementById('h-city').value.trim();
    const phone = document.getElementById('h-phone').value.trim();
    if (!name || !city || !phone) { msg.innerHTML = '<div class="error-msg">Name, city and phone are required.</div>'; return; }
    try {
        await api.post('/hospitals', { hospital_name: name, city, phone, address: document.getElementById('h-addr').value, contact_person: document.getElementById('h-person').value, email: document.getElementById('h-email').value });
        toast('Hospital added!', 'success');
        closeModal();
        loadHospitals();
    } catch (err) {
        msg.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

