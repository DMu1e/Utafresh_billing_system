const db = require('../config/database');

exports.dashboard = (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Total active tenants
        const { tenant_count } = db.prepare("SELECT COUNT(*) as tenant_count FROM tenants WHERE status = 'active'").get();

        // Current month billing summary
        const billingSummary = db.prepare(`
      SELECT
        COUNT(*) as total_bills,
        COALESCE(SUM(total_amount), 0) as total_expected,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
      FROM bills
      WHERE billing_month = ? AND billing_year = ?
    `).get(currentMonth, currentYear);

        // Total collected this month
        const { total_collected } = db.prepare(`
      SELECT COALESCE(SUM(p.amount), 0) as total_collected
      FROM payments p
      JOIN bills b ON p.bill_id = b.id
      WHERE b.billing_month = ? AND b.billing_year = ?
    `).get(currentMonth, currentYear);

        // Disconnection flags
        const { disconnection_count } = db.prepare(
            "SELECT COUNT(*) as disconnection_count FROM disconnection_flags WHERE status = 'flagged'"
        ).get();

        // Recent payments (last 5)
        const recentPayments = db.prepare(`
      SELECT p.*, t.name as tenant_name, b.billing_month, b.billing_year
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN bills b ON p.bill_id = b.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `).all();

        // Properties summary
        const properties = db.prepare(`
      SELECT property_name, COUNT(*) as tenant_count
      FROM tenants
      WHERE status = 'active' AND property_name IS NOT NULL
      GROUP BY property_name
    `).all();

        res.json({
            success: true,
            data: {
                tenantCount: tenant_count,
                billing: {
                    ...billingSummary,
                    total_collected,
                    collection_rate: billingSummary.total_expected > 0
                        ? Math.round((total_collected / billingSummary.total_expected) * 100)
                        : 0,
                },
                disconnectionCount: disconnection_count,
                recentPayments,
                properties,
                currentMonth,
                currentYear,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.revenue = (req, res) => {
    try {
        const { year } = req.query;
        const targetYear = year || new Date().getFullYear();

        const monthlyRevenue = db.prepare(`
      SELECT
        b.billing_month as month,
        COALESCE(SUM(b.total_amount), 0) as expected,
        COALESCE(SUM(CASE WHEN b.status = 'paid' THEN b.total_amount ELSE 0 END), 0) as collected_full,
        (SELECT COALESCE(SUM(p.amount), 0)
         FROM payments p
         JOIN bills b2 ON p.bill_id = b2.id
         WHERE b2.billing_month = b.billing_month AND b2.billing_year = b.billing_year
        ) as total_collected
      FROM bills b
      WHERE b.billing_year = ?
      GROUP BY b.billing_month
      ORDER BY b.billing_month
    `).all(targetYear);

        res.json({ success: true, data: monthlyRevenue });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.disconnections = (req, res) => {
    try {
        const disconnections = db.prepare(`
      SELECT df.*, t.name as tenant_name, t.phone_number, t.meter_number, t.unit_number, t.property_name,
             b.total_amount, b.billing_month, b.billing_year
      FROM disconnection_flags df
      JOIN tenants t ON df.tenant_id = t.id
      JOIN bills b ON df.bill_id = b.id
      WHERE df.status = 'flagged'
      ORDER BY df.days_overdue DESC
    `).all();

        res.json({ success: true, data: disconnections });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
