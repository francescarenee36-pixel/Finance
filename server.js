// ============================================================
//  STELLAR SAT SOLUTIONS INC — Finance Dashboard
//  Backend: Node.js + Express + PostgreSQL (pg)
//  Run:  node server.js  |  Port: 3000
// ============================================================

require('dotenv').config();

const express  = require('express');
const { Pool } = require('pg');
const path     = require('path');
const multer   = require('multer');
const fs       = require('fs');

const app  = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── File uploads ──────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
});
const upload = multer({ storage });

// ── PostgreSQL ────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'postgres',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '12345',
});
pool.connect()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

const q = (text, params) => pool.query(text, params);

// ── Date filter helper ────────────────────────────────────────
function buildDateFilter(period, from, to, params) {
  if (from || to) {
    const conds = [];
    if (from) { params.push(from); conds.push(`date >= $${params.length}`); }
    if (to)   { params.push(to);   conds.push(`date <= $${params.length}`); }
    return conds.join(' AND ');
  }
  // Today
  if (period === 'today' || period === 'day')
    return `date = CURRENT_DATE`;
  // Current calendar week (Monday to Sunday)
  if (period === 'week')
    return `date >= DATE_TRUNC('week', CURRENT_DATE) AND date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'`;
  // Current calendar month
  if (period === 'month')
    return `date >= DATE_TRUNC('month', CURRENT_DATE) AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`;
  // All records
  if (period === 'all')
    return '';
  // Current year (default)
  return `EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`;
}

// ============================================================
//  INCOME
// ============================================================

// GET all income (used as fallback)
app.get('/api/income', async (req, res) => {
  try {
    const { period = 'year', search = '' } = req.query;
    const params = [];
    const dateF = buildDateFilter(period, '', '', params);
    const conditions = [];
    if (dateF) conditions.push(dateF);
    if (search) { params.push(`%${search}%`); conditions.push(`(source ILIKE $${params.length} OR description ILIKE $${params.length})`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await q(`
      SELECT id, date, TO_CHAR(date,'Mon - DD - YYYY') AS date_formatted,
             lot, source, description, amount, or_number
      FROM income_records ${where} ORDER BY date DESC
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET project income (lot IS NOT NULL) — with all filters
app.get('/api/income/projects', async (req, res) => {
  try {
    const { period = 'year', search = '', lot = '', source = '', from = '', to = '' } = req.query;
    const params = [];
    const conditions = ['lot IS NOT NULL'];
    const dateF = buildDateFilter(period, from, to, params);
    if (dateF) conditions.push(dateF);
    if (lot)    { params.push(lot);           conditions.push(`lot = $${params.length}`); }
    if (source) { params.push(`%${source}%`); conditions.push(`source ILIKE $${params.length}`); }
    if (search) {
      const s = `%${search}%`;
      params.push(s); const i1 = params.length;
      params.push(s); const i2 = params.length;
      params.push(s); const i3 = params.length;
      conditions.push(`(lot ILIKE $${i1} OR source ILIKE $${i2} OR description ILIKE $${i3})`);
    }
    const where = 'WHERE ' + conditions.join(' AND ');
    const result = await q(`
      SELECT id, date, TO_CHAR(date,'Mon - DD - YYYY') AS date_formatted,
             lot, source, description, amount
      FROM income_records ${where} ORDER BY date DESC
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add company income
app.post('/api/income', async (req, res) => {
  try {
    const { date, source, description, amount } = req.body;
    const result = await q(`INSERT INTO income_records (date,source,description,amount) VALUES ($1,$2,$3,$4) RETURNING *`, [date, source, description, amount]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add project income
app.post('/api/income/project', async (req, res) => {
  try {
    const { date, lot, source, description, amount } = req.body;
    const result = await q(`INSERT INTO income_records (date,source,description,lot,amount) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [date, source, description, lot, amount]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update income
app.put('/api/income/:id', async (req, res) => {
  try {
    const { date, source, description, amount, lot } = req.body;
    const result = lot
      ? await q(`UPDATE income_records SET date=$1,source=$2,description=$3,lot=$4,amount=$5 WHERE id=$6 RETURNING *`, [date, source, description, lot, amount, req.params.id])
      : await q(`UPDATE income_records SET date=$1,source=$2,description=$3,amount=$4 WHERE id=$5 RETURNING *`, [date, source, description, amount, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE income
app.delete('/api/income/:id', async (req, res) => {
  try {
    await q(`DELETE FROM income_records WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET income KPI totals
app.get('/api/income/kpi', async (req, res) => {
  try {
    const { period = 'year', from = '', to = '' } = req.query;
    const params = [];
    const dateF = buildDateFilter(period, from, to, params);
    const where = dateF ? `WHERE ${dateF}` : '';
    const result = await q(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE lot IS NULL),     0) AS company_total,
        COALESCE(SUM(amount) FILTER (WHERE lot IS NOT NULL), 0) AS project_total,
        COALESCE(SUM(amount), 0)                                 AS total
      FROM income_records ${where}
    `, params);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET monthly income trend (line chart)
app.get('/api/income/monthly', async (req, res) => {
  try {
    const { period = 'year', from = '', to = '' } = req.query;
    const params = [];
    const dateF = buildDateFilter(period, from, to, params);
    const extra = dateF ? `AND ${dateF}` : '';
    const result = await q(`
      SELECT TO_CHAR(DATE_TRUNC('month',date),'Mon') AS month, SUM(amount) AS total
      FROM income_records
      WHERE 1=1 ${extra}
      GROUP BY DATE_TRUNC('month',date)
      ORDER BY DATE_TRUNC('month',date)
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET income by lot (bar chart)
app.get('/api/income/by-project', async (req, res) => {
  try {
    const { period = 'year', from = '', to = '' } = req.query;
    const params = [];
    const dateF = buildDateFilter(period, from, to, params);
    const extra = dateF ? `AND ${dateF}` : '';
    const result = await q(`
      SELECT lot AS label, SUM(amount) AS amount
      FROM income_records
      WHERE lot IS NOT NULL ${extra}
      GROUP BY lot ORDER BY lot
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET lots list
app.get('/api/projects', (req, res) => {
  const lots = ['Lot A','Lot B','Lot C','Lot D','Lot E','Lot F','Lot G'];
  res.json(lots.map((name, i) => ({ id: i+1, project_name: name })));
});

// ============================================================
//  COMPANY EXPENSES
// ============================================================

// ── Overview KPIs  GET /api/expenses/kpis?period=year ────────
app.get('/api/expenses/kpis', async (req, res) => {
  try {
    const params = [];
    const dateF  = buildDateFilter(req.query.period || 'year', '', '', params);
    const where  = dateF ? `WHERE ${dateF}` : '';
    const result = await q(`
      SELECT
        COALESCE(SUM(amount), 0)                                        AS grand_total,
        COALESCE(SUM(amount) FILTER (WHERE type = 'expenses'),  0)      AS expenses_total,
        COALESCE(SUM(amount) FILTER (WHERE type = 'purchases'), 0)      AS purchases_total,
        COALESCE(SUM(amount) FILTER (WHERE type = 'overhead'),  0)      AS overhead_total
      FROM company_expenses ${where}
    `, params);
    const row = result.rows[0];
    res.json({
      grand_total:     Number(row.grand_total),
      expenses_total:  Number(row.expenses_total),
      purchases_total: Number(row.purchases_total),
      overhead_total:  Number(row.overhead_total),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Chart data  GET /api/expenses/monthly?period=year ────────
app.get('/api/expenses/monthly', async (req, res) => {
  try {
    const period = req.query.period || 'year';
    const params = [];
    const dateF  = buildDateFilter(period, '', '', params);
    const where  = dateF ? `WHERE ${dateF}` : '';

    // For today: group by hour; for week: group by day; otherwise group by month
    let selectExpr, groupExpr, orderExpr;
    if (period === 'today' || period === 'day') {
      selectExpr = `TO_CHAR(DATE_TRUNC('hour', created_at), 'HH12 AM') AS month_label`;
      groupExpr  = `DATE_TRUNC('hour', created_at)`;
      orderExpr  = `DATE_TRUNC('hour', created_at)`;
    } else if (period === 'week') {
      selectExpr = `TO_CHAR(date, 'Dy DD Mon') AS month_label`;
      groupExpr  = `date`;
      orderExpr  = `date`;
    } else {
      selectExpr = `TRIM(TO_CHAR(DATE_TRUNC('month', date), 'Month')) AS month_label`;
      groupExpr  = `DATE_TRUNC('month', date)`;
      orderExpr  = `DATE_TRUNC('month', date)`;
    }

    const result = await q(`
      SELECT ${selectExpr}, SUM(amount) AS total
      FROM company_expenses ${where}
      GROUP BY ${groupExpr}
      ORDER BY ${orderExpr}
    `, params);
    res.json(result.rows.map(r => ({ ...r, total: Number(r.total) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Recent records table (Overview tab)
//    GET /api/expenses/recent?period=year&cat=&status=&search= ─
app.get('/api/expenses/recent', async (req, res) => {
  try {
    const { period = 'year', cat = '', status = '', search = '' } = req.query;
    const params = [];
    const dateF  = buildDateFilter(period, '', '', params);
    const conds  = dateF ? [dateF] : [];

    if (cat)    { params.push(cat.toLowerCase());    conds.push(`type = $${params.length}`); }
    if (status) { params.push(status.toLowerCase()); conds.push(`status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(description ILIKE $${params.length} OR category ILIKE $${params.length})`);
    }

    const where  = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    // Show 10 by default; expand to 50 when any filter is actively applied
    const limit = (cat || status || search) ? 50 : 10;
    const result = await q(`
      SELECT id, type, date, category, description, amount, status, vendor
      FROM company_expenses ${where}
      ORDER BY date DESC LIMIT ${limit}
    `, params);
    res.json(result.rows.map(r => ({ ...r, amount: Number(r.amount) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Sub-panel KPIs  GET /api/expenses/sub-kpis?type=expenses ─
app.get('/api/expenses/sub-kpis', async (req, res) => {
  try {
    const type   = req.query.type || 'expenses';
    const result = await q(`
      SELECT
        COALESCE(SUM(amount), 0)                                      AS total,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'),    0)    AS paid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'unpaid'),  0)    AS unpaid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)    AS pending
      FROM company_expenses WHERE type = $1
    `, [type]);
    const row = result.rows[0];
    res.json({
      total:   Number(row.total),
      paid:    Number(row.paid),
      unpaid:  Number(row.unpaid),
      pending: Number(row.pending),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Sub-panel list  GET /api/expenses/list?type=expenses&cat=&status=&search= ─
app.get('/api/expenses/list', async (req, res) => {
  try {
    const { type = 'expenses', cat = '', status = '', search = '' } = req.query;
    const params = [type];
    const conds  = ['type = $1'];

    if (cat)    { params.push(cat);          conds.push(`category = $${params.length}`); }
    if (status) { params.push(status);       conds.push(`status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(description ILIKE $${params.length} OR category ILIKE $${params.length})`);
    }

    const result = await q(`
      SELECT id, type, date, category, description, vendor, amount, status
      FROM company_expenses WHERE ${conds.join(' AND ')}
      ORDER BY date DESC
    `, params);
    res.json(result.rows.map(r => ({ ...r, amount: Number(r.amount) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Legacy list  GET /api/expenses?search= ───────────────────
app.get('/api/expenses', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = search ? [`%${search}%`] : [];
    const where  = search
      ? `WHERE description ILIKE $1 OR category ILIKE $1 OR COALESCE(vendor,'') ILIKE $1`
      : '';
    const result = await q(`SELECT * FROM company_expenses ${where} ORDER BY date DESC`, params);
    res.json(result.rows.map(r => ({ ...r, amount: Number(r.amount) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Add  POST /api/expenses ───────────────────────────────────
app.post('/api/expenses', async (req, res) => {
  try {
    const { date, desc, cat, vendor, amount, status, type } = req.body;
    const result = await q(`
      INSERT INTO company_expenses (type, date, category, description, vendor, amount, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [type || 'expenses', date, cat, desc, vendor || null, amount, status || 'pending']);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Edit  PUT /api/expenses/:id ───────────────────────────────
app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { date, desc, cat, vendor, amount, status, type } = req.body;
    const result = await q(`
      UPDATE company_expenses
      SET type=$1, date=$2, category=$3, description=$4, vendor=$5, amount=$6, status=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [type || 'expenses', date, cat, desc, vendor || null, amount, status, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Delete  DELETE /api/expenses/:id ─────────────────────────
app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await q(`DELETE FROM company_expenses WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
//  PROJECT EXPENSES
// ============================================================

app.get('/api/project-expenses', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = search ? [`%${search}%`] : [];
    const where = search ? `WHERE description ILIKE $1 OR category ILIKE $1 OR vendor ILIKE $1 OR project ILIKE $1` : '';
    const result = await q(`SELECT * FROM project_expenses ${where} ORDER BY date DESC`, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/project-expenses', async (req, res) => {
  try {
    const { date, project, desc, cat, vendor, amount, status } = req.body;
    const result = await q(`INSERT INTO project_expenses (date,project,description,category,vendor,amount,status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [date, project, desc, cat, vendor, amount, status]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/project-expenses/:id', async (req, res) => {
  try {
    const { date, project, desc, cat, vendor, amount, status } = req.body;
    const result = await q(`UPDATE project_expenses SET date=$1,project=$2,description=$3,category=$4,vendor=$5,amount=$6,status=$7 WHERE id=$8 RETURNING *`, [date, project, desc, cat, vendor, amount, status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/project-expenses/:id', async (req, res) => {
  try {
    await q(`DELETE FROM project_expenses WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
//  COLLECTIONS
// ============================================================

app.get('/api/collections', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = search ? [`%${search}%`] : [];
    const where = search ? `WHERE client ILIKE $1 OR COALESCE(or_number,'') ILIKE $1` : '';
    const result = await q(`SELECT * FROM collections ${where} ORDER BY date DESC`, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/collections', async (req, res) => {
  try {
    const { date, client, or: orNum, due, collected } = req.body;
    const result = await q(`INSERT INTO collections (date,client,or_number,amount_due,amount_collected) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [date, client, orNum||null, due, collected||0]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/collections/:id', async (req, res) => {
  try {
    const { date, client, or: orNum, due, collected } = req.body;
    const result = await q(`UPDATE collections SET date=$1,client=$2,or_number=$3,amount_due=$4,amount_collected=$5 WHERE id=$6 RETURNING *`, [date, client, orNum||null, due, collected||0, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/collections/:id', async (req, res) => {
  try {
    await q(`DELETE FROM collections WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
//  LETTERS
// ============================================================

app.get('/api/letters', async (req, res) => {
  try {
    const result = await q(`SELECT * FROM letters ORDER BY uploaded_at DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/letters', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const fileType = file.originalname.split('.').pop().toUpperCase();
    const fileSize = file.size < 1048576 ? (file.size/1024).toFixed(1)+' KB' : (file.size/1048576).toFixed(1)+' MB';
    const result = await q(`INSERT INTO letters (file_name,file_type,file_size,file_path) VALUES ($1,$2,$3,$4) RETURNING *`, [file.originalname, fileType, fileSize, '/uploads/'+file.filename]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/letters/:id', async (req, res) => {
  try {
    const row = await q(`SELECT file_path FROM letters WHERE id=$1`, [req.params.id]);
    if (row.rows[0]) {
      const fp = path.join(__dirname, 'public', row.rows[0].file_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await q(`DELETE FROM letters WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
//  FINANCIAL REPORT
// ============================================================

app.get('/api/report/monthly', async (req, res) => {
  try {
    const result = await q(`SELECT * FROM v_monthly_summary`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/report/kpis', async (req, res) => {
  try {
    const result = await q(`
      SELECT
        (SELECT COALESCE(SUM(amount),0)           FROM income_records   WHERE EXTRACT(YEAR FROM date)=EXTRACT(YEAR FROM NOW())) AS total_income,
        (SELECT COALESCE(SUM(amount),0)           FROM company_expenses WHERE EXTRACT(YEAR FROM date)=EXTRACT(YEAR FROM NOW())) AS comp_expenses,
        (SELECT COALESCE(SUM(amount),0)           FROM project_expenses WHERE EXTRACT(YEAR FROM date)=EXTRACT(YEAR FROM NOW())) AS proj_expenses,
        (SELECT COALESCE(SUM(amount_collected),0) FROM collections      WHERE EXTRACT(YEAR FROM date)=EXTRACT(YEAR FROM NOW())) AS total_collections
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
//  EMPLOYEE
// ============================================================

function empSearchWhere(search, fields, params) {
  if (!search) return '';
  params.push(`%${search}%`);
  const n = params.length;
  return `AND (${fields.map(f => `${f} ILIKE $${n}`).join(' OR ')})`;
}

// ── REIMBURSE ─────────────────────────────────────────────────

app.get('/api/employee/reimburse', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = [];
    const sw = empSearchWhere(search, ['employee_name', 'description', 'role::text'], params);
    const result = await q(
      `SELECT id, employee_name, role, request_date, description, amount, status, comment
       FROM reimburse WHERE 1=1 ${sw} ORDER BY request_date DESC`, params
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/employee/reimburse/:id', async (req, res) => {
  try {
    const result = await q(`SELECT * FROM reimburse WHERE id=$1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Finance: Approve / Decline  +  optional comment (can send just comment too)
app.patch('/api/employee/reimburse/:id/action', async (req, res) => {
  try {
    const { status, comment } = req.body;
    const sets = [], params = [];
    if (status  !== undefined) { params.push(status);  sets.push(`status=$${params.length}::request_status`); }
    if (comment !== undefined) { params.push(comment); sets.push(`comment=COALESCE($${params.length}, comment)`); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const result = await q(
      `UPDATE reimburse SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── BUDGET REQUESTS ───────────────────────────────────────────

app.get('/api/employee/budget', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = [];
    const sw = empSearchWhere(search, ['employee_name', 'description', 'role::text'], params);
    const result = await q(
      `SELECT id, employee_name, role, request_date, description, amount, status, comment
       FROM budget_requests WHERE 1=1 ${sw} ORDER BY request_date DESC`, params
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/employee/budget/:id', async (req, res) => {
  try {
    const result = await q(`SELECT * FROM budget_requests WHERE id=$1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Finance: Done (approve) / Decline  +  optional comment
app.patch('/api/employee/budget/:id/action', async (req, res) => {
  try {
    const { status, comment } = req.body;
    const sets = [], params = [];
    if (status  !== undefined) { params.push(status);  sets.push(`status=$${params.length}::request_status`); }
    if (comment !== undefined) { params.push(comment); sets.push(`comment=COALESCE($${params.length}, comment)`); }
    if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const result = await q(
      `UPDATE budget_requests SET ${sets.join(',')}, updated_at=NOW() WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SALARY ADVANCES ───────────────────────────────────────────

app.get('/api/employee/salary', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = [];
    const sw = empSearchWhere(search, ['employee_name'], params);
    const result = await q(
      `SELECT id, employee_name, advance_amount, balance, advance_date, status
       FROM salary_advances WHERE 1=1 ${sw} ORDER BY advance_date DESC`, params
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/employee/salary/:id', async (req, res) => {
  try {
    const result = await q(`SELECT * FROM salary_advances WHERE id=$1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/employee/salary', async (req, res) => {
  try {
    const { employee_name, advance_amount, balance, advance_date, status } = req.body;
    const result = await q(
      `INSERT INTO salary_advances (employee_name, advance_amount, balance, advance_date, status)
       VALUES ($1,$2,$3,$4,$5::request_status) RETURNING *`,
      [employee_name, advance_amount, balance ?? 0, advance_date, status || 'Pending']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/employee/salary/:id', async (req, res) => {
  try {
    const { employee_name, advance_amount, balance, advance_date, status } = req.body;
    const result = await q(
      `UPDATE salary_advances
       SET employee_name=$1, advance_amount=$2, balance=$3, advance_date=$4,
           status=$5::request_status, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [employee_name, advance_amount, balance ?? 0, advance_date, status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/employee/salary/:id', async (req, res) => {
  try {
    await q(`DELETE FROM salary_advances WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
//  START
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 Finance Dashboard running at http://localhost:${PORT}`);
});