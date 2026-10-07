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
