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
--  COMPANY EXPENSES
-- ============================================================
CREATE TABLE company_expenses (
    id          SERIAL          PRIMARY KEY,
    date        DATE            NOT NULL,
    description VARCHAR(255)    NOT NULL,
    category    VARCHAR(100)    NOT NULL
                  CHECK (category IN ('Supplies','Utilities','Equipment','Labor','Logistics','Other')),
    vendor      VARCHAR(150)    NOT NULL,
    amount      NUMERIC(15,2)   NOT NULL CHECK (amount > 0),
    status      VARCHAR(50)     NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('completed','progress','pending')),
    recorded_by INT             REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ============================================================
--  PROJECT EXPENSES
--  project = plain text e.g. 'Project Alpha' (no FK needed)
-- ============================================================
CREATE TABLE project_expenses (
    id          SERIAL          PRIMARY KEY,
    date        DATE            NOT NULL,
    project     VARCHAR(150)    NOT NULL,
    description VARCHAR(255)    NOT NULL,
    category    VARCHAR(100)    NOT NULL
                  CHECK (category IN ('Materials','Labor','Equipment','Logistics','Other')),
    vendor      VARCHAR(150)    NOT NULL,
    amount      NUMERIC(15,2)   NOT NULL CHECK (amount > 0),
    status      VARCHAR(50)     NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('completed','progress','pending')),
    recorded_by INT             REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ============================================================
--  COLLECTIONS
-- ============================================================
CREATE TABLE collections (
    id               SERIAL          PRIMARY KEY,
    date             DATE            NOT NULL,
    client           VARCHAR(150)    NOT NULL,
    or_number        VARCHAR(100),
    amount_due       NUMERIC(15,2)   NOT NULL CHECK (amount_due > 0),
    amount_collected NUMERIC(15,2)   NOT NULL DEFAULT 0 CHECK (amount_collected >= 0),
    balance          NUMERIC(15,2)   GENERATED ALWAYS AS (amount_due - amount_collected) STORED,
    status           VARCHAR(50)     GENERATED ALWAYS AS (
                       CASE
                         WHEN amount_collected >= amount_due THEN 'paid'
                         WHEN amount_collected > 0           THEN 'partial'
                         ELSE                                     'unpaid'
                       END
                     ) STORED,
    recorded_by      INT             REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_collected_lte_due CHECK (amount_collected <= amount_due)
);

-- ============================================================
--  LETTERS
-- ============================================================
CREATE TABLE letters (
    id           SERIAL        PRIMARY KEY,
    file_name    VARCHAR(255)  NOT NULL,
    file_type    VARCHAR(20)   NOT NULL,
    file_size    VARCHAR(20)   NOT NULL,
    file_path    TEXT          NOT NULL,
    uploaded_by  INT           REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  INDEXES
-- ============================================================
CREATE INDEX idx_income_date       ON income_records(date);
CREATE INDEX idx_income_lot        ON income_records(lot);
CREATE INDEX idx_income_source     ON income_records(source);
CREATE INDEX idx_income_or         ON income_records(or_number);

CREATE INDEX idx_comp_exp_date     ON company_expenses(date);
CREATE INDEX idx_comp_exp_status   ON company_expenses(status);
CREATE INDEX idx_comp_exp_cat      ON company_expenses(category);

CREATE INDEX idx_proj_exp_date     ON project_expenses(date);
CREATE INDEX idx_proj_exp_project  ON project_expenses(project);
CREATE INDEX idx_proj_exp_status   ON project_expenses(status);

CREATE INDEX idx_col_date          ON collections(date);
CREATE INDEX idx_col_client        ON collections(client);
CREATE INDEX idx_col_status        ON collections(status);

CREATE INDEX idx_letters_uploaded  ON letters(uploaded_at);

-- ============================================================
--  AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at     BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_income_updated_at    BEFORE UPDATE ON income_records   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comp_exp_updated_at  BEFORE UPDATE ON company_expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proj_exp_updated_at  BEFORE UPDATE ON project_expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_col_updated_at       BEFORE UPDATE ON collections      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  VIEWS
-- ============================================================

-- Company income (lot IS NULL)
CREATE OR REPLACE VIEW v_company_income AS
SELECT
    id, date,
    TO_CHAR(date, 'Mon - DD - YYYY') AS date_formatted,
    source, description, amount, or_number, created_at
FROM income_records
WHERE lot IS NULL
ORDER BY date DESC;

-- Project income (lot IS NOT NULL)
CREATE OR REPLACE VIEW v_project_income AS
SELECT
    id, date,
    TO_CHAR(date, 'Mon - DD - YYYY') AS date_formatted,
    lot, source, description, amount, or_number, created_at
FROM income_records
WHERE lot IS NOT NULL
ORDER BY date DESC;

-- Monthly trend (company income only, for line chart)
CREATE OR REPLACE VIEW v_income_monthly AS
SELECT
    DATE_TRUNC('month', date)                 AS month,
    TO_CHAR(DATE_TRUNC('month', date), 'Mon') AS month_label,
    SUM(amount)                               AS total
FROM income_records
WHERE lot IS NULL
GROUP BY DATE_TRUNC('month', date)
ORDER BY DATE_TRUNC('month', date);

-- Project income totals by lot (for bar chart)
CREATE OR REPLACE VIEW v_income_by_lot AS
SELECT
    lot,
    SUM(amount)  AS amount,
    COUNT(*)     AS transaction_count
FROM income_records
WHERE lot IS NOT NULL
GROUP BY lot
ORDER BY lot;

-- KPI totals
CREATE OR REPLACE VIEW v_income_kpi AS
SELECT
    COALESCE(SUM(amount) FILTER (WHERE lot IS NULL),     0) AS company_total,
    COALESCE(SUM(amount) FILTER (WHERE lot IS NOT NULL), 0) AS project_total,
    COALESCE(SUM(amount), 0)                                 AS total
FROM income_records;

-- Project expenses (plain text project name)
CREATE OR REPLACE VIEW v_proj_expenses_detail AS
SELECT
    id, date,
    TO_CHAR(date, 'Mon - DD - YYYY') AS date_formatted,
    project, description, category, vendor, amount, status, created_at
FROM project_expenses
ORDER BY date DESC;

-- Collections summary
CREATE OR REPLACE VIEW v_collections_summary AS
SELECT
    SUM(amount_due)        AS total_due,
    SUM(amount_collected)  AS total_collected,
    SUM(balance)           AS total_balance,
    COUNT(*) FILTER (WHERE status = 'paid')    AS paid_count,
    COUNT(*) FILTER (WHERE status = 'partial') AS partial_count,
    COUNT(*) FILTER (WHERE status = 'unpaid')  AS unpaid_count
FROM collections;

-- Monthly financial summary (Financial Report)
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
    m.month,
    TO_CHAR(m.month, 'FMMonth YYYY')             AS month_label,
    COALESCE(i.total_income,    0)               AS total_income,
    COALESCE(ce.total_comp_exp, 0)               AS total_comp_expenses,
    COALESCE(pe.total_proj_exp, 0)               AS total_proj_expenses,
    COALESCE(ce.total_comp_exp, 0)
      + COALESCE(pe.total_proj_exp, 0)           AS total_expenses,
    COALESCE(i.total_income, 0)
      - COALESCE(ce.total_comp_exp, 0)
      - COALESCE(pe.total_proj_exp, 0)           AS net_income
FROM (
    SELECT DISTINCT DATE_TRUNC('month', date) AS month FROM income_records
    UNION SELECT DISTINCT DATE_TRUNC('month', date) FROM company_expenses
    UNION SELECT DISTINCT DATE_TRUNC('month', date) FROM project_expenses
) m
LEFT JOIN (SELECT DATE_TRUNC('month', date) AS month, SUM(amount) AS total_income   FROM income_records   GROUP BY 1) i  ON i.month  = m.month
LEFT JOIN (SELECT DATE_TRUNC('month', date) AS month, SUM(amount) AS total_comp_exp FROM company_expenses GROUP BY 1) ce ON ce.month = m.month
LEFT JOIN (SELECT DATE_TRUNC('month', date) AS month, SUM(amount) AS total_proj_exp FROM project_expenses GROUP BY 1) pe ON pe.month = m.month
ORDER BY m.month;

-- ============================================================
--  SEED DATA
-- ============================================================

INSERT INTO users (full_name, email, role) VALUES
    ('Finance Admin', 'finance@stellarsat.com', 'admin');

-- Company income (lot = NULL)
INSERT INTO income_records (date, source, description, amount, or_number, recorded_by) VALUES
    ('2026-01-02', 'Client Payment',   'Satellite Service',    120000, 'OR-2026-0001', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-13', 'Installation Fee', 'Equipment Setup',       80000, 'OR-2026-0002', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-28', 'Subscription',     'Monthly Service Plan',  60000, 'OR-2026-0003', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-03', 'Client Payment',   'Satellite Service',    140000, 'OR-2026-0004', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-18', 'Installation Fee', 'Equipment Setup',      100000, 'OR-2026-0005', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-03-06', 'Client Payment',   'Satellite Service',     90000, 'OR-2026-0006', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-03-24', 'Installation Fee', 'Equipment Setup',       70000, 'OR-2026-0007', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-04-05', 'Client Payment',   'Satellite Service',    200000, 'OR-2026-0008', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-04-18', 'Subscription',     'Monthly Service Plan',  55000, 'OR-2026-0009', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-05-10', 'Client Payment',   'Satellite Service',    150000, 'OR-2026-0010', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-05-22', 'Installation Fee', 'Equipment Setup',       65000, 'OR-2026-0011', (SELECT id FROM users WHERE email='finance@stellarsat.com'));

-- Project income (lot = 'Lot A'–'Lot G')
INSERT INTO income_records (date, source, description, lot, amount, or_number, recorded_by) VALUES
    ('2026-01-15', 'Client Payment', 'Satellite Service', 'Lot A',  10000, 'OR-2026-P001', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-15', 'Client Payment', 'Satellite Service', 'Lot B',  12500, 'OR-2026-P002', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-15', 'Client Payment', 'Satellite Service', 'Lot C',  15000, 'OR-2026-P003', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-15', 'Client Payment', 'Satellite Service', 'Lot D',  12200, 'OR-2026-P004', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-15', 'Client Payment', 'Satellite Service', 'Lot E',  12800, 'OR-2026-P005', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-15', 'Client Payment', 'Satellite Service', 'Lot F',  13500, 'OR-2026-P006', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-15', 'Client Payment', 'Satellite Service', 'Lot G',  12300, 'OR-2026-P007', (SELECT id FROM users WHERE email='finance@stellarsat.com'));

INSERT INTO company_expenses (date, description, category, vendor, amount, status, recorded_by) VALUES
    ('2026-01-14', 'Office Supplies',     'Supplies',  'National Book Store', 15200, 'completed', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-13', 'Electricity Bill',    'Utilities', 'MERALCO',             32400, 'completed', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-12', 'Internet Service',    'Utilities', 'PLDT',                 5800, 'completed', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-10', 'Equipment Purchase',  'Equipment', 'PC Express',          85000, 'progress',  (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-08', 'Janitorial Supplies', 'Supplies',  'Lazada Business',      4200, 'completed', (SELECT id FROM users WHERE email='finance@stellarsat.com'));

INSERT INTO project_expenses (date, project, description, category, vendor, amount, status, recorded_by) VALUES
    ('2026-01-13', 'Project Alpha', 'Concrete Materials',  'Materials', 'SM Construct',   88000, 'completed', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-12', 'Project Beta',  'Steel Reinforcement', 'Materials', 'Steel Masters',  124000, 'pending',   (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-11', 'Project Alpha', 'Labor Cost - Week 2', 'Labor',     'Internal',        45000, 'completed', (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-10', 'Project Gamma', 'Equipment Rental',    'Equipment', 'Rent-All PH',     32000, 'progress',  (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-09', 'Project Beta',  'Site Transportation', 'Logistics', 'Logistics Corp',  18500, 'completed', (SELECT id FROM users WHERE email='finance@stellarsat.com'));

INSERT INTO collections (date, client, or_number, amount_due, amount_collected, recorded_by) VALUES
    ('2026-01-20', 'XYZ Corporation',    'OR-2026-0050', 500000, 450000, (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-01-25', 'ABC Builders',        NULL,           320000,      0, (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-01', 'DEF Infrastructure', 'OR-2026-0048', 780000, 780000, (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-05', 'GHI Solutions',      'OR-2026-0047', 150000,  75000, (SELECT id FROM users WHERE email='finance@stellarsat.com')),
    ('2026-02-10', 'JKL Enterprises',     NULL,           220000,      0, (SELECT id FROM users WHERE email='finance@stellarsat.com'));

-- ============================================================
--  API QUERY REFERENCE
-- ============================================================

-- COMPANY INCOME (lot IS NULL)
-- GET all:     SELECT * FROM v_company_income WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW());
-- POST add:    INSERT INTO income_records (date, source, description, amount) VALUES ($1,$2,$3,$4) RETURNING *;
-- PUT update:  UPDATE income_records SET date=$1, source=$2, description=$3, amount=$4 WHERE id=$5 AND lot IS NULL RETURNING *;
-- DELETE:      DELETE FROM income_records WHERE id=$1;

-- PROJECT INCOME (lot IS NOT NULL)
-- GET all:     SELECT * FROM v_project_income WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW());
-- POST add:    INSERT INTO income_records (date, source, description, lot, amount) VALUES ($1,$2,$3,$4,$5) RETURNING *;
-- PUT update:  UPDATE income_records SET date=$1, source=$2, description=$3, lot=$4, amount=$5 WHERE id=$6 RETURNING *;
-- DELETE:      DELETE FROM income_records WHERE id=$1;

-- KPI + CHARTS
-- KPI total:    SELECT * FROM v_income_kpi;
-- Line chart:   SELECT month_label AS month, total FROM v_income_monthly;
-- Bar chart:    SELECT lot AS label, amount FROM v_income_by_lot;

-- COMPANY EXPENSES
-- GET all:     SELECT * FROM company_expenses ORDER BY date DESC;
-- POST add:    INSERT INTO company_expenses (date, description, category, vendor, amount, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *;
-- PUT update:  UPDATE company_expenses SET date=$1, description=$2, category=$3, vendor=$4, amount=$5, status=$6 WHERE id=$7 RETURNING *;
-- DELETE:      DELETE FROM company_expenses WHERE id=$1;

-- PROJECT EXPENSES
-- GET all:     SELECT * FROM v_proj_expenses_detail;
-- POST add:    INSERT INTO project_expenses (date, project, description, category, vendor, amount, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *;
-- PUT update:  UPDATE project_expenses SET date=$1, project=$2, description=$3, category=$4, vendor=$5, amount=$6, status=$7 WHERE id=$8 RETURNING *;
-- DELETE:      DELETE FROM project_expenses WHERE id=$1;

-- COLLECTIONS
-- GET all:     SELECT * FROM collections ORDER BY date DESC;
-- GET summary: SELECT * FROM v_collections_summary;
-- POST add:    INSERT INTO collections (date, client, or_number, amount_due, amount_collected) VALUES ($1,$2,$3,$4,$5) RETURNING *;
-- PUT update:  UPDATE collections SET date=$1, client=$2, or_number=$3, amount_due=$4, amount_collected=$5 WHERE id=$6 RETURNING *;
-- DELETE:      DELETE FROM collections WHERE id=$1;

-- LETTERS
-- GET all:    SELECT * FROM letters ORDER BY uploaded_at DESC;
-- POST add:   INSERT INTO letters (file_name, file_type, file_size, file_path) VALUES ($1,$2,$3,$4) RETURNING *;
-- DELETE:     DELETE FROM letters WHERE id=$1;

-- FINANCIAL REPORT
-- Monthly:    SELECT * FROM v_monthly_summary;
-- Dashboard KPIs:
--   SELECT
--     (SELECT COALESCE(SUM(amount),0)           FROM income_records   WHERE EXTRACT(YEAR FROM date)=EXTRACT(YEAR FROM NOW())) AS total_income,
--     (SELECT COALESCE(SUM(amount),0)           FROM company_expenses WHERE EXTRACT(YEAR FROM date)=EXTRACT(YEAR FROM NOW())) AS comp_expenses,
--     (SELECT COALESCE(SUM(amount),0)           FROM project_expenses WHERE EXTRACT(YEAR FROM date)=EXTRACT(YEAR FROM NOW())) AS proj_expenses,
--     (SELECT COALESCE(SUM(amount_collected),0) FROM collections      WHERE EXTRACT(YEAR FROM date)=EXTRACT(YEAR FROM NOW())) AS total_collections;

-- ============================================================
--  MIGRATION (if you already have data — run instead of above)
-- ============================================================
-- ALTER TABLE income_records DROP COLUMN IF EXISTS project_id;
-- ALTER TABLE income_records ADD COLUMN IF NOT EXISTS lot VARCHAR(50)
--   CONSTRAINT chk_lot CHECK (lot IN ('Lot A','Lot B','Lot C','Lot D','Lot E','Lot F','Lot G') OR lot IS NULL);
-- ALTER TABLE project_expenses DROP COLUMN IF EXISTS project_id;
-- ALTER TABLE project_expenses ADD COLUMN IF NOT EXISTS project VARCHAR(150);
-- UPDATE project_expenses pe SET project = p.project_name FROM projects p WHERE pe.project_id_old = p.id;
-- DROP TABLE IF EXISTS projects CASCADE;