const pool = require('../db');

// POST /api/bookings (Create a booking via STORED PROCEDURE book_bed)
exports.createBooking = async (req, res) => {
    try {
        const { bed_id, check_in_date, monthly_rent, tenant_id } = req.body;

        // Tenant ID determination
        let targetTenantId = tenant_id;
        if (req.user.role === 'tenant') {
            targetTenantId = req.user.tenant_id;
        }

        if (!targetTenantId) {
            return res.status(400).json({ error: 'Tenant ID is required.' });
        }

        if (!bed_id || !check_in_date || !monthly_rent) {
            return res.status(400).json({ error: 'Bed ID, check-in date, and monthly rent are required.' });
        }

        const rent = parseFloat(monthly_rent);
        if (isNaN(rent) || rent <= 0) {
            return res.status(400).json({ error: 'Monthly rent must be a positive number.' });
        }

        // Execute Stored Procedure: book_bed(tenant_id, bed_id, check_in_date, monthly_rent)
        // Stored procedure raises SQLSTATE 45000 if bed is occupied or invalid
        const [result] = await pool.query(
            'CALL book_bed(?, ?, ?, ?)',
            [targetTenantId, parseInt(bed_id, 10), check_in_date, rent]
        );

        // Result of procedure select
        const bookingData = result[0] && result[0][0] ? result[0][0] : {};

        res.status(201).json({
            message: 'Bed booked successfully!',
            booking: bookingData
        });
    } catch (err) {
        console.error('Error creating booking via procedure:', err);
        // Catch MySQL SIGNAL 45000 from triggers/procedure
        res.status(400).json({ error: err.message || 'Failed to book bed.' });
    }
};

// POST /api/bookings/:id/checkout (Checkout tenant via STORED PROCEDURE checkout_tenant)
exports.checkoutBooking = async (req, res) => {
    try {
        const bookingId = parseInt(req.params.id, 10);
        const checkOutDate = req.body.check_out_date || new Date().toISOString().split('T')[0];

        // Authorization check
        if (req.user.role === 'tenant') {
            const [check] = await pool.execute(
                'SELECT booking_id FROM Booking WHERE booking_id = ? AND tenant_id = ?',
                [bookingId, req.user.tenant_id]
            );
            if (check.length === 0) {
                return res.status(403).json({ error: 'You are not authorized to check out this booking.' });
            }
        }

        // Execute Stored Procedure: checkout_tenant(booking_id, check_out_date)
        const [result] = await pool.query(
            'CALL checkout_tenant(?, ?)',
            [bookingId, checkOutDate]
        );

        const checkoutData = result[0] && result[0][0] ? result[0][0] : {};

        res.json({
            message: 'Tenant checked out successfully! Bed is now Available.',
            details: checkoutData
        });
    } catch (err) {
        console.error('Error checking out booking:', err);
        res.status(400).json({ error: err.message || 'Failed to checkout booking.' });
    }
};

// GET /api/bookings/my (Tenant Bookings)
exports.getMyBookings = async (req, res) => {
    try {
        if (!req.user.tenant_id) {
            return res.status(400).json({ error: 'Tenant profile not linked.' });
        }

        const [bookings] = await pool.execute(
            `SELECT 
                bk.booking_id,
                bk.check_in_date,
                bk.check_out_date,
                bk.monthly_rent,
                bk.booking_status,
                b.bed_id,
                b.status AS bed_status,
                r.room_id,
                r.room_type,
                p.property_id,
                p.name AS property_name,
                p.address AS property_address,
                o.name AS owner_name,
                o.phone AS owner_phone,
                COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00) AS total_paid,
                get_pending_rent(bk.booking_id) AS pending_due
             FROM Booking bk
             INNER JOIN Bed b ON bk.bed_id = b.bed_id
             INNER JOIN Room r ON b.room_id = r.room_id
             INNER JOIN Property p ON r.property_id = p.property_id
             INNER JOIN Owner o ON p.owner_id = o.owner_id
             WHERE bk.tenant_id = ?
             ORDER BY bk.booking_id DESC`,
            [req.user.tenant_id]
        );

        res.json(bookings);
    } catch (err) {
        console.error('Error fetching tenant bookings:', err);
        res.status(500).json({ error: 'Failed to fetch bookings.' });
    }
};

// GET /api/bookings/owner (Owner Bookings)
exports.getOwnerBookings = async (req, res) => {
    try {
        if (!req.user.owner_id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        let query = `
            SELECT 
                bk.booking_id,
                bk.check_in_date,
                bk.check_out_date,
                bk.monthly_rent,
                bk.booking_status,
                b.bed_id,
                r.room_type,
                p.name AS property_name,
                t.tenant_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,
                COALESCE((SELECT SUM(amount) FROM Payment WHERE booking_id = bk.booking_id), 0.00) AS total_paid,
                get_pending_rent(bk.booking_id) AS pending_due
            FROM Booking bk
            INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id
            INNER JOIN Bed b ON bk.bed_id = b.bed_id
            INNER JOIN Room r ON b.room_id = r.room_id
            INNER JOIN Property p ON r.property_id = p.property_id
        `;

        const params = [];
        if (req.user.role === 'owner') {
            query += ` WHERE p.owner_id = ?`;
            params.push(req.user.owner_id);
        }

        query += ` ORDER BY bk.booking_id DESC`;

        const [bookings] = await pool.query(query, params);
        res.json(bookings);
    } catch (err) {
        console.error('Error fetching owner bookings:', err);
        res.status(500).json({ error: 'Failed to fetch bookings.' });
    }
};

// GET /api/bookings (Admin All Bookings)
exports.getAllBookings = async (req, res) => {
    try {
        const [bookings] = await pool.execute(
            `SELECT * FROM tenant_booking_details ORDER BY booking_id DESC`
        );
        res.json(bookings);
    } catch (err) {
        console.error('Error fetching all bookings:', err);
        res.status(500).json({ error: 'Failed to fetch bookings.' });
    }
};

