const router = require('express').Router();
const exportsController = require('../controllers/exports.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/bills', exportsController.exportBills);
router.get('/payments', exportsController.exportPayments);
router.get('/tenants', exportsController.exportTenants);
router.get('/disconnections', exportsController.exportDisconnections);

module.exports = router;
