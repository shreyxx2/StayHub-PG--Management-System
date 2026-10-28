const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All booking routes require authentication
router.use(authenticateToken);

router.post('/', authorizeRoles('tenant', 'admin'), bookingController.createBooking);
router.post('/:id/checkout', authorizeRoles('tenant', 'owner', 'admin'), bookingController.checkoutBooking);
router.get('/my', authorizeRoles('tenant'), bookingController.getMyBookings);
router.get('/owner', authorizeRoles('owner', 'admin'), bookingController.getOwnerBookings);
router.get('/', authorizeRoles('admin'), bookingController.getAllBookings);

module.exports = router;

