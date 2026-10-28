const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', authorizeRoles('tenant', 'admin'), complaintController.raiseComplaint);
router.get('/my', authorizeRoles('tenant'), complaintController.getMyComplaints);
router.get('/owner', authorizeRoles('owner', 'admin'), complaintController.getOwnerComplaints);
router.get('/', authorizeRoles('admin'), complaintController.getAllComplaints);
router.put('/:id/status', authorizeRoles('owner', 'admin'), complaintController.updateComplaintStatus);

module.exports = router;

