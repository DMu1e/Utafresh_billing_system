const db = require('../config/database');
const { logAudit } = require('../utils/helpers');
const { sendSMS, buildBillMessage, getSettings } = require('../services/sms.service');

exports.generate = (req, res) => {
    try {
        const { month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and year are required.' });
        }

        const rateSetting = db.prepare("SELECT setting_value FROM system_settings WHERE setting_name = 'current_rate'").get();
        const rate = parseFloat(rateSetting?.setting_value || 155);

        const dueDaySetting = db.prepare("SELECT setting_value FROM system_settings WHERE setting_name = 'due_date_day'").get();
        const dueDay = parseInt(dueDaySetting?.setting_value || 5);

        // Calculate due date: the dueDay-th of the following month
        let dueMonth = parseInt(month) + 1;
        let dueYear = parseInt(year);
        if (dueMonth > 12) {
            dueMonth = 1;
            dueYear += 1;
        }
        const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

        // Get all active tenants
        const tenants = db.prepare("SELECT * FROM tenants WHERE status = 'active'").all();

        const results = { generated: 0, skipped: 0, errors: [] };

        const insertBill = db.prepare(`
      INSERT INTO bills (tenant_id, billing_month, billing_year, previous_reading, current_reading, units_consumed, rate_per_unit, total_amount, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const generateAll = db.transaction(() => {
            for (const tenant of tenants) {
                // Check if bill already exists for this tenant/month/year
                const existingBill = db.prepare(
                    'SELECT id FROM bills WHERE tenant_id = ? AND billing_month = ? AND billing_year = ?'
                ).get(tenant.id, month, year);

                if (existingBill) {
                    results.skipped++;
                    continue;
                }

                // Get the two most recent readings to calculate consumption
                const readings = db.prepare(
                    'SELECT * FROM meter_readings WHERE tenant_id = ? ORDER BY reading_date DESC LIMIT 2'
                ).all(tenant.id);

                if (readings.length < 2) {
                    results.errors.push(`${tenant.name}: Not enough readings to generate bill`);
                    continue;
                }

                const currentReading = readings[0].reading_value;
                const previousReading = readings[1].reading_value;
                const unitsConsumed = currentReading - previousReading;
                const totalAmount = unitsConsumed * rate;

                try {
                    insertBill.run(tenant.id, month, year, previousReading, currentReading, unitsConsumed, rate, totalAmount, dueDate);
                    results.generated++;
                } catch (err) {
                    results.errors.push(`${tenant.name}: ${err.message}`);
                }
            }
        });

        generateAll();

        res.json({
            success: true,
            data: results,
            message: `Bills generated: ${results.generated}, Skipped: ${results.skipped}`,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAll = (req, res) => {
    try {
        const { tenant_id, month, year, status } = req.query;
        let query = `
      SELECT b.*, t.name as tenant_name, t.meter_number, t.unit_number, t.property_name, t.phone_number
      FROM bills b
      JOIN tenants t ON b.tenant_id = t.id
      WHERE 1=1
    `;
        const params = [];

        if (tenant_id) {
            query += ' AND b.tenant_id = ?';
            params.push(tenant_id);
        }
        if (month) {
            query += ' AND b.billing_month = ?';
            params.push(month);
        }
        if (year) {
            query += ' AND b.billing_year = ?';
            params.push(year);
        }
        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }
        query += ' ORDER BY b.billing_year DESC, b.billing_month DESC, t.name ASC';

        const bills = db.prepare(query).all(...params);

        // For each bill, get total payments made
        const getPayments = db.prepare('SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?');
        const enrichedBills = bills.map(bill => {
            const { total_paid } = getPayments.get(bill.id);
            return { ...bill, total_paid, balance: bill.total_amount - total_paid };
        });

        res.json({ success: true, data: enrichedBills });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getById = (req, res) => {
    try {
        const bill = db.prepare(`
      SELECT b.*, t.name as tenant_name, t.meter_number, t.unit_number, t.property_name, t.phone_number
      FROM bills b
      JOIN tenants t ON b.tenant_id = t.id
      WHERE b.id = ?
    `).get(req.params.id);

        if (!bill) {
            return res.status(404).json({ success: false, message: 'Bill not found.' });
        }

        const payments = db.prepare(
            'SELECT * FROM payments WHERE bill_id = ? ORDER BY payment_date DESC'
        ).all(req.params.id);

        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

        res.json({
            success: true,
            data: { ...bill, payments, total_paid: totalPaid, balance: bill.total_amount - totalPaid },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getByTenant = (req, res) => {
    try {
        const bills = db.prepare(`
      SELECT b.* FROM bills b
      WHERE b.tenant_id = ?
      ORDER BY b.billing_year DESC, b.billing_month DESC
    `).all(req.params.tenantId);

        const getPayments = db.prepare('SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?');
        const enrichedBills = bills.map(bill => {
            const { total_paid } = getPayments.get(bill.id);
            return { ...bill, total_paid, balance: bill.total_amount - total_paid };
        });

        res.json({ success: true, data: enrichedBills });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.sendBillsSMS = async (req, res) => {
    try {
        const { month, year } = req.body;
        if (!month || !year) {
            return res.status(400).json({ success: false, message: 'Month and year are required.' });
        }

        const settings = getSettings();

        const bills = db.prepare(`
            SELECT b.*, t.name as tenant_name, t.phone_number
            FROM bills b
            JOIN tenants t ON b.tenant_id = t.id
            WHERE b.billing_month = ? AND b.billing_year = ?
            AND t.status = 'active'
            AND t.phone_number IS NOT NULL
        `).all(month, year);

        if (bills.length === 0) {
            return res.status(404).json({ success: false, message: 'No bills found for this period.' });
        }

        let sent = 0, failed = 0, errors = [];
        for (const bill of bills) {
            const message = buildBillMessage(bill, settings);
            const result = await sendSMS(bill.phone_number, message, bill.tenant_id, 'bill');
            if (result.success) {
                sent++;
            } else {
                failed++;
                errors.push(`${bill.tenant_name}: ${result.error}`);
            }
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        res.json({
            success: true,
            data: { sent, failed, total: bills.length, errors },
            message: `SMS sent to ${sent} of ${bills.length} tenants.${failed > 0 ? ` ${failed} failed.` : ''}`,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
