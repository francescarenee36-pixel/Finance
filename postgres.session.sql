-- ============================================================
--  STELLAR SAT SOLUTIONS INC — FINANCE DATABASE
--  Updated: 2026
--
--  SIMPLIFIED:
--  - No projects lookup table
--  - income_records.lot stores 'Lot A'–'Lot G' directly
--  - project_expenses.project stores project name as plain text
--  - Company income  = income_records WHERE lot IS NULL
--  - Project income  = income_records WHERE lot IS NOT NULL
-- ============================================================

DROP TABLE IF EXISTS letters           CASCADE;
DROP TABLE IF EXISTS collections       CASCADE;
DROP TABLE IF EXISTS project_expenses  CASCADE;
DROP TABLE IF EXISTS company_expenses  CASCADE;
DROP TABLE IF EXISTS income_records    CASCADE;
DROP TABLE IF EXISTS income_descriptions CASCADE;
DROP TABLE IF EXISTS income_sources    CASCADE;
DROP TABLE IF EXISTS projects          CASCADE;
DROP TABLE IF EXISTS users             CASCADE;

-- ============================================================
--  USERS
-- ============================================================
CREATE TABLE users (
    id          SERIAL        PRIMARY KEY,
    full_name   VARCHAR(150)  NOT NULL,
    email       VARCHAR(150)  UNIQUE NOT NULL,
    role        VARCHAR(50)   NOT NULL DEFAULT 'finance_officer',
    is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  INCOME RECORDS
--  lot = NULL          → Company Income
--  lot = 'Lot A'–'Lot G' → Project Income
-- ============================================================
CREATE TABLE income_records (
    id          SERIAL          PRIMARY KEY,
    date        DATE            NOT NULL,
    lot         VARCHAR(50),
    source      VARCHAR(255)    NOT NULL,
    description VARCHAR(255)    NOT NULL, 
    amount      NUMERIC(15,2)   NOT NULL CHECK (amount > 0),
    or_number   VARCHAR(100),
    remarks     TEXT,
    recorded_by INT             REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_lot CHECK (
        lot IN ('Lot A','Lot B','Lot C','Lot D','Lot E','Lot F','Lot G')
        OR lot IS NULL
    )
);

select * from income_records
-- ============================================================
--  FINANCE DASHBOARD — Company Expenses (PostgreSQL)
-- ============================================================

-- Drop existing objects if re-running
DROP VIEW IF EXISTS v_expense_monthly;
DROP VIEW IF EXISTS v_expense_sub_kpis;
DROP VIEW IF EXISTS v_expense_kpis;
DROP TABLE IF EXISTS company_expenses;

-- Custom types (PostgreSQL equivalent of MySQL ENUM)
DO $$ BEGIN
  CREATE TYPE expense_type   AS ENUM ('expenses', 'purchases', 'overhead');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE expense_status AS ENUM ('paid', 'unpaid', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
--  MAIN TABLE
-- ============================================================
CREATE TABLE company_expenses (
  id          SERIAL            PRIMARY KEY,
  type        expense_type      NOT NULL DEFAULT 'expenses',
  date        DATE              NOT NULL,
  category    VARCHAR(100)      NOT NULL,
  description VARCHAR(500)      NOT NULL,
  vendor      VARCHAR(200),
  amount      NUMERIC(15,2)     NOT NULL DEFAULT 0,
  status      expense_status    NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP         NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exp_type        ON company_expenses (type);
CREATE INDEX idx_exp_date        ON company_expenses (date);
CREATE INDEX idx_exp_status      ON company_expenses (status);
CREATE INDEX idx_exp_type_date   ON company_expenses (type, date);
CREATE INDEX idx_exp_type_status ON company_expenses (type, status);

-- ============================================================
--  SEED DATA
-- ============================================================
INSERT INTO company_expenses (type, date, category, description, vendor, amount, status) VALUES
('expenses',  '2026-01-02', 'Salaries',        'Staff Payroll — January',            'Payroll System',       200000.00, 'paid'),
('expenses',  '2026-01-13', 'Contractor Fees', 'Tower Installation Contractor',      'Alpha Contractors',     45000.00, 'unpaid'),
('expenses',  '2026-01-28', 'Legal Fees',      'Contract Review - Legal Team',       'Santos Law Office',     15000.00, 'pending'),
('expenses',  '2026-02-02', 'Salaries',        'Staff Payroll — February',           'Payroll System',       200000.00, 'paid'),
('expenses',  '2026-02-14', 'Utilities',       'Electricity Bill — February',        'MERALCO',               18500.00, 'paid'),
('expenses',  '2026-02-20', 'Contractor Fees', 'Satellite Dish Maintenance',         'TechServ Corp',         22000.00, 'pending'),
('expenses',  '2026-03-02', 'Salaries',        'Staff Payroll — March',              'Payroll System',       200000.00, 'paid'),
('expenses',  '2026-03-15', 'Legal Fees',      'Permit Processing Fees',             'City Hall',              8500.00, 'paid'),
('expenses',  '2026-03-22', 'Utilities',       'Water Bill — March',                 'Manila Water',           3200.00, 'paid'),
('purchases', '2026-01-10', 'Equipment',       'Network Switch — Cisco 24-port',     'CDO Computers',         85000.00, 'paid'),
('purchases', '2026-01-28', 'Software',        'Monthly Service Plan — MS365',       'Microsoft Philippines', 60000.00, 'paid'),
('purchases', '2026-02-05', 'Supplies',        'Office Supplies — Q1 Batch',         'National Bookstore',    12500.00, 'paid'),
('purchases', '2026-02-18', 'Materials',       'Cabling Materials — Phase 2',        'EleKtrikal Supply',     38000.00, 'pending'),
('purchases', '2026-03-01', 'Equipment',       'UPS Backup Units x4',                'APC Distributor PH',    64000.00, 'paid'),
('purchases', '2026-03-10', 'Software',        'Antivirus License Renewal',          'Kaspersky PH',          15000.00, 'paid'),
('purchases', '2026-03-25', 'Supplies',        'Printer Ink & Paper — Q1',           'Office Depot',           7800.00, 'pending'),
('overhead',  '2026-01-01', 'Rent',            'Office Space Rental — January',      'SM Prime Holdings',     35000.00, 'paid'),
('overhead',  '2026-01-15', 'Internet',        'Fiber Internet — January',           'PLDT',                  12000.00, 'paid'),
('overhead',  '2026-01-25', 'Insurance',       'Office Building Insurance Premium',  'Malayan Insurance',      8500.00, 'paid'),
('overhead',  '2026-02-01', 'Rent',            'Office Space Rental — February',     'SM Prime Holdings',     35000.00, 'paid'),
('overhead',  '2026-02-15', 'Internet',        'Fiber Internet — February',          'PLDT',                  12000.00, 'paid'),
('overhead',  '2026-03-01', 'Rent',            'Office Space Rental — March',        'SM Prime Holdings',     35000.00, 'paid'),
('overhead',  '2026-03-15', 'Depreciation',    'Equipment Depreciation — Q1',        NULL,                     6200.00, 'pending'),
('overhead',  '2026-03-20', 'Insurance',       'Vehicle Insurance Renewal',          'Pioneer Insurance',      9800.00, 'paid');

-- ============================================================
--  VIEWS  (PostgreSQL uses TO_CHAR instead of MySQL DATE_FORMAT)
-- ============================================================

CREATE OR REPLACE VIEW v_expense_kpis AS
SELECT
  SUM(amount)                                          AS grand_total,
  SUM(CASE WHEN type = 'expenses'  THEN amount END)    AS expenses_total,
  SUM(CASE WHEN type = 'purchases' THEN amount END)    AS purchases_total,
  SUM(CASE WHEN type = 'overhead'  THEN amount END)    AS overhead_total
FROM company_expenses;

CREATE OR REPLACE VIEW v_expense_sub_kpis AS
SELECT
  type,
  SUM(amount)                                              AS total,
  SUM(CASE WHEN status = 'paid'    THEN amount ELSE 0 END) AS paid,
  SUM(CASE WHEN status = 'unpaid'  THEN amount ELSE 0 END) AS unpaid,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pending
FROM company_expenses
GROUP BY type;

CREATE OR REPLACE VIEW v_expense_monthly AS
SELECT
  TO_CHAR(date, 'YYYY-MM') AS month_key,
  TO_CHAR(date, 'Month')   AS month_label,
  SUM(amount)              AS total
FROM company_expenses
GROUP BY month_key, month_label
ORDER BY month_key;
 
SELECT * FROM company_expenses

-- ============================================================
--  Remaining tables needed by server.js
--  Run AFTER expenses_schema.sql
-- ============================================================

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id                SERIAL        PRIMARY KEY,
  date              DATE          NOT NULL,
  client            VARCHAR(255)  NOT NULL,
  or_number         VARCHAR(100),
  amount_due        NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_collected  NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Letters / file uploads
CREATE TABLE IF NOT EXISTS letters (
  id           SERIAL        PRIMARY KEY,
  file_name    VARCHAR(255)  NOT NULL,
  file_type    VARCHAR(20)   NOT NULL,
  file_size    VARCHAR(30)   NOT NULL,
  file_path    TEXT          NOT NULL,
  uploaded_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Project expenses
CREATE TABLE IF NOT EXISTS project_expenses (
  id            SERIAL        PRIMARY KEY,
  date          DATE          NOT NULL,
  project_name  VARCHAR(255)  NOT NULL,
  description   VARCHAR(500)  NOT NULL,
  category      VARCHAR(100)  NOT NULL,
  vendor        VARCHAR(200),
  amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  status        VARCHAR(30)   NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

