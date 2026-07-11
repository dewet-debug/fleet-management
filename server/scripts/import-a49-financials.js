/**
 * Import the operator's monthly financial workbook (MNC A49) into
 *   - FleetFinancialMonth  (fleet-wide per-month billing/collection/fund balances + KPI counts)
 *   - VehicleRentalMonth   (per-vehicle per-month rental billed/collected)
 *
 * These two models are read by the reports (financials, fleetHealth, rentalVsEarnings,
 * rentalRepeat, driverScorecard) but have no other importer. Re-run any time the workbook
 * is updated; it is idempotent (FleetFinancialMonth upserts by month, VehicleRentalMonth
 * deletes+recreates per month).
 *
 * Usage:  node scripts/import-a49-financials.js <path-to-workbook.xlsx>
 *
 * Source tabs:
 *   "Monthly summary"  -> Total billing (Gross amount invoiced / Amount collected),
 *                         Profit fund cumulative balance, Total fund balance, Cash balance
 *   "KPI"              -> Total Delivered, Active (vehicle counts)
 *   "* Collections"    -> per-vehicle rental lines
 *
 * Notes learned the hard way:
 *   - Collections tabs list a vehicle on MULTIPLE billing lines, and some months use a
 *     placeholder "pool" plate (e.g. MT79CXGP in Apr 26 held 84 distinct drivers). Rows must
 *     be AGGREGATED BY SUM per (month, licensePlate) — keep-last under-counts the month total.
 *   - "Collection - Rental" is stored as a negative; collected = abs(value).
 *   - Month headers are Excel serials (epoch 1899-12-30) or "September 25" style labels.
 */
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const FILE = process.argv[2];
if (!FILE) { console.error('Usage: node scripts/import-a49-financials.js <workbook.xlsx>'); process.exit(1); }

const MONTHS = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
const MONTHNAME = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const num = (v) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return isNaN(n) ? null : n; };

function serialToKey(serial) {
  const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function labelToKey(label) {
  const m = String(label).trim().match(/^([A-Za-z]+)\s+(\d{2,4})$/);
  if (!m) return null;
  const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!mon) return null;
  let yr = Number(m[2]); if (yr < 100) yr += 2000;
  return `${yr}-${String(mon).padStart(2, '0')}`;
}
function cellToKey(v) {
  if (typeof v === 'number') return serialToKey(v);
  if (typeof v === 'string' && v.trim()) return labelToKey(v);
  return null;
}
function keyToLabel(key) { const [y, m] = key.split('-'); return `${MONTHNAME[Number(m)]} ${y.slice(2)}`; }
function tabNameToKey(name) {
  const m = name.match(/([A-Za-z]{3})\s*(\d{2})/);
  if (!m) return null;
  const mon = MONTHS[m[1].toLowerCase()];
  return `${2000 + Number(m[2])}-${String(mon).padStart(2, '0')}`;
}

(async () => {
  const wb = XLSX.readFile(FILE);

  // ---------- FleetFinancialMonth ----------
  const ms = XLSX.utils.sheet_to_json(wb.Sheets['Monthly summary'], { header: 1, blankrows: false });
  const msMonthRow = ms.find(r => r && r.slice(2).filter(c => typeof c === 'number' && c > 40000).length >= 3);
  const msCols = {};
  msMonthRow.forEach((v, i) => { const k = cellToKey(v); if (k && i >= 2 && i <= 10) msCols[k] = i; });

  const findRow = (label, afterLabel) => {
    let start = 0;
    if (afterLabel) { const idx = ms.findIndex(r => r && String(r[0]).trim() === afterLabel); start = idx >= 0 ? idx : 0; }
    for (let i = start; i < ms.length; i++) if (ms[i] && String(ms[i][0]).trim() === label) return ms[i];
    return null;
  };
  const rowBilled = findRow('Gross amount invoiced', 'Total billing');
  const rowCollected = findRow('Amount collected', 'Total billing');
  const rowProfitFund = findRow('Cumulative fund balance', 'Profit fund');
  const rowTotalFund = findRow('Total fund balance');
  const rowCash = findRow('Cash balance');

  const kpi = XLSX.utils.sheet_to_json(wb.Sheets['KPI'], { header: 1, blankrows: false });
  const kpiMonthRow = kpi.find(r => r && r.slice(2).filter(c => (typeof c === 'number' && c > 40000) || (typeof c === 'string' && labelToKey(c))).length >= 3);
  const kpiCols = {};
  kpiMonthRow.forEach((v, i) => { const k = cellToKey(v); if (k && i >= 2) kpiCols[k] = i; });
  const kpiRow = (label) => kpi.find(r => r && String(r[0]).trim() === label);
  const rowDelivered = kpiRow('Total Delivered');
  const rowActive = kpiRow('Active');

  for (const key of Object.keys(msCols).sort()) {
    const c = msCols[key];
    const kc = kpiCols[key];
    const data = {
      month: key,
      monthLabel: keyToLabel(key),
      billedGross: num(rowBilled?.[c]) ?? 0,
      collected: num(rowCollected?.[c]) ?? 0,
      profitFundBalance: rowProfitFund ? num(rowProfitFund[c]) : null,
      totalFundBalance: rowTotalFund ? num(rowTotalFund[c]) : null,
      cashBalance: rowCash ? num(rowCash[c]) : null,
      vehiclesDelivered: kc != null && rowDelivered ? Math.round(num(rowDelivered[kc]) ?? 0) : null,
      vehiclesActive: kc != null && rowActive ? Math.round(num(rowActive[kc]) ?? 0) : null,
      source: 'MNC A49 workbook (Monthly summary + KPI)',
    };
    await p.fleetFinancialMonth.upsert({ where: { month: key }, update: data, create: data });
    console.log(`FIN ${key} ${data.monthLabel}: billed=${data.billedGross.toFixed(0)} collected=${data.collected.toFixed(0)} delivered=${data.vehiclesDelivered} active=${data.vehiclesActive}`);
  }

  // ---------- VehicleRentalMonth ----------
  for (const tab of wb.SheetNames.filter(n => /collection/i.test(n))) {
    const key = tabNameToKey(tab);
    if (!key) { console.log('SKIP tab (no month):', tab); continue; }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[tab], { header: 1, blankrows: false });
    const hIdx = rows.findIndex(r => r && r.some(c => String(c).trim() === 'Vehicle registration number'));
    if (hIdx < 0) { console.log('SKIP tab (no header):', tab); continue; }
    const H = rows[hIdx].map(c => String(c).trim());
    const col = (name) => H.indexOf(name);
    const iPlate = col('Vehicle registration number'), iDriver = col('Driver'), iDid = col('Driver ID');
    const iRent = col('Total rental'), iExc = col('Excess KM'), iInit = col('Initiation fees'), iColl = col('Collection - Rental');
    const recs = [];
    for (let i = hIdx + 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue;
      const plate = r[iPlate]; const billed = num(r[iRent]);
      if (!plate || typeof plate !== 'string' || billed === null) continue;
      const p2 = plate.toUpperCase().replace(/\s/g, '');
      if (!/^[A-Z0-9]{4,}$/.test(p2)) continue;
      recs.push({
        month: key, licensePlate: p2,
        driverName: r[iDriver] ? String(r[iDriver]) : null,
        driverId: r[iDid] != null && r[iDid] !== '' ? String(r[iDid]) : null,
        rentalBilled: billed,
        rentalCollected: Math.abs(num(r[iColl]) ?? 0),
        excessKm: num(r[iExc]),
        initiationFees: num(r[iInit]),
      });
    }
    // Aggregate by SUM per plate (see header note).
    const agg = new Map();
    for (const rec of recs) {
      const ex = agg.get(rec.licensePlate);
      if (!ex) { agg.set(rec.licensePlate, { ...rec }); continue; }
      ex.rentalBilled += rec.rentalBilled;
      ex.rentalCollected += rec.rentalCollected;
      ex.excessKm = (ex.excessKm || 0) + (rec.excessKm || 0);
      ex.initiationFees = (ex.initiationFees || 0) + (rec.initiationFees || 0);
      if (rec.driverName) ex.driverName = rec.driverName;
      if (rec.driverId) ex.driverId = rec.driverId;
    }
    const uniq = [...agg.values()];
    await p.vehicleRentalMonth.deleteMany({ where: { month: key } });
    for (let i = 0; i < uniq.length; i += 200) await p.vehicleRentalMonth.createMany({ data: uniq.slice(i, i + 200), skipDuplicates: true });
    const sumBilled = uniq.reduce((a, r) => a + r.rentalBilled, 0);
    console.log(`RENT ${key} (${tab}): ${uniq.length} vehicles, billed=${sumBilled.toFixed(0)}`);
  }

  console.log('\nDONE. FleetFinancialMonth:', await p.fleetFinancialMonth.count(), '| VehicleRentalMonth:', await p.vehicleRentalMonth.count());
  await p.$disconnect();
})().catch(e => { console.error('ERR:', e.message, e.stack); process.exit(1); });
