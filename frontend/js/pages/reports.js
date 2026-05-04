// REPORTS ======================

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

