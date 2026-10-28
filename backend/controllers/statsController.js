const pool = require('../db');

// GET /api/stats/owner (Owner Dashboard Metrics)
exports.getOwnerStats = async (req, res) => {
    try {
        const ownerId = req.user.role === 'admin' ? req.query.owner_id || null : req.user.owner_id;

        let propertyFilter = '';
        const params = [];

        if (ownerId) {
            propertyFilter = 'WHERE p.owner_id = ?';
            params.push(ownerId);
        }

        // 1. Bed status counts
        const [bedStats] = await pool.query(
            `SELECT 
                COUNT(b.bed_id) AS total_beds,
                SUM(CASE WHEN b.status = 'Available' THEN 1 ELSE 0 END) AS available_beds,
                SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_beds,
                SUM(CASE WHEN b.status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance_beds
             FROM Property p
             LEFT JOIN Room r ON p.property_id = r.property_id
             LEFT JOIN Bed b ON r.room_id = b.room_id
             ${propertyFilter}`,
            params
        );

        const totalBeds = bedStats[0].total_beds || 0;
        const occupiedBeds = bedStats[0].occupied_beds || 0;
        const availableBeds = bedStats[0].available_beds || 0;
        const maintenanceBeds = bedStats[0].maintenance_beds || 0;
        const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0;

        // 2. Revenue this month
        const [revenueStats] = await pool.query(
            `SELECT COALESCE(SUM(pay.amount), 0.00) AS revenue_this_month
             FROM Payment pay
             INNER JOIN Booking bk ON pay.booking_id = bk.booking_id
             INNER JOIN Bed b ON bk.bed_id = b.bed_id
             INNER JOIN Room r ON b.room_id = r.room_id
             INNER JOIN Property p ON r.property_id = p.property_id
             ${propertyFilter} 
             ${propertyFilter ? 'AND' : 'WHERE'} 
             YEAR(pay.payment_date) = YEAR(CURDATE()) AND MONTH(pay.payment_date) = MONTH(CURDATE())`,
            params
        );

        // 3. Pending dues across active bookings
        let duesQuery = `
            SELECT COALESCE(SUM(get_pending_rent(bk.booking_id)), 0.00) AS total_pending_dues
            FROM Booking bk
            INNER JOIN Bed b ON bk.bed_id = b.bed_id
            INNER JOIN Room r ON b.room_id = r.room_id
            INNER JOIN Property p ON r.property_id = p.property_id
            ${propertyFilter}
            ${propertyFilter ? 'AND' : 'WHERE'} bk.booking_status = 'Active'
        `;
        const [duesStats] = await pool.query(duesQuery, params);

        // 4. Open complaints count
        let complaintsQuery = `
            SELECT COUNT(c.complaint_id) AS open_complaints_count
            FROM Complaint c
            INNER JOIN owner_complaint oc ON c.complaint_id = oc.complaint_id
            WHERE c.status IN ('Open', 'In Progress')
        `;
        const complaintParams = [];
        if (ownerId) {
            complaintsQuery += ` AND oc.owner_id = ?`;
            complaintParams.push(ownerId);
        }
        const [complaintStats] = await pool.query(complaintsQuery, complaintParams);

        // 5. Total Properties and Rooms
        const [propCount] = await pool.query(
            `SELECT COUNT(DISTINCT p.property_id) AS total_properties,
                    COUNT(DISTINCT r.room_id) AS total_rooms
             FROM Property p
             LEFT JOIN Room r ON p.property_id = r.property_id
             ${propertyFilter}`,
            params
        );

        res.json({
            total_properties: propCount[0].total_properties || 0,
            total_rooms: propCount[0].total_rooms || 0,
            total_beds: totalBeds,
            available_beds: availableBeds,
            occupied_beds: occupiedBeds,
            maintenance_beds: maintenanceBeds,
            occupancy_rate: occupancyRate,
            revenue_this_month: revenueStats[0].revenue_this_month || 0,
            total_pending_dues: duesStats[0].total_pending_dues || 0,
            open_complaints: complaintStats[0].open_complaints_count || 0
        });
    } catch (err) {
        console.error('Error fetching owner stats:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard metrics.' });
    }
};

// GET /api/stats/admin (Global System KPIs)
exports.getAdminStats = async (req, res) => {
    try {
        const [owners] = await pool.execute('SELECT COUNT(*) AS count FROM Owner');
        const [properties] = await pool.execute('SELECT COUNT(*) AS count FROM Property');
        const [rooms] = await pool.execute('SELECT COUNT(*) AS count FROM Room');
        const [beds] = await pool.execute('SELECT COUNT(*) AS count, SUM(CASE WHEN status="Available" THEN 1 ELSE 0 END) AS available, SUM(CASE WHEN status="Occupied" THEN 1 ELSE 0 END) AS occupied FROM Bed');
        const [tenants] = await pool.execute('SELECT COUNT(*) AS count FROM Tenant');
        const [bookings] = await pool.execute('SELECT COUNT(*) AS count, SUM(CASE WHEN booking_status="Active" THEN 1 ELSE 0 END) AS active FROM Booking');
        const [payments] = await pool.execute('SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_revenue FROM Payment');
        const [complaints] = await pool.execute('SELECT COUNT(*) AS count, SUM(CASE WHEN status="Open" THEN 1 ELSE 0 END) AS open_count FROM Complaint');

        res.json({
            total_owners: owners[0].count,
            total_properties: properties[0].count,
            total_rooms: rooms[0].count,
            total_beds: beds[0].count,
            available_beds: beds[0].available || 0,
            occupied_beds: beds[0].occupied || 0,
            total_tenants: tenants[0].count,
            total_bookings: bookings[0].count,
            active_bookings: bookings[0].active || 0,
            total_transactions: payments[0].count,
            total_revenue: payments[0].total_revenue,
            total_complaints: complaints[0].count,
            open_complaints: complaints[0].open_count || 0
        });
    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ error: 'Failed to fetch admin stats.' });
    }
};

