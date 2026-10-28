const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', authorizeRoles('tenant', 'admin'), paymentController.createPayment);
router.get('/my', authorizeRoles('tenant'), paymentController.getMyPayments);
router.get('/owner', authorizeRoles('owner', 'admin'), paymentController.getOwnerPayments);
router.get('/', authorizeRoles('admin'), paymentController.getAllPayments);

module.exports = router;

