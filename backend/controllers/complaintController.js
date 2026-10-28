const pool = require('../db');

// POST /api/complaints (Raise complaint via STORED PROCEDURE raise_complaint)
exports.raiseComplaint = async (req, res) => {
    try {
        const { description } = req.body;

        if (!description || description.trim() === '') {
            return res.status(400).json({ error: 'Complaint description is required.' });
        }

        if (!req.user.tenant_id) {
            return res.status(400).json({ error: 'Only tenants can raise complaints.' });
        }

        // Call Stored Procedure: raise_complaint(tenant_id, description)
        // Trigger trg_link_complaint_to_owner automatically inserts into owner_complaint
        const [result] = await pool.query(
            'CALL raise_complaint(?, ?)',
            [req.user.tenant_id, description.trim()]
        );

        const complaintData = result[0] && result[0][0] ? result[0][0] : {};

        res.status(201).json({
            message: 'Complaint registered successfully and assigned to PG owner!',
            complaint: complaintData
        });
    } catch (err) {
        console.error('Error raising complaint:', err);
        res.status(400).json({ error: err.message || 'Failed to raise complaint.' });
    }
};

// GET /api/complaints/my (Tenant's complaints)
exports.getMyComplaints = async (req, res) => {
    try {
        if (!req.user.tenant_id) {
            return res.status(400).json({ error: 'Tenant profile not linked.' });
        }

        const [complaints] = await pool.execute(
            `SELECT 
                c.complaint_id,
                c.description,
                c.status,
                c.complaint_date,
                o.name AS assigned_owner_name,
                o.phone AS assigned_owner_phone
             FROM Complaint c
             LEFT JOIN owner_complaint oc ON c.complaint_id = oc.complaint_id
             LEFT JOIN Owner o ON oc.owner_id = o.owner_id
             WHERE c.tenant_id = ?
             ORDER BY c.complaint_date DESC`,
            [req.user.tenant_id]
        );

        res.json(complaints);
    } catch (err) {
        console.error('Error fetching tenant complaints:', err);
        res.status(500).json({ error: 'Failed to fetch complaints.' });
    }
};

// GET /api/complaints/owner (Owner's complaints via owner_complaint M:N junction)
exports.getOwnerComplaints = async (req, res) => {
    try {
        let query = `
            SELECT 
                c.complaint_id,
                c.description,
                c.status,
                c.complaint_date,
                t.tenant_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,
                oc.assigned_date,
                o.name AS owner_name
            FROM Complaint c
            INNER JOIN owner_complaint oc ON c.complaint_id = oc.complaint_id
            INNER JOIN Owner o ON oc.owner_id = o.owner_id
            INNER JOIN Tenant t ON c.tenant_id = t.tenant_id
        `;

        const params = [];
        if (req.user.role === 'owner') {
            query += ` WHERE oc.owner_id = ?`;
            params.push(req.user.owner_id);
        }

        query += ` ORDER BY c.complaint_date DESC`;

        const [complaints] = await pool.query(query, params);
        res.json(complaints);
    } catch (err) {
        console.error('Error fetching owner complaints:', err);
        res.status(500).json({ error: 'Failed to fetch complaints.' });
    }
};

// GET /api/complaints (Admin all complaints)
exports.getAllComplaints = async (req, res) => {
    try {
        const [complaints] = await pool.execute(
            `SELECT 
                c.complaint_id,
                c.description,
                c.status,
                c.complaint_date,
                t.tenant_id,
                t.name AS tenant_name,
                t.phone AS tenant_phone,
                o.name AS owner_name
             FROM Complaint c
             INNER JOIN Tenant t ON c.tenant_id = t.tenant_id
             LEFT JOIN owner_complaint oc ON c.complaint_id = oc.complaint_id
             LEFT JOIN Owner o ON oc.owner_id = o.owner_id
             ORDER BY c.complaint_date DESC`
        );
        res.json(complaints);
    } catch (err) {
        console.error('Error fetching all complaints:', err);
        res.status(500).json({ error: 'Failed to fetch complaints.' });
    }
};

// PUT /api/complaints/:id/status (Update status: Open, In Progress, Resolved)
exports.updateComplaintStatus = async (req, res) => {
    try {
        const complaintId = parseInt(req.params.id, 10);
        const { status } = req.body;

        if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid complaint status. Allowed: Open, In Progress, Resolved.' });
        }

        // If owner, check that complaint is logged for this owner
        if (req.user.role === 'owner') {
            const [check] = await pool.execute(
                'SELECT complaint_id FROM owner_complaint WHERE complaint_id = ? AND owner_id = ?',
                [complaintId, req.user.owner_id]
            );
            if (check.length === 0) {
                return res.status(403).json({ error: 'You are not assigned to this complaint.' });
            }
        }

        await pool.execute(
            'UPDATE Complaint SET status = ? WHERE complaint_id = ?',
            [status, complaintId]
        );

        res.json({ message: 'Complaint status updated successfully.' });
    } catch (err) {
        console.error('Error updating complaint status:', err);
        res.status(500).json({ error: 'Failed to update complaint status.' });
    }
};

