const router = require('express').Router();
const notificationsController = require('../controllers/notifications.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('admin'));

// Get all notifications
router.get('/', notificationsController.getAll);

// Mark a single notification as read
router.put('/:id/read', notificationsController.markRead);

// Mark all notifications as read
router.put('/read-all', notificationsController.markAllRead);

// Delete old notifications (30+ days)
router.delete('/cleanup', notificationsController.deleteOld);

module.exports = router;
