// Donations page

async function renderDonations() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-header">
            <div><h2>Donation Records</h2><p>All blood donations collected by the system</p></div>
            <select id="don-days-filter" class="btn btn-secondary" onchange="loadDonationsPage()">
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365" selected>Last 1 year</option>
                <option value="3650">All time</option>
            </select>
        </div>
        <div class="card">
            <div id="donations-wrap">${loading()}</div>
        </div>
    `;
    loadDonationsPage();
}

async function loadDonationsPage() {
    const days = document.getElementById('don-days-filter')?.value || 365;
    const wrap = document.getElementById('donations-wrap');
    if (wrap) wrap.innerHTML = loading();
    try {
        const rows = await api.get(`/donations?days=${days}`);
        if (!rows.length) { wrap.innerHTML = emptyState('💉', 'No donations in this period'); return; }
        wrap.innerHTML = `<div class="table-container"><table>
            <thead><tr><th>Donor</th><th>Date</th><th>Blood Group</th><th>Qty (ml)</th><th>Hb</th><th>Camp</th><th>Unit Status</th><th>Expiry</th></tr></thead>
            <tbody>${rows.map(r => `<tr>
                <td><strong>${escHtml(r.donor_name)}</strong></td>
                <td>${formatDate(r.donation_date)}</td>
                <td><span class="badge badge-red">${r.blood_group}</span></td>
                <td>${r.quantity_ml}</td>
                <td>${r.hemoglobin ? r.hemoglobin + ' g/dL' : '—'}</td>
                <td>${escHtml(r.camp_name)}</td>
                <td>${statusBadge(r.unit_status)}</td>
                <td style="color:${new Date(r.expiry_date) < new Date() ? 'var(--red)' : ''}">
                    ${formatDate(r.expiry_date)}
                </td>
            </tr>`).join('')}</tbody></table></div>`;
    } catch (err) {
        wrap.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

// ====================== INVENTORY ======================

async function renderInventory() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-header">
            <div><h2>Blood Inventory</h2><p>Live stock of available blood units</p></div>
            <button class="btn btn-secondary" onclick="runExpireUnits()">🔄 Check Expiry</button>
        </div>
        <div id="inv-summary" class="mb-6">${loading()}</div>
        <div class="card">
            <div class="card-header"><div class="card-title">All Available Units</div></div>
            <div id="inv-detail">${loading()}</div>
        </div>
    `;
    loadInventory();
}

async function loadInventory() {
    try {
        const [summary, units] = await Promise.all([api.get('/inventory/summary'), api.get('/inventory')]);
        const maxVal = Math.max(...summary.map(s => s.available_units), 1);

        document.getElementById('inv-summary').innerHTML = `
            <div class="inventory-grid">
                ${summary.map(s => {
                    let cls = 'ok';
                    if (s.available_units === 0) cls = 'critical';
                    else if (s.available_units <= 3) cls = 'low';
                    return `<div class="blood-card ${cls}">
                        <div class="blood-group-label">${s.blood_group}</div>
                        <div class="blood-count">${s.available_units}</div>
                        <div class="blood-sub">available</div>
                        ${s.expiring_soon > 0 ? `<div class="blood-expiring">⏰ ${s.expiring_soon} expiring</div>` : ''}
                        ${s.expired_units > 0 ? `<div class="blood-expiring" style="color:var(--red)">🚫 ${s.expired_units} expired</div>` : ''}
                    </div>`;
                }).join('')}
            </div>
            <div class="card mt-4">
                <div class="card-header"><div class="card-title">Inventory Bar Chart</div></div>
                <div class="card-body">
                    <div class="chart-bar-wrap">
                        ${summary.map(s => `
                        <div class="chart-bar-row">
                            <div class="chart-bar-label">${s.blood_group}</div>
                            <div class="chart-bar-track">
                                <div class="chart-bar-fill" style="width:${Math.min((s.available_units/maxVal)*100, 100)}%">
                                    ${s.available_units > 0 ? `<span>${s.available_units}</span>` : ''}
                                </div>
                            </div>
                            <div class="chart-bar-count">${s.available_units} units</div>
                        </div>`).join('')}
                    </div>
                </div>
            </div>
        `;

        document.getElementById('inv-detail').innerHTML = units.length === 0
            ? emptyState('🏦', 'No available units', 'Record donations to add blood to inventory.')
            : `<div class="table-container"><table>
                <thead><tr><th>Unit ID</th><th>Blood Group</th><th>Qty (ml)</th><th>Collected</th><th>Expires</th><th>Days Left</th><th>Camp</th></tr></thead>
                <tbody>${units.map(u => {
                    const urgent = u.days_to_expiry <= 7;
                    return `<tr>
                        <td>#${u.unit_id}</td>
                        <td><span class="badge badge-red">${u.blood_group}</span></td>
                        <td>${u.quantity_ml}</td>
                        <td>${formatDate(u.collection_date)}</td>
                        <td>${formatDate(u.expiry_date)}</td>
                        <td style="color:${urgent ? 'var(--amber)' : 'var(--gray-700)'}; font-weight:${urgent ? '600' : '400'}">
                            ${u.days_to_expiry}d ${urgent ? '⚠️' : ''}
                        </td>
                        <td>${escHtml(u.camp_name)}</td>
                    </tr>`;
                }).join('')}</tbody></table></div>`;
    } catch (err) {
        document.getElementById('inv-summary').innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function runExpireUnits() {
    try {
        const res = await api.post('/inventory/expire', {});
        toast(`Expiry check complete. ${res.expired_count} unit(s) marked expired.`, res.expired_count > 0 ? 'error' : 'success');
        loadInventory();
    } catch (err) {
        toast('Failed to run expiry check: ' + err.message, 'error');
    }
}

// ====================== REQUESTS ======================

async function renderRequests() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-header">
            <div><h2>Blood Requests</h2><p>Manage hospital blood requests</p></div>
            <button class="btn btn-primary" onclick="showAddRequestModal()">+ New Request</button>
        </div>
        <div class="card">
            <div class="card-header">
                <select id="req-filter" class="btn btn-secondary" onchange="loadRequests()">
                    <option value="">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="partially_fulfilled">Partially Fulfilled</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>
            <div id="requests-wrap">${loading()}</div>
        </div>
    `;
    loadRequests();
}

async function loadRequests() {
    const status = document.getElementById('req-filter')?.value || '';
    const wrap = document.getElementById('requests-wrap');
    if (wrap) wrap.innerHTML = loading();
    try {
        const rows = await api.get(`/requests${status ? '?status=' + status : ''}`);
        if (!rows.length) { wrap.innerHTML = emptyState('📋', 'No requests found'); return; }
        wrap.innerHTML = `<div class="table-container"><table>
            <thead><tr><th>ID</th><th>Hospital</th><th>Blood</th><th>Units</th><th>Available</th><th>Patient</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>${rows.map(r => `<tr>
                <td>#${r.request_id}</td>
                <td><strong>${escHtml(r.hospital_name)}</strong><br><small>${escHtml(r.hospital_city)}</small></td>
                <td><span class="badge badge-red">${r.blood_group}</span></td>
                <td>${r.units_needed}</td>
                <td><strong style="color:${r.units_available >= r.units_needed ? 'var(--green)' : 'var(--red)'}">${r.units_available}</strong></td>
                <td>${escHtml(r.patient_name) || '—'}</td>
                <td>${priorityBadge(r.priority)}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${formatDate(r.requested_at)}</td>
                <td>
                    ${(r.status === 'pending' || r.status === 'partially_fulfilled') ? `
                    <div class="btn-actions">
                        <button class="btn btn-sm btn-green" onclick="issueBlood(${r.request_id})">Issue</button>
                        <button class="btn btn-sm btn-secondary" onclick="rejectRequest(${r.request_id})">Reject</button>
                    </div>` : '—'}
                </td>
            </tr>`).join('')}</tbody></table></div>`;
    } catch (err) {
        wrap.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

async function issueBlood(requestId) {
    if (!confirm(`Issue blood for request #${requestId}? This will assign available units using FIFO (oldest units first).`)) return;
    try {
        const res = await api.post(`/requests/${requestId}/issue`, { staff_id: window.currentUser?.staff_id || 1 });
        toast(res.message, 'success');
        loadRequests();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function rejectRequest(requestId) {
    if (!confirm('Reject this request?')) return;
    try {
        await api.put(`/requests/${requestId}/status`, { status: 'rejected', staff_id: window.currentUser?.staff_id || 1 });
        toast('Request rejected.', '');
        loadRequests();
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function showAddRequestModal() {
    const hospitals = await api.get('/hospitals');
    showModal('New Blood Request', `
        <div id="req-form-msg"></div>
        <div class="form-group"><label>Hospital *</label>
            <select id="req-hosp"><option value="">-- Select Hospital --</option>
                ${hospitals.map(h => `<option value="${h.hospital_id}">${escHtml(h.hospital_name)} (${escHtml(h.city)})</option>`).join('')}
            </select>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Blood Group *</label>
                <select id="req-bg"><option value="">-- Select --</option>${bloodGroupOptions()}</select>
            </div>
            <div class="form-group"><label>Units Needed *</label><input type="number" id="req-units" value="1" min="1" max="20"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Priority *</label>
                <select id="req-priority"><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select>
            </div>
            <div class="form-group"><label>Patient Age</label><input type="number" id="req-age" placeholder="35" min="1" max="120"></div>
        </div>
        <div class="form-group"><label>Patient Name</label><input type="text" id="req-patient" placeholder="Patient name"></div>
        <div class="form-group"><label>Reason / Diagnosis</label><input type="text" id="req-reason" placeholder="e.g. Surgery, Accident"></div>
        <button class="btn btn-primary btn-full" onclick="submitRequest()">Submit Request</button>
    `);
}

async function submitRequest() {
    const msg = document.getElementById('req-form-msg');
    const hospital_id = document.getElementById('req-hosp').value;
    const blood_group = document.getElementById('req-bg').value;
    const units_needed = document.getElementById('req-units').value;
    if (!hospital_id || !blood_group || !units_needed) {
        msg.innerHTML = '<div class="error-msg">Hospital, blood group and units are required.</div>'; return;
    }
    try {
        await api.post('/requests', {
            hospital_id: parseInt(hospital_id),
            blood_group,
            units_needed: parseInt(units_needed),
            priority: document.getElementById('req-priority').value,
            patient_name: document.getElementById('req-patient').value || null,
            patient_age: parseInt(document.getElementById('req-age').value) || null,
            reason: document.getElementById('req-reason').value || null
        });
        toast('Blood request submitted!', 'success');
        closeModal();
        loadRequests();
    } catch (err) {
        msg.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

// ====================== HOSPITALS ======================

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

// ====================== CAMPS ======================

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

// ====================== REPORTS ======================

async function renderReports() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-header"><div><h2>Reports & Analytics</h2><p>Blood group statistics and insights</p></div></div>
        <div id="reports-wrap">${loading()}</div>
    `;
    try {
        const stats = await api.get('/reports/blood-group-stats');
        const maxDonors = Math.max(...stats.map(s => s.total_donors), 1);
        document.getElementById('reports-wrap').innerHTML = `
            <div class="grid-2 mb-6">
                <div class="card">
                    <div class="card-header"><div class="card-title">Donors by Blood Group</div></div>
                    <div class="card-body">
                        <div class="chart-bar-wrap">
                            ${stats.map(s => `<div class="chart-bar-row">
                                <div class="chart-bar-label">${s.blood_group}</div>
                                <div class="chart-bar-track">
                                    <div class="chart-bar-fill" style="width:${Math.max((s.total_donors/maxDonors)*100,2)}%">
                                        ${s.total_donors > 0 ? `<span>${s.total_donors}</span>` : ''}
                                    </div>
                                </div>
                                <div class="chart-bar-count">${s.total_donors} donors</div>
                            </div>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header"><div class="card-title">Current Availability vs Demand</div></div>
                    <div class="card-body">
                        <div class="table-container"><table>
                            <thead><tr><th>Blood Group</th><th>Available</th><th>Pending Requests</th><th>Status</th></tr></thead>
                            <tbody>${stats.map(s => {
                                let status = '✅ OK';
                                let color = 'var(--green)';
                                if (s.pending_requests > 0 && s.currently_available === 0) { status = '🔴 Critical'; color = 'var(--red)'; }
                                else if (s.pending_requests > 0 && s.currently_available < s.pending_requests) { status = '⚠️ Low'; color = 'var(--amber)'; }
                                return `<tr>
                                    <td><span class="badge badge-red">${s.blood_group}</span></td>
                                    <td>${s.currently_available}</td>
                                    <td>${s.pending_requests}</td>
                                    <td style="color:${color}; font-weight:600">${status}</td>
                                </tr>`;
                            }).join('')}</tbody></table></div>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><div class="card-title">Full Blood Group Statistics</div></div>
                <div class="table-container"><table>
                    <thead><tr><th>Blood Group</th><th>Total Donors</th><th>Total Donations</th><th>Currently Available</th><th>Pending Requests</th></tr></thead>
                    <tbody>${stats.map(s => `<tr>
                        <td><span class="badge badge-red">${s.blood_group}</span></td>
                        <td>${s.total_donors}</td>
                        <td>${s.total_donations}</td>
                        <td><strong>${s.currently_available}</strong></td>
                        <td>${s.pending_requests > 0 ? `<span class="badge badge-amber">${s.pending_requests}</span>` : '0'}</td>
                    </tr>`).join('')}</tbody></table></div>
            </div>
        `;
    } catch (err) {
        document.getElementById('reports-wrap').innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}

// ====================== AUDIT LOG ======================

async function renderAudit() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
        <div class="page-header">
            <div><h2>Audit Log</h2><p>System activity trail — all actions are logged for accountability</p></div>
        </div>
        <div class="card" id="audit-wrap">${loading()}</div>
    `;
    try {
        const rows = await api.get('/audit-log');
        document.getElementById('audit-wrap').innerHTML = rows.length === 0
            ? emptyState('🔍', 'No audit records')
            : `<div class="table-container"><table>
                <thead><tr><th>ID</th><th>Action</th><th>Table</th><th>Record ID</th><th>Description</th><th>By</th><th>Timestamp</th></tr></thead>
                <tbody>${rows.map(r => `<tr>
                    <td>${r.log_id}</td>
                    <td><span class="badge badge-blue" style="font-size:10px">${escHtml(r.action_type)}</span></td>
                    <td><code style="font-size:12px;background:var(--gray-100);padding:2px 6px;border-radius:4px">${escHtml(r.table_name)}</code></td>
                    <td>${r.record_id || '—'}</td>
                    <td style="max-width:280px;white-space:normal">${escHtml(r.description)}</td>
                    <td>${escHtml(r.staff_name) || '<span class="text-muted">System</span>'}</td>
                    <td style="white-space:nowrap">${new Date(r.performed_at).toLocaleString('en-IN')}</td>
                </tr>`).join('')}</tbody></table></div>`;
    } catch (err) {
        document.getElementById('audit-wrap').innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
}
