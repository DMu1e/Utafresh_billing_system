const db = require('../config/database');
const { sendSMS, buildPaymentConfirmation, getSettings } = require('../services/sms.service');

exports.sendManual = async (req, res) => {
    try {
        const { phone_number, message, tenant_id } = req.body;

        if (!phone_number || !message) {
            return res.status(400).json({ success: false, message: 'Phone number and message are required.' });
        }

        const result = await sendSMS(phone_number, message, tenant_id || null, 'manual');
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getLogs = (req, res) => {
    try {
        const { tenant_id, type, status, limit } = req.query;
        let query = `
            SELECT sl.*, t.name as tenant_name, t.phone_number
            FROM sms_logs sl
            LEFT JOIN tenants t ON sl.tenant_id = t.id
            WHERE 1=1
        `;
        const params = [];

        if (tenant_id) { query += ' AND sl.tenant_id = ?'; params.push(tenant_id); }
        if (type) { query += ' AND sl.message_type = ?'; params.push(type); }
        if (status) { query += ' AND sl.delivery_status = ?'; params.push(status); }
        query += ' ORDER BY sl.sent_at DESC';
        if (limit) { query += ' LIMIT ?'; params.push(parseInt(limit)); }
        else { query += ' LIMIT 100'; }

        const logs = db.prepare(query).all(...params);
        res.json({ success: true, data: logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendPaymentConfirmation = async (tenantId, amount, paymentDate) => {
    try {
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
        if (!tenant || !tenant.phone_number) return;

        const message = buildPaymentConfirmation(amount, paymentDate);
        await sendSMS(tenant.phone_number, message, tenantId, 'confirmation');
    } catch (err) {
        console.error('Failed to send payment confirmation SMS:', err.message);
    }
};
