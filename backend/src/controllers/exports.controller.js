const ExcelJS = require('exceljs');
const db = require('../config/database');

/**
 * Export billing report to Excel
 */
exports.exportBills = async (req, res) => {
    try {
        const { month, year, status } = req.query;
        let query = `
            SELECT b.*, t.name as tenant_name, t.meter_number, t.unit_number,
                   t.property_name, t.phone_number
            FROM bills b
            JOIN tenants t ON b.tenant_id = t.id
            WHERE 1=1
        `;
        const params = [];
        if (month) { query += ' AND b.billing_month = ?'; params.push(month); }
        if (year) { query += ' AND b.billing_year = ?'; params.push(year); }
        if (status) { query += ' AND b.status = ?'; params.push(status); }
        query += ' ORDER BY t.name ASC';

        const bills = db.prepare(query).all(...params);
        const getPayments = db.prepare('SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?');

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Utafresh Billing System';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Billing Report');

        // Title row
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const title = month && year ? `Billing Report — ${monthNames[month - 1]} ${year}` : 'Billing Report';
        sheet.mergeCells('A1:K1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = title;
        titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } };
        titleCell.alignment = { horizontal: 'center' };

        sheet.addRow([]);

        // Headers
        const headerRow = sheet.addRow([
            'Tenant', 'Property', 'Unit', 'Meter', 'Prev Reading', 'Current Reading',
            'Units Consumed', 'Rate (KES)', 'Bill Amount (KES)', 'Paid (KES)', 'Balance (KES)', 'Status', 'Due Date'
        ]);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            cell.alignment = { horizontal: 'center' };
            cell.border = { bottom: { style: 'thin' } };
        });

        // Data rows
        let totalExpected = 0, totalCollected = 0;
        for (const bill of bills) {
            const { total_paid } = getPayments.get(bill.id);
            const balance = bill.total_amount - total_paid;
            totalExpected += bill.total_amount;
            totalCollected += total_paid;

            const row = sheet.addRow([
                bill.tenant_name, bill.property_name || '', bill.unit_number, bill.meter_number,
                bill.previous_reading, bill.current_reading, bill.units_consumed,
                bill.rate_per_unit, bill.total_amount, total_paid, balance,
                bill.status.toUpperCase(), bill.due_date,
            ]);

            // Color-code status
            const statusCell = row.getCell(12);
            const statusColors = { PAID: 'FF059669', PARTIAL: 'FFD97706', UNPAID: 'FF6B7280', OVERDUE: 'FFDC2626' };
            statusCell.font = { bold: true, color: { argb: statusColors[bill.status.toUpperCase()] || 'FF000000' } };
        }

        // Summary row
        sheet.addRow([]);
        const summaryRow = sheet.addRow([
            'TOTAL', '', '', '', '', '', '', '', totalExpected, totalCollected, totalExpected - totalCollected, '', ''
        ]);
        summaryRow.eachCell((cell) => { cell.font = { bold: true }; });

        // Column widths
        sheet.columns.forEach((col, i) => {
            const widths = [22, 18, 10, 14, 14, 14, 14, 12, 16, 14, 14, 12, 14];
            col.width = widths[i] || 14;
        });

        // Format currency columns
        [9, 10, 11].forEach(colNum => {
            sheet.getColumn(colNum).numFmt = '#,##0.00';
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=billing_report_${month || 'all'}_${year || 'all'}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Export payments report to Excel
 */
exports.exportPayments = async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = `
            SELECT p.*, t.name as tenant_name, t.meter_number, t.phone_number,
                   b.billing_month, b.billing_year, b.total_amount as bill_amount,
                   u.name as recorded_by_name
            FROM payments p
            JOIN tenants t ON p.tenant_id = t.id
            JOIN bills b ON p.bill_id = b.id
            LEFT JOIN users u ON p.recorded_by = u.id
            WHERE 1=1
        `;
        const params = [];
        if (month && year) {
            query += ' AND b.billing_month = ? AND b.billing_year = ?';
            params.push(month, year);
        }
        query += ' ORDER BY p.payment_date DESC';

        const payments = db.prepare(query).all(...params);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Utafresh Billing System';
        const sheet = workbook.addWorksheet('Payments Report');

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const title = month && year ? `Payments Report — ${monthNames[month - 1]} ${year}` : 'Payments Report';
        sheet.mergeCells('A1:H1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = title;
        titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } };
        titleCell.alignment = { horizontal: 'center' };

        sheet.addRow([]);

        const headerRow = sheet.addRow([
            'Tenant', 'Bill Period', 'Bill Amount (KES)', 'Payment Amount (KES)',
            'Payment Date', 'Method', 'Reference', 'Recorded By'
        ]);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
            cell.alignment = { horizontal: 'center' };
        });

        let totalAmount = 0;
        for (const p of payments) {
            totalAmount += p.amount;
            sheet.addRow([
                p.tenant_name,
                `${monthNames[p.billing_month - 1]} ${p.billing_year}`,
                p.bill_amount,
                p.amount,
                p.payment_date,
                p.payment_method === 'mpesa' ? 'M-Pesa' : 'Bank Transfer',
                p.reference_number || '',
                p.recorded_by_name || '',
            ]);
        }

        sheet.addRow([]);
        const summaryRow = sheet.addRow(['TOTAL', '', '', totalAmount, '', '', '', '']);
        summaryRow.eachCell((cell) => { cell.font = { bold: true }; });

        sheet.columns.forEach((col, i) => {
            const widths = [22, 18, 18, 18, 14, 14, 18, 18];
            col.width = widths[i] || 14;
        });

        [3, 4].forEach(colNum => {
            sheet.getColumn(colNum).numFmt = '#,##0.00';
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=payments_report_${month || 'all'}_${year || 'all'}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Export tenant list to Excel
 */
exports.exportTenants = async (req, res) => {
    try {
        const tenants = db.prepare(`
            SELECT t.*,
                   (SELECT reading_value FROM meter_readings WHERE tenant_id = t.id ORDER BY reading_date DESC LIMIT 1) as latest_reading,
                   (SELECT COALESCE(SUM(b.total_amount), 0) FROM bills b WHERE b.tenant_id = t.id AND b.status IN ('unpaid', 'partial', 'overdue')) as outstanding_balance
            FROM tenants t
            ORDER BY t.name
        `).all();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Utafresh Billing System';
        const sheet = workbook.addWorksheet('Tenants');

        sheet.mergeCells('A1:I1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'Tenant List';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } };
        titleCell.alignment = { horizontal: 'center' };

        sheet.addRow([]);

        const headerRow = sheet.addRow([
            'Name', 'Phone', 'Meter No.', 'Unit', 'Property', 'Move-in Date',
            'Deposit (KES)', 'Deposit Paid', 'Latest Reading', 'Outstanding (KES)', 'Status'
        ]);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
            cell.alignment = { horizontal: 'center' };
        });

        for (const t of tenants) {
            const row = sheet.addRow([
                t.name, t.phone_number, t.meter_number, t.unit_number,
                t.property_name || '', t.move_in_date,
                t.deposit_amount, t.deposit_paid ? 'Yes' : 'No',
                t.latest_reading ?? '', t.outstanding_balance || 0,
                t.status.toUpperCase(),
            ]);

            const statusCell = row.getCell(11);
            statusCell.font = {
                bold: true,
                color: { argb: t.status === 'active' ? 'FF059669' : 'FF6B7280' },
            };
        }

        sheet.columns.forEach((col, i) => {
            const widths = [22, 16, 14, 10, 18, 14, 14, 12, 14, 16, 10];
            col.width = widths[i] || 14;
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=tenants.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Export disconnection list to Excel
 */
exports.exportDisconnections = async (req, res) => {
    try {
        const disconnections = db.prepare(`
            SELECT df.*, t.name as tenant_name, t.phone_number, t.meter_number,
                   t.unit_number, t.property_name,
                   b.total_amount, b.billing_month, b.billing_year
            FROM disconnection_flags df
            JOIN tenants t ON df.tenant_id = t.id
            JOIN bills b ON df.bill_id = b.id
            WHERE df.status = 'flagged'
            ORDER BY df.days_overdue DESC
        `).all();

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Utafresh Billing System';
        const sheet = workbook.addWorksheet('Disconnection List');

        sheet.mergeCells('A1:H1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'Disconnection Flag Report';
        titleCell.font = { size: 16, bold: true, color: { argb: 'FFDC2626' } };
        titleCell.alignment = { horizontal: 'center' };

        sheet.addRow([]);

        const headerRow = sheet.addRow([
            'Tenant', 'Phone', 'Meter', 'Unit', 'Property',
            'Amount Owed (KES)', 'Days Overdue', 'Flagged Date'
        ]);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
            cell.alignment = { horizontal: 'center' };
        });

        for (const d of disconnections) {
            sheet.addRow([
                d.tenant_name, d.phone_number, d.meter_number, d.unit_number,
                d.property_name || '', d.total_amount, d.days_overdue, d.flagged_date,
            ]);
        }

        sheet.columns.forEach((col, i) => {
            const widths = [22, 16, 14, 10, 18, 18, 14, 14];
            col.width = widths[i] || 14;
        });

        sheet.getColumn(6).numFmt = '#,##0.00';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=disconnections.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
