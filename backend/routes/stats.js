const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/owner', authorizeRoles('owner', 'admin'), statsController.getOwnerStats);
router.get('/admin', authorizeRoles('admin'), statsController.getAdminStats);

module.exports = router;

