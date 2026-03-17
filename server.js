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
  if (period === 'day')
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

app.get('/api/expenses', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const params = search ? [`%${search}%`] : [];
    const where = search ? `WHERE description ILIKE $1 OR category ILIKE $1 OR vendor ILIKE $1` : '';
    const result = await q(`SELECT * FROM company_expenses ${where} ORDER BY date DESC`, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { date, desc, cat, vendor, amount, status } = req.body;
    const result = await q(`INSERT INTO company_expenses (date,description,category,vendor,amount,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [date, desc, cat, vendor, amount, status]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { date, desc, cat, vendor, amount, status } = req.body;
    const result = await q(`UPDATE company_expenses SET date=$1,description=$2,category=$3,vendor=$4,amount=$5,status=$6 WHERE id=$7 RETURNING *`, [date, desc, cat, vendor, amount, status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
//  START
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 Finance Dashboard running at http://localhost:${PORT}`);
});