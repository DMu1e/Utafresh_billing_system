const db = require('../config/database');

function logAudit(userId, action, tableName, recordId, oldValue = null, newValue = null) {
    try {
        db.prepare(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, action, tableName, recordId,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null
        );
    } catch (err) {
        console.error('Audit log error:', err.message);
    }
}

module.exports = { logAudit };
