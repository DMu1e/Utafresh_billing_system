const router = require('express').Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', settingsController.getAll);
router.put('/:name', authorize('admin'), settingsController.update);

module.exports = router;
