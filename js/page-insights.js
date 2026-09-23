/* =====================================================================
   page-insights.js — plain-language insights for Main, BI and Scoring
   Every insight is computed from the filtered data; clicking one opens
   the invoices / salesperson / customer behind it.
   ===================================================================== */

let SCORE_CTX = null;
const INS_ICON = { good:'▲', bad:'▼', warn:'!', info:'i' };
function drawInsights(id, list){
  const el = document.getElementById(id);
  if(!el) return;
  el.innerHTML = list.map(i=>{
    const attr = i.drill ? `data-drill="${i.drill}"` : i.sp ? `data-sp="${escAttr(i.sp)}"` : i.cust ? `data-cust="${escAttr(i.cust)}"` : '';
    return `<div class="insight ${i.tone}${attr?' clickable':''}" ${attr}><span class="ins-ico">${INS_ICON[i.tone]}</span><p>${i.text}${attr?' <span class="ins-more">View →</span>':''}</p></div>`;
  }).join('') || `<div class="insight info"><span class="ins-ico">i</span><p>No data in the selected filters.</p></div>`;
}
const pctChange = (c,p) => p ? (c-p)/Math.abs(p)*100 : null;
const signPct = v => `${v>=0?'+':'−'}${Math.abs(v).toFixed(1)}%`;
function workingDaysBetween(a, b){ // Mon–Sat, inclusive
  let n = 0; const d = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  while(d <= b){ if(d.getDay()!==0) n++; d.setDate(d.getDate()+1); }
  return n;
}

/* ============================ MAIN ============================ */
function renderMainInsights(){
  const base = baseFiltered(ALL_ROWS), cur = currentRows();
  if(!cur.length) return drawInsights('mainInsights', []);
  const a = aggregateRows(cur);
  const C = periodCompare(base), ca = aggregateRows(C.cur), pa = aggregateRows(C.prev);
  const out = [];

  const ch = pctChange(ca.net, pa.net);
  if(ch !== null){
    out.push({ tone: ch>=0?'good':'bad', drill: registerDrill(`Invoices — ${C.label.replace(/^(in the |vs )/,'').replace(/ vs .*$/,'')}`, C.cur, `Current side of the comparison ${C.label}`),
      text:`Net sales <b>${fmtINR(ca.net)}</b>, ${ch>=0?'up':'down'} <b>${Math.abs(ch).toFixed(1)}%</b> ${C.label} (was ${fmtINR(pa.net)}). Invoices ${fmtNum(ca.invoices)} vs ${fmtNum(pa.invoices)}.` });
    const gpd = ca.gpPct - pa.gpPct;
    if(Math.abs(gpd) >= 0.3) out.push({ tone: gpd>=0?'good':'warn',
      text:`Margin ${gpd>=0?'improved':'slipped'} to <b>${fmtPct(ca.gpPct)}</b> from ${fmtPct(pa.gpPct)} — ${gpd>=0?'that alone adds':'that costs'} about ${fmtINR(Math.abs(gpd)/100*ca.net)} of profit on current sales.` });
    const aovd = pctChange(ca.avgInvoice, pa.avgInvoice);
    if(aovd!==null && Math.abs(aovd) >= 5) out.push({ tone: aovd>=0?'good':'warn', text:`Average invoice ${aovd>=0?'grew':'fell'} to <b>${fmtINR(ca.avgInvoice)}</b> (${signPct(aovd)}).` });
  }

  const sps = a.bySp.slice().sort((x,y)=>y.net-x.net);
  if(sps.length){
    const t = sps[0];
    out.push({ tone:'info', sp:t.salesperson, text:`<b>${t.salesperson}</b> leads with ${fmtINR(t.net)} — ${(t.net/a.net*100).toFixed(1)}% of sales from ${fmtNum(t.invoices)} invoices.` });
  }
  const spCur = {}, spPrev = {};
  C.cur.forEach(r=>spCur[r.salesperson]=(spCur[r.salesperson]||0)+r.net);
  C.prev.forEach(r=>spPrev[r.salesperson]=(spPrev[r.salesperson]||0)+r.net);
  const movers = Object.keys(spPrev).filter(k=>spPrev[k]>0).map(k=>({ sp:k, d:(spCur[k]||0)-spPrev[k], p:pctChange(spCur[k]||0, spPrev[k]) }));
  if(movers.length >= 2){
    const up = movers.slice().sort((x,y)=>y.d-x.d)[0], dn = movers.slice().sort((x,y)=>x.d-y.d)[0];
    if(up.d>0) out.push({ tone:'good', sp:up.sp, text:`Biggest gain: <b>${up.sp}</b> +${fmtINR(up.d)} (${signPct(up.p)}) ${C.label}.` });
    if(dn.d<0) out.push({ tone:'bad', sp:dn.sp, text:`Biggest drop: <b>${dn.sp}</b> −${fmtINR(-dn.d)} (${signPct(dn.p)}) ${C.label}.` });
  }

  const crr = aggregateRows(cur.filter(r=>r.ordertype==='CRR')), nbd = aggregateRows(cur.filter(r=>r.ordertype==='NBD'));
  if(a.net && state.ordertype==='ALL'){
    out.push({ tone:'info', drill: registerDrill('NBD (new business) invoices', cur.filter(r=>r.ordertype==='NBD')),
      text:`New business (NBD) is <b>${(nbd.net/a.net*100).toFixed(1)}%</b> of sales at ${fmtPct(nbd.gpPct)} GP; repeat (CRR) is ${(crr.net/a.net*100).toFixed(1)}% at ${fmtPct(crr.gpPct)} GP.` });
  }

  const buckets = buildPeriodBuckets(cur), items = bucketAggs(cur, buckets);
  if(items.length >= 3){
    const avg = items.reduce((s,it)=>s+it.agg.net,0)/items.length;
    let bi = 0; items.forEach((it,i)=>{ if(it.agg.net > items[bi].agg.net) bi = i; });
    const b = items[bi];
    out.push({ tone:'info', drill: registerDrill(`${buckets.granularity} — ${b.label}`, cur.filter(buckets.defs[bi].match)),
      text:`Best ${buckets.granularity.toLowerCase().replace('ly','').replace('dai','day')} was <b>${b.label}${b.range?` (${b.range})`:''}</b> at ${fmtINR(b.agg.net)}, ${(b.agg.net/avg).toFixed(1)}× the average of ${fmtINR(avg)}.` });
  }

  const days = new Set(cur.map(r=>r.date.toDateString()));
  if(days.size >= 12){
    const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const tot = Array(7).fill(0), cnt = Array(7).fill(0), seen = Array(7).fill(null).map(()=>new Set());
    cur.forEach(r=>{ const d = r.date.getDay(); tot[d]+=r.net; seen[d].add(r.date.toDateString()); });
    seen.forEach((s,i)=>cnt[i]=s.size);
    const avgs = tot.map((t,i)=>cnt[i]?t/cnt[i]:null);
    const valid = avgs.map((v,i)=>({i,v})).filter(x=>x.v!==null);
    if(valid.length >= 3){
      const best = valid.sort((x,y)=>y.v-x.v)[0], worst = valid[valid.length-1];
      out.push({ tone:'info', text:`<b>${names[best.i]}</b> is the strongest billing day (avg ${fmtINR(best.v)} per day); ${names[worst.i]} is the weakest (avg ${fmtINR(worst.v)}).` });
    }
  }

  // Month-end projection when looking at the latest (still running) month
  if(state.mode==='MONTH' && state.monthKey===MONTHS[MONTHS.length-1]?.key){
    const [y,m] = state.monthKey.split('-').map(Number);
    const mStart = new Date(y,m-1,1), mEnd = new Date(y,m,0);
    const last = ALL_ROWS[ALL_ROWS.length-1].date;
    const done = workingDaysBetween(mStart, last), total = workingDaysBetween(mStart, mEnd);
    if(done && done < total){
      const proj = a.net/done*total;
      const prevKey = MONTHS[MONTHS.length-2]?.key;
      const prevNet = prevKey ? aggregateRows(base.filter(r=>r.monthKey===prevKey)).net : 0;
      out.push({ tone: prevNet && proj < prevNet ? 'warn' : 'good',
        text:`At the current pace this month will close around <b>${fmtINR(proj)}</b> (${done} of ${total} working days billed)${prevNet?`, vs ${fmtINR(prevNet)} last month`:''}.` });
    }
  }

  const topC = a.customers.slice().sort((x,y)=>y.net-x.net)[0];
  if(topC && a.net) out.push({ tone: topC.net/a.net >= 0.15 ? 'warn' : 'info', cust: topC.name,
    text:`Largest customer <b>${topC.name}</b> = ${(topC.net/a.net*100).toFixed(1)}% of sales (${fmtINR(topC.net)}).` });

  drawInsights('mainInsights', out);
}

/* ============================ BI ============================ */
function renderBIInsights(){
  const base = baseFiltered(ALL_ROWS), cur = currentRows();
  if(!cur.length) return drawInsights('biInsights', []);
  const a = aggregateRows(cur);
  const C = periodCompare(base), ca = aggregateRows(C.cur), pa = aggregateRows(C.prev);
  const out = [];
  const margin = r => r.net ? r.profit/r.net*100 : 0;

  const pc = pctChange(ca.profit, pa.profit);
  out.push({ tone: pc===null ? 'info' : pc>=0 ? 'good' : 'bad',
    text:`Profit <b>${fmtINR(a.profit)}</b> at <b>${fmtPct(a.gpPct)}</b> GP.` + (pc===null ? '' : ` Profit ${pc>=0?'up':'down'} ${Math.abs(pc).toFixed(1)}% ${C.label}.`) });

  const zero = cur.filter(r=>r.profit<=0);
  if(zero.length){
    const zNet = zero.reduce((s,r)=>s+r.net,0);
    const bySp = {}; zero.forEach(r=>bySp[r.salesperson]=(bySp[r.salesperson]||0)+r.net);
    const worst = topKey(bySp);
    out.push({ tone:'bad', drill: registerDrill('Zero or negative profit invoices', zero),
      text:`<b>${fmtNum(zero.length)} invoices (${(zero.length/cur.length*100).toFixed(0)}%)</b> earned zero or negative profit on ${fmtINR(zNet)} of sales. Most of it is from <b>${worst}</b> (${fmtINR(bySp[worst])}).` });
    const potential = zNet * a.gpPct/100;
    if(potential > 0) out.push({ tone:'warn', drill: registerDrill('Zero-profit invoices', zero),
      text:`If those invoices had earned your average ${fmtPct(a.gpPct)} margin, profit would be about <b>${fmtINR(potential)}</b> higher.` });
  }
  const thin = cur.filter(r=>{ const m = margin(r); return m>0 && m<=5; });
  if(thin.length) out.push({ tone:'warn', drill: registerDrill('Invoices with 0–5% margin', thin),
    text:`${fmtNum(thin.length)} more invoices are on a thin <b>0–5% margin</b> (${fmtINR(thin.reduce((s,r)=>s+r.net,0))} of sales).` });

  const sps = a.bySp.filter(s=>s.invoices>=5 && a.net && s.net/a.net>=0.03);
  if(sps.length >= 2){
    const eff = sps.map(s=>({ ...s, avgP: s.profit/s.invoices, gp: s.net ? s.profit/s.net*100 : 0 }));
    const be = eff.slice().sort((x,y)=>y.avgP-x.avgP)[0], we = eff.slice().sort((x,y)=>x.avgP-y.avgP)[0];
    out.push({ tone:'good', sp:be.salesperson, text:`Most efficient: <b>${be.salesperson}</b> earns ${fmtINR(be.avgP)} profit per invoice; lowest is ${we.salesperson} at ${fmtINR(we.avgP)}.` });
    const lg = eff.slice().sort((x,y)=>x.gp-y.gp)[0];
    if(lg.gp < a.gpPct) out.push({ tone:'warn', sp:lg.salesperson, text:`<b>${lg.salesperson}</b> has the lowest margin at ${fmtPct(lg.gp)} on ${fmtINR(lg.net)} of sales (team ${fmtPct(a.gpPct)}).` });
  }

  const tax = cur.reduce((s,r)=>s+r.tax,0), taxPrev = C.prev.reduce((s,r)=>s+r.tax,0), taxCur = C.cur.reduce((s,r)=>s+r.tax,0);
  const tc = pctChange(taxCur, taxPrev);
  out.push({ tone:'info', text:`GST collected <b>${fmtINR(tax)}</b> (${fmtPct(a.gross ? tax/a.gross*100 : 0)} of billed value)` + (tc===null ? '.' : `, ${tc>=0?'up':'down'} ${Math.abs(tc).toFixed(1)}% ${C.label}.`) });

  const custP = a.customers.slice().sort((x,y)=>y.profit-x.profit);
  if(custP.length && a.profit > 0){
    const top5 = custP.slice(0,5).reduce((s,c)=>s+c.profit,0);
    out.push({ tone:'info', cust: custP[0].name, text:`Most profitable customer: <b>${custP[0].name}</b> (${fmtINR(custP[0].profit)}). Top 5 customers give ${(top5/a.profit*100).toFixed(1)}% of all profit.` });
  }

  const vals = cur.map(r=>r.net).filter(n=>n>0);
  if(vals.length > 5){
    const avg = vals.reduce((s,v)=>s+v,0)/vals.length, sd = Math.sqrt(vals.reduce((s,v)=>s+(v-avg)**2,0)/vals.length);
    const th = avg + ADMIN.outlierSD*sd, big = cur.filter(r=>r.net>th);
    if(big.length) out.push({ tone:'info', drill: registerDrill('Unusually large invoices', big),
      text:`${fmtNum(big.length)} unusually large invoices (over ${fmtINR(th)}) add up to ${fmtINR(big.reduce((s,r)=>s+r.net,0))} — ${(big.reduce((s,r)=>s+r.net,0)/a.net*100).toFixed(1)}% of sales.` });
  }
  drawInsights('biInsights', out);
}

/* ============================ SCORING ============================ */
function renderScoringInsights(){
  const S = SCORE_CTX;
  if(!S || (!S.nbdRows.length && !S.crrRows.length)){
    return drawInsights('scoreInsights', [{ tone:'warn', text:'Assign salespeople to NBD / CRR departments with salaries in <b>Admin</b> to see scoring insights.' }]);
  }
  const out = [];
  const team = (rows, name)=>{
    const withPlan = rows.filter(r=>r.profitPlan>0);
    if(!withPlan.length) return;
    const plan = withPlan.reduce((s,r)=>s+r.profitPlan,0), act = withPlan.reduce((s,r)=>s+r.profitActual,0);
    const pct = act/plan*100, met = withPlan.filter(r=>r.profitActual>=r.profitPlan);
    out.push({ tone: pct>=100 ? 'good' : pct>=75 ? 'warn' : 'bad',
      text:`<b>${name} team</b> made ${fmtINR(act)} profit vs a plan of ${fmtINR(plan)} — <b>${pct.toFixed(0)}% of plan</b>. ${fmtNum(met.length)} of ${fmtNum(withPlan.length)} met their profit target${met.length?`: ${met.map(r=>r.sp).join(', ')}`:''}.` });
  };
  team(S.nbdRows, 'NBD'); team(S.crrRows, 'CRR');
  const all = S.nbdRows.concat(S.crrRows).filter(r=>r.overall!==null);
  if(all.length >= 2){
    const best = all.slice().sort((x,y)=>y.overall-x.overall)[0], worst = all.slice().sort((x,y)=>x.overall-y.overall)[0];
    out.push({ tone:'good', sp:best.sp, text:`Top overall score: <b>${best.sp}</b> (${best.overall>0?'+':''}${best.overall.toFixed(1)}).` });
    out.push({ tone:'bad', sp:worst.sp, text:`Lowest overall score: <b>${worst.sp}</b> (${worst.overall.toFixed(1)}) — profit ${fmtINR(worst.profitActual)} vs plan ${fmtINR(worst.profitPlan)}.` });
  }
  const short = S.nbdRows.concat(S.crrRows).filter(r=>r.profitPlan>0 && r.loss<0);
  if(short.length) out.push({ tone:'warn', text:`Total profit shortfall across ${fmtNum(short.length)} people: <b>${fmtINR(-short.reduce((s,r)=>s+r.loss,0))}</b>. Largest gap: ${short.sort((x,y)=>x.loss-y.loss).slice(0,3).map(r=>`${r.sp} (${fmtINR(-r.loss)})`).join(', ')}.` });
  const grow = S.nbdRows.concat(S.crrRows).filter(r=>r.growth!==null && isFinite(r.growth));
  if(grow.length){
    const g = grow.slice().sort((x,y)=>y.growth-x.growth)[0];
    if(g.growth>0) out.push({ tone:'good', sp:g.sp, text:`Fastest revenue growth vs previous period: <b>${g.sp}</b> ${signPct(g.growth)}.` });
  }
  const avgs = S.nbdRows.concat(S.crrRows).filter(r=>r.avgActual);
  if(avgs.length){
    const top = avgs.slice().sort((x,y)=>y.avgActual-x.avgActual)[0];
    out.push({ tone:'info', sp:top.sp, text:`Highest sale per customer: <b>${top.sp}</b> at ${fmtINR(top.avgActual)} across ${fmtNum(top.uniqCustomers)} customer${top.uniqCustomers===1?'':'s'}.` });
  }
  const noSal = S.nbdRows.concat(S.crrRows).filter(r=>!r.salary);
  if(noSal.length) out.push({ tone:'warn', text:`No salary set for ${noSal.map(r=>r.sp).join(', ')} — their plan and score can't be calculated.` });
  drawInsights('scoreInsights', out);
}
