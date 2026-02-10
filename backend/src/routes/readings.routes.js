const router = require('express').Router();
const { body } = require('express-validator');
const readingsController = require('../controllers/readings.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

router.use(authenticate);

router.get('/', readingsController.getAll);
router.get('/tenant/:tenantId', readingsController.getByTenant);

router.post('/', [
    body('tenant_id').isInt().withMessage('Tenant ID is required'),
    body('reading_value').isInt({ min: 0 }).withMessage('Reading value must be a non-negative integer'),
    body('reading_date').isDate().withMessage('Valid reading date is required'),
    validate,
], readingsController.create);

router.put('/:id', authorize('admin'), readingsController.update);

module.exports = router;
