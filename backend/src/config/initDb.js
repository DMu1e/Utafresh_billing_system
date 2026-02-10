const db = require('./database');
const bcrypt = require('bcryptjs');

function initializeDatabase() {
    console.log('Initializing database...');

    // Create tables
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
      phone_number TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      meter_number TEXT UNIQUE NOT NULL,
      unit_number TEXT NOT NULL,
      property_name TEXT,
      move_in_date DATE NOT NULL,
      deposit_amount DECIMAL(10,2) DEFAULT 0,
      deposit_paid BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      reading_value INTEGER NOT NULL,
      reading_date DATE NOT NULL,
      recorded_by INTEGER REFERENCES users(id),
      photo_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      billing_month INTEGER NOT NULL CHECK(billing_month BETWEEN 1 AND 12),
      billing_year INTEGER NOT NULL,
      previous_reading INTEGER NOT NULL,
      current_reading INTEGER NOT NULL,
      units_consumed INTEGER NOT NULL,
      rate_per_unit DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) NOT NULL,
      due_date DATE NOT NULL,
      status TEXT DEFAULT 'unpaid' CHECK(status IN ('paid', 'unpaid', 'partial', 'overdue')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, billing_month, billing_year)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL REFERENCES bills(id),
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      amount DECIMAL(10,2) NOT NULL,
      payment_date DATE NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('mpesa', 'bank')),
      reference_number TEXT,
      recorded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_name TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER REFERENCES tenants(id),
      message_type TEXT NOT NULL,
      message_content TEXT NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      delivery_status TEXT DEFAULT 'pending' CHECK(delivery_status IN ('pending', 'sent', 'failed')),
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      old_value TEXT,
      new_value TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS disconnection_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id),
      bill_id INTEGER NOT NULL REFERENCES bills(id),
      flagged_date DATE NOT NULL,
      days_overdue INTEGER NOT NULL,
      disconnection_date DATE,
      reconnection_date DATE,
      status TEXT DEFAULT 'flagged' CHECK(status IN ('flagged', 'disconnected', 'reconnected')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_meter_readings_tenant ON meter_readings(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_meter_readings_date ON meter_readings(reading_date);
    CREATE INDEX IF NOT EXISTS idx_bills_tenant ON bills(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
    CREATE INDEX IF NOT EXISTS idx_bills_month_year ON bills(billing_month, billing_year);
    CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
    CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
  `);

    // Create notifications table (for in-app cron notifications to vendor)
    db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK(type IN ('info', 'warning', 'success', 'error')),
      is_read BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
  `);

    // Seed default admin user
    const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@utafresh.com');
    if (!existingAdmin) {
        const passwordHash = bcrypt.hashSync('Admin@123', 10);
        db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone_number)
      VALUES (?, ?, ?, ?, ?)
    `).run('Water Vendor', 'admin@utafresh.com', passwordHash, 'admin', '+254700000000');
        console.log('Default admin user created: admin@utafresh.com / Admin@123');
    }

    // Seed default settings
    const defaultSettings = [
        { name: 'current_rate', value: '155', desc: 'Current water rate per unit (KES)' },
        { name: 'paybill_number', value: '522522', desc: 'M-Pesa PayBill number' },
        { name: 'account_number', value: '5556440', desc: 'M-Pesa account number' },
        { name: 'reading_reminder_day', value: '25', desc: 'Day of month to send reading reminders' },
        { name: 'disconnection_days', value: '8', desc: 'Days after due date to flag for disconnection' },
        { name: 'due_date_day', value: '5', desc: 'Day of month bills are due' },
    ];

    const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO system_settings (setting_name, setting_value, description)
    VALUES (?, ?, ?)
  `);

    for (const s of defaultSettings) {
        insertSetting.run(s.name, s.value, s.desc);
    }

    console.log('Database initialized successfully!');
}

initializeDatabase();
