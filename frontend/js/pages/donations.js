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

