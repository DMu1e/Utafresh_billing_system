const db = require('../config/database');
const { logAudit } = require('../utils/helpers');

exports.getAll = (req, res) => {
    try {
        const { tenant_id, month, year } = req.query;
        let query = `
      SELECT mr.*, t.name as tenant_name, t.meter_number, u.name as recorded_by_name
      FROM meter_readings mr
      JOIN tenants t ON mr.tenant_id = t.id
      LEFT JOIN users u ON mr.recorded_by = u.id
      WHERE 1=1
    `;
        const params = [];

        if (tenant_id) {
            query += ' AND mr.tenant_id = ?';
            params.push(tenant_id);
        }
        if (month && year) {
            query += ' AND strftime("%m", mr.reading_date) = ? AND strftime("%Y", mr.reading_date) = ?';
            params.push(String(month).padStart(2, '0'), String(year));
        }
        query += ' ORDER BY mr.reading_date DESC, t.name ASC';

        const readings = db.prepare(query).all(...params);
        res.json({ success: true, data: readings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getByTenant = (req, res) => {
    try {
        const readings = db.prepare(`
      SELECT mr.*, u.name as recorded_by_name
      FROM meter_readings mr
      LEFT JOIN users u ON mr.recorded_by = u.id
      WHERE mr.tenant_id = ?
      ORDER BY mr.reading_date DESC
    `).all(req.params.tenantId);

        res.json({ success: true, data: readings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.create = (req, res) => {
    try {
        const { tenant_id, reading_value, reading_date, notes } = req.body;

        // Verify tenant exists
        const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenant_id);
        if (!tenant) {
            return res.status(404).json({ success: false, message: 'Tenant not found.' });
        }

        // Get previous reading
        const prevReading = db.prepare(
            'SELECT * FROM meter_readings WHERE tenant_id = ? ORDER BY reading_date DESC LIMIT 1'
        ).get(tenant_id);

        // Validate: current reading must be >= previous reading
        if (prevReading && reading_value < prevReading.reading_value) {
            return res.status(400).json({
                success: false,
                message: `Current reading (${reading_value}) cannot be less than previous reading (${prevReading.reading_value}).`,
            });
        }

        // Warn if consumption is unusually high (>200% of average)
        let warning = null;
        if (prevReading) {
            const consumption = reading_value - prevReading.reading_value;
            const avgConsumption = db.prepare(`
        SELECT AVG(r2.reading_value - r1.reading_value) as avg_consumption
        FROM meter_readings r1
        JOIN meter_readings r2 ON r1.tenant_id = r2.tenant_id AND r2.id > r1.id
        WHERE r1.tenant_id = ?
      `).get(tenant_id);

            if (avgConsumption && avgConsumption.avg_consumption && consumption > avgConsumption.avg_consumption * 2) {
                warning = `Unusually high consumption: ${consumption} units (average: ${Math.round(avgConsumption.avg_consumption)} units)`;
            }
        }

        const result = db.prepare(`
      INSERT INTO meter_readings (tenant_id, reading_value, reading_date, recorded_by, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(tenant_id, reading_value, reading_date, req.user.id, notes || null);

        logAudit(req.user.id, 'create', 'meter_readings', result.lastInsertRowid, null, req.body);

        res.status(201).json({
            success: true,
            data: { id: result.lastInsertRowid },
            warning,
            message: 'Reading recorded successfully.',
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.update = (req, res) => {
    try {
        // Only admin can update readings
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only admin can edit readings.' });
        }

        const { id } = req.params;
        const reading = db.prepare('SELECT * FROM meter_readings WHERE id = ?').get(id);
        if (!reading) {
            return res.status(404).json({ success: false, message: 'Reading not found.' });
        }

        const { reading_value, reading_date, notes } = req.body;

        db.prepare(`
      UPDATE meter_readings SET reading_value = ?, reading_date = ?, notes = ? WHERE id = ?
    `).run(
            reading_value !== undefined ? reading_value : reading.reading_value,
            reading_date || reading.reading_date,
            notes !== undefined ? notes : reading.notes,
            id,
        );

        logAudit(req.user.id, 'update', 'meter_readings', id, reading, req.body);

        res.json({ success: true, message: 'Reading updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
