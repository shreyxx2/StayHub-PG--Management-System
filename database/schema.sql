-- ============================================================================
-- StayHub PG Management System - Database Schema (3NF)
-- DBMS Subject College Project
-- ============================================================================
-- Author: StayHub Development Team
-- RDBMS: MySQL 8.0+
-- Engine: InnoDB (for ACID transactions, foreign keys, row-level locking)
-- Normalization Level: Third Normal Form (3NF)
-- ============================================================================

DROP DATABASE IF EXISTS stayhub_pg;
CREATE DATABASE stayhub_pg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stayhub_pg;

-- ============================================================================
-- 1. OWNER TABLE
-- Represents the owners who manage and operate PG properties.
-- Candidate Key: owner_id (PK), phone (Unique)
-- Normalization: 1NF (Atomic attributes), 2NF (No partial keys), 3NF (No transitive dependencies)
-- ============================================================================
CREATE TABLE Owner (
    owner_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    CONSTRAINT chk_owner_phone CHECK (LENGTH(phone) >= 10)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. PROPERTY TABLE
-- Represents PG hostels owned by owners.
-- Relationship: Owner (1) ---- (N) Property
-- Foreign Key: owner_id REFERENCES Owner(owner_id)
-- ON DELETE CASCADE: Deleting an owner removes all properties owned by them.
-- ON UPDATE CASCADE: Updating owner_id propagates automatically.
-- ============================================================================
CREATE TABLE Property (
    property_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    address VARCHAR(255) NOT NULL,
    owner_id INT NOT NULL,
    CONSTRAINT fk_property_owner FOREIGN KEY (owner_id) 
        REFERENCES Owner(owner_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 3. ROOM TABLE
-- Represents individual rooms inside a PG property.
-- Relationship: Property (1) ---- (N) Room
-- Allowed room_type: 'Single', 'Double', 'Triple', 'Dormitory'
-- Foreign Key: property_id REFERENCES Property(property_id)
-- ============================================================================
CREATE TABLE Room (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_type ENUM('Single', 'Double', 'Triple', 'Dormitory') NOT NULL,
    property_id INT NOT NULL,
    CONSTRAINT fk_room_property FOREIGN KEY (property_id) 
        REFERENCES Property(property_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. BED TABLE
-- Represents individual bookable bed slots inside a room.
-- Relationship: Room (1) ---- (N) Bed
-- Allowed status: 'Available', 'Occupied', 'Maintenance' (Default: 'Available')
-- Foreign Key: room_id REFERENCES Room(room_id)
-- ============================================================================
CREATE TABLE Bed (
    bed_id INT AUTO_INCREMENT PRIMARY KEY,
    status ENUM('Available', 'Occupied', 'Maintenance') NOT NULL DEFAULT 'Available',
    room_id INT NOT NULL,
    CONSTRAINT fk_bed_room FOREIGN KEY (room_id) 
        REFERENCES Room(room_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 5. TENANT TABLE
-- Represents students / working professionals staying in the PG.
-- Candidate Key: tenant_id (PK), phone (Unique)
-- ============================================================================
CREATE TABLE Tenant (
    tenant_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    CONSTRAINT chk_tenant_phone CHECK (LENGTH(phone) >= 10)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. BOOKING TABLE
-- Represents rental contracts between a Tenant and a Bed over time.
-- Note: A bed can be booked many times across history, but only one active booking at any time.
-- Allowed additions: check_out_date (nullable), booking_status ('Active','Completed','Cancelled')
-- Constraints:
--   - monthly_rent > 0
--   - check_out_date >= check_in_date (when not null)
-- Foreign Keys:
--   - bed_id REFERENCES Bed(bed_id) ON DELETE RESTRICT (Preserve audit/financial trail)
--   - tenant_id REFERENCES Tenant(tenant_id) ON DELETE RESTRICT
-- ============================================================================
CREATE TABLE Booking (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    check_in_date DATE NOT NULL,
    monthly_rent DECIMAL(10, 2) NOT NULL,
    check_out_date DATE NULL,
    booking_status ENUM('Active', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Active',
    bed_id INT NOT NULL,
    tenant_id INT NOT NULL,
    CONSTRAINT chk_booking_rent CHECK (monthly_rent > 0),
    CONSTRAINT chk_booking_dates CHECK (check_out_date IS NULL OR check_out_date >= check_in_date),
    CONSTRAINT fk_booking_bed FOREIGN KEY (bed_id) 
        REFERENCES Bed(bed_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_booking_tenant FOREIGN KEY (tenant_id) 
        REFERENCES Tenant(tenant_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 7. PAYMENT TABLE
-- Represents rent payments made against an active or historic booking.
-- Relationship: Booking (1) ---- (N) Payment
-- Allowed payment_mode: 'Cash', 'UPI', 'Card', 'Net Banking'
-- Constraints:
--   - amount > 0
-- Foreign Key: booking_id REFERENCES Booking(booking_id) ON DELETE CASCADE
-- ============================================================================
CREATE TABLE Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_mode ENUM('Cash', 'UPI', 'Card', 'Net Banking') NOT NULL,
    booking_id INT NOT NULL,
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) 
        REFERENCES Booking(booking_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 8. COMPLAINT TABLE
-- Represents maintenance or grievance tickets raised by tenants.
-- Relationship: Tenant (1) ---- (N) Complaint
-- Allowed status: 'Open', 'In Progress', 'Resolved' (Default: 'Open')
-- Foreign Key: tenant_id REFERENCES Tenant(tenant_id) ON DELETE CASCADE
-- ============================================================================
CREATE TABLE Complaint (
    complaint_id INT AUTO_INCREMENT PRIMARY KEY,
    description TEXT NOT NULL,
    status ENUM('Open', 'In Progress', 'Resolved') NOT NULL DEFAULT 'Open',
    complaint_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tenant_id INT NOT NULL,
    CONSTRAINT fk_complaint_tenant FOREIGN KEY (tenant_id) 
        REFERENCES Tenant(tenant_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 9. OWNER_COMPLAINT TABLE (M:N Junction Table)
-- Resolves the Many-to-Many relationship between Owner and Complaint:
-- One owner may handle multiple complaints, and a property's complaint is logged for owner(s).
-- Composite Primary Key: (owner_id, complaint_id)
-- Normalization: In 3NF as each attribute is part of candidate key.
-- ============================================================================
CREATE TABLE owner_complaint (
    owner_id INT NOT NULL,
    complaint_id INT NOT NULL,
    assigned_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (owner_id, complaint_id),
    CONSTRAINT fk_oc_owner FOREIGN KEY (owner_id) 
        REFERENCES Owner(owner_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_oc_complaint FOREIGN KEY (complaint_id) 
        REFERENCES Complaint(complaint_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 10. USERS TABLE (Authentication & Role-Based Access Control)
-- Allowed system addition to support secure web login across roles.
-- Roles: 'admin', 'owner', 'tenant'
-- Foreign Keys:
--   - owner_id NULL REFERENCES Owner(owner_id)
--   - tenant_id NULL REFERENCES Tenant(tenant_id)
-- ============================================================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'owner', 'tenant') NOT NULL,
    owner_id INT NULL,
    tenant_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_owner FOREIGN KEY (owner_id) 
        REFERENCES Owner(owner_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) 
        REFERENCES Tenant(tenant_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB;

