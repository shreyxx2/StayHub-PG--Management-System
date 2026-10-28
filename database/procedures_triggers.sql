-- ============================================================================
-- StayHub PG Management System - Stored Procedures, Functions, Triggers & Cursor
-- DBMS Subject College Project
-- ============================================================================
-- Contains:
--   1. Triggers (Data Integrity & Business Automations)
--   2. Stored Functions (Deterministic Calculations)
--   3. Stored Procedures (Core Transactional Operations)
--   4. Cursor Implementation (Batch Reporting & Iteration)
-- ============================================================================

USE stayhub_pg;

-- ============================================================================
-- SECTION 1: DATABASE TRIGGERS
-- ============================================================================

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS trg_check_bed_before_booking;
DROP TRIGGER IF EXISTS trg_occupy_bed_after_booking;
DROP TRIGGER IF EXISTS trg_free_bed_after_checkout;
DROP TRIGGER IF EXISTS trg_link_complaint_to_owner;
DROP TRIGGER IF EXISTS trg_validate_payment_amount;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- TRIGGER 1: trg_check_bed_before_booking (BEFORE INSERT on Booking)
-- Concept: Declarative validation trigger raising custom application error
-- Purpose: Prevents double-booking or booking a bed undergoing maintenance.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_check_bed_before_booking
BEFORE INSERT ON Booking
FOR EACH ROW
BEGIN
    DECLARE current_bed_status VARCHAR(20);
    
    -- Retrieve the current physical status of the requested bed
    SELECT status INTO current_bed_status 
    FROM Bed 
    WHERE bed_id = NEW.bed_id;
    
    -- If bed does not exist or is not Available, abort transaction with SIGNAL
    IF current_bed_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: The specified Bed ID does not exist in the system.';
    ELSEIF current_bed_status != 'Available' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking Rejected: The requested bed is already Occupied or under Maintenance.';
    END IF;
END$$

-- ----------------------------------------------------------------------------
-- TRIGGER 2: trg_occupy_bed_after_booking (AFTER INSERT on Booking)
-- Concept: State synchronization trigger
-- Purpose: Automatically updates Bed.status to 'Occupied' when a booking is created.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_occupy_bed_after_booking
AFTER INSERT ON Booking
FOR EACH ROW
BEGIN
    IF NEW.booking_status = 'Active' THEN
        UPDATE Bed 
        SET status = 'Occupied' 
        WHERE bed_id = NEW.bed_id;
    END IF;
END$$

-- ----------------------------------------------------------------------------
-- TRIGGER 3: trg_free_bed_after_checkout (AFTER UPDATE on Booking)
-- Concept: Lifecycle state transition trigger
-- Purpose: Automatically frees up the bed when a tenant checks out or cancels.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_free_bed_after_checkout
AFTER UPDATE ON Booking
FOR EACH ROW
BEGIN
    -- If booking transitioned from Active to Completed or Cancelled
    IF OLD.booking_status = 'Active' AND NEW.booking_status IN ('Completed', 'Cancelled') THEN
        UPDATE Bed 
        SET status = 'Available' 
        WHERE bed_id = NEW.bed_id;
    END IF;
END$$

-- ----------------------------------------------------------------------------
-- TRIGGER 4: trg_link_complaint_to_owner (AFTER INSERT on Complaint)
-- Concept: Automatic M:N junction resolution trigger
-- Purpose: When a tenant logs a complaint, query their active booking, locate
--          the property owner, and insert the link into owner_complaint.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_link_complaint_to_owner
AFTER INSERT ON Complaint
FOR EACH ROW
BEGIN
    -- Insert mapping for all owners associated with the tenant's active PG
    INSERT IGNORE INTO owner_complaint (owner_id, complaint_id, assigned_date)
    SELECT DISTINCT 
        p.owner_id, 
        NEW.complaint_id, 
        CURRENT_TIMESTAMP
    FROM Booking bk
    INNER JOIN Bed b ON bk.bed_id = b.bed_id
    INNER JOIN Room r ON b.room_id = r.room_id
    INNER JOIN Property p ON r.property_id = p.property_id
    WHERE bk.tenant_id = NEW.tenant_id 
      AND bk.booking_status = 'Active';
END$$

-- ----------------------------------------------------------------------------
-- TRIGGER 5: trg_validate_payment_amount (BEFORE INSERT on Payment)
-- Concept: Defensive domain constraint trigger
-- Purpose: Reject payments with zero or negative amounts with informative error.
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_validate_payment_amount
BEFORE INSERT ON Payment
FOR EACH ROW
BEGIN
    IF NEW.amount <= 0.00 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Validation Error: Payment amount must be strictly greater than 0.00 INR.';
    END IF;
END$$

DELIMITER ;


-- ============================================================================
-- SECTION 2: STORED FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS get_pending_rent;
DROP FUNCTION IF EXISTS get_occupancy_percentage;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- FUNCTION 1: get_pending_rent(p_booking_id)
-- Purpose: Calculates outstanding rent balance for a given booking.
-- Returns: Outstanding balance (DECIMAL 10,2)
-- ----------------------------------------------------------------------------
CREATE FUNCTION get_pending_rent(p_booking_id INT)
RETURNS DECIMAL(10, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_check_in DATE;
    DECLARE v_check_out DATE;
    DECLARE v_monthly_rent DECIMAL(10, 2);
    DECLARE v_months_stayed INT;
    DECLARE v_total_expected DECIMAL(10, 2);
    DECLARE v_total_paid DECIMAL(10, 2);
    DECLARE v_pending DECIMAL(10, 2);
    
    -- Fetch booking parameters
    SELECT check_in_date, check_out_date, monthly_rent
    INTO v_check_in, v_check_out, v_monthly_rent
    FROM Booking
    WHERE booking_id = p_booking_id;
    
    -- Return 0.00 if booking is invalid
    IF v_monthly_rent IS NULL THEN
        RETURN 0.00;
    END IF;
    
    -- Calculate months stayed (1 + full calendar months elapsed)
    SET v_months_stayed = TIMESTAMPDIFF(MONTH, v_check_in, COALESCE(v_check_out, CURDATE())) + 1;
    IF v_months_stayed < 1 THEN
        SET v_months_stayed = 1;
    END IF;
    
    SET v_total_expected = v_months_stayed * v_monthly_rent;
    
    -- Sum all payments credited against this booking
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
    FROM Payment
    WHERE booking_id = p_booking_id;
    
    -- Compute balance (non-negative)
    IF v_total_expected > v_total_paid THEN
        SET v_pending = v_total_expected - v_total_paid;
    ELSE
        SET v_pending = 0.00;
    END IF;
    
    RETURN v_pending;
END$$

-- ----------------------------------------------------------------------------
-- FUNCTION 2: get_occupancy_percentage(p_property_id)
-- Purpose: Computes live capacity utilization percentage for any given property.
-- Returns: Occupancy % (DECIMAL 5,2)
-- ----------------------------------------------------------------------------
CREATE FUNCTION get_occupancy_percentage(p_property_id INT)
RETURNS DECIMAL(5, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_beds INT DEFAULT 0;
    DECLARE v_occupied_beds INT DEFAULT 0;
    DECLARE v_occupancy_pct DECIMAL(5, 2) DEFAULT 0.00;
    
    -- Count total beds belonging to this property
    SELECT COUNT(b.bed_id) INTO v_total_beds
    FROM Bed b
    INNER JOIN Room r ON b.room_id = r.room_id
    WHERE r.property_id = p_property_id;
    
    -- Count occupied beds
    SELECT COUNT(b.bed_id) INTO v_occupied_beds
    FROM Bed b
    INNER JOIN Room r ON b.room_id = r.room_id
    WHERE r.property_id = p_property_id AND b.status = 'Occupied';
    
    IF v_total_beds > 0 THEN
        SET v_occupancy_pct = ROUND((v_occupied_beds * 100.0) / v_total_beds, 2);
    ELSE
        SET v_occupancy_pct = 0.00;
    END IF;
    
    RETURN v_occupancy_pct;
END$$

DELIMITER ;


-- ============================================================================
-- SECTION 3: STORED PROCEDURES
-- ============================================================================

DROP PROCEDURE IF EXISTS book_bed;
DROP PROCEDURE IF EXISTS record_payment;
DROP PROCEDURE IF EXISTS checkout_tenant;
DROP PROCEDURE IF EXISTS raise_complaint;
DROP PROCEDURE IF EXISTS generate_monthly_dues_report;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- PROCEDURE 1: book_bed
-- Purpose: Atomically book a bed for a tenant.
-- Parameters:
--   IN p_tenant_id INT,
--   IN p_bed_id INT,
--   IN p_check_in_date DATE,
--   IN p_monthly_rent DECIMAL(10,2)
-- ----------------------------------------------------------------------------
CREATE PROCEDURE book_bed(
    IN p_tenant_id INT,
    IN p_bed_id INT,
    IN p_check_in_date DATE,
    IN p_monthly_rent DECIMAL(10, 2)
)
BEGIN
    DECLARE v_bed_status VARCHAR(20);
    DECLARE v_new_booking_id INT;
    
    -- Verify bed exists and read its current status
    SELECT status INTO v_bed_status 
    FROM Bed 
    WHERE bed_id = p_bed_id;
    
    IF v_bed_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Bed not found.';
    END IF;
    
    IF v_bed_status != 'Available' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Bed is not available for booking.';
    END IF;
    
    IF p_monthly_rent <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Monthly rent must be greater than zero.';
    END IF;
    
    -- Insert new booking record (Trigger trg_occupy_bed_after_booking will mark bed 'Occupied')
    INSERT INTO Booking (check_in_date, monthly_rent, check_out_date, booking_status, bed_id, tenant_id)
    VALUES (p_check_in_date, p_monthly_rent, NULL, 'Active', p_bed_id, p_tenant_id);
    
    SET v_new_booking_id = LAST_INSERT_ID();
    
    -- Return the created booking details
    SELECT 
        v_new_booking_id AS booking_id,
        p_tenant_id AS tenant_id,
        p_bed_id AS bed_id,
        'Occupied' AS updated_bed_status,
        'Booking created successfully' AS message;
END$$

-- ----------------------------------------------------------------------------
-- PROCEDURE 2: record_payment
-- Purpose: Record a rent payment against an active booking.
-- Parameters:
--   IN p_booking_id INT,
--   IN p_amount DECIMAL(10,2),
--   IN p_payment_mode VARCHAR(20)
-- ----------------------------------------------------------------------------
CREATE PROCEDURE record_payment(
    IN p_booking_id INT,
    IN p_amount DECIMAL(10, 2),
    IN p_payment_mode VARCHAR(20)
)
BEGIN
    DECLARE v_booking_status VARCHAR(20);
    DECLARE v_payment_id INT;
    
    -- Verify booking existence
    SELECT booking_status INTO v_booking_status
    FROM Booking
    WHERE booking_id = p_booking_id;
    
    IF v_booking_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking not found.';
    END IF;
    
    -- Validate payment mode
    IF p_payment_mode NOT IN ('Cash', 'UPI', 'Card', 'Net Banking') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid payment mode. Allowed: Cash, UPI, Card, Net Banking.';
    END IF;
    
    -- Insert payment (Trigger trg_validate_payment_amount checks amount > 0)
    INSERT INTO Payment (amount, payment_mode, booking_id)
    VALUES (p_amount, p_payment_mode, p_booking_id);
    
    SET v_payment_id = LAST_INSERT_ID();
    
    SELECT 
        v_payment_id AS payment_id,
        p_booking_id AS booking_id,
        p_amount AS amount,
        p_payment_mode AS payment_mode,
        'Payment recorded successfully' AS message;
END$$

-- ----------------------------------------------------------------------------
-- PROCEDURE 3: checkout_tenant
-- Purpose: Check out an active tenant, marking booking Completed and freeing bed.
-- Parameters:
--   IN p_booking_id INT,
--   IN p_check_out_date DATE
-- ----------------------------------------------------------------------------
CREATE PROCEDURE checkout_tenant(
    IN p_booking_id INT,
    IN p_check_out_date DATE
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_check_in DATE;
    DECLARE v_bed_id INT;
    
    SELECT booking_status, check_in_date, bed_id 
    INTO v_status, v_check_in, v_bed_id
    FROM Booking 
    WHERE booking_id = p_booking_id;
    
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking not found.';
    END IF;
    
    IF v_status != 'Active' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking is already closed (not Active).';
    END IF;
    
    IF p_check_out_date < v_check_in THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Checkout date cannot be prior to check-in date.';
    END IF;
    
    -- Update booking (Trigger trg_free_bed_after_checkout marks bed 'Available')
    UPDATE Booking
    SET 
        check_out_date = p_check_out_date,
        booking_status = 'Completed'
    WHERE booking_id = p_booking_id;
    
    SELECT 
        p_booking_id AS booking_id,
        v_bed_id AS freed_bed_id,
        'Available' AS updated_bed_status,
        'Tenant successfully checked out. Bed freed.' AS message;
END$$

-- ----------------------------------------------------------------------------
-- PROCEDURE 4: raise_complaint
-- Purpose: Allow a tenant to register a complaint. Automatically linked to owner.
-- Parameters:
--   IN p_tenant_id INT,
--   IN p_description TEXT
-- ----------------------------------------------------------------------------
CREATE PROCEDURE raise_complaint(
    IN p_tenant_id INT,
    IN p_description TEXT
)
BEGIN
    DECLARE v_complaint_id INT;
    
    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Complaint description cannot be empty.';
    END IF;
    
    -- Insert complaint (Trigger trg_link_complaint_to_owner auto links to owner)
    INSERT INTO Complaint (description, status, tenant_id)
    VALUES (p_description, 'Open', p_tenant_id);
    
    SET v_complaint_id = LAST_INSERT_ID();
    
    SELECT 
        v_complaint_id AS complaint_id,
        p_tenant_id AS tenant_id,
        'Open' AS status,
        'Complaint raised and assigned to property owner successfully.' AS message;
END$$

-- ----------------------------------------------------------------------------
-- PROCEDURE 5: generate_monthly_dues_report (CURSOR IMPLEMENTATION)
-- Concept: Explicit Cursor with loop, fetch, and not found handler
-- Purpose: Demonstrates cursor iteration over active bookings to compute
--          pending balances and build an audit report.
-- ----------------------------------------------------------------------------
CREATE PROCEDURE generate_monthly_dues_report()
BEGIN
    -- Cursor variables
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur_booking_id INT;
    DECLARE cur_tenant_name VARCHAR(100);
    DECLARE cur_property_name VARCHAR(120);
    DECLARE cur_monthly_rent DECIMAL(10, 2);
    DECLARE cur_pending_due DECIMAL(10, 2);
    
    -- Declare explicit cursor
    DECLARE cur_bookings CURSOR FOR
        SELECT 
            bk.booking_id,
            t.name AS tenant_name,
            p.name AS property_name,
            bk.monthly_rent
        FROM Booking bk
        INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id
        INNER JOIN Bed b ON bk.bed_id = b.bed_id
        INNER JOIN Room r ON b.room_id = r.room_id
        INNER JOIN Property p ON r.property_id = p.property_id
        WHERE bk.booking_status = 'Active';
        
    -- Declare CONTINUE HANDLER for cursor loop termination
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Temporary report storage table
    DROP TEMPORARY TABLE IF EXISTS temp_dues_report;
    CREATE TEMPORARY TABLE temp_dues_report (
        booking_id INT,
        tenant_name VARCHAR(100),
        property_name VARCHAR(120),
        monthly_rent DECIMAL(10, 2),
        pending_due DECIMAL(10, 2),
        payment_status VARCHAR(30)
    );
    
    -- Open cursor
    OPEN cur_bookings;
    
    read_loop: LOOP
        FETCH cur_bookings INTO cur_booking_id, cur_tenant_name, cur_property_name, cur_monthly_rent;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Compute pending rent using stored function
        SET cur_pending_due = get_pending_rent(cur_booking_id);
        
        -- Categorize tenant dues
        INSERT INTO temp_dues_report VALUES (
            cur_booking_id,
            cur_tenant_name,
            cur_property_name,
            cur_monthly_rent,
            cur_pending_due,
            CASE 
                WHEN cur_pending_due = 0.00 THEN 'Fully Paid'
                WHEN cur_pending_due <= cur_monthly_rent THEN 'Partial Payment'
                ELSE 'Defaulter (Multi-Month Due)'
            END
        );
    END LOOP;
    
    -- Close cursor
    CLOSE cur_bookings;
    
    -- Project report results
    SELECT * FROM temp_dues_report ORDER BY pending_due DESC;
    
    -- Clean up temporary storage
    DROP TEMPORARY TABLE IF EXISTS temp_dues_report;
END$$

DELIMITER ;

