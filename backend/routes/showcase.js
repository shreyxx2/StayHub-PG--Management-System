const express = require('express');
const router = express.Router();
const showcaseController = require('../controllers/showcaseController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// SQL Showcase Catalog Endpoints (Allow access so students can demo in viva)
router.get('/queries', showcaseController.getQueriesCatalog);
router.post('/run-query', showcaseController.runQuery);

router.get('/views', showcaseController.getViewsCatalog);
router.post('/run-view', showcaseController.runView);

router.post('/run-cursor-report', showcaseController.runCursorReport);
router.post('/test-trigger', showcaseController.testTrigger);

module.exports = router;

