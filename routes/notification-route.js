const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead, deleteAllNotifications } = require('../controller/notification-controller');
const { authMiddleware } = require('../middleware/auth-middleware');

router.get('/', authMiddleware, getMyNotifications);
router.put('/:id/read', authMiddleware, markAsRead);
router.delete('/', authMiddleware, deleteAllNotifications);

module.exports = router;
