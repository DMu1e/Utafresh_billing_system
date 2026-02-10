# Utafresh Automated Billing System

## Table of Contents
- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [User Roles & Access](#user-roles--access)
- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [SMS Notification System](#sms-notification-system)
- [Development Phases](#development-phases)
- [Cost Breakdown](#cost-breakdown)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [License](#license)

---

## Project Overview

Utafresh Automated Billing System is a web-based software solution designed to help a water distribution company automate their billing operations for neighborhood-scale water distribution. The system manages 40-100 tenants across multiple properties within a single geographic area, handling manual mechanical meter readings, billing calculation, payment tracking, and automated SMS notifications.

### What Problem Does It Solve?

- **Automates water consumption calculation** based on meter readings
- **Generates accurate bills** according to consumption and configured rates
- **Tracks payment status** (paid, partially paid, unpaid, overdue)
- **Maintains historical records** of meter readings and billing
- **Sends automated SMS notifications** to tenants
- **Flags tenants for disconnection** after 8 days overdue
- **Manages initial deposits** for new tenants
- **Generates comprehensive reports** for vendors and employees

---

## Key Features

### For Water Vendor (Administrator)
- ✅ Full system access and control
- ✅ Configure and update water rates (flat rate per unit)
- ✅ Manage all tenant accounts (add, edit, deactivate)
- ✅ View all payment statuses and financial reports
- ✅ Manage employee accounts and assignments
- ✅ Edit all records including historical data
- ✅ Receive in-app notifications for critical events
- ✅ Override and manually adjust bills when needed
- ✅ Generate and export comprehensive reports

### For Company Employees (Meter Readers)
- ✅ Input monthly meter readings (end of month - around 27th-31st)
- ✅ View assigned tenant list and meter numbers
- ✅ Update reading status and upload verification photos (optional)
- ✅ View reports (read-only access - cannot edit previous records)
- ✅ Receive notifications when readings are due
- ❌ Cannot modify payment records or historical data
- ❌ Cannot change water rates or tenant information

### For Tenants
- 📱 Receive SMS notifications only (no system access required)
- 📱 Monthly bills with consumption details
- 📱 Payment reminders and overdue notices
- 📱 Payment confirmations

---

## User Roles & Access

### 1. Water Vendor (Administrator)
**Access Level:** Full system access

**Permissions:**
- Configure water rates
- Manage tenant accounts
- View and edit all records
- Generate all reports
- Manage employee accounts
- Override system calculations
- Access audit logs

### 2. Company Employee (Meter Reader)
**Access Level:** Limited operational access

**Permissions:**
- Input meter readings
- View assigned tenants
- View reports (read-only)
- Upload meter photos

**Restrictions:**
- Cannot edit previous records
- Cannot modify payments
- Cannot change water rates
- Cannot access financial reports

### 3. Tenants
**Access Level:** No system access

**Communication:**
- SMS notifications only
- No login required
- No portal access

---

## Functional Requirements

### A. Tenant Management

#### New Tenant Registration
- Capture tenant details:
  - Full name
  - Phone number (for SMS)
  - Meter number
  - Unit/house number
  - Property name/location
  - Move-in date
- Record initial deposit payment (separate from monthly bills)
- Assign tenant to specific meter
- Set account status to "Active"
- Generate initial SMS welcome message

#### Tenant Account Management
- Update tenant information
- Deactivate accounts when tenants move out
- Transfer meters to new tenants
- View complete payment and consumption history
- Track deposit status

#### Multi-Property Support
- Group tenants by property name/location
- Filter and view by specific properties
- Generate property-level reports

---

### B. Meter Reading Module

#### Meter Specifications
- Manual mechanical meters (no automated reading)
- Requires physical inspection by company employees

#### Reading Schedule
- **Reading Date:** End of each calendar month (typically 27th-31st)
- **Reminder:** System sends notification to employees on 25th of each month
- **Deadline:** Employees must complete all readings before month-end

#### Reading Input Interface
- Simple form with fields:
  - Tenant name/meter number
  - Current reading
  - Reading date
- **Validation rules:**
  - Current reading must be ≥ previous reading
  - Alert if reading seems unusually high (>200% of average consumption)
  - Cannot input future dates
- Optional photo upload for meter verification
- Timestamp and employee ID auto-recorded
- Batch upload option for multiple readings

#### Reading History
- Complete reading history per tenant with dates
- Track which employee recorded each reading
- Visual consumption trends (monthly chart)
- Ability to correct erroneous readings (admin only)

---

### C. Billing Calculation Engine

#### Pricing Structure
- **Flat rate per unit** (e.g., Kes 155 per unit)
- Rate is configurable by water vendor
- Rate changes apply to future bills only

#### Calculation Logic
```
Units Consumed = Current Reading - Previous Reading
Total Bill = Units Consumed × Rate per Unit
```

#### Bill Generation Process
1. After all month-end readings are completed
2. System auto-calculates consumption for each tenant
3. Generates itemized bill with:
   - Previous reading
   - Current reading
   - Units consumed
   - Rate per unit
   - Total amount
4. **Due date:** Automatically set to 5th of following month
5. Bills immediately available in system

#### Special Cases
- **New tenants (mid-month join):** First bill is pro-rated based on days in the month
- **Zero consumption:** Bill still generated showing 0 units consumed
- **Deposit tracking:** Deposits tracked separately from monthly bills

---

### D. Payment Tracking System

#### Payment Methods Supported
- M-Pesa (primary)
- Bank Transfer

#### Payment Status Categories
- **Paid:** Full amount received on or before due date
- **Partially Paid:** Some amount received but less than total bill
- **Unpaid:** No payment received
- **Overdue:** Payment due date (5th) has passed without full payment

#### Partial Payment Handling
- System accepts partial payments
- Bill remains in "Partially Paid" status until full amount received
- Running balance shows outstanding amount
- Only marked "Paid" when 100% of bill amount is received

#### Payment Recording
- Record the following:
  - Payment amount
  - Date received
  - Payment method (M-Pesa/Bank)
  - M-Pesa/bank reference number
- Option to apply payment to specific bill or oldest outstanding bill
- Auto-update payment status
- Generate payment confirmation SMS to tenant
- Track who recorded the payment (employee/vendor)

#### Overdue Payment Management
- Bills unpaid after 5th of month automatically flagged as "Overdue"
- **Day 8 (8 days after due date = 13th of month):** Tenant automatically flagged for disconnection
- Disconnection flag appears prominently in system with red indicator
- Generate disconnection list for vendor review
- Record disconnection action and date if executed

#### Reconciliation Dashboard
- Total expected revenue vs actual collected
- List of unpaid/partially paid accounts
- Overdue accounts by number of days
- Accounts flagged for disconnection

---

### E. SMS Notification System

#### SMS Gateway
**Provider:** Africa's Talking (recommended for Kenya)

#### Notification Types & Templates

##### 1. Monthly Bill Notification
**Sent:** After bill generation (typically 1st of month)

**Template:**
```
Hi. Your Water Meter reading for Jan 2026:
Previous reading - 700
Reading as at 31.01.2026 - 766
Units consumed 66 @ Kes 155.
Bill Kes 10,230
Please pay by 5th Feb 2026 to PayBill no. 522522 Account. 5556440.
Thank you.
```

**Dynamic Fields:**
- Month/Year
- Previous reading
- Current reading date and value
- Units consumed
- Rate per unit
- Total bill amount
- Payment due date

##### 2. Payment Reminder
**Sent:** 3 days before due date (2nd of month)

**Template:**
```
Reminder: Your water bill of Kes 10,230 is due on 5th Feb 2026. PayBill 522522, Account 5556440. Thank you.
```

##### 3. Overdue Notice
**Sent:** Day after due date (6th of month)

**Template:**
```
Your water bill of Kes 10,230 was due on 5th Feb 2026 and is now OVERDUE. Please pay immediately to PayBill 522522, Account 5556440 to avoid disconnection.
```

##### 4. Final Warning - Disconnection Alert
**Sent:** Day 8 overdue (13th of month)

**Template:**
```
URGENT: Your water account is 8 days overdue (Kes 10,230). You have been flagged for disconnection. Pay NOW to PayBill 522522, Account 5556440.
```

##### 5. Payment Confirmation
**Sent:** When payment is recorded

**Template:**
```
Payment of Kes 10,230 received on 3rd Feb 2026. Thank you for your payment. Your account is up to date.
```

##### 6. Meter Reading Reminder (For Employees)
**Sent:** 25th of each month

**Template:**
```
Reminder: Monthly meter readings are due by month-end. Please complete all assigned readings by 31st.
```

#### SMS Scheduling
- All tenant SMS notifications sent in batch (early morning, e.g., 8 AM)
- Failed SMS logged with retry mechanism
- Track SMS delivery status per tenant

---

### F. Reporting & Analytics

#### Reports Available to Water Vendor (Admin)

**1. Monthly Revenue Report**
- Total revenue expected
- Total revenue collected
- Collection rate percentage
- Breakdown by payment method

**2. Payment Status Report**
- List of paid accounts with amounts and dates
- List of unpaid accounts with amounts owed
- Partially paid accounts with balances
- Overdue accounts with days overdue

**3. Disconnection Report**
- All accounts flagged for disconnection
- Days overdue
- Amount owed
- Contact information

**4. Consumption Analysis**
- Average consumption per tenant
- High consumers (top 10)
- Zero/low consumption anomalies
- Consumption trends over time

**5. Property Performance Report**
- Revenue and collection rate by property
- Number of tenants per property
- Average consumption by property

**6. Employee Performance Report**
- Readings completed vs assigned
- Timeliness of reading submissions
- Number of reading corrections needed

#### Reports Available to Employees (Read-Only)
- Consumption analysis (their assigned properties only)
- Their own performance metrics
- Cannot access financial reports
- Cannot export reports with sensitive financial data

#### Report Features
- Filter by date range, property, payment status
- Export to PDF and Excel
- Print-friendly format
- Scheduled auto-generation (e.g., monthly reports on 1st of month)

---

## Non-Functional Requirements

### Usability
- Clean, intuitive dashboard showing key metrics at a glance
- Maximum 3 clicks to perform common tasks
- Large, clear buttons suitable for mobile use
- Simple forms with inline help text
- Color-coded status indicators (green = paid, yellow = partial, red = overdue)
- One-time training sufficient for water vendor to use confidently
- Built-in help documentation

### Performance
- Page load time < 2 seconds on 3G connection
- SMS delivery within 2 minutes
- Support 100 concurrent users
- Batch SMS sending for 100 tenants in < 5 minutes
- Report generation in < 10 seconds

### Reliability
- 99% uptime target
- Automated daily database backups (retained for 30 days)
- Weekly full system backup to external storage
- Disaster recovery plan with 24-hour maximum data loss
- SMS retry mechanism for failed deliveries

### Security
- Role-based access control (vendor, employee, read-only)
- Strong password requirements (minimum 8 characters, mix of letters/numbers)
- Passwords hashed and salted with bcrypt
- Session timeout after 30 minutes of inactivity
- HTTPS encryption for all data transmission
- Audit log of all critical actions (payments, reading edits, rate changes)
- Two-factor authentication for vendor account (optional but recommended)

### Data Integrity
- Transaction logging for all payment records
- Immutable historical records (employees cannot edit)
- Data validation on all inputs
- Regular data integrity checks

### Scalability
- Database design supports expansion to 500+ tenants
- Architecture allows for multiple vendor accounts (future multi-tenant SaaS)
- API-ready for future integrations (mobile app, automated meters)

### Mobile Responsiveness
- Fully functional on smartphone browsers
- Touch-friendly interface
- Optimized for screens 375px and up
- Minimal data usage for areas with limited connectivity

---

## Technology Stack

### Frontend
**Framework & Build Tool:**
- React 18
- Vite (build tool - faster alternative to Create React App)

**UI & Styling:**
- Tailwind CSS (utility-first CSS framework)
- React Hook Form (form handling)

**Routing & State:**
- React Router (navigation)
- React Context API or Zustand (state management)

**HTTP Client:**
- Axios (API calls)

**Utilities:**
- date-fns (date handling)

### Backend
**Runtime & Framework:**
- Node.js v18+
- Express.js (web framework)

**Database:**
- SQLite3 (start) or PostgreSQL (production)
- Sequelize or Prisma (ORM - optional)

**Authentication & Security:**
- bcryptjs (password hashing)
- jsonwebtoken (JWT authentication)
- helmet (security headers)
- cors (CORS handling)

**Task Scheduling:**
- node-cron (scheduled tasks for automatic notifications)

**File Upload:**
- multer (handling meter photo uploads)

**SMS Integration:**
- africas-talking (Node.js SDK)

### Database Options

#### Option 1: SQLite (Recommended for Start)
- **Cost:** FREE
- **Storage:** File-based, stored locally
- **Perfect for:** 40-100 tenants
- **Advantages:** 
  - Zero setup
  - Easy backups (just copy the file)
  - No separate database server needed
- **Limitations:** 
  - Not ideal for scaling beyond 500 tenants
  - Single writer at a time

#### Option 2: PostgreSQL (Recommended for Production)
- **Provider:** Neon.tech or Supabase
- **Cost:** FREE tier available
- **Storage:** 0.5 GB - 500 MB (depending on provider)
- **Advantages:**
  - More robust for concurrent users
  - Better for complex queries
  - Industry standard
  - Easy migration from SQLite

### Hosting (All FREE Options)

#### Frontend Hosting
**Vercel** (Recommended)
- **Cost:** FREE
- **Features:**
  - Automatic deployments from GitHub
  - Global CDN
  - HTTPS included
  - Custom domain support
  - Perfect for React + Vite

#### Backend Hosting
**Render.com** (Recommended)
- **Cost:** FREE tier available
- **Features:**
  - Deploy Node.js apps
  - PostgreSQL database included (free tier)
  - Automatic HTTPS
  - Auto-deploy from GitHub
- **Limitation:** Free services sleep after 15 mins inactivity

**Alternative: Railway.app**
- **Cost:** $5 credit/month (usually sufficient)
- **Features:**
  - No sleep time
  - PostgreSQL included
  - Excellent developer experience

### Development Tools
- **Code Editor:** VS Code
- **Version Control:** Git + GitHub
- **API Testing:** Postman or Insomnia
- **Database Viewer:** 
  - DB Browser for SQLite
  - pgAdmin (for PostgreSQL)

### Future Mobile App
- React Native (shares code with React web app)

---

## Database Schema

### Key Tables

#### 1. tenants
```sql
id                 INTEGER PRIMARY KEY
name               TEXT NOT NULL
phone_number       TEXT NOT NULL
meter_number       TEXT UNIQUE NOT NULL
unit_number        TEXT NOT NULL
property_name      TEXT
move_in_date       DATE NOT NULL
deposit_amount     DECIMAL(10,2)
deposit_paid       BOOLEAN DEFAULT FALSE
status             TEXT DEFAULT 'active'  -- active/inactive
created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 2. meter_readings
```sql
id                 INTEGER PRIMARY KEY
tenant_id          INTEGER REFERENCES tenants(id)
reading_value      INTEGER NOT NULL
reading_date       DATE NOT NULL
recorded_by        INTEGER REFERENCES users(id)  -- employee who recorded
photo_url          TEXT
notes              TEXT
created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 3. bills
```sql
id                 INTEGER PRIMARY KEY
tenant_id          INTEGER REFERENCES tenants(id)
billing_month      INTEGER NOT NULL  -- 1-12
billing_year       INTEGER NOT NULL
previous_reading   INTEGER NOT NULL
current_reading    INTEGER NOT NULL
units_consumed     INTEGER NOT NULL
rate_per_unit      DECIMAL(10,2) NOT NULL
total_amount       DECIMAL(10,2) NOT NULL
due_date           DATE NOT NULL
status             TEXT DEFAULT 'unpaid'  -- paid/unpaid/partial/overdue
created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 4. payments
```sql
id                 INTEGER PRIMARY KEY
bill_id            INTEGER REFERENCES bills(id)
tenant_id          INTEGER REFERENCES tenants(id)
amount             DECIMAL(10,2) NOT NULL
payment_date       DATE NOT NULL
payment_method     TEXT NOT NULL  -- mpesa/bank
reference_number   TEXT
recorded_by        INTEGER REFERENCES users(id)
created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 5. users
```sql
id                 INTEGER PRIMARY KEY
name               TEXT NOT NULL
email              TEXT UNIQUE NOT NULL
password_hash      TEXT NOT NULL
role               TEXT NOT NULL  -- admin/employee
phone_number       TEXT
status             TEXT DEFAULT 'active'  -- active/inactive
created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
last_login         TIMESTAMP
```

#### 6. system_settings
```sql
id                 INTEGER PRIMARY KEY
setting_name       TEXT UNIQUE NOT NULL
setting_value      TEXT NOT NULL
description        TEXT
updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_by         INTEGER REFERENCES users(id)
```

**Example settings:**
- `current_rate` → "155"
- `paybill_number` → "522522"
- `account_number` → "5556440"
- `reading_reminder_day` → "25"
- `disconnection_days` → "8"

#### 7. sms_logs
```sql
id                 INTEGER PRIMARY KEY
tenant_id          INTEGER REFERENCES tenants(id)
message_type       TEXT NOT NULL  -- bill/reminder/overdue/confirmation
message_content    TEXT NOT NULL
sent_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
delivery_status    TEXT DEFAULT 'pending'  -- pending/sent/failed
error_message      TEXT
```

#### 8. audit_logs
```sql
id                 INTEGER PRIMARY KEY
user_id            INTEGER REFERENCES users(id)
action             TEXT NOT NULL  -- create/update/delete
table_name         TEXT NOT NULL
record_id          INTEGER NOT NULL
old_value          TEXT
new_value          TEXT
timestamp          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### 9. disconnection_flags
```sql
id                 INTEGER PRIMARY KEY
tenant_id          INTEGER REFERENCES tenants(id)
bill_id            INTEGER REFERENCES bills(id)
flagged_date       DATE NOT NULL
days_overdue       INTEGER NOT NULL
disconnection_date DATE
reconnection_date  DATE
status             TEXT DEFAULT 'flagged'  -- flagged/disconnected/reconnected
created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## SMS Notification System

### Payment Configuration
- **PayBill Number:** 522522
- **Account Number:** 5556440

### SMS Provider
**Africa's Talking**
- Kenya-based SMS gateway
- Pricing: ~KES 0.80 per SMS
- Reliable delivery in East Africa
- Easy API integration

### SMS Cost Estimate
For 100 tenants:
- Monthly bill notification: 100 SMS
- Payment reminders (2 per tenant): 200 SMS
- Overdue notices (assume 30% late): 30 SMS
- Payment confirmations: 100 SMS

**Total: ~430 SMS/month × KES 0.80 = KES 344/month (~$2.50)**

### Automated SMS Schedule
- **1st of month:** Send all monthly bills
- **2nd of month:** Send payment reminders
- **6th of month:** Send overdue notices (for unpaid bills)
- **13th of month:** Send disconnection warnings (8 days overdue)
- **On payment:** Immediate confirmation SMS

---

## Development Phases

### Phase 1: Core MVP (4-6 weeks)
**Goal:** Basic working system

**Features:**
- User authentication (login/logout for vendor + employee)
- Tenant management (add, view, edit, delete)
- Meter reading input form
- Basic billing calculation
- Manual payment recording
- Simple dashboard with key metrics

**Deliverables:**
- Working login system
- Tenant CRUD operations
- Meter reading entry
- Bill generation
- Payment tracking

---

### Phase 2: Automation (2-3 weeks)
**Goal:** Automate notifications and billing

**Features:**
- SMS integration with Africa's Talking
- Automated bill generation after readings
- Automated SMS notifications (bills, reminders, overdue)
- Payment status auto-update
- Scheduled tasks (cron jobs)

**Deliverables:**
- SMS sending functionality
- Automated monthly billing process
- Notification scheduling
- Payment confirmation SMS

---

### Phase 3: Advanced Features (2-3 weeks)
**Goal:** Reporting and management tools

**Features:**
- Comprehensive reporting system
- Disconnection flagging (auto after 8 days)
- Audit logs for all transactions
- Data export (Excel/PDF)
- Employee performance tracking
- Property-level analytics

**Deliverables:**
- All report types functional
- Disconnection management
- Export capabilities
- Audit trail

---

### Phase 4: Refinement (1-2 weeks)
**Goal:** Polish and prepare for launch

**Features:**
- UI/UX improvements
- Mobile responsiveness optimization
- Error handling and validation
- Testing and bug fixes
- User training materials
- Deployment

**Deliverables:**
- Polished user interface
- Fully responsive design
- User manual/guide
- Deployed production system

---

**Total Estimated Timeline: 9-14 weeks (2-3.5 months)**

---

## Cost Breakdown

### Monthly Operational Costs

| Item | Provider | Cost |
|------|----------|------|
| Frontend Hosting | Vercel | **FREE** |
| Backend Hosting | Render.com | **FREE** |
| Database | Neon.tech / SQLite | **FREE** |
| Domain (optional) | Namecheap | ~KES 80/month ($10/year) |
| SSL Certificate | Included | **FREE** |
| SMS (100 tenants) | Africa's Talking | ~KES 300-400/month |
| **Total Monthly** | | **KES 380-480** (~$3-4) |

### One-Time Costs
- Domain registration: ~KES 1,200/year ($10)
- Development: Variable (if outsourced)

### SMS Cost Breakdown
- Bill notifications: 100 SMS × KES 0.80 = KES 80
- Payment reminders: 200 SMS × KES 0.80 = KES 160
- Overdue notices: 30 SMS × KES 0.80 = KES 24
- Confirmations: 100 SMS × KES 0.80 = KES 80
- **Total: ~KES 344/month**

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- npm or yarn
- Git
- VS Code (recommended)
- GitHub account
- Africa's Talking account (for SMS)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/utafresh-billing.git
cd utafresh-billing
```

#### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

#### 3. Install Backend Dependencies
```bash
cd ../backend
npm install
```

#### 4. Environment Variables

Create `.env` file in backend folder:
```env
# Database
DATABASE_URL=./database.sqlite  # or PostgreSQL connection string

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this

# Africa's Talking
AT_API_KEY=your-africas-talking-api-key
AT_USERNAME=your-africas-talking-username

# App Config
PORT=5000
NODE_ENV=development

# Payment Config
PAYBILL_NUMBER=522522
ACCOUNT_NUMBER=5556440
```

Create `.env` file in frontend folder:
```env
VITE_API_URL=http://localhost:5000
```

#### 5. Initialize Database
```bash
cd backend
npm run db:init  # Creates tables and seed data
```

#### 6. Run Development Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend (in new terminal):**
```bash
cd frontend
npm run dev
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## Deployment

### Frontend Deployment (Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign up with GitHub
4. Click "Import Project"
5. Select your repository
6. Configure:
   - **Root Directory:** `frontend/`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
7. Add environment variable:
   - `VITE_API_URL=https://your-backend-url.onrender.com`
8. Click "Deploy"

### Backend Deployment (Render.com)

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Sign up with GitHub
4. Click "New Web Service"
5. Connect your repository
6. Configure:
   - **Root Directory:** `backend/`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
7. Add environment variables (from your .env file)
8. Click "Create Web Service"

### Database Setup (Neon.tech - if using PostgreSQL)

1. Go to [neon.tech](https://neon.tech)
2. Sign up and create new project
3. Copy connection string
4. Add to Render environment variables as `DATABASE_URL`

---

## Project Structure

```
utafresh-billing/
├── frontend/                     # React application
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── ...
│   │   ├── pages/               # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Tenants.jsx
│   │   │   ├── Readings.jsx
│   │   │   ├── Billing.jsx
│   │   │   ├── Payments.jsx
│   │   │   └── Reports.jsx
│   │   ├── services/            # API calls
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   └── ...
│   │   ├── utils/               # Helper functions
│   │   │   ├── formatters.js
│   │   │   └── validators.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                      # Node.js API
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.routes.js
│   │   │   ├── tenants.routes.js
│   │   │   ├── readings.routes.js
│   │   │   ├── bills.routes.js
│   │   │   ├── payments.routes.js
│   │   │   └── reports.routes.js
│   │   ├── controllers/         # Business logic
│   │   │   ├── auth.controller.js
│   │   │   ├── tenants.controller.js
│   │   │   └── ...
│   │   ├── models/              # Database models
│   │   │   ├── Tenant.js
│   │   │   ├── Reading.js
│   │   │   ├── Bill.js
│   │   │   └── ...
│   │   ├── middleware/          # Auth, validation
│   │   │   ├── auth.middleware.js
│   │   │   └── validation.middleware.js
│   │   ├── services/            # External services
│   │   │   ├── sms.service.js
│   │   │   ├── billing.service.js
│   │   │   └── scheduler.service.js
│   │   ├── config/              # Configuration
│   │   │   ├── database.js
│   │   │   └── sms.js
│   │   └── utils/               # Utilities
│   │       ├── logger.js
│   │       └── helpers.js
│   ├── database.sqlite          # SQLite database file
│   ├── package.json
│   └── server.js                # Entry point
│
├── .github/
│   └── workflows/               # CI/CD (optional)
├── docs/                        # Documentation
├── README.md
├── .gitignore
└── LICENSE
```

---

## API Endpoints (Planned)

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Tenants
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/:id` - Get single tenant
- `POST /api/tenants` - Create new tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### Meter Readings
- `GET /api/readings` - Get all readings
- `GET /api/readings/tenant/:id` - Get readings for tenant
- `POST /api/readings` - Add new reading
- `PUT /api/readings/:id` - Update reading

### Bills
- `GET /api/bills` - Get all bills
- `GET /api/bills/tenant/:id` - Get bills for tenant
- `POST /api/bills/generate` - Generate monthly bills
- `GET /api/bills/:id` - Get single bill

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/tenant/:id` - Get payments for tenant
- `POST /api/payments` - Record new payment
- `GET /api/payments/summary` - Payment summary

### Reports
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/collections` - Collection status
- `GET /api/reports/disconnections` - Disconnection list
- `GET /api/reports/consumption` - Consumption analysis

### SMS
- `POST /api/sms/send` - Send manual SMS
- `GET /api/sms/logs` - View SMS history

### Settings
- `GET /api/settings` - Get system settings
- `PUT /api/settings/:name` - Update setting

---

## Security Considerations

### Best Practices Implemented
- ✅ Passwords hashed with bcrypt (never stored in plain text)
- ✅ JWT tokens for authentication
- ✅ HTTPS encryption in production
- ✅ Role-based access control
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ Session timeout (30 minutes)
- ✅ Audit logs for critical actions

### Recommended Additional Security
- Two-factor authentication for admin account
- Rate limiting on API endpoints
- Regular security audits
- Automated backups
- GDPR compliance for tenant data

---

## Testing Strategy

### Unit Tests
- Test individual functions (billing calculations, validators)
- Test database models and queries
- Test API endpoints

### Integration Tests
- Test complete user flows (login → add tenant → record reading → generate bill)
- Test SMS sending
- Test payment recording

### User Acceptance Testing (UAT)
- Water vendor tests all admin functions
- Employees test meter reading entry
- Verify SMS delivery to test numbers

---

## Maintenance & Support

### Regular Maintenance Tasks
- **Daily:** Monitor SMS delivery status
- **Weekly:** Review system logs for errors
- **Monthly:** Database backup verification
- **Quarterly:** Security updates and patches

### Backup Strategy
- **Database:** Daily automated backups
- **Retention:** 30 days
- **Location:** External storage (separate from main server)
- **Recovery:** Test restoration monthly

---

## Future Enhancements

### Phase 5: Advanced Features (Future)
- Mobile app (React Native)
- M-Pesa API integration (auto payment reconciliation)
- Tenant self-service portal
- Automated meter reading (IoT integration)
- Multi-language support (Swahili, English)
- Advanced analytics and forecasting
- Multiple water vendors (SaaS model)

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Contact & Support

**Project Owner:** [Your Name]
**Email:** [your-email@example.com]
**GitHub:** [github.com/yourusername]

For bug reports and feature requests, please open an issue on GitHub.

---

## Acknowledgments

- Africa's Talking for SMS services
- Render.com and Vercel for free hosting
- The open-source community for amazing tools

---

**Version:** 1.0.0  
**Last Updated:** February 2026  
**Status:** In Development

---

## Quick Start Checklist

- [ ] Install Node.js and VS Code
- [ ] Clone repository
- [ ] Install dependencies (frontend + backend)
- [ ] Set up environment variables
- [ ] Initialize database
- [ ] Create Africa's Talking account
- [ ] Run development servers
- [ ] Test basic functionality
- [ ] Deploy to Render and Vercel
- [ ] Configure production environment variables
- [ ] Test SMS sending in production
- [ ] Train water vendor on system usage
- [ ] Go live! 🚀
