const pool = require('../db');

// GET /api/properties (Public Search & Filter with Live Available Beds Count)
exports.getAllProperties = async (req, res) => {
    try {
        const { search, room_type, available_only, min_rent, max_rent } = req.query;

        let query = `
            SELECT 
                p.property_id,
                p.name AS property_name,
                p.address,
                o.owner_id,
                o.name AS owner_name,
                o.phone AS owner_phone,
                COUNT(DISTINCT r.room_id) AS total_rooms,
                COUNT(b.bed_id) AS total_beds,
                SUM(CASE WHEN b.status = 'Available' THEN 1 ELSE 0 END) AS available_beds,
                SUM(CASE WHEN b.status = 'Occupied' THEN 1 ELSE 0 END) AS occupied_beds,
                MIN(bk.monthly_rent) AS starting_rent,
                MAX(bk.monthly_rent) AS max_rent
            FROM Property p
            INNER JOIN Owner o ON p.owner_id = o.owner_id
            LEFT JOIN Room r ON p.property_id = r.property_id
            LEFT JOIN Bed b ON r.room_id = b.room_id
            LEFT JOIN Booking bk ON b.bed_id = bk.bed_id AND bk.booking_status = 'Active'
            WHERE 1=1
        `;

        const params = [];

        if (search) {
            query += ` AND (p.name LIKE ? OR p.address LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (room_type) {
            query += ` AND r.room_type = ?`;
            params.push(room_type);
        }

        query += ` GROUP BY p.property_id, p.name, p.address, o.owner_id, o.name, o.phone`;

        const havingClauses = [];
        if (available_only === 'true' || available_only === '1') {
            havingClauses.push(`available_beds > 0`);
        }

        if (min_rent) {
            havingClauses.push(`(starting_rent >= ? OR starting_rent IS NULL)`);
            params.push(parseFloat(min_rent));
        }

        if (max_rent) {
            havingClauses.push(`(starting_rent <= ? OR starting_rent IS NULL)`);
            params.push(parseFloat(max_rent));
        }

        if (havingClauses.length > 0) {
            query += ` HAVING ` + havingClauses.join(' AND ');
        }

        query += ` ORDER BY available_beds DESC, p.name ASC`;

        const [properties] = await pool.query(query, params);
        res.json(properties);
    } catch (err) {
        console.error('Error fetching properties:', err);
        res.status(500).json({ error: 'Failed to fetch properties.' });
    }
};

// GET /api/properties/:id (Property Details: owner, rooms, beds with status, rent)
exports.getPropertyById = async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id, 10);

        // Fetch property + owner info
        const [props] = await pool.execute(
            `SELECT p.property_id, p.name AS property_name, p.address,
                    o.owner_id, o.name AS owner_name, o.phone AS owner_phone
             FROM Property p
             INNER JOIN Owner o ON p.owner_id = o.owner_id
             WHERE p.property_id = ?`,
            [propertyId]
        );

        if (props.length === 0) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        const property = props[0];

        // Fetch rooms for this property
        const [rooms] = await pool.execute(
            `SELECT room_id, room_type, property_id
             FROM Room
             WHERE property_id = ?
             ORDER BY room_id ASC`,
            [propertyId]
        );

        // Fetch all beds in these rooms
        const [beds] = await pool.execute(
            `SELECT b.bed_id, b.status, b.room_id,
                    bk.booking_id, bk.monthly_rent, bk.booking_status,
                    t.name AS current_tenant_name
             FROM Bed b
             INNER JOIN Room r ON b.room_id = r.room_id
             LEFT JOIN Booking bk ON b.bed_id = bk.bed_id AND bk.booking_status = 'Active'
             LEFT JOIN Tenant t ON bk.tenant_id = t.tenant_id
             WHERE r.property_id = ?
             ORDER BY b.bed_id ASC`,
            [propertyId]
        );

        // Group beds by room
        const bedsByRoom = {};
        beds.forEach(bed => {
            if (!bedsByRoom[bed.room_id]) {
                bedsByRoom[bed.room_id] = [];
            }
            bedsByRoom[bed.room_id].push(bed);
        });

        const roomsWithBeds = rooms.map(room => ({
            ...room,
            beds: bedsByRoom[room.room_id] || []
        }));

        property.rooms = roomsWithBeds;

        // Count totals
        const totalBeds = beds.length;
        const availableBeds = beds.filter(b => b.status === 'Available').length;
        const occupiedBeds = beds.filter(b => b.status === 'Occupied').length;
        const maintenanceBeds = beds.filter(b => b.status === 'Maintenance').length;

        property.stats = {
            total_beds: totalBeds,
            available_beds: availableBeds,
            occupied_beds: occupiedBeds,
            maintenance_beds: maintenanceBeds,
            occupancy_rate: totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : 0
        };

        res.json(property);
    } catch (err) {
        console.error('Error fetching property details:', err);
        res.status(500).json({ error: 'Failed to fetch property details.' });
    }
};

// POST /api/properties (Owner / Admin)
exports.createProperty = async (req, res) => {
    try {
        const { name, address, owner_id } = req.body;

        if (!name || !address) {
            return res.status(400).json({ error: 'Property name and address are required.' });
        }

        // Determine owner ID
        let targetOwnerId = owner_id;
        if (req.user.role === 'owner') {
            targetOwnerId = req.user.owner_id;
        }

        if (!targetOwnerId) {
            return res.status(400).json({ error: 'Owner ID is required.' });
        }

        const [result] = await pool.execute(
            'INSERT INTO Property (name, address, owner_id) VALUES (?, ?, ?)',
            [name.trim(), address.trim(), targetOwnerId]
        );

        res.status(201).json({
            message: 'Property created successfully.',
            property_id: result.insertId
        });
    } catch (err) {
        console.error('Error creating property:', err);
        res.status(500).json({ error: 'Failed to create property.' });
    }
};

// PUT /api/properties/:id (Owner / Admin)
exports.updateProperty = async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id, 10);
        const { name, address } = req.body;

        if (!name || !address) {
            return res.status(400).json({ error: 'Property name and address are required.' });
        }

        // Authorization check if owner
        if (req.user.role === 'owner') {
            const [ownerCheck] = await pool.execute(
                'SELECT property_id FROM Property WHERE property_id = ? AND owner_id = ?',
                [propertyId, req.user.owner_id]
            );
            if (ownerCheck.length === 0) {
                return res.status(403).json({ error: 'You do not own this property.' });
            }
        }

        await pool.execute(
            'UPDATE Property SET name = ?, address = ? WHERE property_id = ?',
            [name.trim(), address.trim(), propertyId]
        );

        res.json({ message: 'Property updated successfully.' });
    } catch (err) {
        console.error('Error updating property:', err);
        res.status(500).json({ error: 'Failed to update property.' });
    }
};

// DELETE /api/properties/:id (Owner / Admin)
exports.deleteProperty = async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id, 10);

        if (req.user.role === 'owner') {
            const [ownerCheck] = await pool.execute(
                'SELECT property_id FROM Property WHERE property_id = ? AND owner_id = ?',
                [propertyId, req.user.owner_id]
            );
            if (ownerCheck.length === 0) {
                return res.status(403).json({ error: 'You do not own this property.' });
            }
        }

        await pool.execute('DELETE FROM Property WHERE property_id = ?', [propertyId]);
        res.json({ message: 'Property deleted successfully.' });
    } catch (err) {
        console.error('Error deleting property:', err);
        res.status(500).json({ error: 'Failed to delete property.' });
    }
};

// POST /api/properties/:id/rooms (Add Room to Property)
exports.addRoom = async (req, res) => {
    try {
        const propertyId = parseInt(req.params.id, 10);
        const { room_type, bed_count } = req.body;

        if (!['Single', 'Double', 'Triple', 'Dormitory'].includes(room_type)) {
            return res.status(400).json({ error: 'Invalid room type.' });
        }

        const [roomResult] = await pool.execute(
            'INSERT INTO Room (room_type, property_id) VALUES (?, ?)',
            [room_type, propertyId]
        );

        const newRoomId = roomResult.insertId;

        // Auto create beds if requested
        const count = parseInt(bed_count, 10) || (
            room_type === 'Single' ? 1 :
            room_type === 'Double' ? 2 :
            room_type === 'Triple' ? 3 : 4
        );

        for (let i = 0; i < count; i++) {
            await pool.execute(
                'INSERT INTO Bed (status, room_id) VALUES (?, ?)',
                ['Available', newRoomId]
            );
        }

        res.status(201).json({
            message: `Room added with ${count} bed(s).`,
            room_id: newRoomId
        });
    } catch (err) {
        console.error('Error adding room:', err);
        res.status(500).json({ error: 'Failed to add room.' });
    }
};

// DELETE /api/rooms/:id
exports.deleteRoom = async (req, res) => {
    try {
        const roomId = parseInt(req.params.id, 10);
        await pool.execute('DELETE FROM Room WHERE room_id = ?', [roomId]);
        res.json({ message: 'Room deleted successfully.' });
    } catch (err) {
        console.error('Error deleting room:', err);
        res.status(500).json({ error: 'Failed to delete room.' });
    }
};

// POST /api/rooms/:id/beds (Add bed)
exports.addBed = async (req, res) => {
    try {
        const roomId = parseInt(req.params.id, 10);
        const status = req.body.status || 'Available';

        const [result] = await pool.execute(
            'INSERT INTO Bed (status, room_id) VALUES (?, ?)',
            [status, roomId]
        );

        res.status(201).json({
            message: 'Bed created successfully.',
            bed_id: result.insertId
        });
    } catch (err) {
        console.error('Error adding bed:', err);
        res.status(500).json({ error: 'Failed to add bed.' });
    }
};

// PUT /api/beds/:id (Update status: Available/Occupied/Maintenance)
exports.updateBedStatus = async (req, res) => {
    try {
        const bedId = parseInt(req.params.id, 10);
        const { status } = req.body;

        if (!['Available', 'Occupied', 'Maintenance'].includes(status)) {
            return res.status(400).json({ error: 'Invalid bed status.' });
        }

        await pool.execute(
            'UPDATE Bed SET status = ? WHERE bed_id = ?',
            [status, bedId]
        );

        res.json({ message: 'Bed status updated successfully.' });
    } catch (err) {
        console.error('Error updating bed status:', err);
        res.status(500).json({ error: 'Failed to update bed status.' });
    }
};

// DELETE /api/beds/:id
exports.deleteBed = async (req, res) => {
    try {
        const bedId = parseInt(req.params.id, 10);
        await pool.execute('DELETE FROM Bed WHERE bed_id = ?', [bedId]);
        res.json({ message: 'Bed deleted successfully.' });
    } catch (err) {
        console.error('Error deleting bed:', err);
        res.status(500).json({ error: 'Failed to delete bed. It may have associated bookings.' });
    }
};

