const router = require('express').Router();
const { body } = require('express-validator');
const paymentsController = require('../controllers/payments.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

router.use(authenticate);

router.get('/', paymentsController.getAll);
router.get('/summary', paymentsController.getSummary);
router.get('/tenant/:tenantId', paymentsController.getByTenant);

router.post('/', [
    body('bill_id').isInt().withMessage('Bill ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('payment_date').isDate().withMessage('Valid payment date is required'),
    body('payment_method').isIn(['mpesa', 'bank']).withMessage('Payment method must be mpesa or bank'),
    validate,
], paymentsController.create);

module.exports = router;
