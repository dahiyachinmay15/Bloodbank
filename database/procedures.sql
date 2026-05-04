-- PL/SQL Components for Blood Bank Management System
-- Stored Procedures, Functions, Triggers, Cursors
-- MySQL syntax (InnoDB, ACID compliant)

USE blood_bank_db;

DELIMITER $$

-- ============================================================
-- TRIGGER 1: Auto-update donor eligibility after donation
-- Donors must wait 90 days between donations
-- ============================================================
CREATE TRIGGER trg_after_donation_insert
AFTER INSERT ON donation
FOR EACH ROW
BEGIN
    UPDATE donor
    SET last_donation_date = NEW.donation_date,
        is_eligible = 0
    WHERE donor_id = NEW.donor_id;

    INSERT INTO audit_log (action_type, table_name, record_id, description)
    VALUES ('DONATION_RECORDED', 'donation', NEW.donation_id, CONCAT('Donor ', NEW.donor_id, ' marked ineligible post-donation'));
END$$

-- ============================================================
-- TRIGGER 2: Auto-expire blood units past 42 days (RBC shelf life)
-- Runs on SELECT via EVENT, but we also check on status update
-- ============================================================
CREATE TRIGGER trg_before_issue_check_expiry
BEFORE INSERT ON blood_issue
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_expiry DATE;

    SELECT status, expiry_date INTO v_status, v_expiry
    FROM blood_unit WHERE unit_id = NEW.unit_id;

    IF v_status != 'available' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Blood unit is not available for issue';
    END IF;

    IF v_expiry < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot issue expired blood unit';
    END IF;
END$$

-- ============================================================
-- TRIGGER 3: After issue, mark unit as issued + audit
-- ============================================================
CREATE TRIGGER trg_after_issue_insert
AFTER INSERT ON blood_issue
FOR EACH ROW
BEGIN
    UPDATE blood_unit SET status = 'issued' WHERE unit_id = NEW.unit_id;

    INSERT INTO audit_log (action_type, table_name, record_id, description, performed_by)
    VALUES ('BLOOD_ISSUED', 'blood_issue', NEW.issue_id,
            CONCAT('Unit ', NEW.unit_id, ' issued for request ', NEW.request_id),
            NEW.issued_by);
END$$

-- ============================================================
-- TRIGGER 4: Log request status changes
-- ============================================================
CREATE TRIGGER trg_after_request_update
AFTER UPDATE ON blood_request
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO audit_log (action_type, table_name, record_id, description, performed_by)
        VALUES ('REQUEST_STATUS_CHANGE', 'blood_request', NEW.request_id,
                CONCAT('Status changed: ', OLD.status, ' -> ', NEW.status), NEW.staff_id);
    END IF;
END$$

-- ============================================================
-- FUNCTION 1: Check available units of a blood group
-- ============================================================
CREATE FUNCTION fn_available_units(p_blood_group VARCHAR(3))
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM blood_unit
    WHERE blood_group = p_blood_group
      AND status = 'available'
      AND expiry_date >= CURDATE();
    RETURN v_count;
END$$

-- ============================================================
-- FUNCTION 2: Check if donor is eligible (90 day rule)
-- ============================================================
CREATE FUNCTION fn_is_donor_eligible(p_donor_id INT)
RETURNS TINYINT(1)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_last_date DATE;
    DECLARE v_eligible TINYINT(1);

    SELECT last_donation_date, is_eligible INTO v_last_date, v_eligible
    FROM donor WHERE donor_id = p_donor_id;

    IF v_last_date IS NULL THEN
        RETURN 1;
    END IF;

    IF DATEDIFF(CURDATE(), v_last_date) >= 90 THEN
        -- Auto-restore eligibility
        UPDATE donor SET is_eligible = 1 WHERE donor_id = p_donor_id;
        RETURN 1;
    END IF;

    RETURN 0;
END$$

-- ============================================================
-- FUNCTION 3: Get donor's total donation count
-- ============================================================
CREATE FUNCTION fn_donor_donation_count(p_donor_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count FROM donation WHERE donor_id = p_donor_id;
    RETURN v_count;
END$$

-- ============================================================
-- STORED PROCEDURE 1: Register new donor with eligibility check
-- ============================================================
CREATE PROCEDURE sp_register_donor(
    IN p_name VARCHAR(100),
    IN p_dob DATE,
    IN p_gender VARCHAR(10),
    IN p_blood_group VARCHAR(3),
    IN p_phone VARCHAR(15),
    IN p_email VARCHAR(100),
    IN p_address TEXT,
    IN p_city VARCHAR(60),
    IN p_pin VARCHAR(10),
    OUT p_donor_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_age INT;
    DECLARE v_exists INT;

    -- Check duplicate phone
    SELECT COUNT(*) INTO v_exists FROM donor WHERE phone = p_phone;
    IF v_exists > 0 THEN
        SET p_donor_id = -1;
        SET p_message = 'Phone number already registered';
        LEAVE sp_register_donor;  -- label trick without GOTO
    END IF;

    SET v_age = TIMESTAMPDIFF(YEAR, p_dob, CURDATE());

    IF v_age < 18 OR v_age > 65 THEN
        SET p_donor_id = -1;
        SET p_message = 'Donor must be between 18 and 65 years old';
    ELSE
        START TRANSACTION;
            INSERT INTO donor (full_name, dob, gender, blood_group, phone, email, address, city, pin_code)
            VALUES (p_name, p_dob, p_gender, p_blood_group, p_phone, p_email, p_address, p_city, p_pin);

            SET p_donor_id = LAST_INSERT_ID();

            INSERT INTO audit_log (action_type, table_name, record_id, description)
            VALUES ('DONOR_REGISTERED', 'donor', p_donor_id, CONCAT('New donor registered: ', p_name));
        COMMIT;
        SET p_message = 'Donor registered successfully';
    END IF;
END$$

-- ============================================================
-- STORED PROCEDURE 2: Record blood donation (ACID transaction)
-- ============================================================
CREATE PROCEDURE sp_record_donation(
    IN p_donor_id INT,
    IN p_blood_group VARCHAR(3),
    IN p_quantity_ml INT,
    IN p_camp_id INT,
    IN p_staff_id INT,
    IN p_hemoglobin DECIMAL(4,1),
    IN p_bp_sys INT,
    IN p_bp_dia INT,
    IN p_weight DECIMAL(5,2),
    OUT p_unit_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_eligible TINYINT(1);
    DECLARE v_expiry DATE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_unit_id = -1;
        SET p_message = 'Transaction failed - rolled back';
    END;

    SET v_eligible = fn_is_donor_eligible(p_donor_id);

    IF v_eligible = 0 THEN
        SET p_unit_id = -1;
        SET p_message = 'Donor is not eligible (must wait 90 days between donations)';
    ELSEIF p_hemoglobin < 12.5 THEN
        SET p_unit_id = -1;
        SET p_message = 'Hemoglobin too low (minimum 12.5 g/dL required)';
    ELSEIF p_weight < 50 THEN
        SET p_unit_id = -1;
        SET p_message = 'Weight too low (minimum 50 kg required)';
    ELSE
        SET v_expiry = DATE_ADD(CURDATE(), INTERVAL 42 DAY);

        START TRANSACTION;
            SAVEPOINT before_unit_insert;

            INSERT INTO blood_unit (blood_group, quantity_ml, collection_date, expiry_date, camp_id)
            VALUES (p_blood_group, p_quantity_ml, CURDATE(), v_expiry, p_camp_id);

            SET p_unit_id = LAST_INSERT_ID();

            INSERT INTO donation (donor_id, unit_id, camp_id, donation_date, staff_id, hemoglobin, bp_systolic, bp_diastolic, weight)
            VALUES (p_donor_id, p_unit_id, p_camp_id, CURDATE(), p_staff_id, p_hemoglobin, p_bp_sys, p_bp_dia, p_weight);

        COMMIT;
        SET p_message = 'Donation recorded successfully';
    END IF;
END$$

-- ============================================================
-- STORED PROCEDURE 3: Process blood request and issue units
-- ============================================================
CREATE PROCEDURE sp_issue_blood(
    IN p_request_id INT,
    IN p_staff_id INT,
    OUT p_issued_count INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_blood_group VARCHAR(3);
    DECLARE v_units_needed INT;
    DECLARE v_unit_id INT;
    DECLARE v_issued INT DEFAULT 0;
    DECLARE v_done INT DEFAULT 0;
    DECLARE v_available INT;

    -- Cursor: get available non-expired units ordered FIFO (oldest first)
    DECLARE cur_units CURSOR FOR
        SELECT unit_id FROM blood_unit
        WHERE blood_group = v_blood_group
          AND status = 'available'
          AND expiry_date >= CURDATE()
        ORDER BY expiry_date ASC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_issued_count = -1;
        SET p_message = 'Error during issue - transaction rolled back';
    END;

    SELECT blood_group, units_needed INTO v_blood_group, v_units_needed
    FROM blood_request WHERE request_id = p_request_id;

    SET v_available = fn_available_units(v_blood_group);

    IF v_available = 0 THEN
        SET p_issued_count = 0;
        SET p_message = 'No available units of this blood group';
        LEAVE sp_issue_blood;
    END IF;

    START TRANSACTION;
        OPEN cur_units;
        issue_loop: LOOP
            FETCH cur_units INTO v_unit_id;
            IF v_done = 1 OR v_issued >= v_units_needed THEN
                LEAVE issue_loop;
            END IF;

            INSERT INTO blood_issue (request_id, unit_id, issued_by)
            VALUES (p_request_id, v_unit_id, p_staff_id);

            SET v_issued = v_issued + 1;
        END LOOP;
        CLOSE cur_units;

        -- Update request status
        IF v_issued >= v_units_needed THEN
            UPDATE blood_request SET status = 'fulfilled', staff_id = p_staff_id WHERE request_id = p_request_id;
            SET p_message = CONCAT('Fully fulfilled: ', v_issued, ' unit(s) issued');
        ELSEIF v_issued > 0 THEN
            UPDATE blood_request SET status = 'partially_fulfilled', staff_id = p_staff_id WHERE request_id = p_request_id;
            SET p_message = CONCAT('Partially fulfilled: ', v_issued, ' of ', v_units_needed, ' units issued');
        END IF;

    COMMIT;
    SET p_issued_count = v_issued;
END$$

-- ============================================================
-- STORED PROCEDURE 4: Mark expired units (run as event/manual)
-- ============================================================
CREATE PROCEDURE sp_mark_expired_units(OUT p_count INT)
BEGIN
    DECLARE v_count INT;

    UPDATE blood_unit
    SET status = 'expired'
    WHERE status = 'available' AND expiry_date < CURDATE();

    SET v_count = ROW_COUNT();
    SET p_count = v_count;

    IF v_count > 0 THEN
        INSERT INTO audit_log (action_type, table_name, record_id, description)
        VALUES ('BATCH_EXPIRE', 'blood_unit', NULL, CONCAT(v_count, ' units marked as expired'));
    END IF;
END$$

-- ============================================================
-- STORED PROCEDURE 5: Get inventory summary (used by dashboard)
-- ============================================================
CREATE PROCEDURE sp_inventory_summary()
BEGIN
    CALL sp_mark_expired_units(@dummy);

    SELECT
        bg.blood_group,
        COUNT(CASE WHEN bu.status = 'available' AND bu.expiry_date >= CURDATE() THEN 1 END) AS available_units,
        COUNT(CASE WHEN bu.status = 'issued' THEN 1 END) AS issued_units,
        COUNT(CASE WHEN bu.status = 'expired' THEN 1 END) AS expired_units,
        COUNT(CASE WHEN bu.status = 'available' AND bu.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 END) AS expiring_soon
    FROM blood_group_ref bg
    LEFT JOIN blood_unit bu ON bg.blood_group = bu.blood_group
    GROUP BY bg.blood_group
    ORDER BY bg.blood_group;
END$$

-- ============================================================
-- STORED PROCEDURE 6: Get recent donations with cursor report
-- ============================================================
CREATE PROCEDURE sp_donation_report(IN p_days INT)
BEGIN
    DECLARE v_donor_name VARCHAR(100);
    DECLARE v_blood_group VARCHAR(3);
    DECLARE v_date DATE;
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_done INT DEFAULT 0;

    DECLARE cur_report CURSOR FOR
        SELECT d.full_name, don.blood_group_ref_blood_group, don.donation_date
        FROM donation don
        JOIN donor d ON d.donor_id = don.donor_id
        JOIN blood_unit bu ON bu.unit_id = don.unit_id
        WHERE don.donation_date >= DATE_SUB(CURDATE(), INTERVAL p_days DAY)
        ORDER BY don.donation_date DESC;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    -- Just return the set directly (cursor here is for demo; the real query is the SELECT below)
    SELECT
        d.full_name AS donor_name,
        don.donation_date,
        bu.blood_group,
        bu.quantity_ml,
        bu.status AS unit_status,
        bu.expiry_date,
        COALESCE(c.camp_name, 'Walk-in') AS camp_name,
        s.full_name AS staff_name
    FROM donation don
    JOIN donor d ON d.donor_id = don.donor_id
    JOIN blood_unit bu ON bu.unit_id = don.unit_id
    LEFT JOIN blood_camp c ON c.camp_id = don.camp_id
    LEFT JOIN staff s ON s.staff_id = don.staff_id
    WHERE don.donation_date >= DATE_SUB(CURDATE(), INTERVAL p_days DAY)
    ORDER BY don.donation_date DESC;
END$$

-- ============================================================
-- EVENT: Auto-expire units daily (requires event_scheduler=ON)
-- ============================================================
CREATE EVENT IF NOT EXISTS evt_daily_expire
ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
DO CALL sp_mark_expired_units(@cnt)$$

-- ============================================================
-- VIEW: Inventory summary view (used by frontend dashboard)
-- ============================================================
CREATE OR REPLACE VIEW vw_inventory AS
SELECT
    bg.blood_group,
    COALESCE(COUNT(CASE WHEN bu.status = 'available' AND bu.expiry_date >= CURDATE() THEN 1 END), 0) AS available_units,
    COALESCE(COUNT(CASE WHEN bu.status = 'available' AND bu.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 END), 0) AS expiring_soon,
    COALESCE(COUNT(CASE WHEN bu.status = 'expired' THEN 1 END), 0) AS expired_units
FROM blood_group_ref bg
LEFT JOIN blood_unit bu ON bg.blood_group = bu.blood_group
GROUP BY bg.blood_group$$

-- ============================================================
-- VIEW: Pending urgent requests
-- ============================================================
CREATE OR REPLACE VIEW vw_urgent_requests AS
SELECT
    r.request_id,
    h.hospital_name,
    h.city,
    r.blood_group,
    r.units_needed,
    r.priority,
    r.patient_name,
    r.reason,
    r.status,
    r.requested_at,
    fn_available_units(r.blood_group) AS units_available
FROM blood_request r
JOIN hospital h ON h.hospital_id = r.hospital_id
WHERE r.status IN ('pending', 'partially_fulfilled')
ORDER BY
    FIELD(r.priority, 'critical', 'urgent', 'normal'),
    r.requested_at ASC$$

DELIMITER ;
