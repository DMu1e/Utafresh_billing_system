const router = require('express').Router();
const { body } = require('express-validator');
const smsController = require('../controllers/sms.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

router.use(authenticate);

// View SMS logs
router.get('/logs', smsController.getLogs);

// Send manual SMS (admin only)
router.post('/send', authorize('admin'), [
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('message').notEmpty().withMessage('Message is required'),
    validate,
], smsController.sendManual);

module.exports = router;
