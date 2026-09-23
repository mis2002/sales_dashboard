/* =====================================================================
   config.js — settings
   Sheet id, refresh, admin defaults. Change factory defaults here; day-to-day changes go through the Admin panel.
   ===================================================================== */
/* ========================= CONFIG (factory defaults) ========================= */
const CONFIG = {
  SHEET_ID: '1iTwR2ye-jGKasIbvj4xsq1znuI7ZrbbPcwJZ3AyUIeQ',
  GID: '416074565',
  REFRESH_MS: 45000
};

/* ========================= ADMIN SETTINGS ========================= */
const ADMIN_PASSWORD = '0000';
const ADMIN_SETTINGS_KEY = 'pnp_dashboard_admin_settings_v1';

const PANEL_REGISTRY = [
  { key:'panel-weekstrip',          label:'Main — Last 4 Weeks strip' },
  { key:'panel-mis',                label:'Main — MIS Sales Report' },
  { key:'panel-growth',             label:'Main — Salesperson Weekly Growth table' },
  { key:'panel-trend',              label:'Main — Sales Trend chart' },
  { key:'panel-wow',                label:'Main — Week-over-Week chart' },
  { key:'panel-split',              label:'Main — Order Type Split chart' },
  { key:'panel-sp',                 label:'Main — Salesperson Performance chart' },
  { key:'panel-customers',          label:'Main — Top Customers table' },
  { key:'biTopKpis',                label:'BI Insights — Mini KPI row' },
  { key:'panel-bi-revtaxprofit',    label:'BI Insights — Revenue vs Tax vs Profit' },
  { key:'panel-bi-invoicecount',    label:'BI Insights — Invoice Count trend' },
  { key:'panel-bi-profitpie',       label:'BI Insights — Profit Contribution pie' },
  { key:'panel-bi-rank',            label:'BI Insights — Top 5 / Bottom 5 ranking' },
  { key:'panel-bi-repeatpie',       label:'BI Insights — Repeat vs One-time pie' },
  { key:'panel-bi-margin',          label:'BI Insights — Customer Margin leaderboard' },
  { key:'panel-bi-profitdist',      label:'BI Insights — Profit % Distribution' },
  { key:'panel-bi-flag',            label:'BI Insights — Zero/Low-Profit flags' },
  { key:'panel-bi-efficiency',      label:'BI Insights — Salesperson Efficiency' },
  { key:'panel-bi-taxtrend',        label:'BI Insights — Tax Collected trend' },
  { key:'panel-bi-outlier',         label:'BI Insights — Unusual Invoices' }
];

const DEFAULT_ADMIN_SETTINGS = {
  sheetId: CONFIG.SHEET_ID,
  gid: CONFIG.GID,
  refreshSeconds: CONFIG.REFRESH_MS / 1000,
  autoRefresh: true,
  brandName: 'PICK N PACK',
  dashboardTitle: 'Live Sales Dashboard',
  topCustomersN: 15,
  topSalespersonN: 8,
  outlierSD: 2,
  lowProfitPct: 0,
  visiblePanels: {},
  salaries: {},
  departments: {},
  crTargets: {},
  hiddenFromMis: {}
};
function loadAdminSettings(){
  try{
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if(raw) return Object.assign({}, DEFAULT_ADMIN_SETTINGS, JSON.parse(raw));
  } catch(e){ console.warn('Could not read admin settings', e); }
  return Object.assign({}, DEFAULT_ADMIN_SETTINGS);
}
let ADMIN = loadAdminSettings();
CONFIG.SHEET_ID = ADMIN.sheetId;
CONFIG.GID = ADMIN.gid;
CONFIG.REFRESH_MS = ADMIN.refreshSeconds * 1000;

