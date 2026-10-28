const pool = require('../db');

// List of all 30 queries with detailed DBMS viva metadata
const QUERIES_CATALOG = [
    {
        id: 1,
        title: "Available Beds with Sorting",
        category: "Basic SQL & Sorting",
        concept: "SELECT with WHERE and multi-column ORDER BY",
        description: "Filters beds with status 'Available' and sorts deterministically by room and bed ID.",
        sql: `SELECT bed_id, room_id, status FROM Bed WHERE status = 'Available' ORDER BY room_id ASC, bed_id ASC;`
    },
    {
        id: 2,
        title: "City Pattern Search",
        category: "Pattern Matching",
        concept: "LIKE wildcard operator (% and _)",
        description: "Retrieves PG properties located in Bangalore using case-insensitive partial substring match.",
        sql: `SELECT property_id, name AS property_name, address FROM Property WHERE address LIKE '%Bangalore%' ORDER BY property_id;`
    },
    {
        id: 3,
        title: "Premium Room Types Filter",
        category: "Set Membership",
        concept: "IN operator for discrete sets",
        description: "Identifies rooms that offer private or semi-private living (Single or Double).",
        sql: `SELECT room_id, property_id, room_type FROM Room WHERE room_type IN ('Single', 'Double') ORDER BY property_id, room_type;`
    },
    {
        id: 4,
        title: "Rent Payment Value Range",
        category: "Range Filtering",
        concept: "BETWEEN operator (inclusive interval)",
        description: "Retrieves high-value rent transactions made between 8,000 INR and 15,000 INR.",
        sql: `SELECT payment_id, booking_id, amount, payment_mode, payment_date FROM Payment WHERE amount BETWEEN 8000.00 AND 15000.00 ORDER BY amount DESC;`
    },
    {
        id: 5,
        title: "Distinct Payment Modes",
        category: "Duplicate Elimination",
        concept: "DISTINCT projection",
        description: "Extracts the unique payment channels used across the entire system history.",
        sql: `SELECT DISTINCT payment_mode FROM Payment ORDER BY payment_mode ASC;`
    },
    {
        id: 6,
        title: "Compound Boolean Logic Filter",
        category: "Logical Operators",
        concept: "AND, OR, NOT operator precedence",
        description: "Filters beds in Room 2 or 3 that are not under maintenance.",
        sql: `SELECT bed_id, room_id, status FROM Bed WHERE (room_id = 2 OR room_id = 3) AND NOT status = 'Maintenance';`
    },
    {
        id: 7,
        title: "Available Beds per Property Details",
        category: "Joins (3 Tables)",
        concept: "3-Table INNER JOIN (Property -> Room -> Bed)",
        description: "Traverses property, room, and bed entities to show available bed inventory.",
        sql: `SELECT b.bed_id, r.room_id, r.room_type, p.property_id, p.name AS property_name, b.status FROM Bed b INNER JOIN Room r ON b.room_id = r.room_id INNER JOIN Property p ON r.property_id = p.property_id WHERE b.status = 'Available' ORDER BY p.name, r.room_type;`
    },
    {
        id: 8,
        title: "Owner Bed Asset Inventory",
        category: "Joins (4 Tables)",
        concept: "4-Table INNER JOIN (Owner -> Property -> Room -> Bed)",
        description: "Full vertical ownership trace mapping individual beds back to their legal owner.",
        sql: `SELECT o.owner_id, o.name AS owner_name, o.phone AS owner_phone, p.name AS property_name, r.room_id, r.room_type, b.bed_id, b.status AS bed_status FROM Owner o INNER JOIN Property p ON o.owner_id = p.owner_id INNER JOIN Room r ON p.property_id = r.property_id INNER JOIN Bed b ON r.room_id = b.room_id ORDER BY o.name, p.name, b.bed_id;`
    },
    {
        id: 9,
        title: "Active Tenant Residency Directory",
        category: "Joins (5 Tables)",
        concept: "5-Table INNER JOIN (Tenant -> Booking -> Bed -> Room -> Property)",
        description: "Operational registry mapping active tenants to their current room and PG building.",
        sql: `SELECT t.tenant_id, t.name AS tenant_name, t.phone AS tenant_phone, bk.booking_id, bk.check_in_date, bk.monthly_rent, b.bed_id, r.room_type, p.name AS property_name, p.address AS property_address FROM Tenant t INNER JOIN Booking bk ON t.tenant_id = bk.tenant_id INNER JOIN Bed b ON bk.bed_id = b.bed_id INNER JOIN Room r ON b.room_id = r.room_id INNER JOIN Property p ON r.property_id = p.property_id WHERE bk.booking_status = 'Active' ORDER BY p.name, t.name;`
    },
    {
        id: 10,
        title: "Enterprise 6-Table Financial Audit Trail",
        category: "Joins (6 Tables)",
        concept: "6-Table INNER JOIN (Payment -> Booking -> Tenant -> Bed -> Room -> Property -> Owner)",
        description: "Financial trace linking every payment receipt directly to tenant, room, and recipient owner.",
        sql: `SELECT pay.payment_id, pay.amount, pay.payment_date, pay.payment_mode, t.name AS tenant_name, p.name AS property_name, r.room_type, o.name AS owner_name FROM Payment pay INNER JOIN Booking bk ON pay.booking_id = bk.booking_id INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id INNER JOIN Bed b ON bk.bed_id = b.bed_id INNER JOIN Room r ON b.room_id = r.room_id INNER JOIN Property p ON r.property_id = p.property_id INNER JOIN Owner o ON p.owner_id = o.owner_id ORDER BY pay.payment_date DESC LIMIT 10;`
    },
    {
        id: 11,
        title: "Properties and Room Count (Preserving Zero Rooms)",
        category: "Outer Joins",
        concept: "LEFT OUTER JOIN with COUNT",
        description: "Displays all properties along with room counts, ensuring empty properties are not omitted.",
        sql: `SELECT p.property_id, p.name AS property_name, p.address, COUNT(r.room_id) AS total_rooms FROM Property p LEFT JOIN Room r ON p.property_id = r.property_id GROUP BY p.property_id, p.name, p.address ORDER BY total_rooms DESC;`
    },
    {
        id: 12,
        title: "All Tenants and Grievance History",
        category: "Outer Joins",
        concept: "RIGHT OUTER JOIN with COALESCE",
        description: "Preserves all tenants to display complaint history, including tenants who filed zero complaints.",
        sql: `SELECT t.tenant_id, t.name AS tenant_name, t.phone AS tenant_phone, c.complaint_id, c.description, COALESCE(c.status, 'No Complaints') AS complaint_status FROM Complaint c RIGHT JOIN Tenant t ON c.tenant_id = t.tenant_id ORDER BY t.tenant_id;`
    },
    {
        id: 13,
        title: "Available Beds per Property",
        category: "Aggregation & GROUP BY",
        concept: "Conditional Aggregation (SUM with CASE)",
        description: "Calculates total, available, occupied, and maintenance beds for each PG property.",
        sql: `SELECT p.property_id, p.name AS property_name, COUNT(b.bed_id) AS total_beds, SUM(CASE WHEN b.status = 'Available' THEN 1 ELSE 0 END) AS available_beds, SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_beds, SUM(CASE WHEN b.status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance_beds FROM Property p LEFT JOIN Room r ON p.property_id = r.property_id LEFT JOIN Bed b ON r.room_id = b.room_id GROUP BY p.property_id, p.name ORDER BY available_beds DESC;`
    },
    {
        id: 14,
        title: "Monthly Revenue per Property",
        category: "Aggregation & GROUP BY",
        concept: "SUM across joined relations with COALESCE",
        description: "Total cumulative revenue generated and transaction count per PG property.",
        sql: `SELECT p.property_id, p.name AS property_name, o.name AS owner_name, COALESCE(SUM(pay.amount), 0.00) AS total_revenue_collected, COUNT(pay.payment_id) AS total_transactions FROM Property p INNER JOIN Owner o ON p.owner_id = o.owner_id LEFT JOIN Room r ON p.property_id = r.property_id LEFT JOIN Bed b ON r.room_id = b.room_id LEFT JOIN Booking bk ON b.bed_id = bk.bed_id LEFT JOIN Payment pay ON bk.booking_id = pay.booking_id GROUP BY p.property_id, p.name, o.name ORDER BY total_revenue_collected DESC;`
    },
    {
        id: 15,
        title: "Properties with Average Rent > 8,000",
        category: "Aggregation with HAVING",
        concept: "GROUP BY with HAVING filter",
        description: "Filters aggregated groups to find properties commanding high average monthly rents.",
        sql: `SELECT p.property_id, p.name AS property_name, ROUND(AVG(bk.monthly_rent), 2) AS average_monthly_rent, COUNT(bk.booking_id) AS total_bookings_analyzed FROM Property p INNER JOIN Room r ON p.property_id = r.property_id INNER JOIN Bed b ON r.room_id = b.room_id INNER JOIN Booking bk ON b.bed_id = bk.bed_id GROUP BY p.property_id, p.name HAVING AVG(bk.monthly_rent) > 8000.00 ORDER BY average_monthly_rent DESC;`
    },
    {
        id: 16,
        title: "Rent Boundaries by Room Type",
        category: "Statistical Aggregations",
        concept: "MIN, MAX, and AVG statistical functions",
        description: "Analyzes rent distribution spectrum (Lowest, Highest, Mean) across room categories.",
        sql: `SELECT r.room_type, MIN(bk.monthly_rent) AS minimum_rent, MAX(bk.monthly_rent) AS maximum_rent, ROUND(AVG(bk.monthly_rent), 2) AS average_rent, COUNT(bk.booking_id) AS active_contract_count FROM Room r INNER JOIN Bed b ON r.room_id = b.room_id INNER JOIN Booking bk ON b.bed_id = bk.bed_id WHERE bk.booking_status = 'Active' GROUP BY r.room_type ORDER BY average_rent DESC;`
    },
    {
        id: 17,
        title: "Revenue by Property and Payment Mode",
        category: "Multi-Column Aggregation",
        concept: "Two-dimensional GROUP BY",
        description: "Two-dimensional breakdown of revenue across PG properties and payment modes.",
        sql: `SELECT p.name AS property_name, pay.payment_mode, COUNT(pay.payment_id) AS transaction_count, SUM(pay.amount) AS total_amount FROM Payment pay INNER JOIN Booking bk ON pay.booking_id = bk.booking_id INNER JOIN Bed b ON bk.bed_id = b.bed_id INNER JOIN Room r ON b.room_id = r.room_id INNER JOIN Property p ON r.property_id = p.property_id GROUP BY p.name, pay.payment_mode ORDER BY p.name, total_amount DESC;`
    },
    {
        id: 18,
        title: "Occupancy Percentage per Property",
        category: "Calculated Metrics",
        concept: "Percentage formula inside aggregate query",
        description: "Calculates live occupancy rate percentage for every PG building.",
        sql: `SELECT p.property_id, p.name AS property_name, COUNT(b.bed_id) AS total_beds, SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_beds, ROUND((SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(b.bed_id), 0), 2) AS occupancy_percentage FROM Property p LEFT JOIN Room r ON p.property_id = r.property_id LEFT JOIN Bed b ON r.room_id = b.room_id GROUP BY p.property_id, p.name ORDER BY occupancy_percentage DESC;`
    },
    {
        id: 19,
        title: "Highest Paying Tenant",
        category: "Subqueries",
        concept: "Scalar Subquery with MAX aggregate in HAVING clause",
        description: "Identifies the single highest paying tenant in terms of total lifetime rent payments.",
        sql: `SELECT t.tenant_id, t.name AS tenant_name, t.phone, SUM(pay.amount) AS total_paid FROM Tenant t INNER JOIN Booking bk ON t.tenant_id = bk.tenant_id INNER JOIN Payment pay ON bk.booking_id = pay.booking_id GROUP BY t.tenant_id, t.name, t.phone HAVING total_paid = (SELECT MAX(tenant_total) FROM (SELECT SUM(p2.amount) AS tenant_total FROM Booking bk2 INNER JOIN Payment p2 ON bk2.booking_id = p2.booking_id GROUP BY bk2.tenant_id) AS sub);`
    },
    {
        id: 20,
        title: "Most Popular Room Type",
        category: "Subqueries & Ranking",
        concept: "GROUP BY with LIMIT 1 modal selection",
        description: "Finds which room type attracts the highest tenant booking volume.",
        sql: `SELECT r.room_type, COUNT(bk.booking_id) AS total_bookings FROM Room r INNER JOIN Bed b ON r.room_id = b.room_id INNER JOIN Booking bk ON b.bed_id = bk.bed_id GROUP BY r.room_type ORDER BY total_bookings DESC LIMIT 1;`
    },
    {
        id: 21,
        title: "Properties with No Bookings",
        category: "Subqueries",
        concept: "NOT IN predicate with nested subquery",
        description: "Flags underutilized or newly onboarded PG properties with 0 historical bookings.",
        sql: `SELECT property_id, name AS property_name, address FROM Property WHERE property_id NOT IN (SELECT DISTINCT r.property_id FROM Room r INNER JOIN Bed b ON r.room_id = b.room_id INNER JOIN Booking bk ON b.bed_id = bk.bed_id);`
    },
    {
        id: 22,
        title: "Tenants Who Never Raised a Complaint",
        category: "Correlated Subqueries",
        concept: "Correlated Subquery with NOT EXISTS",
        description: "Finds fully satisfied tenants who have never logged any maintenance complaints.",
        sql: `SELECT t.tenant_id, t.name AS tenant_name, t.phone FROM Tenant t WHERE NOT EXISTS (SELECT 1 FROM Complaint c WHERE c.tenant_id = t.tenant_id) ORDER BY t.name;`
    },
    {
        id: 23,
        title: "Owners with Active Residents",
        category: "Correlated Subqueries",
        concept: "Correlated Subquery with EXISTS",
        description: "Determines owners who currently have at least one active tenant staying in their PG.",
        sql: `SELECT o.owner_id, o.name AS owner_name, o.phone FROM Owner o WHERE EXISTS (SELECT 1 FROM Property p INNER JOIN Room r ON p.property_id = r.property_id INNER JOIN Bed b ON r.room_id = b.room_id INNER JOIN Booking bk ON b.bed_id = bk.bed_id WHERE p.owner_id = o.owner_id AND bk.booking_status = 'Active') ORDER BY o.name;`
    },
    {
        id: 24,
        title: "Single Rooms Pricier than ALL Double Rooms",
        category: "Quantified Subqueries",
        concept: "Universal quantification with ALL operator",
        description: "Identifies Single room bookings whose monthly rent strictly exceeds all Double room bookings.",
        sql: `SELECT bk.booking_id, t.name AS tenant_name, r.room_type, bk.monthly_rent FROM Booking bk INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id INNER JOIN Bed b ON bk.bed_id = b.bed_id INNER JOIN Room r ON b.room_id = r.room_id WHERE r.room_type = 'Single' AND bk.monthly_rent > ALL (SELECT bk2.monthly_rent FROM Booking bk2 INNER JOIN Bed b2 ON bk2.bed_id = b2.bed_id INNER JOIN Room r2 ON b2.room_id = r2.room_id WHERE r2.room_type = 'Double');`
    },
    {
        id: 25,
        title: "Tenants with Pending Rent (Defaulters)",
        category: "Financial Analytics",
        concept: "Calculated balance comparison in HAVING clause",
        description: "Flags all active tenants whose cumulative rent payments are less than expected dues.",
        sql: `SELECT bk.booking_id, t.tenant_id, t.name AS tenant_name, t.phone AS tenant_phone, p.name AS property_name, bk.monthly_rent, COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00) AS total_paid, ((TIMESTAMPDIFF(MONTH, bk.check_in_date, COALESCE(bk.check_out_date, CURDATE())) + 1) * bk.monthly_rent - COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00)) AS pending_due_amount FROM Booking bk INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id INNER JOIN Bed b ON bk.bed_id = b.bed_id INNER JOIN Room r ON b.room_id = r.room_id INNER JOIN Property p ON r.property_id = p.property_id WHERE bk.booking_status = 'Active' HAVING pending_due_amount > 0 ORDER BY pending_due_amount DESC;`
    },
    {
        id: 26,
        title: "Owners with Most Open Complaints",
        category: "Junction Table Traversal",
        concept: "M:N junction aggregation with COUNT & GROUP BY",
        description: "Ranks property owners by count of unresolved maintenance tickets logged for them.",
        sql: `SELECT o.owner_id, o.name AS owner_name, o.phone AS owner_phone, COUNT(c.complaint_id) AS open_complaint_count FROM Owner o INNER JOIN owner_complaint oc ON o.owner_id = oc.owner_id INNER JOIN Complaint c ON oc.complaint_id = c.complaint_id WHERE c.status = 'Open' GROUP BY o.owner_id, o.name, o.phone ORDER BY open_complaint_count DESC;`
    },
    {
        id: 27,
        title: "Consolidated Stakeholder Directory",
        category: "Set Operations",
        concept: "UNION ALL operator",
        description: "Combines contact directories of both PG Owners and Tenants into a single master relation.",
        sql: `SELECT name AS contact_name, phone AS contact_number, 'PG Owner' AS stakeholder_role FROM Owner UNION ALL SELECT name AS contact_name, phone AS contact_number, 'Student/Tenant' AS stakeholder_role FROM Tenant ORDER BY contact_name ASC;`
    },
    {
        id: 28,
        title: "Active Tenants with Complaints (INTERSECT)",
        category: "Set Operations",
        concept: "Simulated INTERSECT via INNER JOIN on common key",
        description: "Finds students who both have an active booking AND have filed at least one complaint.",
        sql: `SELECT DISTINCT t.tenant_id, t.name AS tenant_name, t.phone FROM Tenant t INNER JOIN Booking bk ON t.tenant_id = bk.tenant_id AND bk.booking_status = 'Active' INNER JOIN Complaint c ON t.tenant_id = c.tenant_id ORDER BY t.name;`
    },
    {
        id: 29,
        title: "Never-Booked Beds (EXCEPT / MINUS)",
        category: "Set Operations",
        concept: "Simulated EXCEPT via LEFT JOIN and IS NULL check",
        description: "Extracts all beds that exist in the system minus those that were ever booked.",
        sql: `SELECT b.bed_id, r.room_type, p.name AS property_name, b.status FROM Bed b INNER JOIN Room r ON b.room_id = r.room_id INNER JOIN Property p ON r.property_id = p.property_id LEFT JOIN Booking bk ON b.bed_id = bk.bed_id WHERE bk.booking_id IS NULL ORDER BY b.bed_id;`
    },
    {
        id: 30,
        title: "Property Revenue Share Percentage",
        category: "Analytical Aggregation",
        concept: "Subquery in projection computing ratio against total",
        description: "Computes each property's percentage contribution to overall business revenue.",
        sql: `SELECT p.name AS property_name, COALESCE(SUM(pay.amount), 0.00) AS property_revenue, ROUND((COALESCE(SUM(pay.amount), 0.00) * 100.0) / NULLIF((SELECT SUM(amount) FROM Payment), 0), 2) AS revenue_contribution_pct FROM Property p LEFT JOIN Room r ON p.property_id = r.property_id LEFT JOIN Bed b ON r.room_id = b.room_id LEFT JOIN Booking bk ON b.bed_id = bk.bed_id LEFT JOIN Payment pay ON bk.booking_id = pay.booking_id GROUP BY p.property_id, p.name ORDER BY property_revenue DESC;`
    }
];

// Views catalog
const VIEWS_CATALOG = [
    {
        name: "property_occupancy_summary",
        title: "Property Occupancy Summary",
        description: "Aggregates total rooms, total beds, occupied beds, available beds, maintenance beds, occupancy rate, and active monthly rent.",
        sql: `SELECT * FROM property_occupancy_summary;`
    },
    {
        name: "rent_defaulters",
        title: "Rent Defaulters Report",
        description: "Identifies all active tenants with pending balances, calculating months stayed, expected rent, paid rent, and pending dues.",
        sql: `SELECT * FROM rent_defaulters;`
    },
    {
        name: "tenant_booking_details",
        title: "360-Degree Tenant Booking Details",
        description: "Comprehensive profile view joining Tenant, Booking, Bed, Room, Property, and Owner with payment summaries.",
        sql: `SELECT * FROM tenant_booking_details;`
    },
    {
        name: "monthly_revenue_report",
        title: "Monthly Revenue Report",
        description: "Time-series breakdown of collections by year, calendar month, property, and payment mode.",
        sql: `SELECT * FROM monthly_revenue_report;`
    },
    {
        name: "open_complaints_with_owner",
        title: "Open Complaints with Assigned Owner",
        description: "Exposes active complaints joined with tenant details and the assigned property owner via M:N junction table.",
        sql: `SELECT * FROM open_complaints_with_owner;`
    }
];

// GET /api/showcase/queries
exports.getQueriesCatalog = (req, res) => {
    res.json(QUERIES_CATALOG);
};

// POST /api/showcase/run-query
exports.runQuery = async (req, res) => {
    try {
        const { query_id, custom_sql } = req.body;
        let sql = '';

        if (query_id) {
            const found = QUERIES_CATALOG.find(q => q.id === parseInt(query_id, 10));
            if (!found) {
                return res.status(404).json({ error: 'Query ID not found.' });
            }
            sql = found.sql;
        } else if (custom_sql) {
            sql = custom_sql.trim();
            // Basic safety check for demo: only allow SELECT / SHOW / EXPLAIN
            if (!/^(SELECT|SHOW|EXPLAIN|DESCRIBE)\b/i.test(sql)) {
                return res.status(400).json({ error: 'Only SELECT, SHOW, EXPLAIN, and DESCRIBE queries are permitted in the showcase runner.' });
            }
        } else {
            return res.status(400).json({ error: 'query_id or custom_sql is required.' });
        }

        const startTime = process.hrtime();
        const [rows, fields] = await pool.query(sql);
        const diff = process.hrtime(startTime);
        const executionTimeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

        const columns = fields ? fields.map(f => f.name) : (rows.length > 0 ? Object.keys(rows[0]) : []);

        res.json({
            sql,
            execution_time_ms: executionTimeMs,
            row_count: rows.length,
            columns,
            rows
        });
    } catch (err) {
        console.error('Error executing showcase query:', err);
        res.status(400).json({ error: err.message, sql: req.body.custom_sql || '' });
    }
};

// GET /api/showcase/views
exports.getViewsCatalog = (req, res) => {
    res.json(VIEWS_CATALOG);
};

// POST /api/showcase/run-view
exports.runView = async (req, res) => {
    try {
        const { view_name } = req.body;
        const validViews = VIEWS_CATALOG.map(v => v.name);

        if (!validViews.includes(view_name)) {
            return res.status(400).json({ error: 'Invalid view name.' });
        }

        const sql = `SELECT * FROM \`${view_name}\` LIMIT 50;`;
        const startTime = process.hrtime();
        const [rows, fields] = await pool.query(sql);
        const diff = process.hrtime(startTime);
        const executionTimeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

        const columns = fields ? fields.map(f => f.name) : (rows.length > 0 ? Object.keys(rows[0]) : []);

        res.json({
            view_name,
            sql,
            execution_time_ms: executionTimeMs,
            row_count: rows.length,
            columns,
            rows
        });
    } catch (err) {
        console.error('Error running view:', err);
        res.status(400).json({ error: err.message });
    }
};

// POST /api/showcase/run-cursor-report
exports.runCursorReport = async (req, res) => {
    try {
        const startTime = process.hrtime();
        const [result] = await pool.query('CALL generate_monthly_dues_report();');
        const diff = process.hrtime(startTime);
        const executionTimeMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);

        const rows = result[0] || [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

        res.json({
            procedure: 'CALL generate_monthly_dues_report()',
            concept: 'Explicit MySQL CURSOR with LOOP, FETCH, and CONTINUE HANDLER',
            execution_time_ms: executionTimeMs,
            row_count: rows.length,
            columns,
            rows
        });
    } catch (err) {
        console.error('Error running cursor report:', err);
        res.status(400).json({ error: err.message });
    }
};

// POST /api/showcase/test-trigger (Interactive Trigger Viva Demonstration)
exports.testTrigger = async (req, res) => {
    const { trigger_demo } = req.body;
    const conn = await pool.getConnection();

    try {
        if (trigger_demo === 'occupy_on_booking') {
            // Demo 1: Booking an available bed sets bed status to 'Occupied' automatically
            // Find an available bed
            const [avail] = await conn.execute("SELECT bed_id FROM Bed WHERE status = 'Available' LIMIT 1");
            if (avail.length === 0) {
                return res.status(400).json({ error: 'No available bed found to test booking.' });
            }
            const bedId = avail[0].bed_id;

            // Bed status BEFORE
            const [before] = await conn.execute("SELECT bed_id, status FROM Bed WHERE bed_id = ?", [bedId]);

            // Insert Booking
            const [bk] = await conn.execute(
                "INSERT INTO Booking (check_in_date, monthly_rent, booking_status, bed_id, tenant_id) VALUES (CURDATE(), 7500.00, 'Active', ?, 1)",
                [bedId]
            );
            const newBookingId = bk.insertId;

            // Bed status AFTER trigger fired
            const [after] = await conn.execute("SELECT bed_id, status FROM Bed WHERE bed_id = ?", [bedId]);

            return res.json({
                demo: 'AFTER INSERT on Booking -> Sets Bed to Occupied',
                trigger_name: 'trg_occupy_bed_after_booking',
                tested_bed_id: bedId,
                new_booking_id: newBookingId,
                bed_status_before: before[0].status,
                bed_status_after: after[0].status,
                success: after[0].status === 'Occupied',
                explanation: `Before insertion, Bed ${bedId} status was '${before[0].status}'. When Booking ${newBookingId} was inserted with status 'Active', AFTER INSERT trigger 'trg_occupy_bed_after_booking' immediately fired and updated Bed ${bedId} status to '${after[0].status}'.`
            });
        } 
        else if (trigger_demo === 'free_on_checkout') {
            // Demo 2: Checking out an active booking sets bed status back to 'Available'
            const [active] = await conn.execute("SELECT booking_id, bed_id FROM Booking WHERE booking_status = 'Active' LIMIT 1");
            if (active.length === 0) {
                return res.status(400).json({ error: 'No active booking found to test checkout.' });
            }
            const { booking_id, bed_id } = active[0];

            const [bedBefore] = await conn.execute("SELECT bed_id, status FROM Bed WHERE bed_id = ?", [bed_id]);

            // Update booking to Completed
            await conn.execute(
                "UPDATE Booking SET booking_status = 'Completed', check_out_date = CURDATE() WHERE booking_id = ?",
                [booking_id]
            );

            const [bedAfter] = await conn.execute("SELECT bed_id, status FROM Bed WHERE bed_id = ?", [bed_id]);

            return res.json({
                demo: 'AFTER UPDATE on Booking -> Sets Bed to Available',
                trigger_name: 'trg_free_bed_after_checkout',
                tested_booking_id: booking_id,
                tested_bed_id: bed_id,
                bed_status_before: bedBefore[0].status,
                bed_status_after: bedAfter[0].status,
                success: bedAfter[0].status === 'Available',
                explanation: `Booking ${booking_id} status was changed from 'Active' to 'Completed'. Trigger 'trg_free_bed_after_checkout' detected the state transition and automatically freed Bed ${bed_id} to '${bedAfter[0].status}'.`
            });
        }
        else if (trigger_demo === 'block_occupied_booking') {
            // Demo 3: BEFORE INSERT on Booking rejects booking an occupied bed
            const [occ] = await conn.execute("SELECT bed_id FROM Bed WHERE status = 'Occupied' LIMIT 1");
            if (occ.length === 0) {
                return res.status(400).json({ error: 'No occupied bed found to test rejection.' });
            }
            const occBedId = occ[0].bed_id;

            try {
                // Attempt to insert booking on occupied bed
                await conn.execute(
                    "INSERT INTO Booking (check_in_date, monthly_rent, booking_status, bed_id, tenant_id) VALUES (CURDATE(), 8000.00, 'Active', ?, 1)",
                    [occBedId]
                );
                return res.json({ success: false, message: 'Expected trigger to block, but insert succeeded.' });
            } catch (triggerErr) {
                return res.json({
                    demo: 'BEFORE INSERT on Booking -> Blocks Unavailable Bed',
                    trigger_name: 'trg_check_bed_before_booking',
                    tested_bed_id: occBedId,
                    blocked_successfully: true,
                    sqlstate: triggerErr.sqlState || '45000',
                    mysql_error_message: triggerErr.message,
                    explanation: `Trigger 'trg_check_bed_before_booking' executed BEFORE the INSERT statement. It detected that Bed ${occBedId} has status 'Occupied' and raised a SIGNAL SQLSTATE '45000' with error message: "${triggerErr.message}". The invalid row was never inserted!`
                });
            }
        }
        else if (trigger_demo === 'validate_payment_amount') {
            // Demo 4: BEFORE INSERT on Payment rejects amount <= 0
            try {
                await conn.execute(
                    "INSERT INTO Payment (amount, payment_mode, booking_id) VALUES (-250.00, 'Cash', 1)"
                );
                return res.json({ success: false, message: 'Expected trigger to block negative payment, but insert succeeded.' });
            } catch (triggerErr) {
                return res.json({
                    demo: 'BEFORE INSERT on Payment -> Rejects Amount <= 0',
                    trigger_name: 'trg_validate_payment_amount',
                    tested_amount: -250.00,
                    blocked_successfully: true,
                    sqlstate: triggerErr.sqlState || '45000',
                    mysql_error_message: triggerErr.message,
                    explanation: `Trigger 'trg_validate_payment_amount' verified NEW.amount <= 0.00 and fired SIGNAL SQLSTATE '45000' with message: "${triggerErr.message}". Defensive database-layer enforcement guarantees financial ledger integrity.`
                });
            }
        }
        else if (trigger_demo === 'link_complaint_owner') {
            // Demo 5: AFTER INSERT on Complaint auto-links complaint to owner in owner_complaint
            // Insert complaint for Tenant 1 (Arjun)
            const [cResult] = await conn.execute(
                "INSERT INTO Complaint (description, status, tenant_id) VALUES ('Live Viva Trigger Test: AC remote malfunction', 'Open', 1)"
            );
            const newComplaintId = cResult.insertId;

            // Check owner_complaint table
            const [mappings] = await conn.execute(
                `SELECT oc.owner_id, oc.complaint_id, oc.assigned_date, o.name AS owner_name
                 FROM owner_complaint oc
                 INNER JOIN Owner o ON oc.owner_id = o.owner_id
                 WHERE oc.complaint_id = ?`,
                [newComplaintId]
            );

            return res.json({
                demo: 'AFTER INSERT on Complaint -> Auto-links to Owner in owner_complaint',
                trigger_name: 'trg_link_complaint_to_owner',
                new_complaint_id: newComplaintId,
                auto_linked_mappings: mappings,
                success: mappings.length > 0,
                explanation: `When a new complaint ticket (ID: ${newComplaintId}) was inserted for Tenant 1, trigger 'trg_link_complaint_to_owner' joined Tenant 1's active booking -> Bed -> Room -> Property to locate the owner(s) and automatically inserted a row into junction table 'owner_complaint' with composite key (${mappings[0]?.owner_id || 'N/A'}, ${newComplaintId}).`
            });
        }
        else {
            return res.status(400).json({ error: 'Unknown trigger demo type.' });
        }
    } catch (err) {
        console.error('Trigger test error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
};

