const cron = require('node-cron');
const db = require('../config/database');
const { getSettings } = require('./sms.service');

/**
 * Create an in-app notification for the water vendor
 */
function createNotification(title, message, type = 'info') {
    db.prepare(`
        INSERT INTO notifications (title, message, type)
        VALUES (?, ?, ?)
    `).run(title, message, type);
    console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${title}`);
}

/**
 * Auto-flag overdue bills and create disconnection flags
 * Runs daily at 6:00 AM
 */
function flagOverdueBills() {
    console.log('[CRON] Checking for overdue bills...');
    const today = new Date().toISOString().split('T')[0];

    const overdueBills = db.prepare(`
        UPDATE bills SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
        WHERE status IN ('unpaid', 'partial')
        AND due_date < ?
    `).run(today);

    const settings = getSettings();
    const disconnectionDays = parseInt(settings.disconnection_days || 8);

    const flagDate = new Date();
    flagDate.setDate(flagDate.getDate() - disconnectionDays);
    const flagDateStr = flagDate.toISOString().split('T')[0];

    const billsToFlag = db.prepare(`
        SELECT b.*, t.name as tenant_name
        FROM bills b
        JOIN tenants t ON b.tenant_id = t.id
        WHERE b.status = 'overdue'
        AND b.due_date <= ?
        AND b.id NOT IN (SELECT bill_id FROM disconnection_flags)
    `).all(flagDateStr);

    const insertFlag = db.prepare(`
        INSERT INTO disconnection_flags (tenant_id, bill_id, flagged_date, days_overdue)
        VALUES (?, ?, ?, ?)
    `);

    const flaggedNames = [];
    for (const bill of billsToFlag) {
        const daysOverdue = Math.ceil((new Date() - new Date(bill.due_date)) / (1000 * 60 * 60 * 24));
        insertFlag.run(bill.tenant_id, bill.id, today, daysOverdue);
        flaggedNames.push(`${bill.tenant_name} (${daysOverdue} days)`);
    }

    // Notify vendor in-app
    if (overdueBills.changes > 0 || billsToFlag.length > 0) {
        let msg = '';
        if (overdueBills.changes > 0) {
            msg += `${overdueBills.changes} bill(s) marked as overdue. `;
        }
        if (billsToFlag.length > 0) {
            msg += `${billsToFlag.length} tenant(s) flagged for disconnection: ${flaggedNames.join(', ')}.`;
        }
        createNotification('Overdue Bills Update', msg, 'warning');
    }

    console.log(`[CRON] Marked ${overdueBills.changes} overdue, flagged ${billsToFlag.length} for disconnection`);
    return { overdueMarked: overdueBills.changes, disconnectionsFlagged: billsToFlag.length };
}

/**
 * Check for unpaid bills and notify vendor
 * Runs on 2nd of month at 8:00 AM
 */
function checkUnpaidBills() {
    console.log('[CRON] Checking for unpaid bills...');

    const unpaidBills = db.prepare(`
        SELECT b.*, t.name as tenant_name
        FROM bills b
        JOIN tenants t ON b.tenant_id = t.id
        WHERE b.status IN ('unpaid', 'partial')
        AND t.status = 'active'
        ORDER BY b.due_date ASC
    `).all();

    if (unpaidBills.length > 0) {
        const uniqueNames = [...new Set(unpaidBills.map(b => b.tenant_name))];
        const totalOwed = unpaidBills.reduce((sum, b) => sum + b.total_amount, 0);

        createNotification(
            'Payment Reminders Due',
            `${uniqueNames.length} tenant(s) have unpaid bills totalling KES ${totalOwed.toLocaleString()}. Consider sending bill SMS to: ${uniqueNames.slice(0, 10).join(', ')}${uniqueNames.length > 10 ? ` and ${uniqueNames.length - 10} more` : ''}.`,
            'warning'
        );
    }

    return { unpaidCount: unpaidBills.length };
}

/**
 * Check for bills approaching due date
 * Runs on 3rd of month at 8:00 AM
 */
function checkUpcomingDueDates() {
    console.log('[CRON] Checking upcoming due dates...');

    const upcomingBills = db.prepare(`
        SELECT b.*, t.name as tenant_name
        FROM bills b
        JOIN tenants t ON b.tenant_id = t.id
        WHERE b.status IN ('unpaid', 'partial')
        AND t.status = 'active'
        AND b.due_date >= date('now')
        AND b.due_date <= date('now', '+5 days')
    `).all();

    if (upcomingBills.length > 0) {
        const names = [...new Set(upcomingBills.map(b => b.tenant_name))];
        createNotification(
            'Due Dates Approaching',
            `${names.length} tenant(s) have bills due within 5 days: ${names.slice(0, 10).join(', ')}${names.length > 10 ? ` and ${names.length - 10} more` : ''}. Consider sending reminders.`,
            'info'
        );
    }

    return { upcomingCount: upcomingBills.length };
}

/**
 * Remind vendor to collect meter readings
 * Runs on 25th of month at 8:00 AM
 */
function remindMeterReadings() {
    console.log('[CRON] Meter reading reminder...');

    const activeTenants = db.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'active'").get().count;

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());

    const readingsThisMonth = db.prepare(`
        SELECT COUNT(DISTINCT tenant_id) as count FROM meter_readings
        WHERE strftime('%m', reading_date) = ? AND strftime('%Y', reading_date) = ?
    `).get(month, year);

    const remaining = activeTenants - (readingsThisMonth?.count || 0);

    createNotification(
        'Meter Reading Reminder',
        `Time to collect meter readings! ${readingsThisMonth?.count || 0} of ${activeTenants} tenants have readings this month. ${remaining > 0 ? `${remaining} reading(s) still needed.` : 'All readings collected!'}`,
        remaining > 0 ? 'warning' : 'success'
    );

    return { total: activeTenants, collected: readingsThisMonth?.count || 0, remaining };
}

/**
 * Monthly summary notification
 * Runs on 1st of month at 9:00 AM
 */
function monthlySummary() {
    console.log('[CRON] Generating monthly summary...');

    const now = new Date();
    let prevMonth = now.getMonth(); // 0-indexed = previous month
    let prevYear = now.getFullYear();
    if (prevMonth === 0) { prevMonth = 12; prevYear--; }

    const stats = db.prepare(`
        SELECT
            COUNT(*) as total_bills,
            COALESCE(SUM(total_amount), 0) as total_billed,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
            COUNT(CASE WHEN status IN ('unpaid', 'partial', 'overdue') THEN 1 END) as unpaid_count
        FROM bills
        WHERE billing_month = ? AND billing_year = ?
    `).get(prevMonth, prevYear);

    const collected = db.prepare(`
        SELECT COALESCE(SUM(p.amount), 0) as total
        FROM payments p
        JOIN bills b ON p.bill_id = b.id
        WHERE b.billing_month = ? AND b.billing_year = ?
    `).get(prevMonth, prevYear);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const rate = stats.total_billed > 0 ? Math.round((collected.total / stats.total_billed) * 100) : 0;

    createNotification(
        `${monthNames[prevMonth - 1]} ${prevYear} Summary`,
        `Bills: ${stats.total_bills} | Billed: KES ${stats.total_billed.toLocaleString()} | Collected: KES ${collected.total.toLocaleString()} (${rate}%) | Paid: ${stats.paid_count} | Unpaid: ${stats.unpaid_count}`,
        rate >= 80 ? 'success' : 'warning'
    );

    return stats;
}

/**
 * Initialize all cron jobs
 */
function initCronJobs() {
    console.log('[CRON] Initializing scheduled tasks...');

    // Daily at 6:00 AM — Flag overdue bills & create disconnection flags
    cron.schedule('0 6 * * *', () => {
        flagOverdueBills();
    }, { timezone: 'Africa/Nairobi' });

    // 1st of month at 9:00 AM — Monthly summary
    cron.schedule('0 9 1 * *', () => {
        monthlySummary();
    }, { timezone: 'Africa/Nairobi' });

    // 2nd of month at 8:00 AM — Check unpaid bills
    cron.schedule('0 8 2 * *', () => {
        checkUnpaidBills();
    }, { timezone: 'Africa/Nairobi' });

    // 3rd of month at 8:00 AM — Upcoming due dates
    cron.schedule('0 8 3 * *', () => {
        checkUpcomingDueDates();
    }, { timezone: 'Africa/Nairobi' });

    // 25th of month at 8:00 AM — Meter reading reminder
    cron.schedule('0 8 25 * *', () => {
        remindMeterReadings();
    }, { timezone: 'Africa/Nairobi' });

    console.log('[CRON] Scheduled tasks (in-app notifications):');
    console.log('  - Daily 6:00 AM:  Flag overdue bills & disconnections');
    console.log('  - 1st 9:00 AM:   Monthly summary');
    console.log('  - 2nd 8:00 AM:   Check unpaid bills');
    console.log('  - 3rd 8:00 AM:   Upcoming due dates reminder');
    console.log('  - 25th 8:00 AM:  Meter reading reminder');
}

module.exports = {
    initCronJobs,
    flagOverdueBills,
    checkUnpaidBills,
    checkUpcomingDueDates,
    remindMeterReadings,
    monthlySummary,
    createNotification,
};
