const db = require('../config/database');
const { logAudit } = require('../utils/helpers');

exports.getAll = (req, res) => {
    try {
        const { status, property_name, search } = req.query;
        let query = 'SELECT * FROM tenants WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (property_name) {
            query += ' AND property_name = ?';
            params.push(property_name);
        }
        if (search) {
            query += ' AND (name LIKE ? OR meter_number LIKE ? OR unit_number LIKE ?)';
            const s = `%${search}%`;
            params.push(s, s, s);
        }
        query += ' ORDER BY name ASC';

        const tenants = db.prepare(query).all(...params);
        res.json({ success: true, data: tenants });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getById = (req, res) => {
    try {
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found.' });
        }

        // Get latest reading
        const latestReading = db.prepare(
            'SELECT * FROM meter_readings WHERE tenant_id = ? ORDER BY reading_date DESC LIMIT 1'
        ).get(req.params.id);

        // Get outstanding bills
        const outstandingBills = db.prepare(
            "SELECT * FROM bills WHERE tenant_id = ? AND status IN ('unpaid', 'partial', 'overdue') ORDER BY billing_year DESC, billing_month DESC"
        ).get(req.params.id);

        res.json({
            success: true,
            data: { ...tenant, latestReading, outstandingBills },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.create = (req, res) => {
    try {
        const { name, phone_number, meter_number, unit_number, property_name, move_in_date, deposit_amount, deposit_paid, initial_reading } = req.body;

        const existing = db.prepare('SELECT id FROM tenants WHERE meter_number = ?').get(meter_number);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Meter number already assigned.' });
        }

        const result = db.prepare(`
      INSERT INTO tenants (name, phone_number, meter_number, unit_number, property_name, move_in_date, deposit_amount, deposit_paid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, phone_number, meter_number, unit_number, property_name || null, move_in_date, deposit_amount || 0, deposit_paid ? 1 : 0);

        logAudit(req.user.id, 'create', 'tenants', result.lastInsertRowid, null, req.body);

        // Record initial meter reading
        const readingValue = parseInt(initial_reading) || 0;
        db.prepare(`
      INSERT INTO meter_readings (tenant_id, reading_value, reading_date, recorded_by, notes)
      VALUES (?, ?, ?, ?, 'Initial reading at move-in')
    `).run(result.lastInsertRowid, readingValue, move_in_date, req.user.id);

        res.status(201).json({
            success: true,
            data: { id: result.lastInsertRowid },
            message: 'Tenant created successfully.',
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.update = (req, res) => {
    try {
        const { id } = req.params;
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found.' });
        }

        const { name, phone_number, meter_number, unit_number, property_name, deposit_amount, deposit_paid, status } = req.body;

        // If changing meter number, check uniqueness
        if (meter_number && meter_number !== tenant.meter_number) {
            const existing = db.prepare('SELECT id FROM tenants WHERE meter_number = ? AND id != ?').get(meter_number, id);
            if (existing) {
                return res.status(400).json({ success: false, message: 'Meter number already assigned.' });
            }
        }

        db.prepare(`
      UPDATE tenants SET
        name = ?, phone_number = ?, meter_number = ?, unit_number = ?,
        property_name = ?, deposit_amount = ?, deposit_paid = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
            name || tenant.name,
            phone_number || tenant.phone_number,
            meter_number || tenant.meter_number,
            unit_number || tenant.unit_number,
            property_name !== undefined ? property_name : tenant.property_name,
            deposit_amount !== undefined ? deposit_amount : tenant.deposit_amount,
            deposit_paid !== undefined ? (deposit_paid ? 1 : 0) : tenant.deposit_paid,
            status || tenant.status,
            id,
        );

        logAudit(req.user.id, 'update', 'tenants', id, tenant, req.body);

        res.json({ success: true, message: 'Tenant updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.remove = (req, res) => {
    try {
        const { id } = req.params;
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found.' });
        }

        // Soft delete: deactivate instead of deleting
        db.prepare("UPDATE tenants SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        logAudit(req.user.id, 'delete', 'tenants', id, tenant, { status: 'inactive' });

        res.json({ success: true, message: 'Tenant deactivated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.permanentDelete = (req, res) => {
    try {
        const { id } = req.params;
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found.' });
        }

        // Delete all related records in order (foreign key constraints)
        const deleteTransaction = db.transaction(() => {
            // Delete payments linked to this tenant's bills
            db.prepare('DELETE FROM payments WHERE tenant_id = ?').run(id);
            // Delete bills
            db.prepare('DELETE FROM bills WHERE tenant_id = ?').run(id);
            // Delete meter readings
            db.prepare('DELETE FROM meter_readings WHERE tenant_id = ?').run(id);
            // Delete disconnection flags
            db.prepare('DELETE FROM disconnection_flags WHERE tenant_id = ?').run(id);
            // Delete SMS logs
            db.prepare('DELETE FROM sms_logs WHERE tenant_id = ?').run(id);
            // Delete the tenant
            db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
        });

        deleteTransaction();
        logAudit(req.user.id, 'permanent_delete', 'tenants', id, tenant, null);

        res.json({ success: true, message: `Tenant "${tenant.name}" and all related records permanently deleted.` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getProperties = (req, res) => {
    try {
        const properties = db.prepare(
            "SELECT DISTINCT property_name FROM tenants WHERE property_name IS NOT NULL AND property_name != '' ORDER BY property_name"
        ).all();
        res.json({ success: true, data: properties.map(p => p.property_name) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
