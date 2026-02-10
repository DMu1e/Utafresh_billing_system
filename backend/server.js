const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./src/routes/auth.routes');
const tenantRoutes = require('./src/routes/tenants.routes');
const readingRoutes = require('./src/routes/readings.routes');
const billRoutes = require('./src/routes/bills.routes');
const paymentRoutes = require('./src/routes/payments.routes');
const settingsRoutes = require('./src/routes/settings.routes');
const reportsRoutes = require('./src/routes/reports.routes');
const smsRoutes = require('./src/routes/sms.routes');
const exportsRoutes = require('./src/routes/exports.routes');
const notificationsRoutes = require('./src/routes/notifications.routes');
const { initCronJobs } = require('./src/services/scheduler.service');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded meter photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

app.listen(PORT, () => {
    console.log(`Utafresh Billing API running on port ${PORT}`);
    // Start cron jobs for automated billing tasks
    initCronJobs();
});

module.exports = app;
