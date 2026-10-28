const pool = require('../db');

// POST /api/payments (Record payment using STORED PROCEDURE record_payment)
exports.createPayment = async (req, res) => {
    try {
        const { booking_id, amount, payment_mode } = req.body;

        if (!booking_id || !amount || !payment_mode) {
            return res.status(400).json({ error: 'Booking ID, amount, and payment mode are required.' });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
        }

        if (!['Cash', 'UPI', 'Card', 'Net Banking'].includes(payment_mode)) {
            return res.status(400).json({ error: 'Invalid payment mode. Choose Cash, UPI, Card, or Net Banking.' });
        }

        // Authorization check for tenant
        if (req.user.role === 'tenant') {
            const [check] = await pool.execute(
                'SELECT booking_id FROM Booking WHERE booking_id = ? AND tenant_id = ?',
                [parseInt(booking_id, 10), req.user.tenant_id]
            );
            if (check.length === 0) {
                return res.status(403).json({ error: 'You are not authorized to pay for this booking.' });
            }
        }

        // Execute Stored Procedure: record_payment(booking_id, amount, mode)
        const [result] = await pool.query(
            'CALL record_payment(?, ?, ?)',
            [parseInt(booking_id, 10), parsedAmount, payment_mode]
        );

        const paymentData = result[0] && result[0][0] ? result[0][0] : {};

        res.status(201).json({
            message: 'Payment recorded successfully!',
            payment: paymentData
        });
    } catch (err) {
        console.error('Error recording payment via procedure:', err);
        res.status(400).json({ error: err.message || 'Failed to record payment.' });
    }
};

// GET /api/payments/my (Tenant's Payments)
exports.getMyPayments = async (req, res) => {
    try {
        if (!req.user.tenant_id) {
            return res.status(400).json({ error: 'Tenant profile not linked.' });
        }

        const [payments] = await pool.execute(
            `SELECT 
                pay.payment_id,
                pay.amount,
                pay.payment_date,
                pay.payment_mode,
                bk.booking_id,
                p.name AS property_name,
                r.room_type,
                b.bed_id
             FROM Payment pay
             INNER JOIN Booking bk ON pay.booking_id = bk.booking_id
             INNER JOIN Bed b ON bk.bed_id = b.bed_id
             INNER JOIN Room r ON b.room_id = r.room_id
             INNER JOIN Property p ON r.property_id = p.property_id
             WHERE bk.tenant_id = ?
             ORDER BY pay.payment_date DESC`,
            [req.user.tenant_id]
        );

        res.json(payments);
    } catch (err) {
        console.error('Error fetching tenant payments:', err);
        res.status(500).json({ error: 'Failed to fetch payments.' });
    }
};

// GET /api/payments/owner (Owner's Payments)
exports.getOwnerPayments = async (req, res) => {
    try {
        let query = `
            SELECT 
                pay.payment_id,
                pay.amount,
                pay.payment_date,
                pay.payment_mode,
                bk.booking_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,
                p.name AS property_name,
                r.room_type
            FROM Payment pay
            INNER JOIN Booking bk ON pay.booking_id = bk.booking_id
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

        query += ` ORDER BY pay.payment_date DESC`;

        const [payments] = await pool.query(query, params);
        res.json(payments);
    } catch (err) {
        console.error('Error fetching owner payments:', err);
        res.status(500).json({ error: 'Failed to fetch payments.' });
    }
};

// GET /api/payments (Admin All Payments)
exports.getAllPayments = async (req, res) => {
    try {
        const [payments] = await pool.execute(
            `SELECT 
                pay.payment_id,
                pay.amount,
                pay.payment_date,
                pay.payment_mode,
                bk.booking_id,
                t.name AS tenant_name,
                p.name AS property_name,
                o.name AS owner_name
             FROM Payment pay
             INNER JOIN Booking bk ON pay.booking_id = bk.booking_id
             INNER JOIN Tenant t ON bk.tenant_id = t.tenant_id
             INNER JOIN Bed b ON bk.bed_id = b.bed_id
             INNER JOIN Room r ON b.room_id = r.room_id
             INNER JOIN Property p ON r.property_id = p.property_id
             INNER JOIN Owner o ON p.owner_id = o.owner_id
             ORDER BY pay.payment_date DESC`
        );
        res.json(payments);
    } catch (err) {
        console.error('Error fetching all payments:', err);
        res.status(500).json({ error: 'Failed to fetch payments.' });
    }
};

