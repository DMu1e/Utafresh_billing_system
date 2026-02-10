const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

// Login
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
], authController.login);

// Get current user
router.get('/me', authenticate, authController.me);

// Change password
router.post('/change-password', authenticate, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    validate,
], authController.changePassword);

// Employee management (admin only)
router.post('/employees', authenticate, authorize('admin'), [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    validate,
], authController.createEmployee);

router.get('/employees', authenticate, authorize('admin'), authController.getEmployees);
router.put('/employees/:id', authenticate, authorize('admin'), authController.updateEmployee);

module.exports = router;
