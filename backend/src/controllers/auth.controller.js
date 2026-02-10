const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.login = (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (user.status !== 'active') {
            return res.status(401).json({ success: false, message: 'Account is deactivated.' });
        }

        const validPassword = bcrypt.compareSync(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.me = (req, res) => {
    res.json({ success: true, data: req.user });
};

exports.changePassword = (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

        if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        const hash = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);

        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createEmployee = (req, res) => {
    try {
        const { name, email, password, phone_number } = req.body;

        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone_number)
      VALUES (?, ?, ?, 'employee', ?)
    `).run(name, email, hash, phone_number || null);

        res.status(201).json({
            success: true,
            data: { id: result.lastInsertRowid, name, email, role: 'employee' },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getEmployees = (req, res) => {
    try {
        const employees = db.prepare(
            'SELECT id, name, email, phone_number, status, created_at, last_login FROM users WHERE role = ?'
        ).all('employee');

        res.json({ success: true, data: employees });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateEmployee = (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone_number, status } = req.body;

        const employee = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(id, 'employee');
        if (!employee) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        db.prepare(`
      UPDATE users SET name = ?, email = ?, phone_number = ?, status = ? WHERE id = ?
    `).run(
            name || employee.name,
            email || employee.email,
            phone_number !== undefined ? phone_number : employee.phone_number,
            status || employee.status,
            id
        );

        res.json({ success: true, message: 'Employee updated.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
