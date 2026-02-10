const db = require('../config/database');
const { logAudit } = require('../utils/helpers');

exports.getAll = (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM system_settings ORDER BY setting_name').all();
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.update = (req, res) => {
    try {
        const { name } = req.params;
        const { value } = req.body;

        const setting = db.prepare('SELECT * FROM system_settings WHERE setting_name = ?').get(name);
        if (!setting) {
            return res.status(404).json({ success: false, message: 'Setting not found.' });
        }

        db.prepare(`
      UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE setting_name = ?
    `).run(value, req.user.id, name);

        logAudit(req.user.id, 'update', 'system_settings', setting.id, { value: setting.setting_value }, { value });

        res.json({ success: true, message: `Setting '${name}' updated.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
