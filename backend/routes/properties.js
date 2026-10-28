const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Public routes
router.get('/', propertyController.getAllProperties);
router.get('/:id', propertyController.getPropertyById);

// Owner / Admin protected routes
router.post('/', authenticateToken, authorizeRoles('owner', 'admin'), propertyController.createProperty);
router.put('/:id', authenticateToken, authorizeRoles('owner', 'admin'), propertyController.updateProperty);
router.delete('/:id', authenticateToken, authorizeRoles('owner', 'admin'), propertyController.deleteProperty);

// Room management
router.post('/:id/rooms', authenticateToken, authorizeRoles('owner', 'admin'), propertyController.addRoom);
router.delete('/rooms/:id', authenticateToken, authorizeRoles('owner', 'admin'), propertyController.deleteRoom);

// Bed management
router.post('/rooms/:id/beds', authenticateToken, authorizeRoles('owner', 'admin'), propertyController.addBed);
router.put('/beds/:id', authenticateToken, authorizeRoles('owner', 'admin'), propertyController.updateBedStatus);
router.delete('/beds/:id', authenticateToken, authorizeRoles('owner', 'admin'), propertyController.deleteBed);

module.exports = router;

