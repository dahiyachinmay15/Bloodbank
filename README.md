# Blood Bank Management System
**Thapar Institute of Engineering & Technology, Patiala**  
UCS310 – Database Management Systems | 2026–27  
Group: Chinmay (1024030664), Aksh Kaushik (1024030660), Rahil Yadav (1024030786)  
Lab Instructor: Dr. Ananya Pandey

---

## What This Project Covers

- **3NF Normalized** relational schema (8 tables: donor, blood_unit, donation, hospital, blood_request, blood_issue, blood_camp, audit_log)
- **Stored Procedures**: sp_register_donor, sp_record_donation, sp_issue_blood, sp_mark_expired_units, sp_inventory_summary, sp_donation_report
- **Functions**: fn_available_units, fn_is_donor_eligible, fn_donor_donation_count
- **Triggers**: auto-mark donor ineligible post-donation, expiry check before issue, audit trail after issue, request status logging
- **Cursor**: FIFO blood unit selection in sp_issue_blood (oldest units issued first)
- **ACID Transactions**: START TRANSACTION / SAVEPOINT / COMMIT / ROLLBACK in every write procedure
- **Views**: vw_inventory, vw_urgent_requests
- **Event**: Daily auto-expiry of blood units
- **Frontend**: Single-page app with login, dashboard, all CRUD operations

---

## Prerequisites

| Tool | Version |
|------|---------|
| MySQL | 8.0+ |
| Node.js | 18+ |
| npm | 9+ |

---

## Step-by-Step Setup

### 1. MySQL Setup

Open MySQL Workbench or the MySQL command-line client and run:

```sql
-- Step 1: Create schema
SOURCE /path/to/blood_bank/database/schema.sql;

-- Step 2: Create stored procedures, triggers, functions, views
SOURCE /path/to/blood_bank/database/procedures.sql;

-- Step 3: Insert seed data
SOURCE /path/to/blood_bank/database/seed.sql;

-- Step 4: Enable the daily event scheduler (run once)
SET GLOBAL event_scheduler = ON;
```

**OR** using the terminal:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p blood_bank_db < database/procedures.sql
mysql -u root -p blood_bank_db < database/seed.sql

# Enable event scheduler in MySQL config
# Add to my.cnf / my.ini under [mysqld]: event_scheduler=ON
```

### 2. Backend Configuration

```bash
cd backend

# Copy and edit the environment file
cp .env .env.local
```

Edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=blood_bank_db
PORT=3000
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Start the Server

```bash
npm start
```

You should see:
```
MySQL connected
Blood Bank API running on http://localhost:3000
```

### 5. Open the App

Visit: **http://localhost:3000**

Login credentials:
- **Admin**: admin@bloodbank.com / admin123
- **Staff**: ravi@bloodbank.com / staff123

---

## Project Structure

```
blood_bank/
├── database/
│   ├── schema.sql       ← DDL: all 8 tables with FK constraints
│   ├── procedures.sql   ← PL/SQL: triggers, procedures, functions, views
│   └── seed.sql         ← DML: sample data (donors, hospitals, inventory)
├── backend/
│   ├── server.js        ← Express REST API (all routes)
│   ├── package.json
│   └── .env             ← DB credentials (edit this)
└── frontend/
    ├── index.html       ← Single-page app shell
    ├── css/main.css     ← All styles
    └── js/
        ├── api.js       ← Fetch wrapper
        ├── utils.js     ← Shared helpers
        ├── app.js       ← Router, auth, navigation
        └── pages/
            ├── dashboard.js
            ├── donors.js
            └── donations.js  ← Also contains: inventory, requests, hospitals, camps, reports, audit
```

---

## Database Design (3NF Proof)

**1NF**: All attributes are atomic. No repeating groups. Each cell holds one value.

**2NF**: No partial dependencies. Every non-key attribute depends on the whole primary key (all tables use surrogate INT PKs, so 2NF is trivially satisfied).

**3NF**: No transitive dependencies. Example: `donor` has `city` and `pin_code` as direct attributes of the donor — not derived from blood_group or any other non-key column. Blood group descriptions are in `blood_group_ref` (not duplicated in donor), preventing transitive deps.

---

## ACID Properties Demonstrated

| Property | Implementation |
|----------|---------------|
| Atomicity | All write operations use START TRANSACTION + COMMIT/ROLLBACK. If donation insert succeeds but linking fails, the whole thing rolls back. |
| Consistency | FK constraints, CHECK constraints (expiry > collection), NOT NULL, UNIQUE on phone ensure data never violates rules. |
| Isolation | InnoDB's default REPEATABLE READ isolation prevents dirty reads between concurrent users. |
| Durability | InnoDB writes to disk (redo log) before acknowledging commit. Data survives crashes. |

---

## PL/SQL Features Used

| Feature | Where |
|---------|-------|
| Stored Procedure | sp_register_donor, sp_record_donation, sp_issue_blood, sp_mark_expired_units |
| Function | fn_available_units(), fn_is_donor_eligible(), fn_donor_donation_count() |
| Trigger | trg_after_donation_insert, trg_before_issue_check_expiry, trg_after_issue_insert, trg_after_request_update |
| Cursor | Inside sp_issue_blood — iterates available units FIFO |
| Exception Handling | DECLARE EXIT/CONTINUE HANDLER FOR SQLEXCEPTION, SIGNAL SQLSTATE for custom errors |
| Transaction Control | START TRANSACTION, SAVEPOINT, COMMIT, ROLLBACK in all write procedures |
| Event | evt_daily_expire — auto-marks expired blood units daily |
| View | vw_inventory, vw_urgent_requests |

---

## Troubleshooting

**"Access denied for user 'root'"** → Check your .env password. Try logging into MySQL manually first.

**"Unknown database 'blood_bank_db'"** → Run schema.sql first before procedures.sql and seed.sql.

**"PROCEDURE already exists"** → The procedures.sql uses CREATE OR REPLACE / DROP IF EXISTS patterns; if you get conflicts, run: `DROP DATABASE blood_bank_db;` and start fresh.

**Event scheduler not working** → Add `event_scheduler=ON` to your MySQL config file (my.cnf/my.ini) under [mysqld] and restart MySQL.

**Port 3000 in use** → Change PORT in .env to 3001 or any free port.
