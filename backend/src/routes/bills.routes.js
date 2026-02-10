const router = require('express').Router();
const { body } = require('express-validator');
const billsController = require('../controllers/bills.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

router.use(authenticate);

router.get('/', billsController.getAll);
router.get('/:id', billsController.getById);
router.get('/tenant/:tenantId', billsController.getByTenant);

// Generate bills (admin only)
router.post('/generate', authorize('admin'), [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
    body('year').isInt({ min: 2020 }).withMessage('Valid year is required'),
    validate,
], billsController.generate);

// Send bills via SMS to tenants (admin only)
router.post('/send-sms', authorize('admin'), [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
    body('year').isInt({ min: 2020 }).withMessage('Valid year is required'),
    validate,
], billsController.sendBillsSMS);

module.exports = router;
