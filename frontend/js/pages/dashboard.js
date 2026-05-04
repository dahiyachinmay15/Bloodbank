// Dashboard page

async function renderDashboard() {
    const content = document.getElementById('page-content');
    content.innerHTML = loading('Fetching live data...');

    try {
        const data = await api.get('/dashboard');
        const { inventory, stats, recentActivity } = data;

        // Calculate totals for alert section
        const totalAvail = inventory.reduce((s, r) => s + (r.available_units || 0), 0);
        const criticalGroups = inventory.filter(r => r.available_units <= 2);
        const expiringSoon = inventory.reduce((s, r) => s + (r.expiring_soon || 0), 0);

        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card red">
                    <div class="stat-label">Total Donors</div>
                    <div class="stat-value">${stats.totalDonors}</div>
                    <div class="stat-sub">Registered in system</div>
                </div>
                <div class="stat-card green">
                    <div class="stat-label">Total Donations</div>
                    <div class="stat-value">${stats.totalDonations}</div>
                    <div class="stat-sub">Recorded donations</div>
                </div>
                <div class="stat-card blue">
                    <div class="stat-label">Units Available</div>
                    <div class="stat-value">${totalAvail}</div>
                    <div class="stat-sub">Ready for issue</div>
                </div>
                <div class="stat-card amber">
                    <div class="stat-label">Pending Requests</div>
                    <div class="stat-value">${stats.pendingRequests}</div>
                    <div class="stat-sub">Awaiting action</div>
                </div>
            </div>

            ${criticalGroups.length > 0 ? `
            <div class="card mb-6" style="border-left: 3px solid var(--red)">
                <div class="card-body" style="padding: 14px 20px">
                    <strong>⚠️ Critical Stock Alert:</strong>
                    ${criticalGroups.map(g => `<span class="badge badge-red" style="margin-left:6px">${g.blood_group} (${g.available_units} units)</span>`).join('')}
                    &nbsp; — Consider arranging a blood camp or contacting eligible donors.
                </div>
            </div>` : ''}

            ${expiringSoon > 0 ? `
            <div class="card mb-6" style="border-left: 3px solid var(--amber)">
                <div class="card-body" style="padding: 14px 20px">
                    <strong>⏰ Expiry Alert:</strong> ${expiringSoon} unit(s) expiring within 7 days. Prioritize these in blood requests.
                </div>
            </div>` : ''}

            <div class="grid-2 mb-6">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Blood Inventory Overview</div>
                        <button class="btn btn-sm btn-secondary" onclick="navigate('inventory')">View All</button>
                    </div>
                    <div class="card-body">
                        <div class="inventory-grid">
                            ${inventory.map(row => {
                                let cardClass = 'ok';
                                if (row.available_units === 0) cardClass = 'critical';
                                else if (row.available_units <= 3) cardClass = 'low';
                                return `
                                <div class="blood-card ${cardClass}">
                                    <div class="blood-group-label">${row.blood_group}</div>
                                    <div class="blood-count">${row.available_units}</div>
                                    <div class="blood-sub">units</div>
                                    ${row.expiring_soon > 0 ? `<div class="blood-expiring">⏰ ${row.expiring_soon} expiring</div>` : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Recent Donations</div>
                        <button class="btn btn-sm btn-secondary" onclick="navigate('donations')">View All</button>
                    </div>
                    <div class="card-body">
                        ${recentActivity.length === 0 ? emptyState('💉', 'No recent donations') : `
                        <div class="chart-bar-wrap">
                            ${recentActivity.map(a => `
                            <div style="display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid var(--gray-100)">
                                <span class="badge badge-red">${escHtml(a.blood_group)}</span>
                                <div style="flex:1">
                                    <div style="font-weight:500; font-size:13px">${escHtml(a.name)}</div>
                                    <div style="font-size:11px; color:var(--gray-400)">${formatDate(a.date)}</div>
                                </div>
                            </div>`).join('')}
                        </div>`}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="card-title">Urgent & Pending Requests</div>
                    <button class="btn btn-sm btn-primary" onclick="navigate('requests')">Manage Requests</button>
                </div>
                <div id="urgent-requests-preview">
                    ${loading('Loading requests...')}
                </div>
            </div>
        `;

        // Load urgent requests
        try {
            const urgent = await api.get('/requests/urgent');
            const preview = urgent.slice(0, 5);
            document.getElementById('urgent-requests-preview').innerHTML = preview.length === 0
                ? `<div class="card-body">${emptyState('✅', 'No pending requests', 'All requests have been processed.')}</div>`
                : `<div class="table-container"><table>
                    <thead><tr><th>Hospital</th><th>Blood Group</th><th>Units Needed</th><th>Available</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>${preview.map(r => `<tr>
                        <td><strong>${escHtml(r.hospital_name)}</strong><br><small class="text-muted">${escHtml(r.city)}</small></td>
                        <td><span class="badge badge-red">${r.blood_group}</span></td>
                        <td>${r.units_needed}</td>
                        <td><span style="color:${r.units_available >= r.units_needed ? 'var(--green)' : 'var(--red)'}; font-weight:600">${r.units_available}</span></td>
                        <td>${priorityBadge(r.priority)}</td>
                        <td>${statusBadge(r.status)}</td>
                        <td>${formatDate(r.requested_at)}</td>
                    </tr>`).join('')}</tbody></table></div>`;
        } catch (e) {
            document.getElementById('urgent-requests-preview').innerHTML = `<div class="card-body text-muted">Could not load requests.</div>`;
        }

    } catch (err) {
        content.innerHTML = `<div class="error-msg">Failed to load dashboard: ${err.message}</div>`;
    }
}
