-- ============================================================
--  STELLARSAT SOLUTIONS INC.
--  Employee Dashboard — PostgreSQL Database Schema
--  Covers: Reimburse | Request of Budget | P.O | Salary Advancement
-- ============================================================

-- ─────────────────────────────────────────────
--  EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()

-- ─────────────────────────────────────────────
--  ENUM TYPES
-- ─────────────────────────────────────────────
CREATE TYPE request_status AS ENUM (
    'Pending',
    'Approved',
    'Done',
    'Decline'
);

CREATE TYPE employee_role AS ENUM (
    'NOC',
    'Admin',
    'Executives',
    'Bidding',
    'Finance'
);

-- ─────────────────────────────────────────────
--  TABLE: employees
--  Stores all staff who can submit requests
-- ─────────────────────────────────────────────
CREATE TABLE employees (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150)    NOT NULL,
    role        employee_role   NOT NULL,
    email       VARCHAR(200)    UNIQUE,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
 
-- ─────────────────────────────────────────────
--  TABLE: reimburse
--  Tab 1 — Employee Reimburse
--  Columns: Name | Roles | Date | Description | Amount | Comments
-- ─────────────────────────────────────────────
CREATE TABLE reimburse (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            REFERENCES employees(id) ON DELETE SET NULL,
    -- denormalized for display (matches screenshots)
    employee_name   VARCHAR(150)    NOT NULL,
    role            employee_role   NOT NULL,
    request_date    DATE            NOT NULL DEFAULT CURRENT_DATE,
    description     VARCHAR(500)    NOT NULL,
    amount          NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
    status          request_status  NOT NULL DEFAULT 'Pending',
    comment         TEXT,                        -- Finance remark (optional)
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  TABLE: budget_requests
--  Tab 2 — Request of Budget
--  Columns: Name | Roles | Date | Description | Amount | Status | Comments
-- ─────────────────────────────────────────────
CREATE TABLE budget_requests (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            REFERENCES employees(id) ON DELETE SET NULL,
    employee_name   VARCHAR(150)    NOT NULL,
    role            employee_role   NOT NULL,
    request_date    DATE            NOT NULL DEFAULT CURRENT_DATE,
    description     VARCHAR(500)    NOT NULL,
    amount          NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
    status          request_status  NOT NULL DEFAULT 'Pending',
    comment         TEXT,                        -- Finance remark (optional)
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  TABLE: purchase_orders
--  Tab 3 — P.O (Purchase Orders)
--  Columns: Equipment | Quantity | Amount | Date
-- ─────────────────────────────────────────────
CREATE TABLE purchase_orders (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name       VARCHAR(200)    NOT NULL,
    quantity        VARCHAR(100)    NOT NULL,     -- e.g. "6 Bundle", "3 Units"
    amount          NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
    order_date      DATE            NOT NULL DEFAULT CURRENT_DATE,
    status          request_status  NOT NULL DEFAULT 'Pending',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  TABLE: salary_advances
--  Tab 4 — Salary Advancement
--  Columns: Name | Amount | Balance | Date | Status
-- ─────────────────────────────────────────────
CREATE TABLE salary_advances (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID            REFERENCES employees(id) ON DELETE SET NULL,
    employee_name   VARCHAR(150)    NOT NULL,
    advance_amount  NUMERIC(12, 2)  NOT NULL CHECK (advance_amount > 0),
    balance         NUMERIC(12, 2)  NOT NULL CHECK (balance >= 0),
    advance_date    DATE            NOT NULL DEFAULT CURRENT_DATE,
    status          request_status  NOT NULL DEFAULT 'Pending',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  AUTO-UPDATE updated_at TRIGGER FUNCTION
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- attach trigger to every table
CREATE TRIGGER trg_reimburse_updated
    BEFORE UPDATE ON reimburse
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_budget_updated
    BEFORE UPDATE ON budget_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_po_updated
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_salary_updated
    BEFORE UPDATE ON salary_advances
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employees_updated
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────
--  INDEXES  (for search & filter performance)
-- ─────────────────────────────────────────────
-- reimburse
CREATE INDEX idx_reimburse_employee_name  ON reimburse (employee_name);
CREATE INDEX idx_reimburse_role           ON reimburse (role);
CREATE INDEX idx_reimburse_request_date   ON reimburse (request_date);
CREATE INDEX idx_reimburse_status         ON reimburse (status);

-- budget_requests
CREATE INDEX idx_budget_employee_name     ON budget_requests (employee_name);
CREATE INDEX idx_budget_role              ON budget_requests (role);
CREATE INDEX idx_budget_request_date      ON budget_requests (request_date);
CREATE INDEX idx_budget_status            ON budget_requests (status);

-- purchase_orders
CREATE INDEX idx_po_order_date            ON purchase_orders (order_date);
CREATE INDEX idx_po_item_name             ON purchase_orders (item_name);
CREATE INDEX idx_po_status                ON purchase_orders (status);

-- salary_advances
CREATE INDEX idx_salary_employee_name     ON salary_advances (employee_name);
CREATE INDEX idx_salary_advance_date      ON salary_advances (advance_date);
CREATE INDEX idx_salary_status            ON salary_advances (status);

-- ─────────────────────────────────────────────
--  SAMPLE DATA  (matches the screenshots exactly)
-- ─────────────────────────────────────────────

-- Employees
INSERT INTO employees (name, role, email) VALUES
    ('Arianne Mendiola', 'NOC',    'arianne.mendiola@stellarsat.com'),
    ('Jacov De Belen',   'NOC',    'jacov.debelen@stellarsat.com'),
    ('Lyka Sergantes',   'NOC',    'lyka.sergantes@stellarsat.com'),
    ('Jae Yumul',        'NOC',    'jae.yumul@stellarsat.com'),
    ('Chisca Renee',     'NOC',    'chisca.renee@stellarsat.com');

-- Reimburse (Tab 1)
INSERT INTO reimburse (employee_name, role, request_date, description, amount, status, comment) VALUES
    ('Arianne Mendiola', 'NOC', '2026-01-02', 'Grab',    500.00,  'Pending', NULL),
    ('Jacov De Belen',   'NOC', '2026-01-13', 'Package', 2500.00, 'Pending', NULL);

-- Budget Requests (Tab 2)
INSERT INTO budget_requests (employee_name, role, request_date, description, amount, status, comment) VALUES
    ('Arianne Mendiola', 'NOC', '2026-01-02', 'Bond Paper', 500.00,  'Done',    NULL),
    ('Jacov De Belen',   'NOC', '2026-01-13', 'Package',    2500.00, 'Decline', NULL),
    ('Lyka Sergantes',   'NOC', '2026-01-15', 'Grab',       500.00,  'Pending', NULL),
    ('Arianne Mendiola', 'NOC', '2026-01-20', 'Grab',       500.00,  'Pending', NULL);

-- Purchase Orders (Tab 3)
INSERT INTO purchase_orders (item_name, quantity, amount, order_date, status) VALUES
    ('Tissue',             '6 Bundle', 1360.00, '2026-01-02', 'Pending'),
    ('Dishwashing Liquid', '6 Galon',  2000.00, '2026-01-12', 'Pending');

-- Salary Advances (Tab 4)
INSERT INTO salary_advances (employee_name, advance_amount, balance, advance_date, status) VALUES
    ('Arianne Mendiola', 5000.00, 13000.00, '2026-01-02', 'Approved'),
    ('Lyka Sergantes',   3000.00, 5000.00,  '2026-01-12', 'Approved'),
    ('Jae Yumul',        3000.00, 5000.00,  '2026-01-12', 'Decline'),
    ('Chisca Renee',     3000.00, 5000.00,  '2026-01-12', 'Decline');

-- ─────────────────────────────────────────────
--  USEFUL VIEWS (for quick Finance reporting)
-- ─────────────────────────────────────────────

-- All pending items across all modules
CREATE VIEW v_pending_all AS
    SELECT 'Reimburse'       AS module, id, employee_name, role::TEXT, request_date AS ref_date, description AS label, amount, status, created_at FROM reimburse       WHERE status = 'Pending'
    UNION ALL
    SELECT 'Budget Request',            id, employee_name, role::TEXT, request_date,             description,          amount, status, created_at FROM budget_requests WHERE status = 'Pending'
    UNION ALL
    SELECT 'Purchase Order',            id, item_name,     NULL,        order_date,              item_name,            amount, status, created_at FROM purchase_orders WHERE status = 'Pending'
    UNION ALL
    SELECT 'Salary Advance',            id, employee_name, NULL,        advance_date,            'Salary Advance',     advance_amount, status, created_at FROM salary_advances WHERE status = 'Pending';

-- Summary by status per module
CREATE VIEW v_summary AS
    SELECT 'Reimburse'      AS module, status, COUNT(*) AS total_requests, SUM(amount) AS total_amount FROM reimburse       GROUP BY status
    UNION ALL
    SELECT 'Budget Request', status, COUNT(*), SUM(amount)                                            FROM budget_requests GROUP BY status
    UNION ALL
    SELECT 'Purchase Order', status, COUNT(*), SUM(amount)                                            FROM purchase_orders GROUP BY status
    UNION ALL
    SELECT 'Salary Advance', status, COUNT(*), SUM(advance_amount)                                    FROM salary_advances GROUP BY status;

-- ─────────────────────────────────────────────
--  EXAMPLE QUERIES
-- ─────────────────────────────────────────────

/*
-- Get all reimburse requests (Tab 1)
SELECT id, employee_name, role, request_date, description, amount, status, comment
FROM reimburse
ORDER BY request_date DESC;

-- Add a new reimburse entry
INSERT INTO reimburse (employee_name, role, request_date, description, amount)
VALUES ('Juan Dela Cruz', 'NOC', CURRENT_DATE, 'Grab to client site', 650.00);

-- Approve a budget request
UPDATE budget_requests SET status = 'Approved' WHERE id = '<uuid>';

-- Add a finance comment
UPDATE reimburse SET comment = 'Verified receipt. Approved for payment.' WHERE id = '<uuid>';

-- Get all pending items (Finance dashboard view)
SELECT * FROM v_pending_all ORDER BY ref_date DESC;

-- Summary report
SELECT * FROM v_summary ORDER BY module, status;

-- Search by employee name (all tabs)
SELECT * FROM reimburse     WHERE employee_name ILIKE '%arianne%';
SELECT * FROM budget_requests WHERE employee_name ILIKE '%arianne%';
SELECT * FROM salary_advances WHERE employee_name ILIKE '%arianne%';
*/

-- Drop all views first (they depend on the tables)
