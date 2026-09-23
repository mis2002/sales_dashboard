# Pick N Pack — Live Sales Dashboard

## Folder structure (upload EXACTLY like this)
```
index.html                         ← page layout (HTML only)
css/style.css                      ← design: colours, cards, layout, mobile
js/vendor/chart.umd.js             ← Chart.js library (stored in repo, no CDN)
js/vendor/chartjs-plugin-datalabels.min.js
js/config.js                       ← Sheet ID, gid, refresh, admin defaults
js/format.js                       ← ₹ formats, colours, small helpers
js/data.js                         ← fetch Google Sheet + ALL calculations
js/charts.js                       ← chart theme, data labels, chart builders
js/render.js                       ← cards, tables, MIS, BI, scoring screens
js/customer-calc.js                ← Customers tab: segments, states, pin codes, insights (calculations)
js/customer-view.js                ← Customers tab: charts, tables, customer popup, CSV export
js/app.js                          ← buttons, filters, admin panel, loading
```

## GitHub Pages par update kaise karein
1. Repo `sales-dashboard` kholo → purana `index.html` delete ya replace karo.
2. **Add file → Upload files** → is zip ke andar ke `index.html`, `css` folder aur `js` folder drag-drop karo (folders ke saath, taaki path same rahe).
3. **Commit changes** → 1–2 minute baad `https://mis2002.github.io/sales-dashboard/` kholo → **Ctrl + Shift + R** (hard refresh, purana cache hatane ke liye).

File names case-sensitive hain: `js/app.js` ≠ `JS/App.js`.

## Kya badla
- **Stuck loading fix:** Chart.js ab repo ke andar hai, CDN block hone se page nahi rukega.
- Koi file load na ho ya error aaye to screen par saaf message aata hai, spinner kabhi hamesha nahi ghoomta (25 sec watchdog).
- Har section alag safety-net me render hota hai — ek chart toot jaye to baaki dashboard chalta rahe.
- Footer me **data health**: kitni sheet rows use hui, kitni skip hui (date/amount missing), koi column naam na mila ho to.

## Kya kahan badlein
| Kaam | File |
|---|---|
| Rang / font / spacing | `css/style.css` (top me `:root` variables) |
| Sheet ID, gid, refresh time | `js/config.js` (ya Admin panel, password 0000) |
| Koi calculation / formula | `js/data.js` (aggregation) ya `js/render.js` (MIS scoring) |
| Graph ka look / labels | `js/charts.js` |

## Customers tab (new)
Uses the **Place of Supply** (column L) and **Billing Code** (column M, pin code) columns.
Column names can also be "State" / "Pin code" — both are recognised. "DELHI", "Delhi (07)" etc. are cleaned to "Delhi".

Segments (recalculated for the selected period end):
- Champion: 6+ order days, ordered in last 30 days, top 20% by lifetime value
- Loyal: 4+ order days, active in last 45 days
- Promising: active in last 45 days
- New: first ever order within last 30 days
- At risk: reordered before, now quiet for more than 2× their usual gap (minimum 30 days)
- Needs attention: rare orders, 45–90 days quiet
- Lost: 90+ days without an order
Change the day limits in `segmentOf()` inside `js/customer-calc.js`.
