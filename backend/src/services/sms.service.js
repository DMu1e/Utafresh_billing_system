const AfricasTalking = require('africastalking');
const db = require('../config/database');

// Initialize Africa's Talking
const credentials = {
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
};

let sms;
try {
    const at = AfricasTalking(credentials);
    sms = at.SMS;
} catch (err) {
    console.warn('Africa\'s Talking SMS not configured:', err.message);
}

/**
 * Normalize a Kenyan phone number to +254XXXXXXXXX format
 * Accepts: 0712345678, 254712345678, +254712345678, 712345678
 */
function normalizePhone(phone) {
    if (!phone) return phone;
    let cleaned = phone.toString().replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+254')) return cleaned;
    if (cleaned.startsWith('254') && cleaned.length === 12) return '+' + cleaned;
    if (cleaned.startsWith('0') && cleaned.length === 10) return '+254' + cleaned.slice(1);
    if (cleaned.length === 9 && /^[17]/.test(cleaned)) return '+254' + cleaned;
    return cleaned; // Return as-is if unrecognized format
}

/**
 * Send an SMS and log it to the database
 */
async function sendSMS(phoneNumber, message, tenantId = null, messageType = 'general') {
    // Normalize phone number to +254 format
    const formattedPhone = normalizePhone(phoneNumber);

    // Log the SMS attempt
    const logEntry = db.prepare(`
        INSERT INTO sms_logs (tenant_id, message_type, message_content, delivery_status)
        VALUES (?, ?, ?, 'pending')
    `).run(tenantId, messageType, message);
    const logId = logEntry.lastInsertRowid;

    // If dry-run mode or SMS not configured, just log and return
    if (!sms || process.env.SMS_DRY_RUN === 'true') {
        console.log(`[SMS DRY RUN] To: ${formattedPhone} | Type: ${messageType}`);
        console.log(`  Message: ${message}`);
        db.prepare("UPDATE sms_logs SET delivery_status = 'sent', error_message = 'dry-run' WHERE id = ?").run(logId);
        return { success: true, dryRun: true, logId };
    }

    try {
        console.log(`[SMS SENDING] To: ${formattedPhone} (original: ${phoneNumber}) | Type: ${messageType} | Env: ${process.env.AT_ENV || 'not set'}`);

        const result = await sms.send({
            to: [formattedPhone],
            message,
            // from: 'UTAFRESH' // Only set this in production with a registered sender ID
        });

        // Log the full AT API response for debugging
        const recipients = result?.SMSMessageData?.Recipients || [];
        console.log(`[SMS RESULT] Recipients:`, JSON.stringify(recipients, null, 2));
        console.log(`[SMS RESULT] Full response:`, JSON.stringify(result?.SMSMessageData, null, 2));

        // Check if AT reported any actual failures
        const failedRecipients = recipients.filter(r => r.status !== 'Success' && r.statusCode !== 101);
        if (failedRecipients.length > 0) {
            const errMsg = failedRecipients.map(r => `${r.number}: ${r.status} (code ${r.statusCode})`).join('; ');
            db.prepare("UPDATE sms_logs SET delivery_status = 'failed', error_message = ? WHERE id = ?").run(errMsg, logId);
            console.warn(`[SMS PARTIAL FAIL] ${errMsg}`);
            return { success: false, error: errMsg, result, logId };
        }

        db.prepare("UPDATE sms_logs SET delivery_status = 'sent' WHERE id = ?").run(logId);
        console.log(`[SMS SENT] To: ${formattedPhone} | Type: ${messageType}`);
        return { success: true, result, logId };
    } catch (err) {
        db.prepare("UPDATE sms_logs SET delivery_status = 'failed', error_message = ? WHERE id = ?")
            .run(err.message, logId);
        console.error(`[SMS FAILED] To: ${formattedPhone} | Error: ${err.message}`);
        return { success: false, error: err.message, logId };
    }
}

/**
 * Send monthly bill notification to a tenant
 */
function buildBillMessage(bill, settings) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[bill.billing_month - 1];
    const readingDate = `${String(bill.billing_month).padStart(2, '0')}.${bill.billing_year}`;

    let dueMonth = bill.billing_month + 1;
    let dueYear = bill.billing_year;
    if (dueMonth > 12) { dueMonth = 1; dueYear++; }
    const dueDay = settings.due_date_day || '5';
    const dueMonthName = monthNames[dueMonth - 1];

    return `Hi. Your Water Meter reading for ${monthName} ${bill.billing_year}:\n` +
        `Previous reading - ${bill.previous_reading}\n` +
        `Reading as at ${readingDate} - ${bill.current_reading}\n` +
        `Units consumed ${bill.units_consumed} @ Kes ${bill.rate_per_unit}.\n` +
        `Bill Kes ${bill.total_amount.toLocaleString()}\n` +
        `Please pay by ${dueDay}th ${dueMonthName} ${dueYear} to PayBill no. ${settings.paybill_number} Account. ${settings.account_number}.\n` +
        `Thank you.`;
}

function buildReminderMessage(bill, settings) {
    let dueMonth = bill.billing_month + 1;
    let dueYear = bill.billing_year;
    if (dueMonth > 12) { dueMonth = 1; dueYear++; }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dueDay = settings.due_date_day || '5';
    const dueMonthName = monthNames[dueMonth - 1];

    return `Reminder: Your water bill of Kes ${bill.total_amount.toLocaleString()} is due on ${dueDay}th ${dueMonthName} ${dueYear}. PayBill ${settings.paybill_number}, Account ${settings.account_number}. Thank you.`;
}

function buildOverdueMessage(bill, settings) {
    let dueMonth = bill.billing_month + 1;
    let dueYear = bill.billing_year;
    if (dueMonth > 12) { dueMonth = 1; dueYear++; }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dueDay = settings.due_date_day || '5';
    const dueMonthName = monthNames[dueMonth - 1];

    return `Your water bill of Kes ${bill.total_amount.toLocaleString()} was due on ${dueDay}th ${dueMonthName} ${dueYear} and is now OVERDUE. Please pay immediately to PayBill ${settings.paybill_number}, Account ${settings.account_number} to avoid disconnection.`;
}

function buildDisconnectionWarning(bill, settings) {
    return `URGENT: Your water account is 8 days overdue (Kes ${bill.total_amount.toLocaleString()}). You have been flagged for disconnection. Pay NOW to PayBill ${settings.paybill_number}, Account ${settings.account_number}.`;
}

function buildPaymentConfirmation(amount, date) {
    return `Payment of Kes ${amount.toLocaleString()} received on ${date}. Thank you for your payment. Your account is up to date.`;
}

function buildReadingReminder() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `Reminder: Monthly meter readings are due by month-end. Please complete all assigned readings by ${lastDay}th.`;
}

/**
 * Get system settings as a key-value object
 */
function getSettings() {
    const rows = db.prepare('SELECT setting_name, setting_value FROM system_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.setting_name] = r.setting_value; });
    return settings;
}

module.exports = {
    sendSMS,
    normalizePhone,
    buildBillMessage,
    buildReminderMessage,
    buildOverdueMessage,
    buildDisconnectionWarning,
    buildPaymentConfirmation,
    buildReadingReminder,
    getSettings,
};
