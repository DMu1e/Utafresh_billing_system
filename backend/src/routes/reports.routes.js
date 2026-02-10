const router = require('express').Router();
const reportsController = require('../controllers/reports.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/dashboard', reportsController.dashboard);
router.get('/revenue', reportsController.revenue);
router.get('/disconnections', reportsController.disconnections);

module.exports = router;
