// Donors page

async function renderDonors() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-header">
            <div>
                <h2>Donors</h2>
                <p>Manage donor registrations and eligibility</p>
            </div>
            <button class="btn btn-primary" onclick="showAddDonorModal()">+ Register Donor</button>
        </div>
        <div class="card">
            <div class="card-header">
                <div class="search-bar" style="width:100%;margin:0">
                    <input type="text" class="search-input" id="donor-search" placeholder="Search by name, phone, email..." oninput="filterDonors()">
                    <select id="donor-bg-filter" class="search-input" style="max-width:100px" onchange="filterDonors()">
                        <option value="">All Groups</option>
                        ${bloodGroupOptions()}
                    </select>
                    <select id="donor-eligible-filter" class="search-input" style="max-width:130px" onchange="filterDonors()">
                        <option value="">All Status</option>
                        <option value="1">Eligible Only</option>
                        <option value="0">Ineligible Only</option>
                    </select>
                </div>
            </div>
            <div id="donors-table-wrap">${loading()}</div>
        </div>
    `;
    loadDonors();
}

let allDonors = [];

async function loadDonors() {
    try {
        allDonors = await api.get('/donors');
        renderDonorsTable(allDonors);
    } catch (err) {
        document.getElementById('donors-table-wrap').innerHTML = `<div class="error-msg">Error: ${err.message}</div>`;
    }
}

function filterDonors() {
    const search = document.getElementById('donor-search').value.toLowerCase();
    const bg = document.getElementById('donor-bg-filter').value;
    const eligible = document.getElementById('donor-eligible-filter').value;
    let filtered = allDonors;
    if (search) filtered = filtered.filter(d =>
        d.full_name?.toLowerCase().includes(search) ||
        d.phone?.includes(search) ||
        d.email?.toLowerCase().includes(search)
    );
    if (bg) filtered = filtered.filter(d => d.blood_group === bg);
    if (eligible !== '') filtered = filtered.filter(d => String(d.actually_eligible) === eligible);
    renderDonorsTable(filtered);
}

function renderDonorsTable(donors) {
    const wrap = document.getElementById('donors-table-wrap');
    if (!donors.length) { wrap.innerHTML = emptyState('👤', 'No donors found', 'Register the first donor using the button above.'); return; }
    wrap.innerHTML = `<div class="table-container"><table>
        <thead><tr><th>#</th><th>Name</th><th>Blood Group</th><th>Phone</th><th>City</th><th>Eligible</th><th>Last Donation</th><th>Donations</th><th>Actions</th></tr></thead>
        <tbody>${donors.map(d => `<tr>
            <td>${d.donor_id}</td>
            <td><strong>${escHtml(d.full_name)}</strong><br><small class="text-muted">${d.gender}</small></td>
            <td><span class="badge badge-red">${d.blood_group}</span></td>
            <td>${escHtml(d.phone)}</td>
            <td>${escHtml(d.city) || '—'}</td>
            <td>
                <span class="eligible-dot ${d.actually_eligible ? 'yes' : 'no'}"></span>
                ${d.actually_eligible ? 'Yes' : 'No'}
            </td>
            <td>${d.last_donation_date ? formatDate(d.last_donation_date) : '<span class="text-muted">Never</span>'}</td>
            <td>${d.total_donations}</td>
            <td><div class="btn-actions">
                <button class="btn btn-sm btn-secondary" onclick="viewDonor(${d.donor_id})">View</button>
                ${d.actually_eligible ? `<button class="btn btn-sm btn-green" onclick="showRecordDonationModal(${d.donor_id}, '${escHtml(d.full_name)}', '${d.blood_group}')">Donate</button>` : ''}
            </div></td>
        </tr>`).join('')}</tbody></table></div>`;
}

function showAddDonorModal() {
    showModal('Register New Donor', `
        <div id="donor-form-msg"></div>
        <div class="form-row">
            <div class="form-group"><label>Full Name *</label><input type="text" id="d-name" placeholder="Ravi Kumar"></div>
            <div class="form-group"><label>Date of Birth *</label><input type="date" id="d-dob" max="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Gender *</label>
                <select id="d-gender"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
            </div>
            <div class="form-group"><label>Blood Group *</label>
                <select id="d-bg"><option value="">-- Select --</option>${bloodGroupOptions()}</select>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Phone *</label><input type="tel" id="d-phone" placeholder="9876543210" maxlength="15"></div>
            <div class="form-group"><label>Email</label><input type="email" id="d-email" placeholder="donor@email.com"></div>
        </div>
        <div class="form-group"><label>Address</label><textarea id="d-address" rows="2" placeholder="Full address"></textarea></div>
        <div class="form-row">
            <div class="form-group"><label>City</label><input type="text" id="d-city" placeholder="Patiala"></div>
            <div class="form-group"><label>PIN Code</label><input type="text" id="d-pin" placeholder="147001" maxlength="10"></div>
        </div>
        <button class="btn btn-primary btn-full" onclick="submitAddDonor()">Register Donor</button>
    `);
}

async function submitAddDonor() {
    const msgEl = document.getElementById('donor-form-msg');
    const body = {
        full_name: document.getElementById('d-name').value.trim(),
        dob: document.getElementById('d-dob').value,
        gender: document.getElementById('d-gender').value,
        blood_group: document.getElementById('d-bg').value,
        phone: document.getElementById('d-phone').value.trim(),
        email: document.getElementById('d-email').value.trim(),
        address: document.getElementById('d-address').value.trim(),
        city: document.getElementById('d-city').value.trim(),
        pin_code: document.getElementById('d-pin').value.trim()
    };
    if (!body.full_name || !body.dob || !body.blood_group || !body.phone) {
        msgEl.innerHTML = '<div class="error-msg">Please fill all required fields (*).</div>';
        return;
    }
    try {
        const res = await api.post('/donors', body);
        toast('Donor registered successfully! 🎉', 'success');
        closeModal();
        loadDonors();
    } catch (err) {
        msgEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function viewDonor(id) {
    showModal('Donor Details', loading('Fetching donor info...'));
    try {
        const d = await api.get(`/donors/${id}`);
        document.getElementById('modal-body').innerHTML = `
            <div class="detail-grid mb-4">
                <div class="detail-item"><label>Full Name</label><span>${escHtml(d.full_name)}</span></div>
                <div class="detail-item"><label>Blood Group</label><span><span class="badge badge-red">${d.blood_group}</span></span></div>
                <div class="detail-item"><label>Date of Birth</label><span>${formatDate(d.dob)}</span></div>
                <div class="detail-item"><label>Gender</label><span style="text-transform:capitalize">${d.gender}</span></div>
                <div class="detail-item"><label>Phone</label><span>${escHtml(d.phone)}</span></div>
                <div class="detail-item"><label>Email</label><span>${escHtml(d.email) || '—'}</span></div>
                <div class="detail-item"><label>City</label><span>${escHtml(d.city) || '—'}</span></div>
                <div class="detail-item"><label>Eligible to Donate</label><span>${d.actually_eligible ? '✅ Yes' : '❌ No (must wait 90 days)'}</span></div>
                <div class="detail-item"><label>Last Donation</label><span>${formatDate(d.last_donation_date)}</span></div>
                <div class="detail-item"><label>Total Donations</label><span>${d.total_donations}</span></div>
            </div>
            <h4 style="margin-bottom:10px;font-size:14px;color:var(--gray-600)">Donation History</h4>
            ${d.donations.length === 0 ? emptyState('💉', 'No donations yet') : `
            <div class="table-container"><table>
                <thead><tr><th>Date</th><th>Blood Group</th><th>Qty (ml)</th><th>Camp</th><th>Unit Status</th></tr></thead>
                <tbody>${d.donations.map(don => `<tr>
                    <td>${formatDate(don.donation_date)}</td>
                    <td><span class="badge badge-red">${don.blood_group}</span></td>
                    <td>${don.quantity_ml}</td>
                    <td>${escHtml(don.camp_name)}</td>
                    <td>${statusBadge(don.unit_status)}</td>
                </tr>`).join('')}</tbody></table></div>`}
        `;
    } catch (err) {
        document.getElementById('modal-body').innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

function showRecordDonationModal(donorId, name, bloodGroup) {
    showModal(`Record Donation — ${name}`, `
        <div id="donate-msg"></div>
        <div class="form-row">
            <div class="form-group"><label>Blood Group</label>
                <select id="don-bg"><option value="">-- Select --</option>${bloodGroupOptions(bloodGroup)}</select>
            </div>
            <div class="form-group"><label>Quantity (ml)</label>
                <input type="number" id="don-qty" value="450" min="200" max="500">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Hemoglobin (g/dL) *</label><input type="number" id="don-hb" step="0.1" placeholder="13.5" min="10" max="20"></div>
            <div class="form-group"><label>Weight (kg) *</label><input type="number" id="don-wt" step="0.1" placeholder="65" min="40" max="200"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>BP Systolic</label><input type="number" id="don-sys" placeholder="120"></div>
            <div class="form-group"><label>BP Diastolic</label><input type="number" id="don-dia" placeholder="80"></div>
        </div>
        <div class="form-group"><label>Camp (optional)</label>
            <select id="don-camp"><option value="">Walk-in / No Camp</option></select>
        </div>
        <button class="btn btn-primary btn-full" onclick="submitDonation(${donorId})">Record Donation</button>
    `);

    // Load camps
    api.get('/camps').then(camps => {
        const sel = document.getElementById('don-camp');
        if (!sel) return;
        camps.filter(c => c.status !== 'cancelled').forEach(c => {
            sel.innerHTML += `<option value="${c.camp_id}">${escHtml(c.camp_name)} (${formatDate(c.camp_date)})</option>`;
        });
    });
}

async function submitDonation(donorId) {
    const msg = document.getElementById('donate-msg');
    const hb = parseFloat(document.getElementById('don-hb').value);
    const wt = parseFloat(document.getElementById('don-wt').value);
    const bg = document.getElementById('don-bg').value;
    if (!bg || !hb || !wt) { msg.innerHTML = '<div class="error-msg">Blood group, hemoglobin and weight are required.</div>'; return; }

    try {
        const res = await api.post('/donations', {
            donor_id: donorId,
            blood_group: bg,
            quantity_ml: parseInt(document.getElementById('don-qty').value) || 450,
            camp_id: document.getElementById('don-camp').value || null,
            staff_id: window.currentUser?.staff_id || 1,
            hemoglobin: hb,
            weight: wt,
            bp_systolic: parseInt(document.getElementById('don-sys').value) || null,
            bp_diastolic: parseInt(document.getElementById('don-dia').value) || null
        });
        toast('Donation recorded! Blood unit added to inventory. 💉', 'success');
        closeModal();
        loadDonors();
    } catch (err) {
        msg.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}
