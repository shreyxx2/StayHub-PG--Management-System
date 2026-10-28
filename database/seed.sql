-- ============================================================================
-- StayHub PG Management System - Realistic Seed Data
-- DBMS Subject College Project
-- ============================================================================
-- Contains:
--   - 3 Owners
--   - 5 PG Properties across Bangalore, Pune, Hyderabad
--   - 18 Rooms (Single, Double, Triple, Dormitory)
--   - 46 Beds (Available, Occupied, Maintenance)
--   - 18 Tenants (Realistic Indian students & IT professionals)
--   - 24 Bookings (Active, Completed, Cancelled)
--   - 48 Payments (Cash, UPI, Card, Net Banking)
--   - 12 Complaints (Open, In Progress, Resolved)
--   - Owner_Complaint M:N junction mappings
--   - 22 User authentication records with bcrypt password 'password123'
-- ============================================================================

USE stayhub_pg;

-- Temporarily disable foreign key checks for clean batch seeding
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
TRUNCATE TABLE owner_complaint;
TRUNCATE TABLE Complaint;
TRUNCATE TABLE Payment;
TRUNCATE TABLE Booking;
TRUNCATE TABLE Tenant;
TRUNCATE TABLE Bed;
TRUNCATE TABLE Room;
TRUNCATE TABLE Property;
TRUNCATE TABLE Owner;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. SEED OWNERS (3 realistic PG business owners)
-- ============================================================================
INSERT INTO Owner (owner_id, name, phone) VALUES
(1, 'Ramesh Sharma', '9876543210'),
(2, 'Sunita Patel', '9823456781'),
(3, 'Anand Rao', '9745612309');

-- ============================================================================
-- 2. SEED PROPERTIES (5 properties linked to Owners)
-- Owner 1 owns 2, Owner 2 owns 2, Owner 3 owns 1
-- ============================================================================
INSERT INTO Property (property_id, name, address, owner_id) VALUES
(1, 'Sai Comforts Executive PG', '4th Block, 100ft Road, Koramangala, Bangalore, Karnataka - 560034', 1),
(2, 'Green Valley Luxury PG', 'Phase 1, Rajiv Gandhi Infotech Park, Hinjawadi, Pune, Maharashtra - 411057', 1),
(3, 'Royal Palms Executive PG', 'Telecom Nagar, Gachibowli, Hyderabad, Telangana - 500032', 2),
(4, 'Sri Krishna Comforts PG', 'EPIP Zone, Near ITPL, Whitefield, Bangalore, Karnataka - 560066', 2),
(5, 'Nestwell Premier PG', 'Opp. Symbiosis Campus, Viman Nagar, Pune, Maharashtra - 411014', 3);

-- ============================================================================
-- 3. SEED ROOMS (18 rooms across the 5 properties)
-- Room Types: 'Single', 'Double', 'Triple', 'Dormitory'
-- ============================================================================
INSERT INTO Room (room_id, room_type, property_id) VALUES
-- Property 1 (Sai Comforts - Bangalore)
(1, 'Single', 1),
(2, 'Double', 1),
(3, 'Triple', 1),
(4, 'Dormitory', 1),

-- Property 2 (Green Valley - Pune)
(5, 'Single', 2),
(6, 'Double', 2),
(7, 'Double', 2),
(8, 'Triple', 2),

-- Property 3 (Royal Palms - Hyderabad)
(9, 'Single', 3),
(10, 'Double', 3),
(11, 'Triple', 3),
(12, 'Dormitory', 3),

-- Property 4 (Sri Krishna - Bangalore)
(13, 'Double', 4),
(14, 'Triple', 4),
(15, 'Dormitory', 4),

-- Property 5 (Nestwell - Pune)
(16, 'Single', 5),
(17, 'Double', 5),
(18, 'Triple', 5);

-- ============================================================================
-- 4. SEED BEDS (46 beds across all rooms)
-- Statuses: 'Available', 'Occupied', 'Maintenance'
-- ============================================================================
INSERT INTO Bed (bed_id, status, room_id) VALUES
-- Room 1 (Prop 1 - Single): 1 Bed
(1, 'Occupied', 1),

-- Room 2 (Prop 1 - Double): 2 Beds
(2, 'Occupied', 2),
(3, 'Available', 2),

-- Room 3 (Prop 1 - Triple): 3 Beds
(4, 'Occupied', 3),
(5, 'Occupied', 3),
(6, 'Available', 3),

-- Room 4 (Prop 1 - Dormitory): 4 Beds
(7, 'Occupied', 4),
(8, 'Occupied', 4),
(9, 'Available', 4),
(10, 'Maintenance', 4),

-- Room 5 (Prop 2 - Single): 1 Bed
(11, 'Occupied', 5),

-- Room 6 (Prop 2 - Double): 2 Beds
(12, 'Occupied', 6),
(13, 'Available', 6),

-- Room 7 (Prop 2 - Double): 2 Beds
(14, 'Occupied', 7),
(15, 'Available', 7),

-- Room 8 (Prop 2 - Triple): 3 Beds
(16, 'Occupied', 8),
(17, 'Occupied', 8),
(18, 'Available', 8),

-- Room 9 (Prop 3 - Single): 1 Bed
(19, 'Occupied', 9),

-- Room 10 (Prop 3 - Double): 2 Beds
(20, 'Occupied', 10),
(21, 'Available', 10),

-- Room 11 (Prop 3 - Triple): 3 Beds
(22, 'Occupied', 11),
(23, 'Occupied', 11),
(24, 'Available', 11),

-- Room 12 (Prop 3 - Dormitory): 4 Beds
(25, 'Occupied', 12),
(26, 'Occupied', 12),
(27, 'Available', 12),
(28, 'Maintenance', 12),

-- Room 13 (Prop 4 - Double): 2 Beds
(29, 'Occupied', 13),
(30, 'Available', 13),

-- Room 14 (Prop 4 - Triple): 3 Beds
(31, 'Occupied', 14),
(32, 'Available', 14),
(33, 'Available', 14),

-- Room 15 (Prop 4 - Dormitory): 4 Beds
(34, 'Available', 15),
(35, 'Available', 15),
(36, 'Available', 15),
(37, 'Available', 15),

-- Room 16 (Prop 5 - Single): 1 Bed
(38, 'Occupied', 16),

-- Room 17 (Prop 5 - Double): 2 Beds
(39, 'Occupied', 17),
(40, 'Available', 17),

-- Room 18 (Prop 5 - Triple): 3 Beds
(41, 'Occupied', 18),
(42, 'Available', 18),
(43, 'Available', 18),

-- Extra beds in Dormitory 15 for capacity
(44, 'Available', 15),
(45, 'Available', 15),
(46, 'Maintenance', 15);

-- ============================================================================
-- 5. SEED TENANTS (18 tenants)
-- ============================================================================
INSERT INTO Tenant (tenant_id, name, phone) VALUES
(1, 'Arjun Mehta', '9811223344'),
(2, 'Priya Nair', '9822334455'),
(3, 'Rohit Verma', '9833445566'),
(4, 'Sneha Kulkarni', '9844556677'),
(5, 'Vikram Singh', '9855667788'),
(6, 'Ananya Deshmukh', '9866778899'),
(7, 'Karthik Reddy', '9877889900'),
(8, 'Divya Iyer', '9888990011'),
(9, 'Rahul Joshi', '9899001122'),
(10, 'Pooja Hegde', '9900112233'),
(11, 'Amit Choudhary', '9911223344'),
(12, 'Meera Menon', '9922334455'),
(13, 'Varun Gupta', '9933445566'),
(14, 'Tanvi Saxena', '9944556677'),
(15, 'Siddharth Sen', '9955667788'),
(16, 'Ritu Bansal', '9966778899'),
(17, 'Aditya Bhat', '9977889900'),
(18, 'Neha Kapoor', '9988990011');

-- ============================================================================
-- 6. SEED BOOKINGS (24 bookings: Active, Completed, Cancelled)
-- ============================================================================
INSERT INTO Booking (booking_id, check_in_date, monthly_rent, check_out_date, booking_status, bed_id, tenant_id) VALUES
-- Active Bookings (Current Occupants)
(1,  '2026-01-01', 12000.00, NULL, 'Active', 1,  1),   -- Arjun in Bed 1 (Single)
(2,  '2026-01-15', 8500.00,  NULL, 'Active', 2,  2),   -- Priya in Bed 2 (Double)
(3,  '2026-02-01', 6500.00,  NULL, 'Active', 4,  3),   -- Rohit in Bed 4 (Triple)
(4,  '2026-02-10', 6500.00,  NULL, 'Active', 5,  4),   -- Sneha in Bed 5 (Triple)
(5,  '2026-03-01', 5000.00,  NULL, 'Active', 7,  5),   -- Vikram in Bed 7 (Dorm)
(6,  '2026-03-05', 5000.00,  NULL, 'Active', 8,  6),   -- Ananya in Bed 8 (Dorm)
(7,  '2026-01-10', 13000.00, NULL, 'Active', 11, 7),   -- Karthik in Bed 11 (Single)
(8,  '2026-02-15', 9000.00,  NULL, 'Active', 12, 8),   -- Divya in Bed 12 (Double)
(9,  '2026-03-01', 9000.00,  NULL, 'Active', 14, 9),   -- Rahul in Bed 14 (Double)
(10, '2026-01-20', 7000.00,  NULL, 'Active', 16, 10),  -- Pooja in Bed 16 (Triple)
(11, '2026-02-01', 7000.00,  NULL, 'Active', 17, 11),  -- Amit in Bed 17 (Triple)
(12, '2026-02-15', 14000.00, NULL, 'Active', 19, 12),  -- Meera in Bed 19 (Single)
(13, '2026-03-01', 9500.00,  NULL, 'Active', 20, 13),  -- Varun in Bed 20 (Double)
(14, '2026-03-10', 7500.00,  NULL, 'Active', 22, 14),  -- Tanvi in Bed 22 (Triple)
(15, '2026-01-05', 7500.00,  NULL, 'Active', 23, 15),  -- Siddharth in Bed 23 (Triple)
(16, '2026-02-01', 5500.00,  NULL, 'Active', 25, 16),  -- Ritu in Bed 25 (Dorm)
(17, '2026-03-15', 5500.00,  NULL, 'Active', 26, 17),  -- Aditya in Bed 26 (Dorm)
(18, '2026-01-12', 8000.00,  NULL, 'Active', 29, 18),  -- Neha in Bed 29 (Double)
(19, '2026-02-15', 6000.00,  NULL, 'Active', 31, 1),   -- Arjun second booking (bed 31)
(20, '2026-01-01', 11500.00, NULL, 'Active', 38, 2),   -- Priya in Bed 38 (Single)
(21, '2026-02-01', 8000.00,  NULL, 'Active', 39, 3),   -- Rohit in Bed 39 (Double)
(22, '2026-03-01', 6000.00,  NULL, 'Active', 41, 4),   -- Sneha in Bed 41 (Triple)

-- Completed Bookings (Past Tenants who checked out)
(23, '2025-08-01', 12000.00, '2025-12-31', 'Completed', 3, 5),  -- Vikram previously in Bed 3
(24, '2025-09-01', 6500.00,  '2025-11-30', 'Completed', 6, 6);  -- Ananya previously in Bed 6

-- ============================================================================
-- 7. SEED PAYMENTS (48 payments across multiple months & modes)
-- Modes: 'Cash', 'UPI', 'Card', 'Net Banking'
-- ============================================================================
INSERT INTO Payment (payment_id, amount, payment_date, payment_mode, booking_id) VALUES
-- Booking 1 (Arjun - 12000/mo, check-in Jan 2026)
(1,  12000.00, '2026-01-02 10:30:00', 'UPI', 1),
(2,  12000.00, '2026-02-02 11:15:00', 'Net Banking', 1),
(3,  12000.00, '2026-03-02 09:45:00', 'UPI', 1),

-- Booking 2 (Priya - 8500/mo, check-in Jan 2026)
(4,  8500.00,  '2026-01-16 14:00:00', 'Card', 2),
(5,  8500.00,  '2026-02-16 16:30:00', 'UPI', 2),
(6,  8500.00,  '2026-03-16 12:20:00', 'UPI', 2),

-- Booking 3 (Rohit - 6500/mo, check-in Feb 2026)
(7,  6500.00,  '2026-02-02 18:00:00', 'UPI', 3),
(8,  6500.00,  '2026-03-02 15:10:00', 'Cash', 3),

-- Booking 4 (Sneha - 6500/mo, check-in Feb 2026 - Defaulter partial payment)
(9,  6500.00,  '2026-02-11 10:00:00', 'UPI', 4),
(10, 3000.00,  '2026-03-12 11:30:00', 'Cash', 4), -- Pending rent remaining

-- Booking 5 (Vikram - 5000/mo, check-in Mar 2026)
(11, 5000.00,  '2026-03-02 17:45:00', 'UPI', 5),

-- Booking 6 (Ananya - 5000/mo, check-in Mar 2026)
(12, 5000.00,  '2026-03-06 19:20:00', 'Net Banking', 6),

-- Booking 7 (Karthik - 13000/mo, check-in Jan 2026)
(13, 13000.00, '2026-01-11 09:00:00', 'Net Banking', 7),
(14, 13000.00, '2026-02-11 09:30:00', 'Net Banking', 7),
(15, 13000.00, '2026-03-11 10:15:00', 'Card', 7),

-- Booking 8 (Divya - 9000/mo, check-in Feb 2026)
(16, 9000.00,  '2026-02-16 13:00:00', 'UPI', 8),
(17, 9000.00,  '2026-03-16 14:15:00', 'UPI', 8),

-- Booking 9 (Rahul - 9000/mo, check-in Mar 2026)
(18, 9000.00,  '2026-03-02 11:00:00', 'Card', 9),

-- Booking 10 (Pooja - 7000/mo, check-in Jan 2026)
(19, 7000.00,  '2026-01-21 16:00:00', 'UPI', 10),
(20, 7000.00,  '2026-02-21 12:40:00', 'UPI', 10),
(21, 7000.00,  '2026-03-21 10:30:00', 'Net Banking', 10),

-- Booking 11 (Amit - 7000/mo, check-in Feb 2026 - Defaulter with 0 payment in March)
(22, 7000.00,  '2026-02-02 08:30:00', 'Cash', 11),

-- Booking 12 (Meera - 14000/mo, check-in Feb 2026)
(23, 14000.00, '2026-02-16 11:20:00', 'Net Banking', 12),
(24, 14000.00, '2026-03-16 15:45:00', 'Net Banking', 12),

-- Booking 13 (Varun - 9500/mo, check-in Mar 2026)
(25, 9500.00,  '2026-03-02 10:00:00', 'UPI', 13),

-- Booking 14 (Tanvi - 7500/mo, check-in Mar 2026)
(26, 7500.00,  '2026-03-11 12:00:00', 'UPI', 14),

-- Booking 15 (Siddharth - 7500/mo, check-in Jan 2026)
(27, 7500.00,  '2026-01-06 17:00:00', 'UPI', 15),
(28, 7500.00,  '2026-02-06 18:30:00', 'Card', 15),
(29, 7500.00,  '2026-03-06 14:00:00', 'UPI', 15),

-- Booking 16 (Ritu - 5500/mo, check-in Feb 2026)
(30, 5500.00,  '2026-02-02 13:10:00', 'Cash', 16),
(31, 5500.00,  '2026-03-02 14:00:00', 'Cash', 16),

-- Booking 17 (Aditya - 5500/mo, check-in Mar 2026)
(32, 5500.00,  '2026-03-16 16:30:00', 'UPI', 17),

-- Booking 18 (Neha - 8000/mo, check-in Jan 2026)
(33, 8000.00,  '2026-01-13 10:15:00', 'Net Banking', 18),
(34, 8000.00,  '2026-02-13 11:20:00', 'Net Banking', 18),
(35, 8000.00,  '2026-03-13 10:45:00', 'Net Banking', 18),

-- Booking 19 (Arjun - 6000/mo, check-in Feb 2026)
(36, 6000.00,  '2026-02-16 09:30:00', 'UPI', 19),
(37, 6000.00,  '2026-03-16 10:00:00', 'UPI', 19),

-- Booking 20 (Priya - 11500/mo, check-in Jan 2026)
(38, 11500.00, '2026-01-02 15:00:00', 'Card', 20),
(39, 11500.00, '2026-02-02 14:30:00', 'Card', 20),
(40, 11500.00, '2026-03-02 16:15:00', 'Card', 20),

-- Booking 21 (Rohit - 8000/mo, check-in Feb 2026)
(41, 8000.00,  '2026-02-02 17:00:00', 'UPI', 21),
(42, 8000.00,  '2026-03-02 18:20:00', 'UPI', 21),

-- Booking 22 (Sneha - 6000/mo, check-in Mar 2026)
(43, 6000.00,  '2026-03-02 12:00:00', 'UPI', 22),

-- Booking 23 (Vikram completed: 5 months of rent paid)
(44, 12000.00, '2025-08-02 10:00:00', 'UPI', 23),
(45, 12000.00, '2025-09-02 11:00:00', 'UPI', 23),
(46, 12000.00, '2025-10-02 10:30:00', 'Net Banking', 23),

-- Booking 24 (Ananya completed: 3 months of rent paid)
(47, 6500.00,  '2025-09-02 12:00:00', 'Cash', 24),
(48, 6500.00,  '2025-10-02 14:00:00', 'Cash', 24);

-- ============================================================================
-- 8. SEED COMPLAINTS (12 realistic tenant complaints)
-- Statuses: 'Open', 'In Progress', 'Resolved'
-- ============================================================================
INSERT INTO Complaint (complaint_id, description, status, complaint_date, tenant_id) VALUES
(1,  'High-speed Wi-Fi not reachable in Room 101 corner.', 'Open', '2026-03-10 10:30:00', 1),
(2,  'Bathroom tap has a continuous minor leak.', 'In Progress', '2026-03-12 11:45:00', 2),
(3,  'Geyser takes over 20 minutes to heat water in the morning.', 'Resolved', '2026-02-15 08:30:00', 3),
(4,  'Window latch in Room 103 is loose, rattles during wind.', 'Open', '2026-03-18 16:20:00', 4),
(5,  'RO drinking water dispenser filter needs regular service/change.', 'Open', '2026-03-20 09:15:00', 5),
(6,  'Need mattress replacement due to spring discomfort.', 'In Progress', '2026-03-14 14:00:00', 7),
(7,  'Air conditioner remote control batteries dead and cooling low.', 'Resolved', '2026-02-20 18:00:00', 8),
(8,  'Washing machine on 2nd floor vibrates excessively on spin cycle.', 'In Progress', '2026-03-16 12:10:00', 9),
(9,  'Room door lock is jammed from outside when turned.', 'Open', '2026-03-22 17:30:00', 10),
(10, 'Common balcony light bulb is fused.', 'Resolved', '2026-01-25 19:40:00', 12),
(11, 'Power backup generator took 15 minutes to switch on during outage.', 'Open', '2026-03-24 15:00:00', 14),
(12, 'Pest control needed for wardrobe corners.', 'In Progress', '2026-03-21 13:20:00', 15);

-- ============================================================================
-- 9. SEED OWNER_COMPLAINT (M:N Junction Table)
-- Resolves which owner handles which tenant complaint based on property ownership
-- ============================================================================
INSERT INTO owner_complaint (owner_id, complaint_id, assigned_date) VALUES
-- Owner 1 (Ramesh Sharma) manages Complaints 1, 2, 3, 4, 5 (tenants 1, 2, 3, 4, 5 in Prop 1 & 2)
(1, 1, '2026-03-10 10:35:00'),
(1, 2, '2026-03-12 11:50:00'),
(1, 3, '2026-02-15 08:35:00'),
(1, 4, '2026-03-18 16:25:00'),
(1, 5, '2026-03-20 09:20:00'),

-- Owner 1 also manages complaints for Property 2 (tenants 7, 8, 9)
(1, 6, '2026-03-14 14:05:00'),
(1, 7, '2026-02-20 18:05:00'),
(1, 8, '2026-03-16 12:15:00'),

-- Owner 2 (Sunita Patel) manages Complaints 9, 10, 11, 12 (tenants 10, 12, 14, 15 in Prop 3 & 4)
(2, 9,  '2026-03-22 17:35:00'),
(2, 10, '2026-01-25 19:45:00'),
(2, 11, '2026-03-24 15:05:00'),
(2, 12, '2026-03-21 13:25:00');

-- ============================================================================
-- 10. SEED USERS (Authentication credentials)
-- Default password for all users: 'password123'
-- Bcrypt Hash: $2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa
-- ============================================================================
INSERT INTO users (user_id, email, password_hash, role, owner_id, tenant_id) VALUES
-- System Administrator
(1,  'admin@stayhub.com',     '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'admin',  NULL, NULL),

-- PG Owners
(2,  'ramesh@stayhub.com',    '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'owner',  1,    NULL),
(3,  'sunita@stayhub.com',    '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'owner',  2,    NULL),
(4,  'anand@stayhub.com',     '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'owner',  3,    NULL),

-- Tenants / Students
(5,  'arjun@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 1),
(6,  'priya@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 2),
(7,  'rohit@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 3),
(8,  'sneha@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 4),
(9,  'vikram@gmail.com',      '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 5),
(10, 'ananya@gmail.com',      '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 6),
(11, 'karthik@gmail.com',     '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 7),
(12, 'divya@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 8),
(13, 'rahul@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 9),
(14, 'pooja@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 10),
(15, 'amit@gmail.com',        '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 11),
(16, 'meera@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 12),
(17, 'varun@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 13),
(18, 'tanvi@gmail.com',       '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 14),
(19, 'siddharth@gmail.com',   '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 15),
(20, 'ritu@gmail.com',        '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 16),
(21, 'aditya@gmail.com',      '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 17),
(22, 'neha@gmail.com',        '$2a$10$l4UFFBnqW61egt73RPEq0uEqJoBvHEOwMt3OQR5uaaxAebZW/5FBa', 'tenant', NULL, 18);

