/* ================= USER SESSION ================= */

const user = { full_name: "Finance Officer", email: "finance@finance.com" };

/* ================= GLOBAL ================= */

const mainContent = document.getElementById("mainContent");
const API = "";  // Same origin — Express serves both frontend and API

let currentPage = 1;
const rowsPerPage = 7;

/* ================= SIDEBAR ================= */

document.querySelectorAll(".menu li").forEach(item => {
  item.addEventListener("click", function () {
    document.querySelectorAll(".menu li").forEach(li => li.classList.remove("active"));
    this.classList.add("active");
    const text = this.querySelector("span")?.innerText?.trim() || this.innerText.trim();
    if (text === "Dashboard")                          loadDashboard();
    if (text === "Company Income")                     loadCompanyIncome();
    if (text === "Company Expenses and Purchases")     loadCompanyExpenses();
    if (text === "Project Expenses and Purchases")     loadProjectExpenses();
    if (text === "Financial Report")                   loadFinancialReport();
    if (text === "Collections")                        loadCollections();
    if (text === "Letters")                            loadLetters();
    if (text === "Settings")                           loadSettings();
  });
});


/* ================= SIDEBAR TOGGLE ================= */

document.getElementById("toggleSidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
});

/* ================= DARK MODE TOGGLE ================= */

function applyDarkModeFromStorage() {
  const dark = localStorage.getItem("darkMode") === "true";
  document.body.classList.toggle("dark", dark);
}
applyDarkModeFromStorage();

/* ================= TOAST ================= */

function showToast(message, type = "success") {
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();
  const colors = { success: "#16a34a", error: "#dc2626", info: "#2f4b85" };
  const icons  = { success: "ri-checkbox-circle-line", error: "ri-close-circle-line", info: "ri-information-line" };
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: ${colors[type]}; color: white;
    padding: 12px 20px; border-radius: 12px;
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    animation: slideInRight 0.3s ease;
  `;
  toast.innerHTML = `<i class="${icons[type]}"></i> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transition = "opacity 0.4s"; setTimeout(() => toast.remove(), 400); }, 3000);
}

/* ================= COUNTERS ================= */

function runCounters() {
  document.querySelectorAll(".counter").forEach(counter => {
    const target = +counter.getAttribute("data-target");
    let count = 0;
    const update = () => {
      if (count < target) {
        count += Math.ceil(target / 80);
        counter.innerText = Math.min(count, target).toLocaleString();
        setTimeout(update, 12);
      } else {
        counter.innerText = target.toLocaleString();
      }
    };
    update();
  });
}

/* ================= FORMAT HELPERS ================= */

function formatCurrency(amount) {
  return "₱" + Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "2-digit" });
}

/* ================= DASHBOARD ================= */

function loadDashboard() {
  mainContent.innerHTML = `
    <div class="topbar">
      <div class="left">
        <h2><i class="ri-dashboard-line" style="color:#2f4b85;"></i> Finance Dashboard</h2>
        <p style="color:#6b7280;font-size:13px;margin-top:2px;">Welcome back, ${user?.full_name || user?.email || "Finance Officer"}</p>
      </div>
      <div class="right">
        <div class="search-box">
          <i class="ri-search-line"></i>
          <input type="text" placeholder="Search records…">
        </div>
        <button class="icon-btn" title="Toggle Dark Mode" onclick="document.body.classList.toggle('dark'); localStorage.setItem('darkMode', document.body.classList.contains('dark'))">
          <i class="ri-moon-line"></i>
        </button>
        <button class="icon-btn" title="Notifications">
          <i class="ri-notification-3-line"></i>
        </button>
      </div>
    </div>

    <div class="section-title">Key Financial Indicators</div>

    <div class="cards" id="dashKpiCards">
      <div class="card">
        <div class="card-top"><div class="icon-box green"><i class="ri-line-chart-line"></i></div>
          <div class="stat"><h1 id="kpiIncome">0</h1><span class="trend up">↑ this year</span></div>
        </div><p>Total Company Income</p>
      </div>
      <div class="card pulse">
        <div class="card-top"><div class="icon-box red"><i class="ri-shopping-cart-line"></i></div>
          <div class="stat"><h1 id="kpiCompExp">0</h1><span class="trend down">this year</span></div>
        </div><p>Company Expenses</p>
      </div>
      <div class="card">
        <div class="card-top"><div class="icon-box orange"><i class="ri-file-list-3-line"></i></div>
          <div class="stat"><h1 id="kpiProjExp">0</h1><span class="trend down">this year</span></div>
        </div><p>Project Expenses</p>
      </div>
      <div class="card">
        <div class="card-top"><div class="icon-box blue"><i class="ri-hand-coin-line"></i></div>
          <div class="stat"><h1 id="kpiCollections">0</h1><span class="trend up">↑ this year</span></div>
        </div><p>Total Collections</p>
      </div>
    </div>

    <div class="section-title">Recent Transactions</div>

    <div class="table-container">
      <div class="table-title"><i class="ri-exchange-funds-line"></i> Latest Financial Activity</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${generateDashboardRows()}
        </tbody>
      </table>
    </div>

    <div class="section-title">Collections Overview</div>
    <div class="table-container">
      <div class="table-title"><i class="ri-hand-coin-line"></i> Pending & Recent Collections</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Client / Project</th>
            <th>Due Date</th>
            <th>Amount Due</th>
            <th>Collected</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${generateCollectionRows()}
        </tbody>
      </table>
    </div>
  `;
  // Load KPIs from API
  api("GET", "/api/report/kpis").then(kpis => {
    const fmt = (n) => formatCurrency(n);
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = fmt(val); };
    el("kpiIncome",      kpis.total_income);
    el("kpiCompExp",     kpis.comp_expenses);
    el("kpiProjExp",     kpis.proj_expenses);
    el("kpiCollections", kpis.total_collections);
  }).catch(() => {
    // Server not running — show dashes
    ["kpiIncome","kpiCompExp","kpiProjExp","kpiCollections"].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.textContent = "—";
    });
  });
}

function generateDashboardRows() {
  const rows = [
    { date: "2025-07-15", desc: "Client Payment – Project Alpha", cat: "Income", amount: 250000, status: "completed" },
    { date: "2025-07-14", desc: "Office Supplies Purchase",       cat: "Expense", amount: 15200, status: "completed" },
    { date: "2025-07-13", desc: "Project Beta – Material Cost",   cat: "Project Expense", amount: 88000, status: "pending" },
    { date: "2025-07-12", desc: "Utility Bills – July",           cat: "Expense", amount: 32400, status: "completed" },
    { date: "2025-07-11", desc: "Collection – XYZ Corp",          cat: "Collection", amount: 450000, status: "completed" },
    { date: "2025-07-10", desc: "Equipment Maintenance",          cat: "Expense", amount: 9500, status: "progress" },
    { date: "2025-07-09", desc: "Client Payment – Project Gamma", cat: "Income", amount: 180000, status: "completed" },
  ];
  return rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${formatDate(r.date)}</td>
      <td>${r.desc}</td>
      <td><span class="badge ${r.cat === "Income" || r.cat === "Collection" ? "completed" : r.cat === "Project Expense" ? "medium" : "high"}">${r.cat}</span></td>
      <td style="font-weight:600;color:${r.cat === "Income" || r.cat === "Collection" ? "#16a34a" : "#dc2626"}">${formatCurrency(r.amount)}</td>
      <td><span class="badge ${r.status}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></td>
    </tr>
  `).join("");
}

function generateCollectionRows() {
  const rows = [
    { client: "XYZ Corporation",      due: "2025-07-20", due_amt: 500000, collected: 450000 },
    { client: "ABC Builders",         due: "2025-07-25", due_amt: 320000, collected: 0 },
    { client: "DEF Infrastructure",   due: "2025-08-01", due_amt: 780000, collected: 780000 },
    { client: "GHI Solutions",        due: "2025-08-05", due_amt: 150000, collected: 75000 },
    { client: "JKL Enterprises",      due: "2025-08-10", due_amt: 220000, collected: 0 },
  ];
  return rows.map((r, i) => {
    const balance = r.due_amt - r.collected;
    const pct = r.due_amt > 0 ? Math.round((r.collected / r.due_amt) * 100) : 0;
    const status = pct === 100 ? "completed" : pct > 0 ? "progress" : "pending";
    const statusLabel = pct === 100 ? "Paid" : pct > 0 ? "Partial" : "Unpaid";
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${r.client}</td>
        <td>${formatDate(r.due)}</td>
        <td style="font-weight:600;">${formatCurrency(r.due_amt)}</td>
        <td style="color:#16a34a;font-weight:600;">${formatCurrency(r.collected)}</td>
        <td style="color:${balance > 0 ? "#dc2626" : "#16a34a"};font-weight:600;">${formatCurrency(balance)}</td>
        <td><span class="badge ${status}">${statusLabel}</span></td>
      </tr>
    `;
  }).join("");
}

/* ================= API HELPER ================= */

async function api(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function apiUpload(url, formData) {
  const res = await fetch(API + url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

/* ================= COMPANY INCOME ================= */

let incActiveTab    = "overview";
let incOvPeriod     = "year";   // overview period: day|week|month|year|custom
let incOvFrom       = "";       // overview custom from
let incOvTo         = "";       // overview custom to
let incSearchQuery  = "";
let incFilterLot    = "";
let incFilterSource = "";
let incFilterFrom   = "";       // income tab from
let incFilterTo     = "";       // income tab to
let incLineChartInst = null;
let incBarChartInst  = null;
let incDeleteId      = null;

function incDestroyCharts() {
  if (incLineChartInst) { incLineChartInst.destroy(); incLineChartInst = null; }
  if (incBarChartInst)  { incBarChartInst.destroy();  incBarChartInst  = null; }
}

function loadCompanyIncome() {
  incDestroyCharts();
  incActiveTab    = "overview";
  incOvPeriod     = "year";
  incOvFrom = incOvTo = "";
  incSearchQuery  = "";
  incFilterLot = incFilterSource = incFilterFrom = incFilterTo = "";

  mainContent.innerHTML = `
  <div class="inc-page">

    <!-- Header -->
    <div class="inc-hdr">
      <div class="inc-av"><i class="ri-user-smile-line" style="font-size:22px;color:#1e3a6e;"></i></div>
      <span class="inc-wb">Welcome back!</span>
      <div class="inc-srch">
        <i class="ri-search-line"></i>
        <input type="text" placeholder="Search here" id="incSearchInput">
      </div>
      <button class="inc-bell"><i class="ri-notification-3-line"></i><span class="bdot"></span></button>
    </div>

    <!-- Actions -->
    <div class="inc-act">
      <button class="inc-btn-add" id="incAddBtn" style="display:none;">
        <i class="ri-add-line"></i> Add Income
      </button>
      <!-- Period filter + custom range — Overview only -->
      <div id="incPeriodWrap" style="display:flex;align-items:center;gap:8px;">
        <div class="inc-flt-wrap">
          <button class="inc-btn-flt" id="incFilterBtn">
            <i class="ri-equalizer-line"></i> Filter <i class="ri-arrow-down-s-line"></i>
          </button>
          <div class="inc-flt-dd" id="incFltDd">
            <div class="inc-flt-opt" id="incFopt-day">Day</div>
            <div class="inc-flt-opt" id="incFopt-week">Week</div>
            <div class="inc-flt-opt" id="incFopt-month">Month</div>
            <div class="inc-flt-opt active" id="incFopt-year">Year</div>
            <div class="inc-flt-opt" id="incFopt-custom" style="border-top:1px solid #e5e7eb;margin-top:4px;padding-top:12px;">
              <i class="ri-calendar-line" style="margin-right:4px;"></i>Custom Range
            </div>
          </div>
        </div>
        <!-- Custom date inputs — shown when Custom Range selected -->
        <div id="incOvCustomRange" style="display:none;align-items:center;gap:6px;">
          <input type="date" id="incOvFrom" style="padding:6px 10px;border:1.5px solid #c8d8e8;border-radius:8px;font-size:13px;color:#374151;outline:none;background:white;">
          <span style="color:#6b7280;font-size:13px;">to</span>
          <input type="date" id="incOvTo" style="padding:6px 10px;border:1.5px solid #c8d8e8;border-radius:8px;font-size:13px;color:#374151;outline:none;background:white;">
          <button id="incOvApply" style="padding:6px 14px;background:#1e3a6e;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">
            Apply
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="inc-tabs-row">
      <div class="inc-tabs">
        <button class="inc-tab active" id="incTabOv">Overview</button>
        <button class="inc-tab"        id="incTabIn">Income</button>
      </div>
    </div>

    <!-- Filter Bar — Income tab only -->
    <div id="incFilterBar" style="display:none; background:#eaf1f8; border-bottom:1.5px solid #c8d8e8; padding:14px 22px; flex-wrap:wrap; gap:12px; align-items:flex-end;">
      <div style="display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:11px;font-weight:700;color:#4b6a90;text-transform:uppercase;letter-spacing:.4px;">From</label>
        <input type="date" id="incFltFrom" style="padding:7px 10px;border:1.5px solid #c8d8e8;border-radius:8px;font-size:13px;color:#374151;outline:none;background:white;">
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:11px;font-weight:700;color:#4b6a90;text-transform:uppercase;letter-spacing:.4px;">To</label>
        <input type="date" id="incFltTo" style="padding:7px 10px;border:1.5px solid #c8d8e8;border-radius:8px;font-size:13px;color:#374151;outline:none;background:white;">
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:11px;font-weight:700;color:#4b6a90;text-transform:uppercase;letter-spacing:.4px;">Lot</label>
        <select id="incFltLot" style="padding:7px 10px;border:1.5px solid #c8d8e8;border-radius:8px;font-size:13px;color:#374151;outline:none;background:white;min-width:110px;">
          <option value="">All Lots</option>
          <option>Lot A</option><option>Lot B</option><option>Lot C</option>
          <option>Lot D</option><option>Lot E</option><option>Lot F</option><option>Lot G</option>
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;">
        <label style="font-size:11px;font-weight:700;color:#4b6a90;text-transform:uppercase;letter-spacing:.4px;">Source</label>
        <input type="text" id="incFltSource" placeholder="e.g. Client Payment" style="padding:7px 10px;border:1.5px solid #c8d8e8;border-radius:8px;font-size:13px;color:#374151;outline:none;background:white;min-width:160px;">
      </div>
      <div style="display:flex;gap:8px;align-items:flex-end;">
        <button id="incFltApply" style="padding:8px 18px;background:#1e3a6e;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;">
          <i class="ri-filter-line"></i> Apply
        </button>
        <button id="incFltClear" style="padding:8px 14px;background:white;color:#6b7280;border:1.5px solid #c8d8e8;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;">
          <i class="ri-close-line"></i> Clear
        </button>
      </div>
    </div>

    <!-- Panels -->
    <div class="inc-body">

      <!-- OVERVIEW -->
      <div id="incPanelOv">
        <div class="inc-kpi-card">
          <div class="inc-kpi-icon">&#128176;</div>
          <div>
            <div class="inc-kpi-amount" id="incKpiAmt">Loading...</div>
            <div class="inc-kpi-label" id="incKpiLabel">Total Income this Year</div>
          </div>
        </div>
        <div class="inc-charts-row">
          <div class="inc-chart-card">
            <div class="inc-chart-title">Income Trends</div>
            <canvas id="incLineChart" height="230"></canvas>
          </div>
          <div class="inc-chart-bare">
            <div class="inc-chart-title">Income by Lot (A-G)</div>
            <canvas id="incBarChart" height="270"></canvas>
          </div>
        </div>
      </div>

      <!-- INCOME TABLE -->
      <div id="incPanelIn" style="display:none;">
        <!-- Total card at top -->
        <div style="display:flex;align-items:center;justify-content:space-between;background:#1e3a6e;border-radius:13px;padding:18px 28px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:46px;height:46px;background:rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">&#128176;</div>
            <div>
              <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:.6px;">Total Income</div>
              <div id="incTableTotal" style="font-size:28px;font-weight:900;color:white;line-height:1.2;">&#8369; 0</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div id="incTableCount" style="font-size:13px;color:rgba(255,255,255,0.7);"></div>
            <div id="incTableRange" style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px;"></div>
          </div>
        </div>
        <!-- Table -->
        <div class="inc-tbl-wrap">
          <div class="inc-tbl-banner">INCOME REPORTS</div>
          <table class="inc-tbl">
            <thead>
              <tr><th>Date</th><th>Lot</th><th>Source</th><th>Description</th><th>Amount</th><th>Actions</th></tr>
            </thead>
            <tbody id="incTbody"><tr><td colspan="6" class="inc-empty">Loading...</td></tr></tbody>
          </table>
        </div>
      </div>

    </div>
  </div>`;

  // Wire all events
  document.getElementById("incTabOv").addEventListener("click", () => incSwitchTab("overview"));
  document.getElementById("incTabIn").addEventListener("click", () => incSwitchTab("income"));
  document.getElementById("incAddBtn").addEventListener("click", incOpenAddModal);
  document.getElementById("incFilterBtn").addEventListener("click", incToggleFilter);
  document.getElementById("incSearchInput").addEventListener("input", () => {
    incSearchQuery = document.getElementById("incSearchInput").value.toLowerCase();
    if (incActiveTab === "income") incRefreshTable();
  });
  ["day","week","month","year"].forEach(p =>
    document.getElementById("incFopt-"+p).addEventListener("click", () => incSetPeriod(p))
  );
  document.getElementById("incFopt-custom").addEventListener("click", () => {
    document.getElementById("incFltDd").classList.remove("show");
    document.querySelectorAll(".inc-flt-opt").forEach(o => o.classList.remove("active"));
    document.getElementById("incFopt-custom").classList.add("active");
    document.getElementById("incOvCustomRange").style.display = "flex";
    incOvPeriod = "custom";
  });
  document.getElementById("incOvApply").addEventListener("click", () => {
    incOvFrom = document.getElementById("incOvFrom").value;
    incOvTo   = document.getElementById("incOvTo").value;
    if (!incOvFrom && !incOvTo) { showToast("Please select at least one date.", "error"); return; }
    incRefreshOverview();
    showToast("Custom range applied.", "info");
  });
  document.getElementById("incFltApply").addEventListener("click", () => {
    incFilterFrom   = document.getElementById("incFltFrom").value;
    incFilterTo     = document.getElementById("incFltTo").value;
    incFilterLot    = document.getElementById("incFltLot").value;
    incFilterSource = document.getElementById("incFltSource").value.trim();
    incRefreshTable();
    showToast("Filters applied.", "info");
  });
  document.getElementById("incFltClear").addEventListener("click", () => {
    incFilterFrom = incFilterTo = incFilterLot = incFilterSource = "";
    document.getElementById("incFltFrom").value = "";
    document.getElementById("incFltTo").value   = "";
    document.getElementById("incFltLot").value  = "";
    document.getElementById("incFltSource").value = "";
    incRefreshTable();
    showToast("Filters cleared.", "info");
  });
  document.removeEventListener("click", incOutsideClick);
  document.addEventListener("click", incOutsideClick);

  incRefreshOverview();
  incRefreshTable();
}

/* ── Tab switch ── */
function incSwitchTab(tab) {
  incActiveTab = tab;
  const isOv = tab === "overview";
  document.getElementById("incTabOv").classList.toggle("active",  isOv);
  document.getElementById("incTabIn").classList.toggle("active", !isOv);
  document.getElementById("incPanelOv").style.display    = isOv ? "" : "none";
  document.getElementById("incPanelIn").style.display    = isOv ? "none" : "";
  document.getElementById("incAddBtn").style.display     = isOv ? "none" : "";
  document.getElementById("incPeriodWrap").style.display = isOv ? "flex" : "none";
  document.getElementById("incFilterBar").style.display  = isOv ? "none" : "flex";
  if (isOv) { incDestroyCharts(); incRefreshOverview(); }
  else incRefreshTable();
}

/* ── Period filter ── */
function incToggleFilter(e) {
  e && e.stopPropagation();
  document.getElementById("incFltDd").classList.toggle("show");
}
function incOutsideClick(e) {
  const dd = document.getElementById("incFltDd");
  const btn = document.getElementById("incFilterBtn");
  if (dd && btn && dd.classList.contains("show") && !btn.contains(e.target) && !dd.contains(e.target))
    dd.classList.remove("show");
}
function incSetPeriod(p) {
  incOvPeriod = p;
  incOvFrom   = "";
  incOvTo     = "";
  document.getElementById("incFltDd")?.classList.remove("show");
  document.querySelectorAll(".inc-flt-opt").forEach(o => o.classList.remove("active"));
  document.getElementById("incFopt-"+p)?.classList.add("active");
  document.getElementById("incOvCustomRange").style.display = "none";
  incRefreshOverview();
  showToast("Filtered by: " + capitalize(p), "info");
}

/* ── Overview query params ── */
function incOvParams() {
  const p = new URLSearchParams();
  if (incOvPeriod === "custom" && (incOvFrom || incOvTo)) {
    if (incOvFrom) p.set("from", incOvFrom);
    if (incOvTo)   p.set("to",   incOvTo);
  } else {
    p.set("period", incOvPeriod || "year");
  }
  return p.toString();
}

/* ── Income table query params ── */
function incBuildQuery() {
  const p = new URLSearchParams();
  if (incFilterFrom)   p.set("from",   incFilterFrom);
  if (incFilterTo)     p.set("to",     incFilterTo);
  if (incFilterLot)    p.set("lot",    incFilterLot);
  if (incFilterSource) p.set("source", incFilterSource);
  if (incSearchQuery)  p.set("search", incSearchQuery);
  if (!incFilterFrom && !incFilterTo) p.set("period", "all");
  return p.toString();
}

/* ── Overview ── */
async function incRefreshOverview() {
  try {
    const qs = incOvParams();
    const [kpi, monthly, byLot] = await Promise.all([
      api("GET", "/api/income/kpi?" + qs),
      api("GET", "/api/income/monthly?" + qs),
      api("GET", "/api/income/by-project?" + qs),
    ]);
    const el    = document.getElementById("incKpiAmt");
    const label = document.getElementById("incKpiLabel");
    if (el) el.textContent = "\u20b1 " + Number(kpi.total).toLocaleString();
    if (label) {
      const map = { day:"Today", week:"This Week", month:"This Month", year:"This Year", custom:"Custom Range" };
      label.textContent = "Total Income \u2014 " + (map[incOvPeriod] || "This Year");
    }
    incDrawCharts(monthly, byLot);
  } catch (err) {
    const el = document.getElementById("incKpiAmt");
    if (el) el.innerHTML = '<span style="font-size:13px;color:#dc2626;">Server offline \u2014 run npm start</span>';
  }
}

function incDrawCharts(monthly, byLot) {
  const lc = document.getElementById("incLineChart");
  const bc = document.getElementById("incBarChart");
  if (!lc || !bc) return;
  incDestroyCharts();
  const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthMap = {};
  monthly.forEach(r => { monthMap[r.month] = Number(r.total); });
  // Show only months that have data; if no data at all show all 12 with zeros
  const lbls = monthly.length ? monthOrder.filter(m => monthMap[m] !== undefined) : monthOrder;
  const vals = lbls.map(m => monthMap[m] || 0);
  incLineChartInst = new Chart(lc, {
    type:"line",
    data:{labels:lbls,datasets:[{data:vals,borderColor:"#3b82f6",backgroundColor:"rgba(59,130,246,.06)",
      borderWidth:2.5,pointBackgroundColor:"#3b82f6",pointRadius:5,tension:.35,fill:true}]},
    options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>"\u20b1"+c.parsed.y.toLocaleString()}}},
      scales:{y:{ticks:{callback:v=>v.toLocaleString(),font:{size:11}},grid:{color:"rgba(0,0,0,.05)"}},
              x:{ticks:{font:{size:11}},grid:{display:false}}}}
  });
  incBarChartInst = new Chart(bc, {
    type:"bar",
    data:{labels:byLot.map(p=>p.label),datasets:[{data:byLot.map(p=>Number(p.amount)),
      backgroundColor:["#3b82f6","#10b981","#f59e0b","#ec4899","#8b5cf6","#f97316","#14b8a6"],
      borderRadius:9, barPercentage:.6, categoryPercentage:.7}]},
    options:{
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>"\u20b1"+c.parsed.y.toLocaleString()}}},
      layout:{padding:{bottom:16,left:4,right:4}},
      scales:{
        y:{beginAtZero:true,ticks:{callback:v=>"\u20b1"+v.toLocaleString(),font:{size:11}},grid:{color:"rgba(0,0,0,.05)"}},
        x:{ticks:{font:{size:12,weight:"600"},color:"#1e3a6e",maxRotation:0,minRotation:0,autoSkip:false},grid:{display:false}}
      }
    }
  });
}

/* ── Income Table ── */
async function incRefreshTable() {
  const tbody = document.getElementById("incTbody");
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="inc-empty">Loading...</td></tr>';
  try {
    const rows = await api("GET", "/api/income/projects?" + incBuildQuery());
    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    const totalEl = document.getElementById("incTableTotal");
    const countEl = document.getElementById("incTableCount");
    const rangeEl = document.getElementById("incTableRange");
    if (totalEl) {
      const end = total, dur = 700, startTime = performance.now();
      const tick = now => {
        const p = 1 - Math.pow(1 - Math.min(now - startTime, dur)/dur, 3);
        totalEl.textContent = "\u20b1 " + Math.round(end * p).toLocaleString();
        if (now - startTime < dur) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    if (countEl) countEl.textContent = rows.length + " record" + (rows.length !== 1 ? "s" : "");
    if (rangeEl) {
      const parts = [];
      if (incFilterLot)    parts.push(incFilterLot);
      if (incFilterSource) parts.push(incFilterSource);
      if (incFilterFrom || incFilterTo) parts.push((incFilterFrom||"start") + " \u2192 " + (incFilterTo||"today"));
      rangeEl.textContent = parts.length ? parts.join(" \u00b7 ") : "All records";
    }
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="inc-empty">No records found.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((r, i) => {
      const lotC = {'Lot A':['#dbeafe','#1e40af'],'Lot B':['#d1fae5','#065f46'],
        'Lot C':['#fef3c7','#92400e'],'Lot D':['#fce7f3','#9d174d'],
        'Lot E':['#ede9fe','#5b21b6'],'Lot F':['#ffedd5','#9a3412'],'Lot G':['#f0fdf4','#14532d']};
      const [bg, fg] = lotC[r.lot] || ['#e5e7eb','#374151'];
      return `<tr style="animation-delay:${i*0.04}s">
        <td style="color:#64748b;font-size:12.5px;white-space:nowrap;">${r.date_formatted || formatDate(r.date)}</td>
        <td><span style="display:inline-flex;align-items:center;padding:5px 13px;border-radius:20px;font-size:11.5px;font-weight:800;background:${bg};color:${fg};letter-spacing:.4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.08);">${r.lot}</span></td>
        <td style="font-weight:600;color:#374151;">${r.source}</td>
        <td style="color:#64748b;font-size:13px;">${r.description}</td>
        <td><span style="font-size:14.5px;font-weight:900;color:#1e3a6e;background:rgba(30,58,110,.07);padding:4px 10px;border-radius:8px;display:inline-block;">&#8369;${Number(r.amount).toLocaleString()}</span></td>
        <td><div class="inc-row-btns">
          <button class="inc-row-btn inc-btn-edit" onclick="incOpenEditModal(${r.id},'${(r.lot||'').replace(/'/g,"\\'")}','${(r.source||'').replace(/'/g,"\\'")}','${(r.description||'').replace(/'/g,"\\'")}',${r.amount},'${r.date}')"><i class="ri-pencil-line"></i> Edit</button>
          <button class="inc-row-btn inc-btn-del" onclick="incOpenDeleteModal(${r.id},'${(r.lot||'').replace(/'/g,"\\'")}',${r.amount})"><i class="ri-delete-bin-line"></i> Delete</button>
        </div></td>
      </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="inc-empty" style="color:#dc2626;">Cannot connect to server. Make sure server.js is running.</td></tr>';
  }
}

/* ── Add / Edit / Delete ── */
function incOpenAddModal() {
  document.getElementById("incModalTitle").innerHTML = '<i class="ri-add-circle-line"></i> Add Income';
  document.getElementById("incEditId").value  = "";
  document.getElementById("incFDate").value   = new Date().toISOString().split("T")[0];
  document.getElementById("incFLot").value    = "";
  document.getElementById("incFSource").value = "";
  document.getElementById("incFDesc").value   = "";
  document.getElementById("incFAmount").value = "";
  document.getElementById("incRecordModal").style.display = "flex";
}
function incOpenEditModal(id, lot, source, description, amount, date) {
  document.getElementById("incModalTitle").innerHTML = '<i class="ri-pencil-line"></i> Edit Income';
  document.getElementById("incEditId").value  = id;
  document.getElementById("incFDate").value   = date;
  document.getElementById("incFLot").value    = lot;
  document.getElementById("incFSource").value = source;
  document.getElementById("incFDesc").value   = description;
  document.getElementById("incFAmount").value = amount;
  document.getElementById("incRecordModal").style.display = "flex";
}
function incCloseModal() { document.getElementById("incRecordModal").style.display = "none"; }
async function incSaveRecord() {
  const date        = document.getElementById("incFDate").value;
  const lot         = document.getElementById("incFLot").value;
  const source      = document.getElementById("incFSource").value.trim();
  const description = document.getElementById("incFDesc").value.trim();
  const amount      = parseFloat(document.getElementById("incFAmount").value);
  const editId      = document.getElementById("incEditId").value;
  if (!date || !lot || !source || !description || !amount || isNaN(amount) || amount <= 0) {
    showToast("Please fill in all fields correctly.", "error"); return;
  }
  try {
    if (editId) {
      await api("PUT", "/api/income/" + editId, { date, lot, source, description, amount });
      showToast("Record updated.", "success");
    } else {
      await api("POST", "/api/income/project", { date, lot, source, description, amount });
      showToast("Income added.", "success");
    }
    incCloseModal(); incRefreshOverview(); incRefreshTable();
  } catch (err) { showToast("Save failed: " + err.message, "error"); }
}
function incOpenDeleteModal(id, lot, amount) {
  incDeleteId = id;
  document.getElementById("incDeletePreview").textContent = lot + "  |  \u20b1" + Number(amount).toLocaleString();
  document.getElementById("incDeleteModal").style.display = "flex";
}
function incCloseDeleteModal() { document.getElementById("incDeleteModal").style.display = "none"; incDeleteId = null; }
async function incConfirmDelete() {
  try {
    await api("DELETE", "/api/income/" + incDeleteId);
    incCloseDeleteModal(); incRefreshOverview(); incRefreshTable();
    showToast("Record deleted.", "info");
  } catch (err) { showToast("Delete failed: " + err.message, "error"); }
}

/* ================= COMPANY EXPENSES ================= */

let expDeleteId = null;

function loadCompanyExpenses() {
  mainContent.innerHTML = `
    <div class="terminals-header">
      <h2><i class="ri-shopping-cart-line"></i> Company Expenses and Purchases</h2>
      <div class="terminals-actions">
        <div class="search-box"><i class="ri-search-line"></i><input type="text" id="expSearch" placeholder="Search here…"></div>
        <button class="tool-btn apply-btn" id="btnAddExpense"><i class="ri-add-line"></i> Add Expense</button>
      </div>
    </div>
    <p style="color:#6b7280;font-size:13px;margin-bottom:18px;">Manage company-wide expenses and procurement</p>
    <div class="table-card">
      <div class="table-card-header"><span>Company Expenses and Purchases</span></div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead style="background:#dbeafe;">
            <tr>
              ${["#","Date","Description","Category","Supplier / Vendor","Amount","Status","Actions"]
                .map(h=>`<th style="padding:12px 16px;text-align:left;font-size:13px;font-weight:600;color:#1e3a6e;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody id="expTableBody"><tr><td colspan="8" style="text-align:center;padding:30px;color:#9ca3af;">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;
  expRenderTable();
  document.getElementById("btnAddExpense").addEventListener("click", expOpenAdd);
  document.getElementById("expSearch").addEventListener("input", expRenderTable);
}

async function expRenderTable() {
  const q = document.getElementById("expSearch")?.value || "";
  const tbody = document.getElementById("expTableBody");
  if (!tbody) return;
  try {
    const rows = await api("GET", `/api/expenses?search=${encodeURIComponent(q)}`);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;">No records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r, i) => `
      <tr>
        <td style="padding:12px 16px;">${i+1}</td>
        <td style="padding:12px 16px;">${formatDate(r.date)}</td>
        <td style="padding:12px 16px;">${r.description}</td>
        <td style="padding:12px 16px;"><span class="badge medium">${r.category}</span></td>
        <td style="padding:12px 16px;">${r.vendor}</td>
        <td style="padding:12px 16px;font-weight:700;color:#dc2626;">${formatCurrency(r.amount)}</td>
        <td style="padding:12px 16px;"><span class="badge ${r.status}">${capitalize(r.status)}</span></td>
        <td style="padding:12px 16px;">
          <div style="display:flex;gap:6px;">
            <button class="inc-row-btn inc-btn-edit" onclick="expOpenEdit(${r.id},'${r.date}','${r.description}','${r.category}','${r.vendor}',${r.amount},'${r.status}')"><i class="ri-pencil-line"></i> Edit</button>
            <button class="inc-row-btn inc-btn-del"  onclick="expOpenDelete(${r.id},'${r.description}',${r.amount})"><i class="ri-delete-bin-line"></i> Delete</button>
          </div>
        </td>
      </tr>`).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#dc2626;">Error loading records.</td></tr>`;
  }
}

function expOpenAdd() {
  document.getElementById("expModalTitle").textContent = "Add Expense";
  document.getElementById("expEditId").value = "";
  document.getElementById("expFDate").value  = new Date().toISOString().split("T")[0];
  document.getElementById("expFDesc").value  = "";
  document.getElementById("expFCat").value   = "Supplies";
  document.getElementById("expFVendor").value = "";
  document.getElementById("expFAmount").value = "";
  document.getElementById("expFStatus").value = "completed";
  document.getElementById("expModal").style.display = "flex";
}
function expOpenEdit(id, date, desc, cat, vendor, amount, status) {
  document.getElementById("expModalTitle").textContent = "Edit Expense";
  document.getElementById("expEditId").value  = id;
  document.getElementById("expFDate").value   = date;
  document.getElementById("expFDesc").value   = desc;
  document.getElementById("expFCat").value    = cat;
  document.getElementById("expFVendor").value = vendor;
  document.getElementById("expFAmount").value = amount;
  document.getElementById("expFStatus").value = status;
  document.getElementById("expModal").style.display = "flex";
}
function expCloseModal() { document.getElementById("expModal").style.display = "none"; }
async function expSave() {
  const date   = document.getElementById("expFDate").value;
  const desc   = document.getElementById("expFDesc").value.trim();
  const cat    = document.getElementById("expFCat").value;
  const vendor = document.getElementById("expFVendor").value.trim();
  const amount = parseFloat(document.getElementById("expFAmount").value);
  const status = document.getElementById("expFStatus").value;
  const editId = document.getElementById("expEditId").value;
  if (!date || !desc || !vendor || !amount || isNaN(amount)) {
    showToast("Please fill in all fields correctly.", "error"); return;
  }
  try {
    if (editId) {
      await api("PUT", `/api/expenses/${editId}`, { date, desc, cat, vendor, amount, status });
      showToast("Expense updated.", "success");
    } else {
      await api("POST", `/api/expenses`, { date, desc, cat, vendor, amount, status });
      showToast("Expense added.", "success");
    }
    expCloseModal();
    expRenderTable();
  } catch (err) {
    showToast("Save failed: " + err.message, "error");
  }
}
function expOpenDelete(id, desc, amount) {
  expDeleteId = id;
  document.getElementById("expDeletePreview").textContent = `${desc}  |  ${formatCurrency(amount)}`;
  document.getElementById("expDeleteModal").style.display = "flex";
}
function expCloseDelete() { document.getElementById("expDeleteModal").style.display = "none"; expDeleteId = null; }
async function expConfirmDelete() {
  try {
    await api("DELETE", `/api/expenses/${expDeleteId}`);
    expCloseDelete();
    expRenderTable();
    showToast("Expense deleted.", "info");
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

/* ================= PROJECT EXPENSES ================= */

let projExpDeleteId = null;

function loadProjectExpenses() {
  mainContent.innerHTML = `
    <div class="terminals-header">
      <h2><i class="ri-file-list-3-line"></i> Project Expenses and Purchases</h2>
      <div class="terminals-actions">
        <div class="search-box"><i class="ri-search-line"></i><input type="text" id="projExpSearch" placeholder="Search here…"></div>
        <button class="tool-btn apply-btn" id="btnAddProjExp"><i class="ri-add-line"></i> Add Project Expense</button>
      </div>
    </div>
    <p style="color:#6b7280;font-size:13px;margin-bottom:18px;">Track expenses and purchases per project</p>
    <div class="table-card">
      <div class="table-card-header"><span>Project Expenses and Purchases</span></div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead style="background:#dbeafe;">
            <tr>
              ${["#","Date","Project","Description","Category","Supplier","Amount","Status","Actions"]
                .map(h=>`<th style="padding:12px 16px;text-align:left;font-size:13px;font-weight:600;color:#1e3a6e;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody id="projExpTableBody"><tr><td colspan="9" style="text-align:center;padding:30px;color:#9ca3af;">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;
  projExpRenderTable();
  document.getElementById("btnAddProjExp").addEventListener("click", projExpOpenAdd);
  document.getElementById("projExpSearch").addEventListener("input", projExpRenderTable);
}

async function projExpRenderTable() {
  const q = document.getElementById("projExpSearch")?.value || "";
  const tbody = document.getElementById("projExpTableBody");
  if (!tbody) return;
  try {
    const rows = await api("GET", `/api/project-expenses?search=${encodeURIComponent(q)}`);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#9ca3af;">No records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r, i) => `
      <tr>
        <td style="padding:12px 16px;">${i+1}</td>
        <td style="padding:12px 16px;">${formatDate(r.date)}</td>
        <td style="padding:12px 16px;"><strong>${r.project_name}</strong></td>
        <td style="padding:12px 16px;">${r.description}</td>
        <td style="padding:12px 16px;"><span class="badge medium">${r.category}</span></td>
        <td style="padding:12px 16px;">${r.vendor}</td>
        <td style="padding:12px 16px;font-weight:700;color:#dc2626;">${formatCurrency(r.amount)}</td>
        <td style="padding:12px 16px;"><span class="badge ${r.status}">${capitalize(r.status)}</span></td>
        <td style="padding:12px 16px;">
          <div style="display:flex;gap:6px;">
            <button class="inc-row-btn inc-btn-edit" onclick="projExpOpenEdit(${r.id},'${r.date}','${r.project_name}','${r.description}','${r.category}','${r.vendor}',${r.amount},'${r.status}')"><i class="ri-pencil-line"></i> Edit</button>
            <button class="inc-row-btn inc-btn-del"  onclick="projExpOpenDelete(${r.id},'${r.project_name}','${r.description}',${r.amount})"><i class="ri-delete-bin-line"></i> Delete</button>
          </div>
        </td>
      </tr>`).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#dc2626;">Error loading records.</td></tr>`;
  }
}

async function projExpOpenAdd() {
  document.getElementById("projExpModalTitle").textContent = "Add Project Expense";
  document.getElementById("projExpEditId").value    = "";
  document.getElementById("projExpFDate").value     = new Date().toISOString().split("T")[0];
  document.getElementById("projExpFDesc").value     = "";
  document.getElementById("projExpFCat").value      = "Materials";
  document.getElementById("projExpFVendor").value   = "";
  document.getElementById("projExpFAmount").value   = "";
  document.getElementById("projExpFStatus").value   = "pending";
  await projExpLoadProjects();
  document.getElementById("projExpModal").style.display = "flex";
}
async function projExpOpenEdit(id, date, project, desc, cat, vendor, amount, status) {
  document.getElementById("projExpModalTitle").textContent = "Edit Project Expense";
  document.getElementById("projExpEditId").value    = id;
  document.getElementById("projExpFDate").value     = date;
  document.getElementById("projExpFDesc").value     = desc;
  document.getElementById("projExpFCat").value      = cat;
  document.getElementById("projExpFVendor").value   = vendor;
  document.getElementById("projExpFAmount").value   = amount;
  document.getElementById("projExpFStatus").value   = status;
  await projExpLoadProjects(project);
  document.getElementById("projExpModal").style.display = "flex";
}
async function projExpLoadProjects(selected = "") {
  try {
    const projects = await api("GET", `/api/projects`);
    const sel = document.getElementById("projExpFProject");
    if (!sel) return;
    sel.innerHTML = projects.map(p =>
      `<option value="${p.project_name}" ${p.project_name === selected ? "selected" : ""}>${p.project_name}</option>`
    ).join("");
  } catch (err) { console.error("Failed to load projects:", err); }
}
function projExpCloseModal() { document.getElementById("projExpModal").style.display = "none"; }
async function projExpSave() {
  const date    = document.getElementById("projExpFDate").value;
  const project = document.getElementById("projExpFProject").value;
  const desc    = document.getElementById("projExpFDesc").value.trim();
  const cat     = document.getElementById("projExpFCat").value;
  const vendor  = document.getElementById("projExpFVendor").value.trim();
  const amount  = parseFloat(document.getElementById("projExpFAmount").value);
  const status  = document.getElementById("projExpFStatus").value;
  const editId  = document.getElementById("projExpEditId").value;
  if (!date || !project || !desc || !vendor || !amount || isNaN(amount)) {
    showToast("Please fill in all fields correctly.", "error"); return;
  }
  try {
    if (editId) {
      await api("PUT", `/api/project-expenses/${editId}`, { date, project, desc, cat, vendor, amount, status });
      showToast("Project expense updated.", "success");
    } else {
      await api("POST", `/api/project-expenses`, { date, project, desc, cat, vendor, amount, status });
      showToast("Project expense added.", "success");
    }
    projExpCloseModal();
    projExpRenderTable();
  } catch (err) {
    showToast("Save failed: " + err.message, "error");
  }
}
function projExpOpenDelete(id, project, desc, amount) {
  projExpDeleteId = id;
  document.getElementById("projExpDeletePreview").textContent = `${project}  |  ${desc}  |  ${formatCurrency(amount)}`;
  document.getElementById("projExpDeleteModal").style.display = "flex";
}
function projExpCloseDelete() { document.getElementById("projExpDeleteModal").style.display = "none"; projExpDeleteId = null; }
async function projExpConfirmDelete() {
  try {
    await api("DELETE", `/api/project-expenses/${projExpDeleteId}`);
    projExpCloseDelete();
    projExpRenderTable();
    showToast("Project expense deleted.", "info");
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

/* ================= FINANCIAL REPORT ================= */

async function loadFinancialReport() {
  mainContent.innerHTML = `
    <div class="terminals-header">
      <h2><i class="ri-bar-chart-2-line"></i> Financial Report</h2>
      <div class="terminals-actions">
        <button class="tool-btn apply-btn"><i class="ri-download-2-line"></i> Export Report</button>
      </div>
    </div>
    <div id="reportKpiCards" class="cards" style="margin-bottom:24px;">
      <div class="card"><div class="card-top"><div class="icon-box green"><i class="ri-arrow-up-circle-line"></i></div>
        <div class="stat"><h1 id="rpIncome">Loading…</h1><span class="trend up">↑ this year</span></div></div><p>Total Income</p></div>
      <div class="card"><div class="card-top"><div class="icon-box red"><i class="ri-arrow-down-circle-line"></i></div>
        <div class="stat"><h1 id="rpExpenses">Loading…</h1><span class="trend down">↑ this year</span></div></div><p>Total Expenses</p></div>
      <div class="card"><div class="card-top"><div class="icon-box blue"><i class="ri-money-dollar-circle-line"></i></div>
        <div class="stat"><h1 id="rpNet">Loading…</h1><span class="trend up">↑ this year</span></div></div><p>Net Income</p></div>
    </div>
    <div class="table-container">
      <div class="table-title"><i class="ri-bar-chart-2-line"></i> Monthly Summary</div>
      <table>
        <thead>
          <tr><th>Month</th><th>Income</th><th>Company Expenses</th><th>Project Expenses</th><th>Total Expenses</th><th>Net Income</th></tr>
        </thead>
        <tbody id="reportTableBody"><tr><td colspan="6" style="text-align:center;padding:30px;color:#9ca3af;">Loading…</td></tr></tbody>
      </table>
    </div>`;

  try {
    const [kpis, monthly] = await Promise.all([
      api("GET", "/api/report/kpis"),
      api("GET", "/api/report/monthly"),
    ]);
    document.getElementById("rpIncome").textContent   = formatCurrency(kpis.total_income);
    document.getElementById("rpExpenses").textContent = formatCurrency(Number(kpis.comp_expenses) + Number(kpis.proj_expenses));
    document.getElementById("rpNet").textContent      = formatCurrency(kpis.total_income - kpis.comp_expenses - kpis.proj_expenses);

    const tbody = document.getElementById("reportTableBody");
    tbody.innerHTML = monthly.map(r => {
      const net = Number(r.net_income);
      return `<tr>
        <td>${r.month_label}</td>
        <td style="color:#16a34a;font-weight:600;">${formatCurrency(r.total_income)}</td>
        <td style="color:#dc2626;">${formatCurrency(r.total_comp_expenses)}</td>
        <td style="color:#f59e0b;">${formatCurrency(r.total_proj_expenses)}</td>
        <td style="color:#dc2626;font-weight:600;">${formatCurrency(r.total_expenses)}</td>
        <td style="color:${net>=0?"#16a34a":"#dc2626"};font-weight:700;">${formatCurrency(net)}</td>
      </tr>`;
    }).join("");
  } catch (err) {
    showToast("Failed to load report.", "error");
  }
}

/* ================= COLLECTIONS ================= */

let colDeleteId = null;

function loadCollections() {
  mainContent.innerHTML = `
    <div class="terminals-header">
      <h2><i class="ri-hand-coin-line"></i> Collections</h2>
      <div class="terminals-actions">
        <div class="search-box"><i class="ri-search-line"></i><input type="text" id="colSearch" placeholder="Search here…"></div>
        <button class="tool-btn apply-btn" id="btnAddCollection"><i class="ri-add-line"></i> Add Collection</button>
      </div>
    </div>
    <p style="color:#6b7280;font-size:13px;margin-bottom:18px;">Monitor and manage payment collections from clients</p>
    <div class="table-card">
      <div class="table-card-header"><span>Collections</span></div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead style="background:#dbeafe;">
            <tr>
              ${["#","Date","Client / Project","OR Number","Amount Due","Amount Collected","Balance","Status","Actions"]
                .map(h=>`<th style="padding:12px 16px;text-align:left;font-size:13px;font-weight:600;color:#1e3a6e;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody id="colTableBody"><tr><td colspan="9" style="text-align:center;padding:30px;color:#9ca3af;">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;
  colRenderTable();
  document.getElementById("btnAddCollection").addEventListener("click", colOpenAdd);
  document.getElementById("colSearch").addEventListener("input", colRenderTable);
}

async function colRenderTable() {
  const q = document.getElementById("colSearch")?.value || "";
  const tbody = document.getElementById("colTableBody");
  if (!tbody) return;
  try {
    const rows = await api("GET", `/api/collections?search=${encodeURIComponent(q)}`);
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#9ca3af;">No records found.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map((r, i) => {
      const statusClass = r.status === "paid" ? "completed" : r.status === "partial" ? "progress" : "pending";
      const statusLabel = r.status === "paid" ? "Paid" : r.status === "partial" ? "Partial" : "Unpaid";
      return `<tr>
        <td style="padding:12px 16px;">${i+1}</td>
        <td style="padding:12px 16px;">${formatDate(r.date)}</td>
        <td style="padding:12px 16px;"><strong>${r.client}</strong></td>
        <td style="padding:12px 16px;"><code>${r.or_number || "—"}</code></td>
        <td style="padding:12px 16px;font-weight:600;">${formatCurrency(r.amount_due)}</td>
        <td style="padding:12px 16px;color:#16a34a;font-weight:600;">${formatCurrency(r.amount_collected)}</td>
        <td style="padding:12px 16px;color:${Number(r.balance)>0?"#dc2626":"#16a34a"};font-weight:600;">${formatCurrency(r.balance)}</td>
        <td style="padding:12px 16px;"><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td style="padding:12px 16px;">
          <div style="display:flex;gap:6px;">
            <button class="inc-row-btn inc-btn-edit" onclick="colOpenEdit(${r.id},'${r.date}','${r.client}','${r.or_number||""}',${r.amount_due},${r.amount_collected})"><i class="ri-pencil-line"></i> Edit</button>
            <button class="inc-row-btn inc-btn-del"  onclick="colOpenDelete(${r.id},'${r.client}',${r.amount_due})"><i class="ri-delete-bin-line"></i> Delete</button>
          </div>
        </td>
      </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#dc2626;">Error loading records.</td></tr>`;
  }
}

function colOpenAdd() {
  document.getElementById("colModalTitle").textContent = "Add Collection";
  document.getElementById("colEditId").value     = "";
  document.getElementById("colFDate").value      = new Date().toISOString().split("T")[0];
  document.getElementById("colFClient").value    = "";
  document.getElementById("colFOR").value        = "";
  document.getElementById("colFDue").value       = "";
  document.getElementById("colFCollected").value = "";
  document.getElementById("colModal").style.display = "flex";
}
function colOpenEdit(id, date, client, orNum, due, collected) {
  document.getElementById("colModalTitle").textContent = "Edit Collection";
  document.getElementById("colEditId").value     = id;
  document.getElementById("colFDate").value      = date;
  document.getElementById("colFClient").value    = client;
  document.getElementById("colFOR").value        = orNum;
  document.getElementById("colFDue").value       = due;
  document.getElementById("colFCollected").value = collected;
  document.getElementById("colModal").style.display = "flex";
}
function colCloseModal() { document.getElementById("colModal").style.display = "none"; }
async function colSave() {
  const date      = document.getElementById("colFDate").value;
  const client    = document.getElementById("colFClient").value.trim();
  const or        = document.getElementById("colFOR").value.trim();
  const due       = parseFloat(document.getElementById("colFDue").value);
  const collected = parseFloat(document.getElementById("colFCollected").value) || 0;
  const editId    = document.getElementById("colEditId").value;
  if (!date || !client || !due || isNaN(due)) {
    showToast("Please fill in all required fields.", "error"); return;
  }
  if (collected > due) {
    showToast("Collected cannot exceed amount due.", "error"); return;
  }
  try {
    if (editId) {
      await api("PUT", `/api/collections/${editId}`, { date, client, or, due, collected });
      showToast("Collection updated.", "success");
    } else {
      await api("POST", `/api/collections`, { date, client, or, due, collected });
      showToast("Collection added.", "success");
    }
    colCloseModal();
    colRenderTable();
  } catch (err) {
    showToast("Save failed: " + err.message, "error");
  }
}
function colOpenDelete(id, client, due) {
  colDeleteId = id;
  document.getElementById("colDeletePreview").textContent = `${client}  |  Due: ${formatCurrency(due)}`;
  document.getElementById("colDeleteModal").style.display = "flex";
}
function colCloseDelete() { document.getElementById("colDeleteModal").style.display = "none"; colDeleteId = null; }
async function colConfirmDelete() {
  try {
    await api("DELETE", `/api/collections/${colDeleteId}`);
    colCloseDelete();
    colRenderTable();
    showToast("Collection deleted.", "info");
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

/* ================= LETTERS ================= */

function loadLetters() {
  mainContent.innerHTML = `
    <div class="terminals-header">
      <h2><i class="ri-file-line"></i> Letters</h2>
      <div class="terminals-actions">
        <button class="tool-btn apply-btn" id="btnUploadLetter"><i class="ri-upload-line"></i> Upload Letter</button>
      </div>
    </div>
    <input type="file" id="letterFileInput" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style="display:none;" multiple>
    <div class="table-card">
      <div class="table-card-header"><span>Letter Files</span><span id="letterCount" style="font-size:13px;color:rgba(255,255,255,0.8);"></span></div>
      <div id="letterTableWrap" style="overflow-x:auto;">
        <div id="letterEmpty" style="padding:60px;text-align:center;color:#9ca3af;display:none;">
          <i class="ri-folder-open-line" style="font-size:48px;display:block;margin-bottom:12px;"></i>
          <p>No letters uploaded yet.</p>
        </div>
        <table id="letterTable" style="width:100%;border-collapse:collapse;">
          <thead style="background:#dbeafe;">
            <tr>
              ${["#","File Name","Type","Size","Date Uploaded","Actions"]
                .map(h=>`<th style="padding:12px 16px;text-align:left;font-size:13px;font-weight:600;color:#1e3a6e;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody id="letterTableBody"><tr><td colspan="6" style="text-align:center;padding:30px;color:#9ca3af;">Loading…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  document.getElementById("btnUploadLetter").addEventListener("click", () =>
    document.getElementById("letterFileInput").click()
  );
  document.getElementById("letterFileInput").addEventListener("change", letterHandleFiles);
  letterRenderTable();
}

async function letterRenderTable() {
  const tbody = document.getElementById("letterTableBody");
  const count = document.getElementById("letterCount");
  const empty = document.getElementById("letterEmpty");
  const table = document.getElementById("letterTable");
  if (!tbody) return;
  try {
    const files = await api("GET", "/api/letters");
    if (!files.length) {
      if (empty) empty.style.display = "";
      if (table) table.style.display = "none";
      if (count) count.textContent = "";
      return;
    }
    if (empty) empty.style.display = "none";
    if (table) table.style.display = "";
    if (count) count.textContent = files.length + " file(s)";
    const icons = { PDF:"ri-file-pdf-line", DOC:"ri-file-word-line", DOCX:"ri-file-word-line",
                    PNG:"ri-image-line", JPG:"ri-image-line", JPEG:"ri-image-line" };
    tbody.innerHTML = files.map((f, i) => `
      <tr>
        <td style="padding:12px 16px;">${i+1}</td>
        <td style="padding:12px 16px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <i class="${icons[f.file_type]||"ri-file-line"}" style="font-size:18px;color:#1e3a6e;"></i>
            <span style="font-weight:500;">${f.file_name}</span>
          </div>
        </td>
        <td style="padding:12px 16px;"><span class="badge medium">${f.file_type}</span></td>
        <td style="padding:12px 16px;">${f.file_size}</td>
        <td style="padding:12px 16px;">${new Date(f.uploaded_at).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"2-digit"})}</td>
        <td style="padding:12px 16px;">
          <div style="display:flex;gap:6px;">
            <a href="${f.file_path}" download="${f.file_name}" class="inc-row-btn inc-btn-edit" style="text-decoration:none;">
              <i class="ri-download-line"></i> Download
            </a>
            <button class="inc-row-btn inc-btn-del" onclick="letterDelete(${f.id})">
              <i class="ri-delete-bin-line"></i> Delete
            </button>
          </div>
        </td>
      </tr>`).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#dc2626;">Error loading files.</td></tr>`;
  }
}

async function letterHandleFiles(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  try {
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      await apiUpload("/api/letters", fd);
    }
    e.target.value = "";
    letterRenderTable();
    showToast(`${files.length} file(s) uploaded.`, "success");
  } catch (err) {
    showToast("Upload failed: " + err.message, "error");
  }
}

async function letterDelete(id) {
  try {
    await api("DELETE", `/api/letters/${id}`);
    letterRenderTable();
    showToast("File removed.", "info");
  } catch (err) {
    showToast("Delete failed: " + err.message, "error");
  }
}

/* ================= SETTINGS ================= */

function loadSettings() {
  mainContent.innerHTML = `
    <div class="terminals-header"><h2><i class="ri-settings-3-line"></i> Settings</h2></div>
    <div class="table-container" style="overflow:visible;">
      <div class="table-title"><i class="ri-palette-line"></i> Preferences</div>
      <div style="padding:24px;display:flex;flex-direction:column;gap:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--card-bg,#f8fafc);border-radius:12px;border:1px solid #e5e7eb;">
          <div>
            <p style="font-weight:600;margin-bottom:2px;">Dark Mode</p>
            <p style="font-size:13px;color:#6b7280;">Switch between light and dark theme</p>
          </div>
          <button class="tool-btn" onclick="document.body.classList.toggle('dark');localStorage.setItem('darkMode',document.body.classList.contains('dark'));this.innerHTML=document.body.classList.contains('dark')?'<i class=\\'ri-sun-line\\'></i> Light Mode':'<i class=\\'ri-moon-line\\'></i> Dark Mode';">
            <i class="ri-moon-line"></i> Dark Mode
          </button>
        </div>
      </div>
    </div>`;
}

/* ================= SHARED UI BUILDERS ================= */

function buildPageShell({ icon, title, subtitle, addBtnLabel, addBtnId, tableHeaders, tableBodyId }) {
  return `
    <div class="terminals-header">
      <h2><i class="${icon}"></i> ${title}</h2>
      <div class="terminals-actions">
        <div class="search-box">
          <i class="ri-search-line"></i>
          <input type="text" placeholder="Search here…">
        </div>
        <button class="tool-btn apply-btn" id="${addBtnId}">
          <i class="ri-add-line"></i> ${addBtnLabel}
        </button>
      </div>
    </div>
    <p style="color:#6b7280;font-size:13px;margin-bottom:18px;">${subtitle}</p>
    <div class="table-card">
      <div class="table-card-header">
        <span>${title}</span>
        <div class="table-tools">
          <button class="tool-btn" style="color:white;border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.1);">
            <i class="ri-download-2-line"></i> Export
          </button>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead style="background:#dbeafe;">
            <tr>${tableHeaders.map(h => `<th style="padding:12px 16px;text-align:left;font-size:13px;font-weight:600;color:#1e3a6e;border-bottom:1px solid #e5e7eb;">${h}</th>`).join("")}</tr>
          </thead>
          <tbody id="${tableBodyId}">
            <tr><td colspan="${tableHeaders.length}" style="text-align:center;padding:40px;color:#9ca3af;">Loading…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPlaceholderTable(tbodyId, rows, rowRenderer) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="20" style="text-align:center;padding:40px;color:#9ca3af;">No records found.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r, i) => rowRenderer(r, i)).join("");
}

function actionBtns() {
  return `
    <div style="display:flex;gap:6px;">
      <button class="tool-btn" style="padding:4px 8px;" title="Edit"><i class="ri-edit-line"></i></button>
      <button class="tool-btn danger-btn" style="padding:4px 8px;" title="Delete"><i class="ri-delete-bin-line"></i></button>
    </div>
  `;
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

/* ================= INITIAL LOAD ================= */
loadDashboard();

/* ================= INJECT MODALS INTO DOM ================= */

(function injectModals() {
  const modals = `
  <!-- INCOME: Add / Edit Modal -->
  <div class="inc-modal-overlay" id="incRecordModal">
    <div class="inc-modal-box">
      <h3 id="incModalTitle"><i class="ri-add-circle-line"></i> Add Income</h3>
      <input type="hidden" id="incEditId">
      <div class="inc-fg"><label>Date</label><input type="date" id="incFDate"></div>
      <div class="inc-fg">
        <label>Lot</label>
        <select id="incFLot">
          <option value="">&#8212; Select Lot &#8212;</option>
          <option value="Lot A">Lot A</option><option value="Lot B">Lot B</option>
          <option value="Lot C">Lot C</option><option value="Lot D">Lot D</option>
          <option value="Lot E">Lot E</option><option value="Lot F">Lot F</option>
          <option value="Lot G">Lot G</option>
        </select>
      </div>
      <div class="inc-fg"><label>Source</label><input type="text" id="incFSource" placeholder="e.g. Client Payment..."></div>
      <div class="inc-fg"><label>Description</label><input type="text" id="incFDesc" placeholder="e.g. Satellite Service..."></div>
      <div class="inc-fg"><label>Amount (&#8369;)</label><input type="number" id="incFAmount" placeholder="e.g. 120000" min="1"></div>
      <div class="inc-mbtns">
        <button class="inc-mbtn" onclick="incCloseModal()"><i class="ri-close-line"></i> Cancel</button>
        <button class="inc-mbtn inc-mbtn-save" onclick="incSaveRecord()"><i class="ri-save-line"></i> Save</button>
      </div>
    </div>
  </div>

  <!-- INCOME: Delete Confirm Modal -->
  <div class="inc-modal-overlay" id="incDeleteModal">
    <div class="inc-modal-box" style="max-width:380px;">
      <h3 style="color:#dc2626;"><i class="ri-delete-bin-line"></i> Delete Record</h3>
      <p style="font-size:14px;color:#374151;margin-bottom:8px;">Are you sure you want to delete this record?</p>
      <p id="incDeletePreview" style="font-size:12.5px;color:#6b7280;background:#f8fafc;padding:10px 14px;border-radius:9px;"></p>
      <div class="inc-mbtns">
        <button class="inc-mbtn" onclick="incCloseDeleteModal()"><i class="ri-close-line"></i> Cancel</button>
        <button class="inc-mbtn inc-mbtn-del" onclick="incConfirmDelete()"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML("beforeend", modals);

  // Inject additional modals
  const extraModals = `
  <!-- EXPENSE: Add/Edit Modal -->
  <div class="inc-modal-overlay" id="expModal">
    <div class="inc-modal-box">
      <h3 id="expModalTitle">Add Expense</h3>
      <input type="hidden" id="expEditId">
      <div class="inc-fg"><label>Date</label><input type="date" id="expFDate"></div>
      <div class="inc-fg"><label>Description</label><input type="text" id="expFDesc" placeholder="e.g. Office Supplies"></div>
      <div class="inc-fg"><label>Category</label>
        <select id="expFCat">
          <option>Supplies</option><option>Utilities</option><option>Equipment</option>
          <option>Labor</option><option>Logistics</option><option>Other</option>
        </select>
      </div>
      <div class="inc-fg"><label>Supplier / Vendor</label><input type="text" id="expFVendor" placeholder="e.g. MERALCO"></div>
      <div class="inc-fg"><label>Amount (₱)</label><input type="number" id="expFAmount" placeholder="e.g. 15000" min="1"></div>
      <div class="inc-fg"><label>Status</label>
        <select id="expFStatus">
          <option value="completed">Completed</option>
          <option value="progress">In Progress</option>
          <option value="pending">Pending</option>
        </select>
      </div>
      <div class="inc-mbtns">
        <button class="inc-mbtn" onclick="expCloseModal()"><i class="ri-close-line"></i> Cancel</button>
        <button class="inc-mbtn inc-mbtn-save" onclick="expSave()"><i class="ri-save-line"></i> Save</button>
      </div>
    </div>
  </div>

  <!-- EXPENSE: Delete Modal -->
  <div class="inc-modal-overlay" id="expDeleteModal">
    <div class="inc-modal-box" style="max-width:380px;">
      <h3 style="color:#dc2626;"><i class="ri-delete-bin-line"></i> Delete Expense</h3>
      <p style="font-size:14px;color:#374151;margin-bottom:8px;">Are you sure you want to delete this record?</p>
      <p id="expDeletePreview" style="font-size:12.5px;color:#6b7280;background:#f8fafc;padding:10px 14px;border-radius:9px;"></p>
      <div class="inc-mbtns">
        <button class="inc-mbtn" onclick="expCloseDelete()"><i class="ri-close-line"></i> Cancel</button>
        <button class="inc-mbtn inc-mbtn-del" onclick="expConfirmDelete()"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
    </div>
  </div>

  <!-- PROJECT EXPENSE: Add/Edit Modal -->
  <div class="inc-modal-overlay" id="projExpModal">
    <div class="inc-modal-box">
      <h3 id="projExpModalTitle">Add Project Expense</h3>
      <input type="hidden" id="projExpEditId">
      <div class="inc-fg"><label>Date</label><input type="date" id="projExpFDate"></div>
      <div class="inc-fg"><label>Project</label><select id="projExpFProject"></select></div>
      <div class="inc-fg"><label>Description</label><input type="text" id="projExpFDesc" placeholder="e.g. Concrete Materials"></div>
      <div class="inc-fg"><label>Category</label>
        <select id="projExpFCat">
          <option>Materials</option><option>Labor</option><option>Equipment</option>
          <option>Logistics</option><option>Other</option>
        </select>
      </div>
      <div class="inc-fg"><label>Supplier</label><input type="text" id="projExpFVendor" placeholder="e.g. SM Construct"></div>
      <div class="inc-fg"><label>Amount (₱)</label><input type="number" id="projExpFAmount" placeholder="e.g. 88000" min="1"></div>
      <div class="inc-fg"><label>Status</label>
        <select id="projExpFStatus">
          <option value="pending">Pending</option>
          <option value="progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div class="inc-mbtns">
        <button class="inc-mbtn" onclick="projExpCloseModal()"><i class="ri-close-line"></i> Cancel</button>
        <button class="inc-mbtn inc-mbtn-save" onclick="projExpSave()"><i class="ri-save-line"></i> Save</button>
      </div>
    </div>
  </div>

  <!-- PROJECT EXPENSE: Delete Modal -->
  <div class="inc-modal-overlay" id="projExpDeleteModal">
    <div class="inc-modal-box" style="max-width:380px;">
      <h3 style="color:#dc2626;"><i class="ri-delete-bin-line"></i> Delete Project Expense</h3>
      <p style="font-size:14px;color:#374151;margin-bottom:8px;">Are you sure you want to delete this record?</p>
      <p id="projExpDeletePreview" style="font-size:12.5px;color:#6b7280;background:#f8fafc;padding:10px 14px;border-radius:9px;"></p>
      <div class="inc-mbtns">
        <button class="inc-mbtn" onclick="projExpCloseDelete()"><i class="ri-close-line"></i> Cancel</button>
        <button class="inc-mbtn inc-mbtn-del" onclick="projExpConfirmDelete()"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
    </div>
  </div>

  <!-- COLLECTIONS: Add/Edit Modal -->
  <div class="inc-modal-overlay" id="colModal">
    <div class="inc-modal-box">
      <h3 id="colModalTitle">Add Collection</h3>
      <input type="hidden" id="colEditId">
      <div class="inc-fg"><label>Date</label><input type="date" id="colFDate"></div>
      <div class="inc-fg"><label>Client / Project</label><input type="text" id="colFClient" placeholder="e.g. XYZ Corporation"></div>
      <div class="inc-fg"><label>OR Number <span style="color:#9ca3af;font-weight:400;">(optional)</span></label><input type="text" id="colFOR" placeholder="e.g. OR-2026-0050"></div>
      <div class="inc-fg"><label>Amount Due (₱)</label><input type="number" id="colFDue" placeholder="e.g. 500000" min="1"></div>
      <div class="inc-fg"><label>Amount Collected (₱)</label><input type="number" id="colFCollected" placeholder="e.g. 450000" min="0"></div>
      <div class="inc-mbtns">
        <button class="inc-mbtn" onclick="colCloseModal()"><i class="ri-close-line"></i> Cancel</button>
        <button class="inc-mbtn inc-mbtn-save" onclick="colSave()"><i class="ri-save-line"></i> Save</button>
      </div>
    </div>
  </div>

  <!-- COLLECTIONS: Delete Modal -->
  <div class="inc-modal-overlay" id="colDeleteModal">
    <div class="inc-modal-box" style="max-width:380px;">
      <h3 style="color:#dc2626;"><i class="ri-delete-bin-line"></i> Delete Collection</h3>
      <p style="font-size:14px;color:#374151;margin-bottom:8px;">Are you sure you want to delete this record?</p>
      <p id="colDeletePreview" style="font-size:12.5px;color:#6b7280;background:#f8fafc;padding:10px 14px;border-radius:9px;"></p>
      <div class="inc-mbtns">
        <button class="inc-mbtn" onclick="colCloseDelete()"><i class="ri-close-line"></i> Cancel</button>
        <button class="inc-mbtn inc-mbtn-del" onclick="colConfirmDelete()"><i class="ri-delete-bin-line"></i> Delete</button>
      </div>
    </div>
  </div>
`;
  document.body.insertAdjacentHTML("beforeend", extraModals);
})();