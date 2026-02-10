const db = require('../config/database');
const { logAudit } = require('../utils/helpers');

exports.getAll = (req, res) => {
    try {
        const { tenant_id, bill_id, method } = req.query;
        let query = `
      SELECT p.*, t.name as tenant_name, t.meter_number, u.name as recorded_by_name,
             b.billing_month, b.billing_year, b.total_amount as bill_amount
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN bills b ON p.bill_id = b.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE 1=1
    `;
        const params = [];

        if (tenant_id) {
            query += ' AND p.tenant_id = ?';
            params.push(tenant_id);
        }
        if (bill_id) {
            query += ' AND p.bill_id = ?';
            params.push(bill_id);
        }
        if (method) {
            query += ' AND p.payment_method = ?';
            params.push(method);
        }
        query += ' ORDER BY p.payment_date DESC';

        const payments = db.prepare(query).all(...params);
        res.json({ success: true, data: payments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.create = (req, res) => {
    try {
        const { bill_id, tenant_id, amount, payment_date, payment_method, reference_number } = req.body;

        // Verify bill exists
        const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(bill_id);
        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found.' });
        }

        // Calculate current total paid for this bill
        const { total_paid } = db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?'
        ).get(bill_id);

        const remaining = bill.total_amount - total_paid;
        if (amount > remaining) {
            return res.status(400).json({
                success: false,
                message: `Payment amount (${amount}) exceeds remaining balance (${remaining}).`,
            });
        }

        const result = db.prepare(`
      INSERT INTO payments (bill_id, tenant_id, amount, payment_date, payment_method, reference_number, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(bill_id, tenant_id || bill.tenant_id, amount, payment_date, payment_method, reference_number || null, req.user.id);

        // Update bill status
        const newTotalPaid = total_paid + amount;
        let newStatus;
        if (newTotalPaid >= bill.total_amount) {
            newStatus = 'paid';
        } else if (newTotalPaid > 0) {
            newStatus = 'partial';
        } else {
            newStatus = bill.status;
        }

        db.prepare("UPDATE bills SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(newStatus, bill_id);

        logAudit(req.user.id, 'create', 'payments', result.lastInsertRowid, null, req.body);

        // Send payment confirmation SMS (async, don't block response)
        try {
            const { sendPaymentConfirmation } = require('./sms.controller');
            sendPaymentConfirmation(tenant_id || bill.tenant_id, amount, payment_date);
        } catch (smsErr) {
            console.error('SMS confirmation error:', smsErr.message);
        }

        res.status(201).json({
            success: true,
            data: { id: result.lastInsertRowid, bill_status: newStatus },
            message: 'Payment recorded successfully.',
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getByTenant = (req, res) => {
    try {
        const payments = db.prepare(`
      SELECT p.*, b.billing_month, b.billing_year, b.total_amount as bill_amount
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      WHERE p.tenant_id = ?
      ORDER BY p.payment_date DESC
    `).all(req.params.tenantId);

        res.json({ success: true, data: payments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getSummary = (req, res) => {
    try {
        const { month, year } = req.query;
        let billFilter = '';
        const params = [];

        if (month && year) {
            billFilter = ' AND b.billing_month = ? AND b.billing_year = ?';
            params.push(month, year);
        }

        const summary = db.prepare(`
      SELECT
        COUNT(DISTINCT b.id) as total_bills,
        COALESCE(SUM(b.total_amount), 0) as total_expected,
        COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.total_amount ELSE 0 END), 0) as total_fully_paid,
        COUNT(CASE WHEN b.status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN b.status = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN b.status = 'unpaid' THEN 1 END) as unpaid_count,
        COUNT(CASE WHEN b.status = 'overdue' THEN 1 END) as overdue_count
      FROM bills b
      WHERE 1=1 ${billFilter}
    `).get(...params);

        const totalCollected = db.prepare(`
      SELECT COALESCE(SUM(p.amount), 0) as total_collected
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      WHERE 1=1 ${billFilter}
    `).get(...params);

        res.json({
            success: true,
            data: {
                ...summary,
                total_collected: totalCollected.total_collected,
                collection_rate: summary.total_expected > 0
                    ? Math.round((totalCollected.total_collected / summary.total_expected) * 100)
                    : 0,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
