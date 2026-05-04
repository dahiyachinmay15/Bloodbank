require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// DB connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blood_bank_db',
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '+05:30'
});

// Test connection on startup
pool.getConnection()
    .then(conn => { console.log('MySQL connected'); conn.release(); })
    .catch(err => { console.error('MySQL connection failed:', err.message); process.exit(1); });

// Helper to run queries
async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// ===================== DASHBOARD =====================
app.get('/api/dashboard', async (req, res) => {
    try {
        // Run inventory summary stored procedure
        const [inventory] = await pool.query('CALL sp_inventory_summary()');

        const totalDonors = await query('SELECT COUNT(*) AS cnt FROM donor');
        const totalDonations = await query('SELECT COUNT(*) AS cnt FROM donation');
        const pendingRequests = await query("SELECT COUNT(*) AS cnt FROM blood_request WHERE status IN ('pending','partially_fulfilled')");
        const recentActivity = await query(`
            SELECT 'Donation' AS type, d.full_name AS name, don.donation_date AS date, bu.blood_group
            FROM donation don JOIN donor d ON d.donor_id = don.donor_id
            JOIN blood_unit bu ON bu.unit_id = don.unit_id
            ORDER BY don.created_at DESC LIMIT 5
        `);

        res.json({
            inventory: inventory[0],
            stats: {
                totalDonors: totalDonors[0].cnt,
                totalDonations: totalDonations[0].cnt,
                pendingRequests: pendingRequests[0].cnt
            },
            recentActivity
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== DONORS =====================
app.get('/api/donors', async (req, res) => {
    try {
        const { search, blood_group, city } = req.query;
        let sql = `SELECT d.*, fn_is_donor_eligible(d.donor_id) AS actually_eligible,
                   fn_donor_donation_count(d.donor_id) AS total_donations
                   FROM donor d WHERE 1=1`;
        const params = [];
        if (search) { sql += ' AND (d.full_name LIKE ? OR d.phone LIKE ? OR d.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (blood_group) { sql += ' AND d.blood_group = ?'; params.push(blood_group); }
        if (city) { sql += ' AND d.city LIKE ?'; params.push(`%${city}%`); }
        sql += ' ORDER BY d.registered_at DESC';
        const rows = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/donors/:id', async (req, res) => {
    try {
        const [donor] = await query('SELECT *, fn_is_donor_eligible(donor_id) AS actually_eligible, fn_donor_donation_count(donor_id) AS total_donations FROM donor WHERE donor_id = ?', [req.params.id]);
        if (!donor) return res.status(404).json({ error: 'Donor not found' });
        const donations = await query(`SELECT don.*, bu.blood_group, bu.quantity_ml, bu.status AS unit_status, COALESCE(c.camp_name,'Walk-in') AS camp_name FROM donation don JOIN blood_unit bu ON bu.unit_id = don.unit_id LEFT JOIN blood_camp c ON c.camp_id = don.camp_id WHERE don.donor_id = ? ORDER BY don.donation_date DESC`, [req.params.id]);
        res.json({ ...donor, donations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/donors', async (req, res) => {
    try {
        const { full_name, dob, gender, blood_group, phone, email, address, city, pin_code } = req.body;
        const conn = await pool.getConnection();
        try {
            await conn.execute('SET @out_id = 0, @out_msg = ""');
            await conn.execute(
                'CALL sp_register_donor(?,?,?,?,?,?,?,?,?, @out_id, @out_msg)',
                [full_name, dob, gender, blood_group, phone, email || null, address || null, city || null, pin_code || null]
            );
            const [[result]] = await conn.execute('SELECT @out_id AS donor_id, @out_msg AS message');
            if (result.donor_id === -1) return res.status(400).json({ error: result.message });
            res.json({ success: true, donor_id: result.donor_id, message: result.message });
        } finally { conn.release(); }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/donors/:id', async (req, res) => {
    try {
        const { full_name, phone, email, address, city, pin_code } = req.body;
        await query('UPDATE donor SET full_name=?, phone=?, email=?, address=?, city=?, pin_code=? WHERE donor_id=?',
            [full_name, phone, email, address, city, pin_code, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== DONATIONS =====================
app.post('/api/donations', async (req, res) => {
    try {
        const { donor_id, blood_group, quantity_ml, camp_id, staff_id, hemoglobin, bp_systolic, bp_diastolic, weight } = req.body;
        const conn = await pool.getConnection();
        try {
            await conn.execute('SET @out_unit = 0, @out_msg = ""');
            await conn.execute(
                'CALL sp_record_donation(?,?,?,?,?,?,?,?,?, @out_unit, @out_msg)',
                [donor_id, blood_group, quantity_ml || 450, camp_id || null, staff_id || 1,
                 hemoglobin, bp_systolic || null, bp_diastolic || null, weight]
            );
            const [[result]] = await conn.execute('SELECT @out_unit AS unit_id, @out_msg AS message');
            if (result.unit_id === -1) return res.status(400).json({ error: result.message });
            res.json({ success: true, unit_id: result.unit_id, message: result.message });
        } finally { conn.release(); }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/donations', async (req, res) => {
    try {
        const days = req.query.days || 365;
        const conn = await pool.getConnection();
        try {
            const [results] = await conn.query('CALL sp_donation_report(?)', [parseInt(days)]);
            res.json(results[0]);
        } finally { conn.release(); }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== INVENTORY =====================
app.get('/api/inventory', async (req, res) => {
    try {
        const rows = await query(`
            SELECT bu.*, COALESCE(c.camp_name,'Walk-in') AS camp_name,
            DATEDIFF(bu.expiry_date, CURDATE()) AS days_to_expiry
            FROM blood_unit bu
            LEFT JOIN blood_camp c ON c.camp_id = bu.camp_id
            WHERE bu.status = 'available' AND bu.expiry_date >= CURDATE()
            ORDER BY bu.expiry_date ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/inventory/summary', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM vw_inventory');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/inventory/check/:blood_group', async (req, res) => {
    try {
        const [[result]] = await pool.execute('SELECT fn_available_units(?) AS available_units', [req.params.blood_group]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inventory/expire', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        try {
            await conn.execute('SET @cnt = 0');
            await conn.execute('CALL sp_mark_expired_units(@cnt)');
            const [[r]] = await conn.execute('SELECT @cnt AS expired_count');
            res.json({ success: true, expired_count: r.expired_count });
        } finally { conn.release(); }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== HOSPITALS =====================
app.get('/api/hospitals', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM hospital ORDER BY hospital_name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/hospitals', async (req, res) => {
    try {
        const { hospital_name, city, address, contact_person, phone, email } = req.body;
        const result = await query(
            'INSERT INTO hospital (hospital_name, city, address, contact_person, phone, email) VALUES (?,?,?,?,?,?)',
            [hospital_name, city, address || null, contact_person || null, phone, email || null]
        );
        res.json({ success: true, hospital_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== BLOOD REQUESTS =====================
app.get('/api/requests', async (req, res) => {
    try {
        const { status } = req.query;
        let sql = `SELECT r.*, h.hospital_name, h.city AS hospital_city,
                   fn_available_units(r.blood_group) AS units_available,
                   s.full_name AS processed_by
                   FROM blood_request r
                   JOIN hospital h ON h.hospital_id = r.hospital_id
                   LEFT JOIN staff s ON s.staff_id = r.staff_id`;
        const params = [];
        if (status) { sql += ' WHERE r.status = ?'; params.push(status); }
        sql += ' ORDER BY FIELD(r.priority,"critical","urgent","normal"), r.requested_at DESC';
        const rows = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/requests/urgent', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM vw_urgent_requests');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/requests', async (req, res) => {
    try {
        const { hospital_id, blood_group, units_needed, priority, patient_name, patient_age, reason } = req.body;
        const result = await query(
            'INSERT INTO blood_request (hospital_id, blood_group, units_needed, priority, patient_name, patient_age, reason) VALUES (?,?,?,?,?,?,?)',
            [hospital_id, blood_group, units_needed || 1, priority || 'normal', patient_name || null, patient_age || null, reason || null]
        );
        res.json({ success: true, request_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/requests/:id/issue', async (req, res) => {
    try {
        const { staff_id } = req.body;
        const conn = await pool.getConnection();
        try {
            await conn.execute('SET @issued = 0, @msg = ""');
            await conn.execute('CALL sp_issue_blood(?,?, @issued, @msg)', [req.params.id, staff_id || 1]);
            const [[result]] = await conn.execute('SELECT @issued AS issued_count, @msg AS message');
            if (result.issued_count === -1) return res.status(400).json({ error: result.message });
            res.json({ success: true, issued_count: result.issued_count, message: result.message });
        } finally { conn.release(); }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/requests/:id/status', async (req, res) => {
    try {
        const { status, staff_id } = req.body;
        await query('UPDATE blood_request SET status=?, staff_id=? WHERE request_id=?', [status, staff_id || 1, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== BLOOD CAMPS =====================
app.get('/api/camps', async (req, res) => {
    try {
        const rows = await query(`SELECT c.*, COUNT(d.donation_id) AS total_donations FROM blood_camp c LEFT JOIN donation d ON d.camp_id = c.camp_id GROUP BY c.camp_id ORDER BY c.camp_date DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/camps', async (req, res) => {
    try {
        const { camp_name, location, city, camp_date, organizer, contact_phone } = req.body;
        const result = await query(
            'INSERT INTO blood_camp (camp_name, location, city, camp_date, organizer, contact_phone) VALUES (?,?,?,?,?,?)',
            [camp_name, location, city, camp_date, organizer || null, contact_phone || null]
        );
        res.json({ success: true, camp_id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== REPORTS & AUDIT =====================
app.get('/api/audit-log', async (req, res) => {
    try {
        const rows = await query(`SELECT al.*, s.full_name AS staff_name FROM audit_log al LEFT JOIN staff s ON s.staff_id = al.performed_by ORDER BY al.performed_at DESC LIMIT 100`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/blood-group-stats', async (req, res) => {
    try {
        const rows = await query(`
            SELECT bg.blood_group,
                COUNT(DISTINCT d.donor_id) AS total_donors,
                COUNT(don.donation_id) AS total_donations,
                fn_available_units(bg.blood_group) AS currently_available,
                COUNT(CASE WHEN r.status IN ('pending','partially_fulfilled') THEN 1 END) AS pending_requests
            FROM blood_group_ref bg
            LEFT JOIN donor d ON d.blood_group = bg.blood_group
            LEFT JOIN donation don ON don.donor_id = d.donor_id
            LEFT JOIN blood_request r ON r.blood_group = bg.blood_group
            GROUP BY bg.blood_group ORDER BY bg.blood_group
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===================== AUTH (simple demo) =====================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [staff] = await query(
            'SELECT staff_id, full_name, email, role FROM staff WHERE email=? AND password_hash=SHA2(?,256)',
            [email, password]
        );
        if (!staff) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ success: true, staff });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Catch-all: serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Blood Bank API running on http://localhost:${PORT}`));
