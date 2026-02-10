const router = require('express').Router();
const { body } = require('express-validator');
const tenantsController = require('../controllers/tenants.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

router.use(authenticate);

// Get all tenants
router.get('/', tenantsController.getAll);

// Get property list
router.get('/properties', tenantsController.getProperties);

// Get single tenant
router.get('/:id', tenantsController.getById);

// Create tenant (admin only)
router.post('/', authorize('admin'), [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('meter_number').notEmpty().withMessage('Meter number is required'),
    body('unit_number').notEmpty().withMessage('Unit number is required'),
    body('move_in_date').isDate().withMessage('Valid move-in date is required'),
    validate,
], tenantsController.create);

// Update tenant (admin only)
router.put('/:id', authorize('admin'), tenantsController.update);

// Delete (deactivate) tenant (admin only)
router.delete('/:id', authorize('admin'), tenantsController.remove);

// Permanently delete tenant and all related data (admin only)
router.delete('/:id/permanent', authorize('admin'), tenantsController.permanentDelete);

module.exports = router;
