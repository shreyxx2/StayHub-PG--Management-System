const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const [users] = await pool.execute(
            `SELECT u.user_id, u.email, u.password_hash, u.role, u.owner_id, u.tenant_id,
                    o.name AS owner_name, o.phone AS owner_phone,
                    t.name AS tenant_name, t.phone AS tenant_phone
             FROM users u
             LEFT JOIN Owner o ON u.owner_id = o.owner_id
             LEFT JOIN Tenant t ON u.tenant_id = t.tenant_id
             WHERE u.email = ?`,
            [email.trim().toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const displayName = user.role === 'owner' 
            ? user.owner_name 
            : user.role === 'tenant' 
                ? user.tenant_name 
                : 'System Administrator';

        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                role: user.role,
                owner_id: user.owner_id,
                tenant_id: user.tenant_id,
                name: displayName
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id: user.user_id,
                email: user.email,
                role: user.role,
                owner_id: user.owner_id,
                tenant_id: user.tenant_id,
                name: displayName,
                phone: user.owner_phone || user.tenant_phone || ''
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
};

// POST /api/auth/register
exports.register = async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { email, password, name, phone, role } = req.body;

        if (!email || !password || !name || !phone || !role) {
            return res.status(400).json({ error: 'All fields (name, email, phone, password, role) are required.' });
        }

        if (!['tenant', 'owner'].includes(role)) {
            return res.status(400).json({ error: 'Role must be either tenant or owner.' });
        }

        // Check if email already registered
        const [existing] = await conn.execute(
            'SELECT user_id FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email is already registered.' });
        }

        await conn.beginTransaction();

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        let owner_id = null;
        let tenant_id = null;

        if (role === 'owner') {
            const [ownerResult] = await conn.execute(
                'INSERT INTO Owner (name, phone) VALUES (?, ?)',
                [name.trim(), phone.trim()]
            );
            owner_id = ownerResult.insertId;
        } else {
            const [tenantResult] = await conn.execute(
                'INSERT INTO Tenant (name, phone) VALUES (?, ?)',
                [name.trim(), phone.trim()]
            );
            tenant_id = tenantResult.insertId;
        }

        const [userResult] = await conn.execute(
            'INSERT INTO users (email, password_hash, role, owner_id, tenant_id) VALUES (?, ?, ?, ?, ?)',
            [email.trim().toLowerCase(), password_hash, role, owner_id, tenant_id]
        );

        await conn.commit();

        const token = jwt.sign(
            {
                user_id: userResult.insertId,
                email: email.trim().toLowerCase(),
                role,
                owner_id,
                tenant_id,
                name
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                user_id: userResult.insertId,
                email: email.trim().toLowerCase(),
                role,
                owner_id,
                tenant_id,
                name,
                phone
            }
        });
    } catch (err) {
        await conn.rollback();
        console.error('Registration error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Phone number or email is already in use.' });
        }
        res.status(500).json({ error: 'Internal server error during registration.' });
    } finally {
        conn.release();
    }
};

// GET /api/auth/me
exports.getProfile = async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT u.user_id, u.email, u.role, u.owner_id, u.tenant_id,
                    o.name AS owner_name, o.phone AS owner_phone,
                    t.name AS tenant_name, t.phone AS tenant_phone
             FROM users u
             LEFT JOIN Owner o ON u.owner_id = o.owner_id
             LEFT JOIN Tenant t ON u.tenant_id = t.tenant_id
             WHERE u.user_id = ?`,
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User profile not found.' });
        }

        const u = users[0];
        const name = u.role === 'owner' ? u.owner_name : u.role === 'tenant' ? u.tenant_name : 'Administrator';

        res.json({
            user_id: u.user_id,
            email: u.email,
            role: u.role,
            owner_id: u.owner_id,
            tenant_id: u.tenant_id,
            name,
            phone: u.owner_phone || u.tenant_phone || ''
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
};

