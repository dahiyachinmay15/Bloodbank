-- Seed Data for Blood Bank Management System
USE blood_bank_db;

-- Blood groups
INSERT INTO blood_group_ref (blood_group, description) VALUES
('A+', 'A Positive'), ('A-', 'A Negative'),
('B+', 'B Positive'), ('B-', 'B Negative'),
('AB+', 'AB Positive'), ('AB-', 'AB Negative'),
('O+', 'O Positive'), ('O-', 'O Negative');

-- Staff (password is 'admin123' hashed - in prod use bcrypt, here SHA2 for demo)
INSERT INTO staff (full_name, email, phone, role, password_hash) VALUES
('Admin User', 'admin@bloodbank.com', '9876543210', 'admin', SHA2('admin123', 256)),
('Ravi Kumar', 'ravi@bloodbank.com', '9876543211', 'staff', SHA2('staff123', 256)),
('Priya Singh', 'priya@bloodbank.com', '9876543212', 'staff', SHA2('staff123', 256));

-- Hospitals
INSERT INTO hospital (hospital_name, city, address, contact_person, phone, email) VALUES
('AIIMS Patiala', 'Patiala', 'Rajindra Hospital Road, Patiala, Punjab 147001', 'Dr. Sharma', '0175-2212027', 'aiims.patiala@gov.in'),
('Fortis Hospital', 'Mohali', 'Phase 8, Industrial Area, Mohali, Punjab 160059', 'Dr. Anand', '0172-5096001', 'fortis.mohali@fortishealthcare.com'),
('Columbia Asia Hospital', 'Ludhiana', 'Ferozepur Road, Ludhiana 141012', 'Dr. Mehra', '0161-3988000', 'columbia.lud@hospital.in'),
('Civil Hospital Patiala', 'Patiala', 'Near Kali Mata Mandir, Patiala 147001', 'Dr. Bhatia', '0175-2301234', 'civil.patiala@punjabgov.in'),
('Max Hospital', 'Amritsar', 'GT Road, Amritsar 143001', 'Dr. Kapoor', '0183-5060000', 'max.asr@maxhealthcare.in');

-- Blood camps
INSERT INTO blood_camp (camp_name, location, city, camp_date, organizer, contact_phone, status) VALUES
('Thapar Blood Drive 2025', 'Thapar Institute Campus, Patiala', 'Patiala', '2025-09-15', 'NSS Thapar', '9876500001', 'completed'),
('Lions Club Camp Jan 2026', 'Lions Club Hall, Mall Road', 'Patiala', '2026-01-20', 'Lions Club Patiala', '9876500002', 'completed'),
('Republic Day Camp 2026', 'Town Hall, Sector 22', 'Mohali', '2026-01-26', 'Rotary Club Mohali', '9876500003', 'completed'),
('Summer Donation Drive', 'Government College Ground', 'Ludhiana', '2026-06-10', 'Red Cross Punjab', '9876500004', 'upcoming'),
('World Blood Donor Day', 'Patiala Sports Complex', 'Patiala', '2026-06-14', 'Civil Hospital', '9876500005', 'upcoming');

-- Donors
INSERT INTO donor (full_name, dob, gender, blood_group, phone, email, address, city, pin_code, last_donation_date, is_eligible) VALUES
('Aksh Kaushik', '2004-03-15', 'male', 'O+', '9988776655', 'aksh@email.com', '12 Rajindra Nagar', 'Patiala', '147001', '2025-09-15', 1),
('Chinmay Sharma', '2004-07-22', 'male', 'A+', '9988776644', 'chinmay@email.com', '45 Model Town', 'Patiala', '147001', '2025-09-15', 1),
('Rahil Yadav', '2004-11-05', 'male', 'B+', '9988776633', 'rahil@email.com', '78 Urban Estate', 'Patiala', '147002', NULL, 1),
('Preet Kaur', '1995-06-18', 'female', 'AB+', '9876543220', 'preet@email.com', '23 Lajpat Nagar', 'Ludhiana', '141001', '2025-08-10', 1),
('Harjot Singh', '1988-12-30', 'male', 'O-', '9876543221', 'harjot@email.com', '56 Ranjit Avenue', 'Amritsar', '143001', NULL, 1),
('Sunita Verma', '1992-04-14', 'female', 'A-', '9876543222', 'sunita@email.com', '11 Sector 7', 'Mohali', '160007', '2026-01-20', 1),
('Manpreet Gill', '2000-09-03', 'male', 'B-', '9876543223', NULL, '88 Civil Lines', 'Patiala', '147001', NULL, 1),
('Deepika Nair', '1997-02-28', 'female', 'A+', '9876543224', 'deepika@email.com', '34 Sarabha Nagar', 'Ludhiana', '141001', '2025-11-05', 1),
('Gurpreet Sidhu', '1985-07-07', 'male', 'O+', '9876543225', 'gurpreet@email.com', '66 Prem Nagar', 'Amritsar', '143002', '2025-09-15', 1),
('Anjali Mehta', '2001-01-19', 'female', 'AB-', '9876543226', 'anjali@email.com', '99 New Shimla', 'Patiala', '147004', NULL, 1);

-- Blood units (mix of available, issued, expired)
INSERT INTO blood_unit (blood_group, quantity_ml, collection_date, expiry_date, status, camp_id) VALUES
('O+', 450, '2025-09-15', '2026-01-26', 'issued', 1),
('A+', 450, '2025-09-15', '2026-01-26', 'issued', 1),
('B+', 450, '2026-01-20', '2026-03-03', 'available', 2),
('AB+', 450, '2026-01-20', '2026-03-03', 'available', 2),
('O-', 450, '2026-01-26', '2026-03-09', 'available', 3),
('A-', 450, '2026-01-26', '2026-03-09', 'available', 3),
('B-', 450, '2026-01-26', '2026-03-09', 'available', 3),
('O+', 450, '2026-01-26', '2026-03-09', 'available', 3),
('A+', 450, '2026-01-26', '2026-03-09', 'available', 3),
('O+', 450, '2026-02-10', '2026-03-24', 'available', NULL),
('A+', 450, '2026-02-10', '2026-03-24', 'available', NULL),
('B+', 450, '2026-02-15', '2026-03-29', 'available', NULL),
('AB+', 450, '2026-02-15', '2026-03-29', 'available', NULL),
('O-', 450, '2026-02-15', '2026-03-29', 'available', NULL),
('A+', 450, '2026-03-01', '2026-04-12', 'available', NULL),
('O+', 450, '2026-03-01', '2026-04-12', 'available', NULL),
('B+', 450, '2026-03-10', '2026-04-21', 'available', NULL),
('AB-', 450, '2026-03-10', '2026-04-21', 'available', NULL),
('O+', 450, '2026-04-01', '2026-05-13', 'available', NULL),
('A-', 450, '2026-04-01', '2026-05-13', 'available', NULL),
('B-', 450, '2026-04-01', '2026-05-13', 'available', NULL),
('O+', 450, '2026-04-15', '2026-05-27', 'available', NULL),
('A+', 450, '2026-04-15', '2026-05-27', 'available', NULL),
('AB+', 450, '2026-04-15', '2026-05-27', 'available', NULL);

-- Donations (linking donors to units)
INSERT INTO donation (donor_id, unit_id, camp_id, donation_date, staff_id, hemoglobin, bp_systolic, bp_diastolic, weight) VALUES
(1, 1, 1, '2025-09-15', 2, 14.5, 120, 80, 68.0),
(2, 2, 1, '2025-09-15', 2, 13.8, 118, 76, 72.5),
(4, 4, 2, '2026-01-20', 3, 13.2, 115, 75, 60.0),
(6, 6, 3, '2026-01-26', 2, 12.8, 110, 72, 55.0),
(9, 8, 3, '2026-01-26', 2, 15.0, 125, 82, 80.0);

-- Blood requests
INSERT INTO blood_request (hospital_id, blood_group, units_needed, priority, patient_name, patient_age, reason, status, staff_id) VALUES
(1, 'O+', 2, 'urgent', 'Ramesh Kumar', 45, 'Surgery - bypass', 'fulfilled', 2),
(2, 'A+', 1, 'normal', 'Anita Devi', 32, 'Chemotherapy', 'pending', NULL),
(3, 'B-', 1, 'critical', 'Mohan Lal', 67, 'Emergency trauma', 'pending', NULL),
(4, 'AB+', 1, 'normal', 'Reena Sharma', 28, 'Delivery complications', 'pending', NULL),
(1, 'O-', 2, 'urgent', 'Suresh Patel', 52, 'Accident victim', 'pending', NULL);

-- Blood issues (for the fulfilled request)
INSERT INTO blood_issue (request_id, unit_id, issued_by) VALUES
(1, 1, 2),
(1, 16, 2);

-- Update request 1 and unit 16 status manually since trigger already ran on fresh data
UPDATE blood_request SET status = 'fulfilled' WHERE request_id = 1;
UPDATE blood_unit SET status = 'issued' WHERE unit_id = 16;

-- Audit log initial entries
INSERT INTO audit_log (action_type, table_name, record_id, description) VALUES
('SYSTEM_INIT', 'system', NULL, 'Blood Bank Management System initialized'),
('SEED_DATA', 'system', NULL, 'Seed data loaded for demo');
