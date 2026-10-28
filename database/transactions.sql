-- ============================================================================
-- StayHub PG Management System - Database Transactions & ACID Demonstration
-- DBMS Subject College Project
-- ============================================================================
-- ACID Principles Demonstrated:
--   A - Atomicity: All operations in a transaction succeed, or all are undone.
--   C - Consistency: Database transitions from one valid state to another.
--   I - Isolation: Concurrent transactions do not interfere with each other.
--   D - Durability: Committed updates survive system crashes.
-- ============================================================================

USE stayhub_pg;

-- ============================================================================
-- TRANSACTION EXAMPLE 1: ATOMIC BED BOOKING + INITIAL RENT ADVANCE
-- Scenario:
--   A student books Bed #30 and immediately pays the first month's rent (8,000 INR).
--   If the payment fails or bed is unavailable, the booking MUST NOT be created.
--   Either BOTH booking and payment succeed (COMMIT), or NEITHER does (ROLLBACK).
-- ============================================================================

-- Step A: Happy Path Demonstration (Successful COMMIT)
START TRANSACTION;

-- 1. Verify Bed 30 is available (Row lock using FOR UPDATE to avoid race conditions)
SELECT bed_id, status 
FROM Bed 
WHERE bed_id = 30 AND status = 'Available'
FOR UPDATE;

-- 2. Create the booking for Tenant #1 (Arjun)
INSERT INTO Booking (check_in_date, monthly_rent, check_out_date, booking_status, bed_id, tenant_id)
VALUES (CURDATE(), 8000.00, NULL, 'Active', 30, 1);

-- Capture the generated booking_id
SET @new_booking_id = LAST_INSERT_ID();

-- 3. Record the first month advance payment
INSERT INTO Payment (amount, payment_mode, booking_id)
VALUES (8000.00, 'UPI', @new_booking_id);

-- 4. If all preceding steps succeeded with no errors, make changes permanent
COMMIT;

-- Verification of Commit:
SELECT 
    b.bed_id, 
    b.status AS bed_status,
    bk.booking_id,
    bk.booking_status,
    pay.payment_id,
    pay.amount
FROM Bed b
JOIN Booking bk ON b.bed_id = bk.bed_id
JOIN Payment pay ON bk.booking_id = pay.booking_id
WHERE bk.booking_id = @new_booking_id;


-- ============================================================================
-- Step B: Failure Path Demonstration (Automatic ROLLBACK on Failure)
-- Scenario:
--   Tenant attempts to book Bed #30 again (which is now Occupied!).
--   Trigger trg_check_bed_before_booking rejects the insert.
--   The transaction rolls back cleanly, leaving database state unaffected.
-- ============================================================================
START TRANSACTION;

-- Attempting booking on occupied bed:
-- INSERT INTO Booking (check_in_date, monthly_rent, booking_status, bed_id, tenant_id)
-- VALUES (CURDATE(), 8000.00, 'Active', 30, 2); 
-- --> Triggers SIGNAL 45000: "Booking Rejected: The requested bed is already Occupied..."

-- When an application error occurs:
ROLLBACK;


-- ============================================================================
-- TRANSACTION EXAMPLE 2: TENANT CHECKOUT WITH SAVEPOINTS
-- Scenario:
--   Tenant #1 checks out from Bed #30.
--   Savepoint is set after updating booking to 'Completed' (which frees the bed).
--   A final settlement adjustment / deposit refund calculation is attempted.
--   If adjustment fails, rollback only to the SAVEPOINT, preserving checkout!
-- ============================================================================
START TRANSACTION;

-- 1. Update Booking to Completed and set checkout date
UPDATE Booking 
SET 
    booking_status = 'Completed',
    check_out_date = CURDATE()
WHERE booking_id = @new_booking_id;

-- 2. Establish a named SAVEPOINT
SAVEPOINT sp_checkout_completed;

-- 3. Attempt to record an adjustment credit / penalty
-- Suppose an invalid negative penalty of -500 INR was entered by mistake:
-- INSERT INTO Payment (amount, payment_mode, booking_id) VALUES (-500.00, 'Cash', @new_booking_id);
-- --> Triggers error: payment amount must be > 0.

-- Instead of aborting the entire checkout, roll back only to the savepoint:
ROLLBACK TO SAVEPOINT sp_checkout_completed;

-- Now complete the valid checkout transaction:
COMMIT;

-- Verify bed is marked Available again:
SELECT bed_id, status FROM Bed WHERE bed_id = 30;


-- ============================================================================
-- TRANSACTION ISOLATION LEVELS (FOR DBMS VIVA)
-- ============================================================================
-- MySQL InnoDB default isolation level: REPEATABLE READ
-- 
-- 1. READ UNCOMMITTED:
--    Lowest level. Transactions can read uncommitted data (Dirty Reads possible).
-- 2. READ COMMITTED:
--    Prevents dirty reads. Each query sees data committed before query began.
--    Non-repeatable reads possible.
-- 3. REPEATABLE READ (MySQL Default):
--    Uses MVCC (Multi-Version Concurrency Control) snapshot.
--    Prevents dirty reads and non-repeatable reads.
-- 4. SERIALIZABLE:
--    Highest isolation. Acquires shared locks on all reads.
--    Prevents phantom reads, but lowest concurrency throughput.
--
-- Query to check and change isolation level:
-- SELECT @@transaction_isolation;
-- SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- ============================================================================

