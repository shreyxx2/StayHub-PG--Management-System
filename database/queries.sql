-- ============================================================================
-- StayHub PG Management System - 30 Comprehensive DBMS Queries
-- DBMS Subject College Project
-- ============================================================================
-- Covers:
--   1. Basic Selection, Filtering, Pattern Matching, Range & Set Membership
--   2. Multi-Table Joins (INNER, LEFT, RIGHT across 3-6 tables)
--   3. Aggregations, GROUP BY, and HAVING Filters (COUNT, SUM, AVG, MIN, MAX)
--   4. Subqueries (Scalar, Nested, Correlated, EXISTS, NOT EXISTS, IN, ALL/ANY)
--   5. Set Operations (UNION, simulated INTERSECT, simulated EXCEPT)
--   6. Business Analytics & Real-World PG Operational Reports
-- ============================================================================

USE stayhub_pg;

-- ============================================================================
-- SECTION 1: BASIC SELECTION, FILTERING, SORTING, PATTERN & RANGE
-- ============================================================================

-- QUERY 1: Basic SELECT with WHERE and ORDER BY
-- Concept: Single table filter with deterministic multi-column sorting
-- Purpose: Retrieve all currently available beds sorted by room and bed ID.
SELECT 
    bed_id, 
    room_id, 
    status 
FROM Bed 
WHERE status = 'Available' 
ORDER BY room_id ASC, bed_id ASC;

-- QUERY 2: Pattern Matching with LIKE
-- Concept: String wildcards (% and _) for partial text search
-- Purpose: Find all PG properties situated in the tech hub of 'Bangalore'.
SELECT 
    property_id, 
    name AS property_name, 
    address 
FROM Property 
WHERE address LIKE '%Bangalore%' 
ORDER BY property_id;

-- QUERY 3: Set Membership with IN Operator
-- Concept: Discrete set filtering vs chained OR conditions
-- Purpose: List all premium private/semi-private rooms (Single or Double).
SELECT 
    room_id, 
    property_id, 
    room_type 
FROM Room 
WHERE room_type IN ('Single', 'Double')
ORDER BY property_id, room_type;

-- QUERY 4: Range Filtering with BETWEEN Operator
-- Concept: Inclusive interval range comparison
-- Purpose: Find high-value rent payments recorded between 8,000 and 15,000 INR.
SELECT 
    payment_id, 
    booking_id, 
    amount, 
    payment_mode, 
    payment_date 
FROM Payment 
WHERE amount BETWEEN 8000.00 AND 15000.00 
ORDER BY amount DESC;

-- QUERY 5: Eliminating Duplicates with DISTINCT
-- Concept: Unique tuple projection
-- Purpose: List all payment modes actively adopted by tenants across historical records.
SELECT DISTINCT 
    payment_mode 
FROM Payment 
ORDER BY payment_mode ASC;

-- QUERY 6: Complex Boolean Logic (AND, OR, NOT)
-- Concept: Compound propositional filtering with precedence
-- Purpose: Retrieve beds that are available and either in Room 1 or Room 2, excluding maintenance beds.
SELECT 
    bed_id, 
    room_id, 
    status 
FROM Bed 
WHERE (room_id = 2 OR room_id = 3) 
  AND NOT status = 'Maintenance';


-- ============================================================================
-- SECTION 2: MULTI-TABLE JOINS (INNER, LEFT, RIGHT across 3-6 Tables)
-- ============================================================================

-- QUERY 7: 3-Table INNER JOIN (Property -> Room -> Bed)
-- Concept: Multi-entity relational traversal
-- Purpose: List every available bed along with its room type and host PG property name.
SELECT 
    b.bed_id,
    r.room_id,
    r.room_type,
    p.property_id,
    p.name AS property_name,
    b.status
FROM Bed b
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
WHERE b.status = 'Available'
ORDER BY p.name, r.room_type;

-- QUERY 8: 4-Table INNER JOIN (Owner -> Property -> Room -> Bed)
-- Concept: Full vertical ownership hierarchy
-- Purpose: Map all bed inventory directly to the respective property owner for asset tracking.
SELECT 
    o.owner_id,
    o.name AS owner_name,
    o.phone AS owner_phone,
    p.name AS property_name,
    r.room_id,
    r.room_type,
    b.bed_id,
    b.status AS bed_status
FROM Owner o
INNER JOIN Property p ON o.owner_id = p.owner_id
INNER JOIN Room r ON p.property_id = r.property_id
INNER JOIN Bed b ON r.room_id = b.room_id
ORDER BY o.name, p.name, b.bed_id;

-- QUERY 9: 5-Table INNER JOIN (Tenant -> Booking -> Bed -> Room -> Property)
-- Concept: Core operational workflow join
-- Purpose: Current active tenant residency directory showing room & property allocation.
SELECT 
    t.tenant_id,
    t.name AS tenant_name,
    t.phone AS tenant_phone,
    bk.booking_id,
    bk.check_in_date,
    bk.monthly_rent,
    b.bed_id,
    r.room_type,
    p.name AS property_name,
    p.address AS property_address
FROM Tenant t
INNER JOIN Booking bk ON t.tenant_id = bk.tenant_id
INNER JOIN Bed b ON bk.bed_id = b.bed_id
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
WHERE bk.booking_status = 'Active'
ORDER BY p.name, t.name;

-- QUERY 10: 6-Table INNER JOIN with Audit Payment Trail
-- Concept: Enterprise financial traversal across 6 relational levels
-- Purpose: Track payment receipt back to tenant, booking, room, property, and recipient owner.
SELECT 
    pay.payment_id,
    pay.amount,
    pay.payment_date,
    pay.payment_mode,
    t.name AS tenant_name,
    p.name AS property_name,
    r.room_type,
    o.name AS owner_name
FROM Payment pay
INNER JOIN Booking bk ON pay.booking_id = bk.booking_id
INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id
INNER JOIN Bed b ON bk.bed_id = b.bed_id
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
INNER JOIN Owner o ON p.owner_id = o.owner_id
ORDER BY pay.payment_date DESC
LIMIT 10;

-- QUERY 11: LEFT OUTER JOIN
-- Concept: Preserving all tuples of left relation regardless of match
-- Purpose: Display all properties and their room count (ensures properties with 0 rooms still appear).
SELECT 
    p.property_id,
    p.name AS property_name,
    p.address,
    COUNT(r.room_id) AS total_rooms
FROM Property p
LEFT JOIN Room r ON p.property_id = r.property_id
GROUP BY p.property_id, p.name, p.address
ORDER BY total_rooms DESC;

-- QUERY 12: RIGHT OUTER JOIN
-- Concept: Preserving all tuples of right relation
-- Purpose: Show all registered tenants and their raised complaints (including tenants who raised zero complaints).
SELECT 
    t.tenant_id,
    t.name AS tenant_name,
    t.phone AS tenant_phone,
    c.complaint_id,
    c.description,
    COALESCE(c.status, 'No Complaints') AS complaint_status
FROM Complaint c
RIGHT JOIN Tenant t ON c.tenant_id = t.tenant_id
ORDER BY t.tenant_id;


-- ============================================================================
-- SECTION 3: AGGREGATIONS, GROUP BY, AND HAVING FILTERS
-- ============================================================================

-- QUERY 13: Available Beds per Property (Prompt Core Requirement)
-- Concept: Conditional aggregation using COUNT & CASE / SUM
-- Purpose: Real-time bed availability inventory dashboard across all PG properties.
SELECT 
    p.property_id,
    p.name AS property_name,
    COUNT(b.bed_id) AS total_beds,
    SUM(CASE WHEN b.status = 'Available' THEN 1 ELSE 0 END) AS available_beds,
    SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_beds,
    SUM(CASE WHEN b.status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance_beds
FROM Property p
LEFT JOIN Room r ON p.property_id = r.property_id
LEFT JOIN Bed b ON r.room_id = b.room_id
GROUP BY p.property_id, p.name
ORDER BY available_beds DESC;

-- QUERY 14: Monthly Revenue per Property (Prompt Core Requirement)
-- Concept: SUM aggregation across connected transactions grouped by property
-- Purpose: Total cumulative revenue generated per PG property.
SELECT 
    p.property_id,
    p.name AS property_name,
    o.name AS owner_name,
    COALESCE(SUM(pay.amount), 0.00) AS total_revenue_collected,
    COUNT(pay.payment_id) AS total_transactions
FROM Property p
INNER JOIN Owner o ON p.owner_id = o.owner_id
LEFT JOIN Room r ON p.property_id = r.property_id
LEFT JOIN Bed b ON r.room_id = b.room_id
LEFT JOIN Booking bk ON b.bed_id = bk.bed_id
LEFT JOIN Payment pay ON bk.booking_id = pay.booking_id
GROUP BY p.property_id, p.name, o.name
ORDER BY total_revenue_collected DESC;

-- QUERY 15: GROUP BY with HAVING Filter
-- Concept: Post-aggregation filtering criteria
-- Purpose: Identify PG properties where the average monthly rent exceeds 8,000 INR.
SELECT 
    p.property_id,
    p.name AS property_name,
    ROUND(AVG(bk.monthly_rent), 2) AS average_monthly_rent,
    COUNT(bk.booking_id) AS total_bookings_analyzed
FROM Property p
INNER JOIN Room r ON p.property_id = r.property_id
INNER JOIN Bed b ON r.room_id = b.room_id
INNER JOIN Booking bk ON b.bed_id = bk.bed_id
GROUP BY p.property_id, p.name
HAVING AVG(bk.monthly_rent) > 8000.00
ORDER BY average_monthly_rent DESC;

-- QUERY 16: Aggregation with MIN, MAX, and AVG
-- Concept: Statistical boundary analysis across categories
-- Purpose: Analyze rent distribution boundaries (Lowest, Highest, Average) per Room Type.
SELECT 
    r.room_type,
    MIN(bk.monthly_rent) AS minimum_rent,
    MAX(bk.monthly_rent) AS maximum_rent,
    ROUND(AVG(bk.monthly_rent), 2) AS average_rent,
    COUNT(bk.booking_id) AS active_contract_count
FROM Room r
INNER JOIN Bed b ON r.room_id = b.room_id
INNER JOIN Booking bk ON b.bed_id = bk.bed_id
WHERE bk.booking_status = 'Active'
GROUP BY r.room_type
ORDER BY average_rent DESC;

-- QUERY 17: Multi-Column GROUP BY
-- Concept: Two-dimensional categorical breakdown
-- Purpose: Financial audit of payment modes adopted across each property.
SELECT 
    p.name AS property_name,
    pay.payment_mode,
    COUNT(pay.payment_id) AS transaction_count,
    SUM(pay.amount) AS total_amount
FROM Payment pay
INNER JOIN Booking bk ON pay.booking_id = bk.booking_id
INNER JOIN Bed b ON bk.bed_id = b.bed_id
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
GROUP BY p.name, pay.payment_mode
ORDER BY p.name, total_amount DESC;

-- QUERY 18: Occupancy Percentage per Property (Prompt Core Requirement)
-- Concept: Mathematical percentage calculation inside aggregate projection
-- Purpose: Compute live operational capacity utilization % for each PG property.
SELECT 
    p.property_id,
    p.name AS property_name,
    COUNT(b.bed_id) AS total_beds,
    SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_beds,
    ROUND(
        (SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) * 100.0) / 
        NULLIF(COUNT(b.bed_id), 0), 
        2
    ) AS occupancy_percentage
FROM Property p
LEFT JOIN Room r ON p.property_id = r.property_id
LEFT JOIN Bed b ON r.room_id = b.room_id
GROUP BY p.property_id, p.name
ORDER BY occupancy_percentage DESC;


-- ============================================================================
-- SECTION 4: SUBQUERIES (Nested, Correlated, EXISTS, NOT EXISTS, IN/ALL)
-- ============================================================================

-- QUERY 19: Highest Paying Tenant (Prompt Core Requirement)
-- Concept: Scalar subquery in WHERE clause with aggregate subquery
-- Purpose: Identify the single highest contributing tenant in total lifetime rent payments.
SELECT 
    t.tenant_id,
    t.name AS tenant_name,
    t.phone,
    SUM(pay.amount) AS total_paid
FROM Tenant t
INNER JOIN Booking bk ON t.tenant_id = bk.tenant_id
INNER JOIN Payment pay ON bk.booking_id = pay.booking_id
GROUP BY t.tenant_id, t.name, t.phone
HAVING total_paid = (
    SELECT MAX(tenant_total)
    FROM (
        SELECT SUM(p2.amount) AS tenant_total
        FROM Booking bk2
        INNER JOIN Payment p2 ON bk2.booking_id = p2.booking_id
        GROUP BY bk2.tenant_id
    ) AS sub
);

-- QUERY 20: Most Popular Room Type (Prompt Core Requirement)
-- Concept: Subquery finding modal category with MAX count
-- Purpose: Discover which room category attracts the highest number of customer bookings.
SELECT 
    r.room_type,
    COUNT(bk.booking_id) AS total_bookings
FROM Room r
INNER JOIN Bed b ON r.room_id = b.room_id
INNER JOIN Booking bk ON b.bed_id = bk.bed_id
GROUP BY r.room_type
ORDER BY total_bookings DESC
LIMIT 1;

-- QUERY 21: Properties with No Bookings (Prompt Core Requirement)
-- Concept: NOT IN with subquery
-- Purpose: Detect underutilized or new properties that currently have zero bookings recorded.
SELECT 
    property_id, 
    name AS property_name, 
    address 
FROM Property 
WHERE property_id NOT IN (
    SELECT DISTINCT r.property_id 
    FROM Room r
    INNER JOIN Bed b ON r.room_id = b.room_id
    INNER JOIN Booking bk ON b.bed_id = bk.bed_id
);

-- QUERY 22: Tenants Who Never Raised a Complaint (Prompt Core Requirement)
-- Concept: Correlated Subquery with NOT EXISTS
-- Purpose: Identify satisfied or quiet tenants with zero grievance history.
SELECT 
    t.tenant_id,
    t.name AS tenant_name,
    t.phone
FROM Tenant t
WHERE NOT EXISTS (
    SELECT 1 
    FROM Complaint c 
    WHERE c.tenant_id = t.tenant_id
)
ORDER BY t.name;

-- QUERY 23: Correlated Subquery with EXISTS
-- Concept: Row-by-row existence check for relational integrity
-- Purpose: List all PG Owners who currently have at least one active booking in their properties.
SELECT 
    o.owner_id,
    o.name AS owner_name,
    o.phone
FROM Owner o
WHERE EXISTS (
    SELECT 1 
    FROM Property p
    INNER JOIN Room r ON p.property_id = r.property_id
    INNER JOIN Bed b ON r.room_id = b.room_id
    INNER JOIN Booking bk ON b.bed_id = bk.bed_id
    WHERE p.owner_id = o.owner_id AND bk.booking_status = 'Active'
)
ORDER BY o.name;

-- QUERY 24: Subquery with ALL Operator
-- Concept: Universal quantification across subquery results
-- Purpose: Find Single room bookings whose monthly rent is strictly higher than ALL Double room bookings.
SELECT 
    bk.booking_id,
    t.name AS tenant_name,
    r.room_type,
    bk.monthly_rent
FROM Booking bk
INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id
INNER JOIN Bed b ON bk.bed_id = b.bed_id
INNER JOIN Room r ON b.room_id = r.room_id
WHERE r.room_type = 'Single'
  AND bk.monthly_rent > ALL (
      SELECT bk2.monthly_rent
      FROM Booking bk2
      INNER JOIN Bed b2 ON bk2.bed_id = b2.bed_id
      INNER JOIN Room r2 ON b2.room_id = r2.room_id
      WHERE r2.room_type = 'Double'
  );

-- QUERY 25: Tenants with Pending Rent for Current Month (Prompt Core Requirement)
-- Concept: Analytical correlated subquery comparing expected rent vs total payments
-- Purpose: Flag all rent defaulters whose total rent payments fall short of expected monthly dues.
SELECT 
    bk.booking_id,
    t.tenant_id,
    t.name AS tenant_name,
    t.phone AS tenant_phone,
    p.name AS property_name,
    bk.monthly_rent,
    COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00) AS total_paid,
    -- Months stayed multiplied by monthly rent minus total paid
    (
      (TIMESTAMPDIFF(MONTH, bk.check_in_date, COALESCE(bk.check_out_date, CURDATE())) + 1) * bk.monthly_rent
      - COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00)
    ) AS pending_due_amount
FROM Booking bk
INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id
INNER JOIN Bed b ON bk.bed_id = b.bed_id
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
WHERE bk.booking_status = 'Active'
HAVING pending_due_amount > 0
ORDER BY pending_due_amount DESC;

-- QUERY 26: Owners with the Most Open Complaints (Prompt Core Requirement)
-- Concept: Multi-table join through M:N junction table with GROUP BY & ORDER BY
-- Purpose: Rank property owners by backlog of unresolved customer grievances.
SELECT 
    o.owner_id,
    o.name AS owner_name,
    o.phone AS owner_phone,
    COUNT(c.complaint_id) AS open_complaint_count
FROM Owner o
INNER JOIN owner_complaint oc ON o.owner_id = oc.owner_id
INNER JOIN Complaint c ON oc.complaint_id = c.complaint_id
WHERE c.status = 'Open'
GROUP BY o.owner_id, o.name, o.phone
ORDER BY open_complaint_count DESC;


-- ============================================================================
-- SECTION 5: SET OPERATIONS & ADVANCED OPERATIONAL QUERIES
-- ============================================================================

-- QUERY 27: Set Operation: UNION
-- Concept: Set union combining disjoint entities with matching projection arity
-- Purpose: Consolidated master contact book of all system stakeholders (Owners and Tenants).
SELECT 
    name AS contact_name, 
    phone AS contact_number, 
    'PG Owner' AS stakeholder_role 
FROM Owner
UNION ALL
SELECT 
    name AS contact_name, 
    phone AS contact_number, 
    'Student/Tenant' AS stakeholder_role 
FROM Tenant
ORDER BY contact_name ASC;

-- QUERY 28: Simulated Set Operation: INTERSECT
-- Concept: Relational intersection simulated via INNER JOIN on common key
-- Purpose: Find tenants who currently have an Active booking AND have raised at least one Complaint.
SELECT DISTINCT 
    t.tenant_id, 
    t.name AS tenant_name, 
    t.phone 
FROM Tenant t
INNER JOIN Booking bk ON t.tenant_id = bk.tenant_id AND bk.booking_status = 'Active'
INNER JOIN Complaint c ON t.tenant_id = c.tenant_id
ORDER BY t.name;

-- QUERY 29: Simulated Set Operation: EXCEPT / MINUS
-- Concept: Relational set difference simulated via LEFT JOIN with NULL check
-- Purpose: Identify beds that have NEVER had any booking recorded in history.
SELECT 
    b.bed_id, 
    r.room_type, 
    p.name AS property_name, 
    b.status 
FROM Bed b
INNER JOIN Room r ON b.room_id = r.room_id
INNER JOIN Property p ON r.property_id = p.property_id
LEFT JOIN Booking bk ON b.bed_id = bk.bed_id
WHERE bk.booking_id IS NULL
ORDER BY b.bed_id;

-- QUERY 30: Analytical Revenue Contribution Percentage
-- Concept: Subquery in projection for calculating proportional contribution
-- Purpose: Determine the % share of total company revenue generated by each PG property.
SELECT 
    p.name AS property_name,
    COALESCE(SUM(pay.amount), 0.00) AS property_revenue,
    ROUND(
        (COALESCE(SUM(pay.amount), 0.00) * 100.0) / 
        NULLIF((SELECT SUM(amount) FROM Payment), 0),
        2
    ) AS revenue_contribution_pct
FROM Property p
LEFT JOIN Room r ON p.property_id = r.property_id
LEFT JOIN Bed b ON r.room_id = b.room_id
LEFT JOIN Booking bk ON b.bed_id = bk.bed_id
LEFT JOIN Payment pay ON bk.booking_id = pay.booking_id
GROUP BY p.property_id, p.name
ORDER BY property_revenue DESC;

