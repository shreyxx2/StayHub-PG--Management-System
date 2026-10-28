<<<<<<< HEAD
# StayHub PG - PG (Paying Guest) Management System

A complete full-stack web application and database management system designed for college DBMS academic capstone evaluation. Built on **MySQL 8.0**, **Express.js / Node.js** (raw parameterized SQL only, strictly no ORM), and a modern, responsive **HTML5/Bootstrap 5** frontend.

---

## 1. Project Overview

**StayHub PG** connects students and young professionals seeking PG accommodation with property owners managing PG hostels across metropolitan cities. The system enforces relational data integrity at the database layer using strict 3NF schema design, explicit referential constraints, database triggers, stored procedures, and custom business functions.

### Core Capabilities
- **Public & Students**: Live PG search and multi-criteria filters (location, room sharing type, budget, available beds live count), property details with visual bed layout, seamless bed booking via stored procedure, rent payment recording across multiple payment modes (Cash, UPI, Card, Net Banking), and grievance / maintenance ticket logging.
- **PG Owners**: Property portfolio management, room and bed inventory CRUD, resident tenant tracking, payment ledger audit, grievance resolution via Many-to-Many junction mapping, and live KPI analytics (occupancy %, monthly revenue, pending dues, open complaints).
- **System Administrator**: Overall platform oversight, user account management, and access to the interactive **SQL Viva Showcase Engine**.
- **DBMS Viva Interactive Showcase**: A dedicated examination console allowing viva evaluators to run 30 pre-loaded queries, 5 virtual views, stored procedures with explicit cursors, live trigger demonstrations, and arbitrary custom SQL queries with millisecond execution profiling.

---

## 2. Assumptions & Allowed Additions

To deliver an authentic, production-grade web application while adhering strictly to the primary ER diagram specifications, the following minimal additions were introduced:

1. **Authentication Table (`users`)**:
   - Manages role-based login credentials (`admin`, `owner`, `tenant`).
   - Passwords securely hashed using `bcrypt` (work factor 10).
   - Foreign keys: `owner_id` (NULLable, references `Owner`) and `tenant_id` (NULLable, references `Tenant`).
2. **Booking Table Lifecycle Extensions**:
   - Added `check_out_date` (DATE NULL): Records date of departure; required to enable tenants to vacate and free beds.
   - Added `booking_status` (ENUM('Active', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Active'): Distinguishes current occupants from historical rental records.
3. **Explicit Domain ENUM Constraints**:
   - `Bed.status`: `'Available'`, `'Occupied'`, `'Maintenance'` (Default: `'Available'`)
   - `Complaint.status`: `'Open'`, `'In Progress'`, `'Resolved'` (Default: `'Open'`)
   - `Payment.payment_mode`: `'Cash'`, `'UPI'`, `'Card'`, `'Net Banking'`
   - `Room.room_type`: `'Single'`, `'Double'`, `'Triple'`, `'Dormitory'`
4. **No other attributes** were added to any ER entity, preserving exact relational purity.

---

## 3. Entity-Relationship to Relational Schema Mapping

| Conceptual Entity | Relational Table | Primary Key | Foreign Key Constraints | Cardinality & Relationship |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | `Owner` | `owner_id` | None | 1 Owner owns N Properties |
| **Property** | `Property` | `property_id` | `owner_id` &rarr; `Owner(owner_id)` [CASCADE] | 1 Property has N Rooms |
| **Room** | `Room` | `room_id` | `property_id` &rarr; `Property(property_id)` [CASCADE] | 1 Room has N Beds |
| **Bed** | `Bed` | `bed_id` | `room_id` &rarr; `Room(room_id)` [CASCADE] | 1 Bed booked via N Bookings |
| **Tenant** | `Tenant` | `tenant_id` | None | 1 Tenant makes N Bookings |
| **Booking** | `Booking` | `booking_id` | `bed_id` &rarr; `Bed(bed_id)` [RESTRICT]<br>`tenant_id` &rarr; `Tenant(tenant_id)` [RESTRICT] | 1 Booking has N Payments |
| **Payment** | `Payment` | `payment_id` | `booking_id` &rarr; `Booking(booking_id)` [CASCADE] | Financial ledger |
| **Complaint** | `Complaint` | `complaint_id` | `tenant_id` &rarr; `Tenant(tenant_id)` [CASCADE] | 1 Tenant raises N Complaints |
| **Owner-Complaint Link** | `owner_complaint` | `(owner_id, complaint_id)` | `owner_id` &rarr; `Owner(owner_id)` [CASCADE]<br>`complaint_id` &rarr; `Complaint(complaint_id)` [CASCADE] | **M:N Junction Table** resolving Owner &harr; Complaint |
| **Users (Auth)** | `users` | `user_id` | `owner_id` &rarr; `Owner(owner_id)` [CASCADE]<br>`tenant_id` &rarr; `Tenant(tenant_id)` [CASCADE] | Authentication & RBAC |

---

## 4. Normalization Breakdown (1NF &rarr; 2NF &rarr; 3NF)

### First Normal Form (1NF)
- **Atomic Values**: Every table attribute contains only indivisible, scalar values (e.g., phone numbers are single strings, addresses are atomic strings, no comma-separated lists of beds in rooms).
- **Unique Records**: Primary keys are explicitly defined on every table using `AUTO_INCREMENT` or composite keys.
- **No Repeating Groups**: Multiple beds per room or multiple payments per booking are modeled via separate relational child tables rather than arrays or delimited columns.

### Second Normal Form (2NF)
- Meets all 1NF criteria.
- **Full Functional Dependency**: In tables with single-column primary keys, partial dependency is impossible. In the composite primary key table `owner_complaint(owner_id, complaint_id)`, the non-key attribute `assigned_date` depends on the **entire composite key** `(owner_id, complaint_id)`, not on just `owner_id` or just `complaint_id`.

### Third Normal Form (3NF)
- Meets all 2NF criteria.
- **No Transitive Dependencies**: For every non-trivial functional dependency $X \rightarrow Y$, either $X$ is a superkey, or $Y$ is a prime attribute.
- *Examples of Denormalization Avoided*:
  - `Property` stores only `owner_id`; owner's name and contact number are never repeated inside `Property`.
  - `Bed` stores only `room_id`; property address is accessed by traversing relations ($Bed \rightarrow Room \rightarrow Property$) rather than replicating it.
  - `Payment` references `booking_id`; tenant information is resolved dynamically through joins ($Payment \rightarrow Booking \rightarrow Tenant$).

---

## 5. Technology Stack & Directory Structure

- **Database**: MySQL 8.0+ (InnoDB Engine, utf8mb4)
- **Backend**: Node.js v18+ & Express.js (parameterized queries using `mysql2/promise`, `bcryptjs`, `jsonwebtoken`)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Bootstrap 5.3 CDN, FontAwesome 6 CDN

```
StayHub/
├── database/
│   ├── schema.sql              # Database creation & table definitions in 3NF
│   ├── seed.sql                # Sample Indian data (3 owners, 5 PGs, 18 rooms, 46 beds, 18 tenants)
│   ├── queries.sql             # 30 fully commented queries with concept labels
│   ├── views.sql               # 5 database views (occupancy, defaulters, revenue, complaints)
│   ├── procedures_triggers.sql # 5 stored procs, 2 functions, 5 triggers, 1 cursor
│   ├── transactions.sql        # ACID transaction examples (COMMIT, ROLLBACK, SAVEPOINT)
│   └── indexes.sql             # Foreign key & composite indexes with EXPLAIN plans
├── backend/
│   ├── controllers/            # Controller logic (Auth, Property, Booking, Payment, Complaint, Showcase)
│   ├── middleware/             # JWT auth & role authorization
│   ├── routes/                 # Express API routes
│   ├── scripts/
│   │   └── setup-db.js         # Automated sequential SQL database importer script
│   ├── db.js                   # MySQL connection pool
│   └── server.js               # Application entry point
├── frontend/
│   ├── css/                    # Custom CSS styling (styles.css)
│   ├── js/                     # Client logic (api.js, home.js, property.js, tenant.js, owner.js, showcase.js)
│   ├── index.html              # Public Home & search page
│   ├── property-details.html   # Room & bed layout details, bed booking
│   ├── login.html              # Login with 1-click viva demo credentials
│   ├── register.html           # Tenant & Owner registration
│   ├── tenant-dashboard.html   # Student dashboard (bookings, payments, grievances)
│   ├── owner-dashboard.html    # Owner console (property CRUD, tenant dues, complaints)
│   ├── admin-dashboard.html    # Master administration & user accounts
│   └── showcase.html           # Interactive DBMS Viva Evaluation Console
├── .env                        # Configuration file
├── .env.example                # Example environment variables
├── package.json                # Project dependencies and npm scripts
├── VIVA_NOTES.md               # Comprehensive DBMS viva handbook (30+ questions & answers)
└── README.md                   # This documentation file
```

---

## 6. Installation & Setup Instructions

### Prerequisites
1. **Node.js** (v18.0.0 or higher) installed.
2. **MySQL Server 8.0+** running locally (via MySQL Community Server or XAMPP).

### Step 1: Clone or Navigate to Directory
```bash
cd StayHub
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` (or edit existing `.env`):
```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=stayhub_pg
JWT_SECRET=stayhub_super_secret_jwt_key_2026_dbms_viva_project
```
*(If your MySQL root user has no password, leave `DB_PASSWORD=` blank).*

### Step 4: Import Database Scripts (In Exact Order)
You can run our automated database setup script which executes all 5 SQL files in the exact sequence:
```bash
npm run setup-db
```
*Alternatively, you can import manually via MySQL CLI or MySQL Workbench in this exact order:*
1. `mysql -u root -p < database/schema.sql`
2. `mysql -u root -p stayhub_pg < database/seed.sql`
3. `mysql -u root -p stayhub_pg < database/views.sql`
4. `mysql -u root -p stayhub_pg < database/procedures_triggers.sql`
5. `mysql -u root -p stayhub_pg < database/indexes.sql`

### Step 5: Start the Application Server
```bash
npm start
```
The application will launch at: **`http://localhost:5000`**

---

## 7. Demo Login Credentials (For Viva Demo)

All demo accounts use the standard password: **`password123`**

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@stayhub.com` | `password123` | Full system access, all PGs, user management, SQL Showcase |
| **PG Owner 1** | `ramesh@stayhub.com` | `password123` | Ramesh Sharma (Owns 2 PGs in Bangalore & Pune, 22 beds) |
| **PG Owner 2** | `sunita@stayhub.com` | `password123` | Sunita Patel (Owns 2 PGs in Hyderabad & Bangalore) |
| **PG Owner 3** | `anand@stayhub.com` | `password123` | Anand Rao (Owns 1 PG in Pune) |
| **Tenant 1** | `arjun@gmail.com` | `password123` | Arjun Mehta (Active resident in Sai Comforts) |
| **Tenant 2** | `priya@gmail.com` | `password123` | Priya Nair (Active resident in Room 102) |
| **Tenant 4** | `sneha@gmail.com` | `password123` | Sneha Kulkarni (Rent defaulter demo account) |

*(Note: The login page has **One-Click Demo Login Buttons** to immediately sign in as Admin, Owner, or Tenant during your examination!)*

---

## 8. Database Objects Summary

### Stored Procedures
- `book_bed(tenant_id, bed_id, check_in_date, monthly_rent)`: Validates availability, creates booking, and activates occupancy trigger.
- `record_payment(booking_id, amount, payment_mode)`: Records rent payment with validation checks.
- `checkout_tenant(booking_id, check_out_date)`: Sets booking to 'Completed' and activates trigger to free bed.
- `raise_complaint(tenant_id, description)`: Registers complaint ticket and activates trigger to link owner.
- `generate_monthly_dues_report()`: **Explicit MySQL cursor** that iterates active bookings, computes dues, and builds a comprehensive report.

### Stored Functions
- `get_pending_rent(booking_id)`: Computes outstanding rent balance based on months elapsed and payments credited.
- `get_occupancy_percentage(property_id)`: Calculates real-time occupancy rate percentage for a given PG.

### Triggers
1. `trg_check_bed_before_booking` (`BEFORE INSERT ON Booking`): Prevents booking an occupied or maintenance bed using `SIGNAL SQLSTATE '45000'`.
2. `trg_occupy_bed_after_booking` (`AFTER INSERT ON Booking`): Automatically updates `Bed.status` to `'Occupied'`.
3. `trg_free_bed_after_checkout` (`AFTER UPDATE ON Booking`): Automatically resets `Bed.status` to `'Available'` when status becomes `'Completed'`.
4. `trg_link_complaint_to_owner` (`AFTER INSERT ON Complaint`): Automatically maps complaints to property owners in `owner_complaint`.
5. `trg_validate_payment_amount` (`BEFORE INSERT ON Payment`): Rejects payment amounts &le; 0 using `SIGNAL SQLSTATE '45000'`.

=======
# StayHub - PG Management System

StayHub is a Database Management System (DBMS) project designed to manage
Paying Guest (PG) properties, rooms, beds, tenants, bookings, payments,
and complaints.

The system aims to provide an organized way to manage PG-related information
and maintain relationships between owners, properties, tenants, bookings,
and payments.

---

## Project Objective

The main objective of StayHub is to design and implement a database system
for managing PG accommodations efficiently.

The system manages:

- PG property information
- Owners
- Rooms and beds
- Tenants
- Bookings
- Payments
- Complaints

---

## Main Features

- Manage PG owners and their properties
- Manage rooms and beds within properties
- Maintain tenant information
- Manage bed bookings
- Record rental and payment information
- Manage tenant complaints
- Maintain relationships between different entities
- Perform database queries for retrieving and managing information

---

## ER Diagram

The ER diagram represents the entities, attributes, relationships, and
cardinalities of the StayHub PG Management System.

---

## Entities

The database contains the following main entities:

### Owner
Stores information about PG owners.

Attributes:
- `owner_id` (Primary Key)
- `name`
- `phone`

### Property
Stores information about PG properties.

Attributes:
- `property_id` (Primary Key)
- `name`
- `address`

### Room
Stores information about rooms in a property.

Attributes:
- `room_id` (Primary Key)
- `room_type`

### Bed
Stores information about individual beds.

Attributes:
- `bed_id` (Primary Key)
- `status`

### Tenant
Stores information about tenants.

Attributes:
- `tenant_id` (Primary Key)
- `name`
- `phone`

### Booking
Stores information about bed bookings.

Attributes:
- `booking_id` (Primary Key)
- `check_in_date`
- `monthly_rent`

### Payment
Stores payment information.

Attributes:
- `payment_id` (Primary Key)
- `amount`
- `payment_date`
- `payment_mode`

### Complaint
Stores complaints raised by tenants.

Attributes:
- `complaint_id` (Primary Key)
- `description`
- `status`
- `complaint_date`

---

## Relationships

The major relationships in the system are:

| Relationship | Cardinality |
|--------------|-------------|
| Owner - Property | 1 : N |
| Property - Room | 1 : N |
| Room - Bed | 1 : N |
| Bed - Booking | 1 : N |
| Tenant - Booking | 1 : N |
| Booking - Payment | 1 : N |
| Tenant - Complaint | 1 : N |
| Owner - Complaint | M : N |

---

## Database Structure

The project will contain SQL files for:

```text
Database/
├── schema.sql
├── insert.sql
└── queries.sql
>>>>>>> origin/Vedant
