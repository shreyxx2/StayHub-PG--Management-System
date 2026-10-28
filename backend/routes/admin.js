const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken, authorizeRoles('admin'));

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT u.user_id, u.email, u.role, u.owner_id, u.tenant_id, u.created_at,
                    o.name AS owner_name, o.phone AS owner_phone,
                    t.name AS tenant_name, t.phone AS tenant_phone
             FROM users u
             LEFT JOIN Owner o ON u.owner_id = o.owner_id
             LEFT JOIN Tenant t ON u.tenant_id = t.tenant_id
             ORDER BY u.user_id ASC`
        );
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (userId === req.user.user_id) {
            return res.status(400).json({ error: 'You cannot delete your own admin account.' });
        }
        await pool.execute('DELETE FROM users WHERE user_id = ?', [userId]);
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

module.exports = router;

