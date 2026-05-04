-- Blood Bank Management System
-- Thapar Institute of Engineering & Technology, Patiala
-- UCS310 DBMS Project | Group: Aksh Kaushik, Chinmay, Rahil Yadav
-- ================================================================
-- All tables in 3NF: atomic attributes, no partial/transitive deps
-- Engine: InnoDB for ACID compliance and FK enforcement

CREATE DATABASE IF NOT EXISTS blood_bank_db;
USE blood_bank_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_log, blood_issue, blood_request, donation, blood_unit, blood_camp, hospital, donor, staff, blood_group_ref;
SET FOREIGN_KEY_CHECKS = 1;

-- Reference table: blood groups (avoids magic strings everywhere)
CREATE TABLE blood_group_ref (
    blood_group VARCHAR(3) PRIMARY KEY,
    description VARCHAR(50) NOT NULL
);

-- Staff table (Admin / Staff roles)
CREATE TABLE staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Donor table (3NF: no transitive deps on non-key fields)
CREATE TABLE donor (
    donor_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    blood_group VARCHAR(3) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(60),
    pin_code VARCHAR(10),
    is_eligible TINYINT(1) NOT NULL DEFAULT 1,
    last_donation_date DATE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_donor_bg FOREIGN KEY (blood_group) REFERENCES blood_group_ref(blood_group)
);

-- Hospital table
CREATE TABLE hospital (
    hospital_id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_name VARCHAR(150) NOT NULL,
    city VARCHAR(60) NOT NULL,
    address TEXT,
    contact_person VARCHAR(100),
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blood camp table (donation drives)
CREATE TABLE blood_camp (
    camp_id INT AUTO_INCREMENT PRIMARY KEY,
    camp_name VARCHAR(150) NOT NULL,
    location TEXT NOT NULL,
    city VARCHAR(60) NOT NULL,
    camp_date DATE NOT NULL,
    organizer VARCHAR(100),
    contact_phone VARCHAR(15),
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blood inventory: each unit is a distinct row (3NF - no group-level aggregates stored here)
CREATE TABLE blood_unit (
    unit_id INT AUTO_INCREMENT PRIMARY KEY,
    blood_group VARCHAR(3) NOT NULL,
    quantity_ml INT NOT NULL DEFAULT 450,
    collection_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status ENUM('available', 'reserved', 'issued', 'expired', 'discarded') DEFAULT 'available',
    camp_id INT,
    CONSTRAINT fk_bu_bg FOREIGN KEY (blood_group) REFERENCES blood_group_ref(blood_group),
    CONSTRAINT fk_bu_camp FOREIGN KEY (camp_id) REFERENCES blood_camp(camp_id),
    CONSTRAINT chk_expiry CHECK (expiry_date > collection_date)
);

-- Donation record: links donor to blood unit
CREATE TABLE donation (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT NOT NULL,
    unit_id INT NOT NULL UNIQUE,
    camp_id INT,
    donation_date DATE NOT NULL,
    staff_id INT,
    hemoglobin DECIMAL(4,1),
    bp_systolic INT,
    bp_diastolic INT,
    weight DECIMAL(5,2),
    remarks VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_don_donor FOREIGN KEY (donor_id) REFERENCES donor(donor_id),
    CONSTRAINT fk_don_unit FOREIGN KEY (unit_id) REFERENCES blood_unit(unit_id),
    CONSTRAINT fk_don_camp FOREIGN KEY (camp_id) REFERENCES blood_camp(camp_id),
    CONSTRAINT fk_don_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
);

-- Blood request from hospital
CREATE TABLE blood_request (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    hospital_id INT NOT NULL,
    blood_group VARCHAR(3) NOT NULL,
    units_needed INT NOT NULL DEFAULT 1,
    priority ENUM('normal', 'urgent', 'critical') DEFAULT 'normal',
    patient_name VARCHAR(100),
    patient_age INT,
    reason VARCHAR(255),
    status ENUM('pending', 'approved', 'partially_fulfilled', 'fulfilled', 'rejected', 'cancelled') DEFAULT 'pending',
    staff_id INT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_req_hospital FOREIGN KEY (hospital_id) REFERENCES hospital(hospital_id),
    CONSTRAINT fk_req_bg FOREIGN KEY (blood_group) REFERENCES blood_group_ref(blood_group),
    CONSTRAINT fk_req_staff FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
);

-- Blood issue: links request to specific blood units
CREATE TABLE blood_issue (
    issue_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    unit_id INT NOT NULL UNIQUE,
    issued_by INT NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_issue_req FOREIGN KEY (request_id) REFERENCES blood_request(request_id),
    CONSTRAINT fk_issue_unit FOREIGN KEY (unit_id) REFERENCES blood_unit(unit_id),
    CONSTRAINT fk_issue_staff FOREIGN KEY (issued_by) REFERENCES staff(staff_id)
);

-- Audit log for ACID demonstration
CREATE TABLE audit_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    description TEXT,
    performed_by INT,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_staff FOREIGN KEY (performed_by) REFERENCES staff(staff_id)
);
