/* =====================================================================
   app.js — buttons, filters, admin panel, loading, boot
   Wires the UI to state, loads data, starts auto-refresh.
   ===================================================================== */
/* ---------------------- Populate filter controls ---------------------- */
function populateFilterOptions(){
  const spSel = document.getElementById('spFilter');
  const prevSp = state.salesperson;
  const sps = [...new Set(ALL_ROWS.map(r=>r.salesperson))].sort();
  spSel.innerHTML = '<option value="ALL">All Salespersons</option>' + sps.map(s=>`<option value="${escAttr(s)}">${escAttr(s)}</option>`).join('');
  spSel.value = sps.includes(prevSp) ? prevSp : 'ALL';
  state.salesperson = spSel.value;

  const weekSel = document.getElementById('weekFilter');
  const prevWeek = state.weekKey;
  weekSel.innerHTML = WEEKS.slice().reverse().map(w=>`<option value="${w.key}">${w.label} (${w.range})</option>`).join('');
  if(WEEKS.length){
    const exists = WEEKS.some(w=>w.key===prevWeek);
    state.weekKey = exists ? prevWeek : WEEKS[WEEKS.length-1].key;
    weekSel.value = state.weekKey;
  }
  const monthSel = document.getElementById('monthFilter');
  const prevMonth = state.monthKey;
  monthSel.innerHTML = MONTHS.slice().reverse().map(m=>`<option value="${m.key}">${m.label}</option>`).join('');
  if(MONTHS.length){
    const exists = MONTHS.some(m=>m.key===prevMonth);
    state.monthKey = exists ? prevMonth : MONTHS[MONTHS.length-1].key;
    monthSel.value = state.monthKey;
  }
  if(!state.rangeStart && ALL_ROWS.length){
    state.rangeStart = fmtDateInput(ALL_ROWS[0].date);
    state.rangeEnd = fmtDateInput(ALL_ROWS[ALL_ROWS.length-1].date);
    document.getElementById('rangeStart').value = state.rangeStart;
    document.getElementById('rangeEnd').value = state.rangeEnd;
  }
  const yearSel = document.getElementById('yearFilter');
  const years = [...new Set(ALL_ROWS.map(r=>r.date.getFullYear()))].sort((a,b)=>b-a);
  yearSel.innerHTML = '<option value="ALL">Pick a year</option>' + years.map(y=>`<option value="${y}">${y}</option>`).join('');
}


/* ---------------------- UI wiring ---------------------- */
let activeTab = 'main';
document.querySelectorAll('.sb-nav [data-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.sb-nav [data-tab]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    const TAB_IDS = { main:'mainTab', bi:'biTab', scoring:'scoringTab', customers:'customersTab' };
    Object.entries(TAB_IDS).forEach(([k,id])=>{ const el = document.getElementById(id); if(el) el.style.display = activeTab===k ? 'block':'none'; });
    // charts drawn while their tab was hidden have 0 width — redraw so they size to the visible box
    if(ALL_ROWS.length) renderAll();
    window.scrollTo({top:0, behavior:'smooth'});
  });
});

function setMode(mode){
  state.mode = mode;
  document.getElementById('weekBlock').style.display = mode==='WEEK' ? 'flex':'none';
  document.getElementById('monthBlock').style.display = mode==='MONTH' ? 'flex':'none';
  document.getElementById('rangeBlock').style.display = mode==='RANGE' ? 'flex':'none';
  renderAll();
}
document.getElementById('metricToggle').querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.getElementById('metricToggle').querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); state.metric = btn.dataset.metric; renderAll();
  });
});
document.getElementById('orderTypeToggle').querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.getElementById('orderTypeToggle').querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); state.ordertype = btn.dataset.ordertype; renderAll();
  });
});
document.getElementById('modeToggle').querySelectorAll('button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.getElementById('modeToggle').querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); setMode(btn.dataset.mode);
  });
});
document.getElementById('spFilter').addEventListener('change', e=>{ state.salesperson = e.target.value; renderAll(); });
document.getElementById('weekFilter').addEventListener('change', e=>{ state.weekKey = +e.target.value; renderAll(); });
document.getElementById('monthFilter').addEventListener('change', e=>{ state.monthKey = e.target.value; renderAll(); });
document.getElementById('rangeStart').addEventListener('change', e=>{ state.rangeStart = e.target.value; renderAll(); });
document.getElementById('rangeEnd').addEventListener('change', e=>{ state.rangeEnd = e.target.value; renderAll(); });

document.querySelectorAll('.chart-toggle').forEach(group=>{
  const target = group.dataset.target;
  group.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      group.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      if(target==='trendGran'){ state.trendGran = btn.dataset.type; renderTrend(chartTypes.trend); return; }
      if(target==='growthGran'){ state.growthGran = btn.dataset.type; renderGrowthTable(); return; }
      if(target==='misGran'){ state.misGran = btn.dataset.type; renderMisReport(); return; }
      if(target==='scoreGran'){ state.scoreGran = btn.dataset.type; renderMisScoring(); return; }
      chartTypes[target] = btn.dataset.type;
      if(target==='trend') renderTrend(chartTypes.trend);
      if(target==='wow') renderWow(chartTypes.wow);
      if(target==='split') renderSplit(chartTypes.split);
      if(target==='sp') renderSp(chartTypes.sp);
    });
  });
});
document.getElementById('yearFilter').addEventListener('change', e=>{
  const y = e.target.value;
  if(y==='ALL') return;
  state.mode = 'RANGE';
  state.rangeStart = `${y}-01-01`;
  state.rangeEnd = `${y}-12-31`;
  state.trendGran = 'month';
  applyStateToUI();
  renderAll();
});
document.getElementById('refreshBtn').addEventListener('click', ()=>loadData(true));

/* ---------------------- Save / restore filter view ---------------------- */
const SAVED_VIEW_KEY = 'pnp_dashboard_saved_view_v1';
function applyStateToUI(){
  document.querySelectorAll('#metricToggle button').forEach(b=>b.classList.toggle('active', b.dataset.metric===state.metric));
  document.querySelectorAll('#orderTypeToggle button').forEach(b=>b.classList.toggle('active', b.dataset.ordertype===state.ordertype));
  document.querySelectorAll('#modeToggle button').forEach(b=>b.classList.toggle('active', b.dataset.mode===state.mode));
  document.getElementById('weekBlock').style.display = state.mode==='WEEK' ? 'flex':'none';
  document.getElementById('monthBlock').style.display = state.mode==='MONTH' ? 'flex':'none';
  document.getElementById('rangeBlock').style.display = state.mode==='RANGE' ? 'flex':'none';
  const spSel = document.getElementById('spFilter');
  if([...spSel.options].some(o=>o.value===state.salesperson)) spSel.value = state.salesperson;
  if(state.weekKey!=null && document.getElementById('weekFilter').querySelector(`option[value="${state.weekKey}"]`)) document.getElementById('weekFilter').value = state.weekKey;
  if(state.monthKey && document.getElementById('monthFilter').querySelector(`option[value="${state.monthKey}"]`)) document.getElementById('monthFilter').value = state.monthKey;
  if(state.rangeStart) document.getElementById('rangeStart').value = state.rangeStart;
  if(state.rangeEnd) document.getElementById('rangeEnd').value = state.rangeEnd;
  Object.keys(chartTypes).forEach(target=>{
    document.querySelectorAll(`.chart-toggle[data-target="${target}"] button`).forEach(b=>b.classList.toggle('active', b.dataset.type===chartTypes[target]));
  });
  [['trendGran','trendGran'],['growthGran','growthGran'],['misGran','misGran'],['scoreGran','scoreGran']].forEach(([t,k])=>{
    document.querySelectorAll(`.chart-toggle[data-target="${t}"] button`).forEach(b=>b.classList.toggle('active', b.dataset.type===state[k]));
  });
}
function loadSavedView(){
  try{
    const raw = localStorage.getItem(SAVED_VIEW_KEY);
    if(!raw) return;
    const saved = JSON.parse(raw);
    if(saved.state) Object.assign(state, saved.state);
    if(saved.chartTypes) Object.assign(chartTypes, saved.chartTypes);
  } catch(e){ console.warn('Could not read saved view', e); }
}
function saveView(){
  try{
    localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify({ state, chartTypes }));
    const btn = document.getElementById('saveViewBtn');
    const original = btn.textContent;
    btn.textContent = '✓ Saved'; btn.classList.add('saved');
    showToast('View saved. Filters and chart types will load next time.');
    setTimeout(()=>{ btn.textContent = original; btn.classList.remove('saved'); }, 1500);
  } catch(e){ alert('Could not save — your browser may be blocking local storage for this file.'); }
}
function resetView(){
  try{ localStorage.removeItem(SAVED_VIEW_KEY); }catch(e){}
  state = { metric:'net', ordertype:'ALL', salesperson:'ALL', mode:'ALL', weekKey:null, monthKey:null, rangeStart:null, rangeEnd:null, trendGran:'auto', growthGran:'week', misGran:'month', scoreGran:'week' };
  chartTypes = { trend:'bar', split:'stacked', sp:'stacked', wow:'bar' };
  populateFilterOptions();
  applyStateToUI();
  renderAll();
  showToast('View reset to defaults.');
}
document.getElementById('saveViewBtn').addEventListener('click', saveView);
document.getElementById('resetViewBtn').addEventListener('click', resetView);

/* ---------------------- Load / sync ---------------------- */
function setSyncStatus(ok, msg){
  document.getElementById('syncStatus').innerHTML = `<span class="live-dot ${ok?'':'err'}"></span>${msg}`;
}
function showError(msg){
  const bar = document.getElementById('errBar');
  bar.innerHTML = `⚠️ ${msg}<br><br>Fix: open the sheet → <b>Share</b> → set to <b>"Anyone with the link — Viewer"</b>, then refresh.`;
  bar.classList.add('show');
}
function hideError(){ document.getElementById('errBar').classList.remove('show'); }

async function loadData(manual){
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  if(manual) setSyncStatus(true, 'Refreshing…');
  try{
    const rows = await fetchSheetRows();
    const meta = enrichAndIndex(rows);
    ALL_ROWS = rows; WEEKS = meta.weeks; MONTHS = meta.months;
    if(!loadData._savedApplied){ loadSavedView(); loadData._savedApplied = true; }
    populateFilterOptions();
    applyStateToUI();
    hideError();
    document.getElementById('loadingScreen').style.display='none';
    document.getElementById('dashboardBody').style.display='block';
    renderAll();
    renderDataHealth();
    setSyncStatus(true, `Live, synced ${new Date().toLocaleTimeString()}`);
    if(manual) showToast(`Refreshed. ${fmtNum(rows.length)} invoices loaded.`);
  } catch(err){
    console.error(err);
    setSyncStatus(false, 'Connection error');
    showError(err.message || 'Could not load data from the sheet.');
    if(!ALL_ROWS.length) document.getElementById('loadingScreen').style.display='none';
  } finally {
    btn.classList.remove('spinning');
  }
}

// On resize, rebuild the charts so bar widths / label rotation / scroll width re-fit the new screen size
let resizeTimer = null, lastW = window.innerWidth;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    if(Math.abs(window.innerWidth - lastW) < 40) { Object.values(charts).forEach(c=>{ try{ c.resize(); }catch(e){} }); return; }
    lastW = window.innerWidth;
    if(ALL_ROWS.length) renderAll();
  }, 220);
});

/* ---------------------- Admin modal ---------------------- */
function openAdminModal(){
  document.getElementById('adminModalOverlay').style.display = 'flex';
  document.getElementById('adminPassStage').style.display = 'block';
  document.getElementById('adminSettingsStage').style.display = 'none';
  document.getElementById('adminPassInput').value = '';
  document.getElementById('adminPassError').style.display = 'none';
  setTimeout(()=>document.getElementById('adminPassInput').focus(), 50);
}
function closeAdminModal(){ document.getElementById('adminModalOverlay').style.display = 'none'; }
function fillAdminForm(){
  document.getElementById('admSheetId').value = ADMIN.sheetId;
  document.getElementById('admGid').value = ADMIN.gid;
  document.getElementById('admRefresh').value = ADMIN.refreshSeconds;
  document.getElementById('admAutoRefresh').checked = ADMIN.autoRefresh;
  document.getElementById('admBrand').value = ADMIN.brandName;
  document.getElementById('admTitle').value = ADMIN.dashboardTitle;
  document.getElementById('admTopCust').value = ADMIN.topCustomersN;
  document.getElementById('admTopSp').value = ADMIN.topSalespersonN;
  document.getElementById('admOutlierSD').value = ADMIN.outlierSD;
  document.getElementById('admLowProfit').value = ADMIN.lowProfitPct;
  document.getElementById('admPanelList').innerHTML = PANEL_REGISTRY.map(p=>{
    const checked = ADMIN.visiblePanels[p.key] === false ? '' : 'checked';
    return `<label class="admin-check-row"><input type="checkbox" data-panel-key="${p.key}" ${checked}> ${p.label}</label>`;
  }).join('');
  const spNames = [...new Set(ALL_ROWS.map(r=>r.salesperson))].sort();
  const spListEl = document.getElementById('admSalespersonList');
  if(!spNames.length){
    spListEl.innerHTML = `<span class="hint">Load the sheet first — salespeople will appear here automatically.</span>`;
  } else {
    spListEl.innerHTML = spNames.map(sp=>{
      const a = escAttr(sp);
      const dept = ADMIN.departments[sp] || '';
      const salary = ADMIN.salaries[sp] || '';
      const crTarget = (ADMIN.crTargets && ADMIN.crTargets[sp]) || '';
      const hidden = ADMIN.hiddenFromMis && ADMIN.hiddenFromMis[sp];
      return `<div class="admin-sp-row" style="grid-template-columns:1fr 90px 100px 90px 84px">
        <span class="sp-name" title="${a}">${a}</span>
        <select data-sp-dept="${a}">
          <option value="" ${dept===''?'selected':''}>Dept</option>
          <option value="NBD" ${dept==='NBD'?'selected':''}>NBD</option>
          <option value="CRR" ${dept==='CRR'?'selected':''}>CRR</option>
          <option value="OTHER" ${dept==='OTHER'?'selected':''}>OTHER</option>
        </select>
        <input type="number" data-sp-salary="${a}" placeholder="Salary ₹" value="${salary}">
        <input type="number" data-sp-crtarget="${a}" placeholder="CR target %" value="${crTarget}">
        <label style="display:flex;align-items:center;gap:4px;font-size:10.5px;color:var(--ink-dim);white-space:nowrap">
          <input type="checkbox" data-sp-hide="${a}" ${hidden?'checked':''}> Hide in MIS
        </label>
      </div>`;
    }).join('');
  }
}
function applyPanelVisibility(){
  PANEL_REGISTRY.forEach(p=>{
    const el = document.getElementById(p.key);
    if(el) el.style.display = (ADMIN.visiblePanels[p.key] === false) ? 'none' : '';
  });
}
function tryAdminLogin(){
  if(document.getElementById('adminPassInput').value === ADMIN_PASSWORD){
    document.getElementById('adminPassStage').style.display = 'none';
    document.getElementById('adminSettingsStage').style.display = 'block';
    fillAdminForm();
  } else {
    document.getElementById('adminPassError').style.display = 'block';
  }
}
document.getElementById('adminBtn').addEventListener('click', openAdminModal);
document.getElementById('adminModalClose').addEventListener('click', closeAdminModal);
document.getElementById('adminModalOverlay').addEventListener('click', e=>{ if(e.target.id==='adminModalOverlay') closeAdminModal(); });
document.getElementById('adminPassSubmit').addEventListener('click', tryAdminLogin);
document.getElementById('adminPassInput').addEventListener('keydown', e=>{ if(e.key==='Enter') tryAdminLogin(); });
document.getElementById('adminSaveBtn').addEventListener('click', ()=>{
  const visiblePanels = {};
  document.querySelectorAll('#admPanelList input[type="checkbox"]').forEach(cb=>{ if(!cb.checked) visiblePanels[cb.dataset.panelKey] = false; });
  const salaries = {}, departments = {}, crTargets = {}, hiddenFromMis = {};
  document.querySelectorAll('#admSalespersonList [data-sp-salary]').forEach(inp=>{ const v = +inp.value; if(v > 0) salaries[inp.dataset.spSalary] = v; });
  document.querySelectorAll('#admSalespersonList [data-sp-dept]').forEach(sel=>{ if(sel.value) departments[sel.dataset.spDept] = sel.value; });
  document.querySelectorAll('#admSalespersonList [data-sp-crtarget]').forEach(inp=>{ const v = +inp.value; if(v > 0) crTargets[inp.dataset.spCrtarget] = v; });
  document.querySelectorAll('#admSalespersonList [data-sp-hide]').forEach(cb=>{ if(cb.checked) hiddenFromMis[cb.dataset.spHide] = true; });
  const updated = {
    sheetId: document.getElementById('admSheetId').value.trim() || DEFAULT_ADMIN_SETTINGS.sheetId,
    gid: document.getElementById('admGid').value.trim() || DEFAULT_ADMIN_SETTINGS.gid,
    refreshSeconds: Math.max(10, +document.getElementById('admRefresh').value || DEFAULT_ADMIN_SETTINGS.refreshSeconds),
    autoRefresh: document.getElementById('admAutoRefresh').checked,
    brandName: document.getElementById('admBrand').value.trim() || DEFAULT_ADMIN_SETTINGS.brandName,
    dashboardTitle: document.getElementById('admTitle').value.trim() || DEFAULT_ADMIN_SETTINGS.dashboardTitle,
    topCustomersN: Math.max(1, +document.getElementById('admTopCust').value || DEFAULT_ADMIN_SETTINGS.topCustomersN),
    topSalespersonN: Math.max(1, +document.getElementById('admTopSp').value || DEFAULT_ADMIN_SETTINGS.topSalespersonN),
    outlierSD: Math.max(0.5, +document.getElementById('admOutlierSD').value || DEFAULT_ADMIN_SETTINGS.outlierSD),
    lowProfitPct: Math.max(0, +document.getElementById('admLowProfit').value || 0),
    visiblePanels, salaries, departments, crTargets, hiddenFromMis
  };
  try{ localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(updated)); location.reload(); }
  catch(e){ alert('Could not save settings — your browser may be blocking local storage for this file.'); }
});
document.getElementById('adminDefaultsBtn').addEventListener('click', ()=>{
  if(confirm('Restore all admin settings to factory defaults? This reloads the page.')){
    localStorage.removeItem(ADMIN_SETTINGS_KEY);
    location.reload();
  }
});

/* ---------------------- Data health line (footer) ---------------------- */
function renderDataHealth(){
  const el = document.getElementById('dataHealth');
  if(!el || !DATA_HEALTH) return;
  const h = DATA_HEALTH, parts = [`${fmtNum(h.loaded)} of ${fmtNum(h.sheetRows)} sheet rows used`];
  if(h.skippedNoDate) parts.push(`${fmtNum(h.skippedNoDate)} skipped (no valid invoice date)`);
  if(h.skippedNoAmount) parts.push(`${fmtNum(h.skippedNoAmount)} skipped (amount is 0 or empty)`);
  if(h.missingColumns.length) parts.push(`columns not found: ${h.missingColumns.join(', ')}`);
  el.textContent = parts.join(' · ');
  el.style.color = (h.missingColumns.length) ? 'var(--coral)' : '';
}

/* ---------------------- Boot ---------------------- */
function titleCase(s){ return s.toLowerCase().replace(/\b\w/g, c=>c.toUpperCase()); }
document.getElementById('brandLabel').textContent = ADMIN.brandName;
document.getElementById('dashTitle').textContent = ADMIN.dashboardTitle;
document.getElementById('heroHello').textContent = `Hello, ${titleCase(ADMIN.brandName)}!`;
document.getElementById('avatarBadge').textContent = ADMIN.brandName.split(/\s+/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'PN';
document.querySelector('.sb-brand').textContent = ADMIN.brandName.split(/\s+/).filter(Boolean).map(w=>w[0]).join('').slice(0,3) || 'PnP';

applyPanelVisibility();
loadData(false);
// Watchdog: never spin forever. If data hasn't arrived in 25s, say why and what to check.
setTimeout(()=>{
  if(!ALL_ROWS.length && document.getElementById('loadingScreen').style.display !== 'none'){
    document.getElementById('loadingScreen').style.display = 'none';
    setSyncStatus(false, 'No data yet');
    showError('Google Sheet did not respond within 25 seconds. Check your internet, that the sheet is shared as "Anyone with the link — Viewer", and the Sheet ID / gid in Admin settings.');
  }
}, 25000);
if(refreshTimer) clearInterval(refreshTimer);
if(ADMIN.autoRefresh){ refreshTimer = setInterval(()=>loadData(false), CONFIG.REFRESH_MS); }
