const db = require('../config/database');

exports.getAll = (req, res) => {
    try {
        const { unread_only } = req.query;
        let query = 'SELECT * FROM notifications';
        if (unread_only === 'true') query += ' WHERE is_read = 0';
        query += ' ORDER BY created_at DESC LIMIT 50';

        const notifications = db.prepare(query).all();
        const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get().count;

        res.json({ success: true, data: { notifications, unreadCount } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markRead = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
        res.json({ success: true, message: 'Notification marked as read.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.markAllRead = (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
        res.json({ success: true, message: 'All notifications marked as read.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteOld = (req, res) => {
    try {
        const result = db.prepare("DELETE FROM notifications WHERE created_at < datetime('now', '-30 days')").run();
        res.json({ success: true, message: `Deleted ${result.changes} old notifications.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
