// INVENTORY ======================

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

