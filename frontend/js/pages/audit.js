// AUDIT LOG ======================

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
