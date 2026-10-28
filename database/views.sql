-- ============================================================================
-- StayHub PG Management System - Database Views (Virtual Relations)
-- DBMS Subject College Project
-- ============================================================================
-- Views provide:
--   1. Data Abstraction: Hides schema complexity and complex multi-table joins.
--   2. Security & Access Control: Exposes only relevant columns to end users.
--   3. Query Simplification: Allows simple SELECT * FROM <view> for analytics.
--   4. Consistency: Guarantees standardized business logic across applications.
-- ============================================================================

USE stayhub_pg;

-- ============================================================================
-- VIEW 1: property_occupancy_summary
-- Purpose: Real-time operational capacity dashboard for Owners and Admins.
-- Aggregates total rooms, total beds, occupied beds, available beds,
-- maintenance beds, occupancy percentage, and active monthly revenue potential.
-- ============================================================================
DROP VIEW IF EXISTS property_occupancy_summary;
CREATE VIEW property_occupancy_summary AS
SELECT 
    p.property_id,
    p.name AS property_name,
    p.address AS property_address,
    o.owner_id,
    o.name AS owner_name,
    o.phone AS owner_phone,
    COUNT(DISTINCT r.room_id) AS total_rooms,
    COUNT(b.bed_id) AS total_beds,
    SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_beds,
    SUM(CASE WHEN b.status = 'Available' THEN 1 ELSE 0 END) AS available_beds,
    SUM(CASE WHEN b.status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance_beds,
    ROUND(
        (SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(b.bed_id), 0), 
        2
    ) AS occupancy_percentage,
    COALESCE(
        (SELECT SUM(bk.monthly_rent) 
         FROM Booking bk 
         JOIN Bed bd ON bk.bed_id = bd.bed_id 
         JOIN Room rm ON bd.room_id = rm.room_id 
         WHERE rm.property_id = p.property_id AND bk.booking_status = 'Active'),
        0.00
    ) AS active_monthly_rent_run_rate
FROM Property p
INNER JOIN Owner o ON p.owner_id = o.owner_id
LEFT JOIN Room r ON p.property_id = r.property_id
LEFT JOIN Bed b ON r.room_id = b.room_id
GROUP BY p.property_id, p.name, p.address, o.owner_id, o.name, o.phone;

-- ============================================================================
-- VIEW 2: rent_defaulters
-- Purpose: Flags active tenants with unpaid dues / overdue rent.
-- Calculates months elapsed since check-in date, expected cumulative rent,
-- total payments made to date, and the net pending balance.
-- ============================================================================
DROP VIEW IF EXISTS rent_defaulters;
CREATE VIEW rent_defaulters AS
SELECT 
    bk.booking_id,
    t.tenant_id,
    t.name AS tenant_name,
    t.phone AS tenant_phone,
    p.property_id,
    p.name AS property_name,
    o.name AS owner_name,
    o.phone AS owner_phone,
    bk.check_in_date,
    bk.monthly_rent,
    -- Months stayed calculation (at least 1 month)
    (TIMESTAMPDIFF(MONTH, bk.check_in_date, COALESCE(bk.check_out_date, CURDATE())) + 1) AS months_stayed,
    -- Total expected cumulative rent
    (
        (TIMESTAMPDIFF(MONTH, bk.check_in_date, COALESCE(bk.check_out_date, CURDATE())) + 1) * bk.monthly_rent
    ) AS total_expected_rent,
    -- Total payments actually credited
    COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00) AS total_paid_amount,
    -- Net pending balance
    (
        (TIMESTAMPDIFF(MONTH, bk.check_in_date, COALESCE(bk.check_out_date, CURDATE())) + 1) * bk.monthly_rent
        - COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00)
    ) AS pending_due_amount
FROM Booking bk
INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id
INNER JOIN Bed b ON bk.bed_id = b.bed_id
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
INNER JOIN Owner o ON p.owner_id = o.owner_id
WHERE bk.booking_status = 'Active'
HAVING pending_due_amount > 0;

-- ============================================================================
-- VIEW 3: tenant_booking_details
-- Purpose: 360-degree complete profile view of every booking.
-- Joins 6 tables (Tenant, Booking, Bed, Room, Property, Owner) with financial totals.
-- ============================================================================
DROP VIEW IF EXISTS tenant_booking_details;
CREATE VIEW tenant_booking_details AS
SELECT 
    bk.booking_id,
    bk.booking_status,
    bk.check_in_date,
    bk.check_out_date,
    bk.monthly_rent,
    t.tenant_id,
    t.name AS tenant_name,
    t.phone AS tenant_phone,
    b.bed_id,
    b.status AS bed_current_status,
    r.room_id,
    r.room_type,
    p.property_id,
    p.name AS property_name,
    p.address AS property_address,
    o.owner_id,
    o.name AS owner_name,
    o.phone AS owner_phone,
    COALESCE((SELECT COUNT(payment_id) FROM Payment WHERE booking_id = bk.booking_id), 0) AS total_payments_count,
    COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00) AS total_amount_paid,
    (
        (TIMESTAMPDIFF(MONTH, bk.check_in_date, COALESCE(bk.check_out_date, CURDATE())) + 1) * bk.monthly_rent
        - COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00)
    ) AS current_balance_due
FROM Booking bk
INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id
INNER JOIN Bed b ON bk.bed_id = b.bed_id
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
INNER JOIN Owner o ON p.owner_id = o.owner_id;

-- ============================================================================
-- VIEW 4: monthly_revenue_report
-- Purpose: Financial time-series reporting view.
-- Aggregates collections by year, calendar month, PG property, and payment mode.
-- ============================================================================
DROP VIEW IF EXISTS monthly_revenue_report;
CREATE VIEW monthly_revenue_report AS
SELECT 
    YEAR(pay.payment_date) AS payment_year,
    MONTH(pay.payment_date) AS payment_month_num,
    DATE_FORMAT(pay.payment_date, '%M') AS payment_month_name,
    p.property_id,
    p.name AS property_name,
    o.name AS owner_name,
    pay.payment_mode,
    COUNT(pay.payment_id) AS total_transactions,
    SUM(pay.amount) AS total_revenue
FROM Payment pay
INNER JOIN Booking bk ON pay.booking_id = bk.booking_id
INNER JOIN Bed b ON bk.bed_id = b.bed_id
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
INNER JOIN Owner o ON p.owner_id = o.owner_id
GROUP BY 
    YEAR(pay.payment_date),
    MONTH(pay.payment_date),
    DATE_FORMAT(pay.payment_date, '%M'),
    p.property_id,
    p.name,
    o.name,
    pay.payment_mode;

-- ============================================================================
-- VIEW 5: open_complaints_with_owner
-- Purpose: Unresolved complaints management view.
-- Exposes active grievance tickets with tenant and assigned owner info via M:N link.
-- ============================================================================
DROP VIEW IF EXISTS open_complaints_with_owner;
CREATE VIEW open_complaints_with_owner AS
SELECT 
    c.complaint_id,
    c.complaint_date,
    c.description,
    c.status AS complaint_status,
    t.tenant_id,
    t.name AS tenant_name,
    t.phone AS tenant_phone,
    o.owner_id,
    o.name AS owner_name,
    o.phone AS owner_phone,
    oc.assigned_date
FROM Complaint c
INNER JOIN Tenant t ON c.tenant_id = t.tenant_id
INNER JOIN owner_complaint oc ON c.complaint_id = oc.complaint_id
INNER JOIN Owner o ON oc.owner_id = o.owner_id
WHERE c.status IN ('Open', 'In Progress');

