# StayHub PG - DBMS Viva Examination Notes & Reference Handbook

This handbook is prepared specifically for college viva voce evaluation, technical interviews, and project presentations for the Database Management Systems (DBMS) laboratory.

---

## 1. Schema Summary & Architecture

The database `stayhub_pg` consists of 9 core tables representing real-world PG accommodation operations plus 1 authentication table:

1. **Owner (`owner_id`, `name`, `phone`)**: Legal owners who operate PG properties. `phone` is marked `UNIQUE` to prevent duplicate identities.
2. **Property (`property_id`, `name`, `address`, `owner_id`)**: Hostels/PG buildings owned by an Owner ($1:N$).
3. **Room (`room_id`, `room_type`, `property_id`)**: Rooms within a PG ($1:N$). `room_type` is an `ENUM('Single', 'Double', 'Triple', 'Dormitory')`.
4. **Bed (`bed_id`, `status`, `room_id`)**: Individual rentable bed units ($1:N$ with Room). `status` is an `ENUM('Available', 'Occupied', 'Maintenance')`.
5. **Tenant (`tenant_id`, `name`, `phone`)**: Students or working professionals residing in PGs.
6. **Booking (`booking_id`, `check_in_date`, `monthly_rent`, `check_out_date`, `booking_status`, `bed_id`, `tenant_id`)**: Rental contract. A bed can be booked many times across time, but only has one active contract at any moment.
7. **Payment (`payment_id`, `amount`, `payment_date`, `payment_mode`, `booking_id`)**: Payments made against a booking. `payment_mode` is `ENUM('Cash', 'UPI', 'Card', 'Net Banking')`.
8. **Complaint (`complaint_id`, `description`, `status`, `complaint_date`, `tenant_id`)**: Grievance tickets raised by tenants.
9. **`owner_complaint` (`owner_id`, `complaint_id`, `assigned_date`)**: **Many-to-Many Junction Table** linking Complaints to the responsible PG Owners. Composite Primary Key: `(owner_id, complaint_id)`.
10. **`users` (`user_id`, `email`, `password_hash`, `role`, `owner_id`, `tenant_id`)**: Authentication and role-based access control (admin, owner, tenant).

---

## 2. In-Depth Relationship & Junction Table Explanation

### Why do we need the `owner_complaint` M:N Junction Table?
In a relational database:
- A single PG owner owns multiple properties and therefore handles **many complaints** ($1:M$).
- A property may be co-owned, or a complex facility complaint (e.g., building structural water leak, common transformer failure) can be logged and assigned to **multiple owners/stakeholders** ($1:N$).
- Directly embedding `owner_id` into `Complaint` would restrict each complaint to strictly one owner.
- Directly embedding `complaint_id` into `Owner` would violate First Normal Form (1NF) by creating multi-valued attributes (arrays or comma-separated lists).
- **Relational Solution**: Decompose the Many-to-Many ($M:N$) relationship into two One-to-Many relationships using a bridge/junction relation:
  $$\text{Owner } (1) \longleftrightarrow (N) \text{ owner\_complaint } (N) \longleftrightarrow (1) \text{ Complaint}$$
- **Primary Key**: Composite key `(owner_id, complaint_id)` ensures an owner cannot be redundantly assigned to the same complaint twice.
- **Foreign Keys**: Both `owner_id` and `complaint_id` carry `ON DELETE CASCADE` rules so deleting an owner or complaint cleanly purges junction entries without orphan records.

---

## 3. Database Triggers & Why They Exist

A trigger is a stored program invoked automatically by MySQL in response to an `INSERT`, `UPDATE`, or `DELETE` event on a specific table.

### Why enforce logic in Database Triggers instead of Node.js backend code?
1. **Centralized Data Integrity (Single Source of Truth)**: If third-party applications, MySQL CLI, admin scripts, or mobile apps connect directly to the database, application-level checks in Express.js would be completely bypassed. Triggers guarantee relational invariants at the disk/engine level.
2. **Preventing Race Conditions (Concurrency Protection)**: In high-concurrency environments, two students might submit a booking request for the same available bed at the exact same millisecond. An application check (`if (bed.status === 'Available')`) is vulnerable to Time-of-Check to Time-of-Use (TOCTOU) race conditions. The `BEFORE INSERT` trigger executes atomically inside the InnoDB row transaction.
3. **Automatic State Synchronization**: Triggers eliminate human or developer error (e.g., forgetting to update `Bed.status` when creating a booking).

### The 5 Triggers Implemented:
1. `trg_check_bed_before_booking` (`BEFORE INSERT ON Booking`):
   - Inspects the physical status of the requested bed.
   - If `status != 'Available'`, it halts execution and raises a custom error: `SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Booking Rejected: The requested bed is already Occupied or under Maintenance.'`.
2. `trg_occupy_bed_after_booking` (`AFTER INSERT ON Booking`):
   - When a booking is inserted with status `'Active'`, it executes:
     `UPDATE Bed SET status = 'Occupied' WHERE bed_id = NEW.bed_id;`.
3. `trg_free_bed_after_checkout` (`AFTER UPDATE ON Booking`):
   - When `OLD.booking_status = 'Active'` and `NEW.booking_status IN ('Completed', 'Cancelled')`, it executes:
     `UPDATE Bed SET status = 'Available' WHERE bed_id = NEW.bed_id;`.
4. `trg_link_complaint_to_owner` (`AFTER INSERT ON Complaint`):
   - Automatically resolves which owner owns the property where the tenant currently has an active booking:
     ```sql
     INSERT IGNORE INTO owner_complaint (owner_id, complaint_id)
     SELECT DISTINCT p.owner_id, NEW.complaint_id
     FROM Booking bk
     JOIN Bed b ON bk.bed_id = b.bed_id
     JOIN Room r ON b.room_id = r.room_id
     JOIN Property p ON r.property_id = p.property_id
     WHERE bk.tenant_id = NEW.tenant_id AND bk.booking_status = 'Active';
     ```
5. `trg_validate_payment_amount` (`BEFORE INSERT ON Payment`):
   - Rejects zero or negative payments:
     `IF NEW.amount <= 0.00 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '...'; END IF;`.

---

## 4. Stored Procedures, Functions, and Cursors

### Difference between Stored Procedure and Stored Function
| Feature | Stored Procedure | Stored Function |
| :--- | :--- | :--- |
| **Return Value** | May return zero, one, or multiple result sets via `SELECT` or `OUT` parameters | Must return a single scalar value using `RETURNS <datatype>` |
| **Usage in SQL** | Executed using `CALL procedure_name(...)` | Can be called directly inside a `SELECT`, `WHERE`, or `HAVING` clause |
| **Modifications** | Can execute `INSERT`, `UPDATE`, `DELETE`, and transaction statements | Primarily used for deterministic computations |

### The Explicit Cursor Example (`generate_monthly_dues_report`)
- A **Cursor** allows row-by-row procedural processing of a query result set.
- **Workflow**:
  1. `DECLARE cur_bookings CURSOR FOR SELECT ...` (Defines cursor query)
  2. `DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;` (Handles end of stream)
  3. `OPEN cur_bookings;` (Allocates memory buffer)
  4. `read_loop: LOOP FETCH cur_bookings INTO ...;` (Retrieves next row)
  5. Computes individual balance using `get_pending_rent(booking_id)` and categorizes status ('Fully Paid', 'Partial', 'Defaulter').
  6. `CLOSE cur_bookings;` (Releases memory resources)

---

## 5. 30 Comprehensive Viva Questions & Model Answers

### Q1: What are the differences between 1NF, 2NF, and 3NF?
- **1NF**: A relation is in 1NF if all attribute values are atomic (indivisible) and every tuple has a primary key without repeating groups.
- **2NF**: A relation is in 2NF if it is in 1NF and no non-prime attribute is partially dependent on any candidate key (only applies to composite keys).
- **3NF**: A relation is in 3NF if it is in 2NF and no transitive functional dependency exists ($X \rightarrow Y$ where $X$ is not a superkey and $Y$ is non-prime).

### Q2: How does your database adhere to 3NF?
- All attributes are scalar and indivisible (1NF).
- In the composite PK table `owner_complaint(owner_id, complaint_id)`, attribute `assigned_date` depends on the full composite key, eliminating partial dependencies (2NF).
- Foreign keys are used everywhere to prevent transitive attributes. For example, `Property` only stores `owner_id`; owner's name or contact number are not stored in `Property`, avoiding transitive dependency `property_id -> owner_id -> owner_name` (3NF).

### Q3: What is the difference between `DELETE`, `TRUNCATE`, and `DROP`?
- **`DELETE`**: A DML command that removes specific rows based on a `WHERE` condition. It fires `DELETE` triggers and writes each deleted row to the undo log (can be rolled back).
- **`TRUNCATE`**: A DDL command that deallocates all pages in the table. It resets `AUTO_INCREMENT` counters, does not fire row triggers, and executes much faster than `DELETE`.
- **`DROP`**: A DDL command that removes both the table data and table schema permanently from disk.

### Q4: Explain the ACID properties in DBMS.
- **Atomicity**: "All or nothing" execution. If a transaction fails mid-way, all changes roll back.
- **Consistency**: The database transitions only from one valid state satisfying all schema constraints to another.
- **Isolation**: Concurrent transactions execute independently without dirty reads or uncommitted crosstalk.
- **Durability**: Once committed, updates persist permanently in storage even during power loss.

### Q5: What are Transaction Isolation Levels and what is MySQL's default?
MySQL InnoDB's default isolation level is **`REPEATABLE READ`**.
The four ANSI SQL isolation levels are:
1. `READ UNCOMMITTED`: Allows dirty reads (reading uncommitted data of other transactions).
2. `READ COMMITTED`: Avoids dirty reads; each statement reads data committed prior to statement execution.
3. `REPEATABLE READ`: Uses MVCC snapshots; repeated reads in a transaction always see the same snapshot. Prevents dirty reads and non-repeatable reads.
4. `SERIALIZABLE`: Fully serialized reads using range shared locks; eliminates phantom reads at the expense of concurrency.

### Q6: What is a Dirty Read, Non-Repeatable Read, and Phantom Read?
- **Dirty Read**: Transaction A reads data modified by Transaction B that has not been committed yet. If B rolls back, A holds garbage data.
- **Non-Repeatable Read**: Transaction A reads a row, Transaction B updates that row and commits, and Transaction A reads the row again, getting different values.
- **Phantom Read**: Transaction A queries a range of rows (e.g. `WHERE rent > 8000`). Transaction B inserts a new row matching that range and commits. When A queries the range again, a new "phantom" row appears.

### Q7: What is the difference between `WHERE` and `HAVING`?
- `WHERE` filters individual rows **before** aggregation and cannot contain aggregate functions (`SUM`, `AVG`, `COUNT`).
- `HAVING` filters aggregated groups **after** the `GROUP BY` clause has been computed.

### Q8: What is a Correlated Subquery?
A subquery that references columns from the outer query. It cannot be evaluated independently of the outer query; it executes once for every candidate row evaluated by the outer query (e.g., Query 22 using `NOT EXISTS`).

### Q9: How do `UNION` and `UNION ALL` differ?
- `UNION` combines two sets and executes an internal sorting / deduplication pass to return unique rows only.
- `UNION ALL` concatenates the result sets directly without deduplication, making it computationally faster.

### Q10: How do you simulate `INTERSECT` and `EXCEPT` in MySQL?
- **`INTERSECT`**: Simulated via `INNER JOIN` on common matching columns or subquery with `IN` / `EXISTS` (Query 28).
- **`EXCEPT` / `MINUS`**: Simulated via `LEFT JOIN ... WHERE right_table.key IS NULL` or subquery with `NOT IN` / `NOT EXISTS` (Query 29).

### Q11: What is a Primary Key vs Candidate Key vs Super Key?
- **Super Key**: Any set of attributes that uniquely identifies a row.
- **Candidate Key**: A minimal superkey with no redundant attributes (e.g., `phone`, `owner_id`).
- **Primary Key**: The specific candidate key chosen by the database designer as the principal tuple identifier.

### Q12: What is Referential Integrity?
A database constraint ensuring that a foreign key value in a child table must always correspond to an existing primary key value in the parent table, preventing dangling references.

### Q13: Explain `ON DELETE CASCADE` vs `ON DELETE RESTRICT`.
- **`CASCADE`**: If a parent row is deleted (e.g., Owner), MySQL automatically deletes all associated child rows (Properties, Rooms, Beds).
- **`RESTRICT`**: MySQL rejects the deletion of the parent row if any child rows reference it (e.g., a Bed cannot be deleted if active Bookings reference it).

### Q14: What is a B-Tree Index and how does it optimize queries?
A balanced tree data structure that maintains sorted keys. Instead of scanning $N$ rows linearly ($O(N)$), the database traverses logarithmic tree levels ($O(\log N)$) from root to leaf node to locate rows in a few disk I/O operations.

### Q15: When should an index NOT be created?
- On small tables (full scan in memory is faster than tree traversal).
- On columns with low cardinality / low selectivity (e.g., a boolean flag with 50/50 split).
- On write-intensive tables with frequent `INSERT`/`UPDATE` operations, as every write requires updating both the table heap and all secondary index trees.

### Q16: What is the purpose of `EXPLAIN` in MySQL?
`EXPLAIN` shows the query execution plan generated by the MySQL query optimizer. It reveals whether indexes were utilized (`key`), the join strategy (`type: const/ref/ALL`), and the estimated number of rows examined (`rows`).

### Q17: What does `type: ALL` mean in an `EXPLAIN` output?
It indicates a **Full Table Scan**: MySQL had to read every page of the table from disk because no suitable index was found to filter the records.

### Q18: What is `SIGNAL SQLSTATE '45000'` in MySQL?
`SQLSTATE '45000'` is the ANSI SQL standard code for an unhandled user-defined exception. It allows triggers and stored procedures to raise an error and abort the current transaction with a custom error message.

### Q19: What is the difference between an `INNER JOIN`, `LEFT JOIN`, and `RIGHT JOIN`?
- **`INNER JOIN`**: Returns only rows where there is a match in both tables.
- **`LEFT JOIN`**: Returns all rows from the left table, plus matched rows from the right table (unmatched right columns are `NULL`).
- **`RIGHT JOIN`**: Returns all rows from the right table, plus matched rows from the left table.

### Q20: What is a View and why is it called a "Virtual Relation"?
A View is a stored SQL query definition that acts as a virtual table. It does not store physical data on disk (unless materialized); when queried, MySQL dynamically executes the underlying query against the base tables.

### Q21: Can all Views be updated with `UPDATE` or `INSERT`?
No. Views containing aggregate functions (`SUM`, `AVG`), `GROUP BY`, `DISTINCT`, `UNION`, or `JOIN`s are non-updatable in MySQL.

### Q22: What is the role of the `AUTO_INCREMENT` attribute?
It automatically generates a monotonically increasing unique integer for primary key columns whenever a new row is inserted without explicitly supplying a key value.

### Q23: What is the difference between `CHAR` and `VARCHAR`?
- **`CHAR(N)`**: Fixed-length storage. Pads strings with trailing spaces up to length $N$.
- **`VARCHAR(N)`**: Variable-length storage. Stores only the characters plus 1-2 length prefix bytes, conserving disk space.

### Q24: What is MySQL's `InnoDB` Storage Engine?
The default transactional storage engine in MySQL. It supports ACID transactions, foreign key constraints, row-level locking, and crash recovery using redo and undo logs.

### Q25: Why is `multipleStatements: true` used in MySQL connection pools?
It allows executing multiple semicolon-delimited SQL statements in a single database round-trip, essential for running batch migration or setup scripts.

### Q26: What is SQL Injection and how is it prevented in StayHub?
SQL Injection occurs when untrusted user input is directly concatenated into SQL strings. StayHub prevents this by using parameterized queries (`?` placeholders) with `mysql2`, where user input is treated strictly as data literals and never compiled as executable SQL syntax.

### Q27: What is the function of `SAVEPOINT` in transactions?
A `SAVEPOINT` creates a checkpoint within an open transaction. It allows partial rollbacks (`ROLLBACK TO SAVEPOINT name`) without aborting the entire transaction.

### Q28: How does the application prevent double-booking of a bed?
At two levels:
1. Application queries bed status before offering it.
2. The database trigger `trg_check_bed_before_booking` executes `BEFORE INSERT ON Booking`. If the bed is occupied, it signals SQLSTATE 45000, aborting the write even if concurrent requests race.

### Q29: What is the difference between a Clustered Index and a Secondary Index?
- **Clustered Index**: The table data itself is stored in the leaf nodes of the primary key B-Tree (one per table in InnoDB).
- **Secondary Index**: Leaf nodes store the index key and the primary key pointer rather than the entire row data.

### Q30: What is the benefit of the SQL Showcase page in this project?
It proves that the project is fundamentally a DBMS project rather than just a website. It allows examiners to inspect and execute all 30 queries, verify trigger firing behavior, examine execution times, and test custom queries live during the viva.

