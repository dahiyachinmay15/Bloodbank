// REQUESTS ======================

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

