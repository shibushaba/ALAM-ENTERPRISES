// ══════════════════════════════════════════════════════
//  ALAM ENTERPRISES — DATA LEDGER SYSTEM
//  Main Application Logic
// ══════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────
//  USERS & AUTHENTICATION
// ─────────────────────────────────────────────────────
const USERS = [
  { username: 'RKR', pass: 'RKR159', name: 'RKR Admin', role: 'admin', ini: 'RK' },
  { username: 'ALAM', pass: 'ALAM786', name: 'Alam Viewer', role: 'viewer', ini: 'AL' },
];

const ROLE_LABEL = { admin: 'Administrator', viewer: 'Viewer (Read-Only)' };
const canEdit = r => r === 'admin';

let CU = null;
let selRoleVal = 'admin';

function selRole(r, el) {
  selRoleVal = r;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('l-em').value = '';
  document.getElementById('l-pw').value = '';
}

function doLogin() {
  const un = document.getElementById('l-em').value.trim().toUpperCase();
  const pw = document.getElementById('l-pw').value;
  const u = USERS.find(x => x.username === un && x.pass === pw);
  
  if (!u) {
    document.getElementById('l-err').style.display = 'block';
    return;
  }
  
  document.getElementById('l-err').style.display = 'none';
  CU = u;
  
  document.getElementById('pg-login').style.display = 'none';
  document.getElementById('pg-app').style.display = 'flex';
  document.getElementById('pg-app').style.flexDirection = 'column';
  
  ['top-av', 'sb-av'].forEach(id => document.getElementById(id).textContent = u.ini);
  document.getElementById('top-nm').textContent = u.name.split(' ')[0];
  document.getElementById('sb-un').textContent = u.name;
  document.getElementById('sb-ur').textContent = ROLE_LABEL[u.role];
  
  const rb = document.getElementById('top-rb');
  rb.textContent = u.role;
  rb.className = 'rb ' + u.role;
  
  initApp();
}

function doLogout() {
  CU = null;
  if (fbUnsubscribe) { fbUnsubscribe(); fbUnsubscribe = null; }
  if (fbPdfUnsubscribe) { fbPdfUnsubscribe(); fbPdfUnsubscribe = null; }
  
  document.getElementById('pg-login').style.display = 'flex';
  document.getElementById('pg-app').style.display = 'none';
  resetState();
  document.getElementById('l-em').value = '';
  document.getElementById('l-pw').value = '';
}

// ─────────────────────────────────────────────────────
//  FIREBASE SYNC
// ─────────────────────────────────────────────────────
let fbReady = false;
let fbUnsubscribe = null;
let fbPdfUnsubscribe = null;
let isSyncing = false;

function waitForFirebase(cb) {
  if (window._firebaseReady && window._fbDb) {
    fbReady = true;
    cb();
    return;
  }
  if (!window._fbReadyResolvers) window._fbReadyResolvers = [];
  let called = false;
  const run = () => { if (!called) { called = true; fbReady = true; cb(); } };
  window._fbReadyResolvers.push(run);
  document.addEventListener('firebase-ready', function once() {
    document.removeEventListener('firebase-ready', once);
    run();
  });
}

function setSyncStatus(state, text) {
  const badge = document.getElementById('sync-badge');
  const txt = document.getElementById('sync-text');
  if (!badge) return;
  badge.className = 'sync-badge' + (state === 'syncing' ? ' syncing' : state === 'error' ? ' error' : '');
  if (txt) txt.textContent = text || (state === 'syncing' ? 'Syncing…' : state === 'error' ? 'Offline' : 'Synced ✓');
}

function setFbStatus(state) {
  const dot = document.getElementById('fb-dot');
  const txt = document.getElementById('fb-status-text');
  if (!dot || !txt) return;
  dot.className = 'fb-dot ' + state;
  txt.textContent = state === 'online' ? 'Cloud connected' : state === 'offline' ? 'Offline — local mode' : 'Connecting to cloud…';
}

async function fbSave() {
  if (!fbReady || !window._fbDb || !curY || !curM) {
    return fbSaveAll();
  }
  try {
    isSyncing = true;
    setSyncStatus('syncing');
    const path = 'alam_enterprises/data/' + curY + '/' + curM;
    const dbRef = window._fbRef(window._fbDb, path);
    const data = DB[curY] && DB[curY][curM] ? DB[curY][curM] : null;
    if (data) {
      await window._fbSet(dbRef, data);
    }
    setSyncStatus('synced', 'Synced ✓');
  } catch (e) {
    console.warn('Firebase save error:', e);
    setSyncStatus('error', 'Save failed');
  } finally {
    isSyncing = false;
  }
}

async function fbSaveAll() {
  if (!fbReady || !window._fbDb) return;
  try {
    isSyncing = true;
    setSyncStatus('syncing');
    const dbRef = window._fbRef(window._fbDb, 'alam_enterprises/data');
    const toSave = {};
    Object.keys(DB).forEach(y => {
      toSave[y] = {};
      MONTHS.forEach(m => { if (DB[y][m]) toSave[y][m] = DB[y][m]; });
    });
    await window._fbSet(dbRef, toSave);
    setSyncStatus('synced', 'Synced ✓');
  } catch (e) {
    console.warn('Firebase save error:', e);
    setSyncStatus('error', 'Save failed');
  } finally {
    isSyncing = false;
  }
}

function fbSubscribe() {
  if (!fbReady || !window._fbDb) return;
  const dbRef = window._fbRef(window._fbDb, 'alam_enterprises/data');
  fbUnsubscribe = window._fbOnValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      Object.keys(data).forEach(y => {
        ensureY(parseInt(y));
        MONTHS.forEach(m => {
          if (data[y] && data[y][m]) {
            DB[y][m] = data[y][m];
          }
        });
      });
      if (CU) {
        renderDash();
        renderYears();
        renderSB();
        if (curY) renderMonths(curY);
        if (curY && curM && DB[curY] && DB[curY][curM] && !isSyncing) {
          const remoteHdr = DB[curY][curM].headers || [];
          const remoteRows = (DB[curY][curM].rows || []).map(r => [...r]);
          const changed = JSON.stringify(remoteHdr) !== JSON.stringify(shHdr) ||
            JSON.stringify(remoteRows) !== JSON.stringify(shRows);
          if (changed) {
            shHdr = remoteHdr;
            shRows = remoteRows;
            if (shRows.length) { showTbl(); renderSh(); renderCharts(); renderVehNav(); }
          }
        }
      }
      setSyncStatus('synced', 'Synced ✓');
    } else {
      setSyncStatus('syncing', 'Initialising cloud…');
      fbSaveAll().then(() => {
        setSyncStatus('synced', 'Synced ✓');
        if (CU) { renderDash(); renderYears(); renderSB(); }
      });
    }
  }, (err) => {
    console.warn('Firebase listen error:', err);
    setSyncStatus('error', 'Offline — changes saved locally');
    setFbStatus('offline');
  });
}

// ─────────────────────────────────────────────────────
//  DATA MANAGEMENT
// ─────────────────────────────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CY = new Date().getFullYear();
let DB = {};

function ensureY(y) {
  if (!DB[y]) {
    DB[y] = {};
    MONTHS.forEach(m => DB[y][m] = null);
  }
}

[CY - 1, CY, CY + 1].forEach(y => ensureY(y));

function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function makeSample(year, month) {
  const r = rng(year * 100 + MONTHS.indexOf(month));
  const vehicles = ['7486', '7983', '8124', '6032', '9517', '4401', '3865', '7721'];
  const routes = ['Delhi–Mumbai', 'Kolkata–Delhi', 'Chennai–Hyderabad', 'Mumbai–Pune', 'Delhi–Jaipur', 'Kolkata–Patna', 'Ahmedabad–Surat', 'Bangalore–Chennai'];
  const n = Math.floor(r() * 10) + 6;
  const headers = ['ID', 'Vehicle No', 'Route', 'Total Fare (₹)', 'Expenses (₹)', 'Profit / Loss (₹)', 'Date', 'Remarks'];
  
  const rows = Array.from({ length: n }, (_, i) => {
    const veh = vehicles[Math.floor(r() * vehicles.length)];
    const route = routes[Math.floor(r() * routes.length)];
    const fare = Math.round(r() * 80000 + 15000);
    const exp = Math.round(r() * fare * 0.65 + 5000);
    const profit = fare - exp;
    const d = String(Math.floor(r() * 28) + 1).padStart(2, '0');
    const mo = String(MONTHS.indexOf(month) + 1).padStart(2, '0');
    return [
      'TRP-' + String(1000 + i + 1),
      veh,
      route,
      fare.toFixed(2),
      exp.toFixed(2),
      profit.toFixed(2),
      `${year}-${mo}-${d}`,
      profit < 0 ? 'Loss' : 'Profit'
    ];
  });
  return { headers, rows };
}

// ─────────────────────────────────────────────────────
//  STATE MANAGEMENT
// ─────────────────────────────────────────────────────
let curY = null, curM = null, curVeh = null;
let shHdr = [], shRows = [], filtRows = [];
let sCol = -1, sAsc = true, srchQ = '', pg = 1;
const PG = 12;
let CHT = {};
let pdfStore = {};
let manualVehicles = [];
let saveTimer = null;

function resetState() {
  curY = null; curM = null; curVeh = null;
  shHdr = []; shRows = []; filtRows = [];
  sCol = -1; sAsc = true; srchQ = ''; pg = 1;
  pdfStore = {}; manualVehicles = [];
  DB = {};
  [CY - 1, CY, CY + 1].forEach(y => ensureY(y));
}

// ─────────────────────────────────────────────────────
//  INITIALIZATION
// ─────────────────────────────────────────────────────
function initApp() {
  setSyncStatus('syncing', 'Loading…');
  setFbStatus('connecting');
  
  if (fbUnsubscribe) { fbUnsubscribe(); fbUnsubscribe = null; }
  if (fbPdfUnsubscribe) { fbPdfUnsubscribe(); fbPdfUnsubscribe = null; }
  
  waitForFirebase(() => {
    setFbStatus('online');
    fbSubscribe();
    fbSubscribePdfs();
  });
  
  ['January', 'February', 'March', 'April', 'May'].forEach(m => {
    if (!DB[CY][m]) DB[CY][m] = makeSample(CY, m);
  });
  if (!DB[CY - 1]['January']) DB[CY - 1]['January'] = makeSample(CY - 1, 'January');
  if (!DB[CY - 1]['June']) DB[CY - 1]['June'] = makeSample(CY - 1, 'June');
  
  renderSB();
  goYears();
  setSyncStatus('synced', 'Ready');
}

// ─────────────────────────────────────────────────────
//  MOBILE SIDEBAR
// ─────────────────────────────────────────────────────
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sb-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sb-overlay').classList.remove('show');
}

// ─────────────────────────────────────────────────────
//  SIDEBAR RENDERING
// ─────────────────────────────────────────────────────
function renderSB() {
  const years = Object.keys(DB).map(Number).sort((a, b) => b - a);
  document.getElementById('sb-yrs').innerHTML = years.map(y => {
    const cnt = Object.values(DB[y]).filter(v => v).reduce((s, v) => s + v.rows.length, 0);
    return `<div class="sb-yr ${y == curY ? 'on' : ''}" onclick="goMonths(${y});closeSidebar()"><span>${y}</span><span class="sb-yr-n">${cnt}</span></div>`;
  }).join('');
  renderSBVehicles();
}

function renderSBVehicles() {
  const vehSet = new Set();
  Object.keys(DB).forEach(y => {
    MONTHS.forEach(m => {
      const d = DB[y][m];
      if (!d) return;
      const vi = d.headers.findIndex(h => /vehicle/i.test(h));
      if (vi >= 0) d.rows.forEach(r => { const v = String(r[vi] || '').trim(); if (v) vehSet.add(v); });
    });
  });
  
  const vehs = [...vehSet].sort();
  const sec = document.getElementById('sb-vehs-sec');
  const list = document.getElementById('sb-vehs');
  if (!sec || !list) return;
  
  if (!vehs.length) {
    sec.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  
  sec.style.display = 'flex';
  list.innerHTML = vehs.map(v => {
    return `<div class="sb-veh ${curVehGlobal === v ? 'on' : ''}" onclick="goVehicle('${v}');closeSidebar()">
      <span>🚛 ${v}</span><span class="sb-veh-dot has-data"></span>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────────────
function showV(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
  document.getElementById(id).classList.add('on');
}

function setBC(parts) {
  document.getElementById('bc').innerHTML = parts.map((p, i) => {
    const last = i === parts.length - 1;
    return (i > 0 ? `<span class="bc-sep">/</span>` : '') + 
      `<span class="bc-i ${last ? 'cur' : ''}" ${p.f ? `onclick="${p.f}"` : ''}>${p.l}</span>`;
  }).join('');
}

function goYears() {
  curY = null; curM = null; curVehGlobal = null;
  renderDash();
  renderYears();
  showV('v-years');
  setBC([{ l: 'Years' }]);
  renderSB();
}

function goMonths(y) {
  curY = y; curM = null; curVehGlobal = null;
  renderMonths(y);
  showV('v-months');
  setBC([{ l: 'Years', f: 'goYears()' }, { l: y }]);
  renderSB();
}

function goSheet(y, m) {
  curY = y; curM = m; curVeh = null;
  srchQ = ''; sCol = -1; sAsc = true; pg = 1;
  
  document.getElementById('s-h1').innerHTML = `${m} <span style="color:var(--gold)">${y}</span>`;
  document.getElementById('s-srch').value = '';
  
  const ce = canEdit(CU.role);
  document.getElementById('s-sub').innerHTML = ce ? 'Click any cell to edit data instantly' : 'Viewer access is read-only';
  document.getElementById('vbar').className = 'viewer-bar' + (ce ? '' : ' show');
  document.getElementById('btn-add').style.display = ce ? 'inline-flex' : 'none';
  
  const avBtn = document.getElementById('btn-add-veh');
  if (avBtn) avBtn.style.display = ce ? 'inline-flex' : 'none';
  
  const data = DB[y][m];
  if (data) {
    shHdr = data.headers;
    shRows = [...data.rows.map(r => [...r])];
    showTbl();
    renderSh();
    renderCharts();
    renderVehNav();
  } else {
    shHdr = [];
    shRows = [];
    showUp();
  }
  
  document.getElementById('veh-pdf-panel').style.display = 'none';
  showV('v-sheet');
  setBC([{ l: 'Years', f: 'goYears()' }, { l: y, f: `goMonths(${y})` }, { l: m }]);
  renderSB();
}

function showUp() {
  document.getElementById('upload-area').style.display = 'block';
  document.getElementById('tbl-area').style.display = 'none';
}

function showTbl() {
  document.getElementById('upload-area').style.display = 'none';
  document.getElementById('tbl-area').style.display = 'flex';
}

// ─────────────────────────────────────────────────────
//  DASHBOARD & YEARS
// ─────────────────────────────────────────────────────
function renderDash() {
  const yrs = Object.keys(DB).map(Number);
  const tr = yrs.reduce((s, y) => s + Object.values(DB[y]).filter(v => v).reduce((a, v) => a + v.rows.length, 0), 0);
  const tm = yrs.reduce((s, y) => s + Object.values(DB[y]).filter(v => v).length, 0);
  
  document.getElementById('dash-stats').innerHTML = `
    <div class="sc"><div class="sc-icon">📋</div><div class="sc-label">Total Records</div><div class="sc-val">${tr}</div><div class="sc-sub">All years</div></div>
    <div class="sc"><div class="sc-icon">📅</div><div class="sc-label">Years</div><div class="sc-val">${yrs.length}</div></div>
    <div class="sc"><div class="sc-icon">🗓</div><div class="sc-label">Months w/ Data</div><div class="sc-val">${tm}</div></div>
    <div class="sc"><div class="sc-icon">👤</div><div class="sc-label">Signed In</div><div class="sc-val" style="font-size:1rem">${CU.name.split(' ')[0]}</div><div class="sc-sub">${ROLE_LABEL[CU.role]}</div></div>`;
}

function renderYears() {
  const yrs = Object.keys(DB).map(Number).sort((a, b) => b - a);
  document.getElementById('years-grid').innerHTML = yrs.map(y => {
    const rows = Object.values(DB[y]).filter(v => v).reduce((s, v) => s + v.rows.length, 0);
    const mos = Object.values(DB[y]).filter(v => v).length;
    const prog = y < CY ? 100 : y === CY ? Math.round((new Date().getMonth() + 1) / 12 * 100) : 0;
    const bc = y < CY ? 'past' : y === CY ? 'cur' : 'fut';
    const bl = y < CY ? 'Completed' : y === CY ? '● Active' : 'Upcoming';
    
    return `<div class="ycard" onclick="goMonths(${y})">
      <div class="yc-top"><div class="ybadge ${bc}">${bl}</div><div class="yarr">→</div></div>
      <div class="ynumber">${y}</div>
      <div class="ystats"><div><div class="ys-v">${rows}</div><div class="ys-k">Records</div></div><div><div class="ys-v">${mos}/12</div><div class="ys-k">Months</div></div></div>
      <div class="yprog"><div class="ypb" style="width:${prog}%"></div></div>
    </div>`;
  }).join('') + (canEdit(CU?.role) ? `<div class="add-year-card" onclick="addYear()">＋ Add Year</div>` : '');
}

function addYear() {
  const y = parseInt(prompt('Enter year (e.g. 2028):'));
  if (y && y > 2000 && y < 2200 && !DB[y]) {
    ensureY(y);
    renderYears();
    renderDash();
    renderSB();
    toast('Year ' + y + ' added');
    fbSaveAll();
  }
}

// ─────────────────────────────────────────────────────
//  MONTHS VIEW
// ─────────────────────────────────────────────────────
function renderMonths(y) {
  document.getElementById('m-h1').innerHTML = `📅 <span style="color:var(--gold)">${y}</span>`;
  const data = DB[y];
  const tr = Object.values(data).filter(v => v).reduce((s, v) => s + v.rows.length, 0);
  const hd = Object.values(data).filter(v => v).length;
  
  document.getElementById('mo-stats').innerHTML = `
    <div class="sc"><div class="sc-label">Records</div><div class="sc-val">${tr}</div></div>
    <div class="sc"><div class="sc-label">Months w/ Data</div><div class="sc-val">${hd}</div><div class="sc-sub">of 12</div></div>
    <div class="sc"><div class="sc-label">Year</div><div class="sc-val">${y}</div><div class="sc-sub">${y === CY ? 'Current' : y < CY ? 'Past' : 'Future'}</div></div>`;
  
  const mx = Math.max(...Object.values(data).filter(v => v).map(v => v.rows.length), 1);
  document.getElementById('months-grid').innerHTML = MONTHS.map((m, i) => {
    const md = data[m];
    const cnt = md ? md.rows.length : 0;
    const pct = cnt ? Math.round(cnt / mx * 100) : 0;
    const hasPdf = !!(pdfStore[`${y}_${m}`]);
    
    return `<div class="mcard" style="animation-delay:${i * .035}s" onclick="goSheet(${y},'${m}')">
      <div class="mc-dot ${cnt ? 'live' : ''}"></div>
      <div class="mc-n">${String(i + 1).padStart(2, '0')}</div>
      <div class="mc-name">${m}</div>
      <div class="mc-cnt"><strong>${cnt}</strong> record${cnt !== 1 ? 's' : ''} ${hasPdf ? '<span style="color:var(--purple);font-size:.65rem">📄 PDF</span>' : ''}</div>
      <div class="mc-bar"><div class="mc-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────
//  FILE UPLOAD
// ─────────────────────────────────────────────────────
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dz').classList.remove('drag');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
}

function handleFile(file) {
  if (!file) return;
  if (!canEdit(CU.role)) { toast('No edit permission'); return; }
  
  const ext = file.name.split('.').pop().toLowerCase();
  const rd = new FileReader();
  
  rd.onload = e => {
    let hdr = [], rows = [];
    try {
      if (ext === 'csv') {
        const txt = e.target.result;
        const lines = txt.split('\n').filter(l => l.trim());
        hdr = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        rows = lines.slice(1).map(l => l.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
      } else {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!data.length) { toast('Empty file'); return; }
        hdr = data[0].map(String);
        rows = data.slice(1).map(r => r.map(c => String(c || '')));
      }
    } catch (err) {
      toast('Error reading file');
      return;
    }
    
    shHdr = hdr;
    shRows = rows.map(r => { while (r.length < hdr.length) r.push(''); return r.slice(0, hdr.length); });
    DB[curY][curM] = { headers: [...shHdr], rows: shRows.map(r => [...r]) };
    
    pg = 1;
    showTbl();
    renderSh();
    renderCharts();
    renderVehNav();
    toast(`Loaded ${shRows.length} rows · ${file.name}`);
    fbSave();
  };
  
  ext === 'csv' ? rd.readAsText(file) : rd.readAsArrayBuffer(file);
}

function loadSample() {
  const d = makeSample(curY, curM);
  shHdr = d.headers;
  shRows = d.rows.map(r => [...r]);
  DB[curY][curM] = { headers: [...shHdr], rows: shRows.map(r => [...r]) };
  
  pg = 1;
  showTbl();
  renderSh();
  renderCharts();
  renderVehNav();
  toast('Sample data loaded');
  fbSave();
}

// ─────────────────────────────────────────────────────
//  SHEET RENDERING
// ─────────────────────────────────────────────────────
function getFilt() {
  let rows = [...shRows];
  if (srchQ) {
    const q = srchQ.toLowerCase();
    rows = rows.filter(r => r.some(c => String(c).toLowerCase().includes(q)));
  }
  if (sCol >= 0) {
    rows.sort((a, b) => {
      let av = a[sCol] || '', bv = b[sCol] || '';
      const na = parseFloat(av), nb = parseFloat(bv);
      if (!isNaN(na) && !isNaN(nb)) { av = na; bv = nb; }
      else { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return sAsc ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
    });
  }
  return rows;
}

function renderSh() {
  filtRows = getFilt();
  const start = (pg - 1) * PG, pRows = filtRows.slice(start, start + PG);
  const ce = canEdit(CU.role);
  
  const fareIdx = shHdr.findIndex(h => /fare/i.test(h));
  const expIdx = shHdr.findIndex(h => /expense/i.test(h));
  const plIdx = shHdr.findIndex(h => /profit|loss|p.*l/i.test(h));
  
  document.getElementById('s-thead').innerHTML = `<tr>
    <th class="col-cb"><input type="checkbox" id="sa" onchange="togAll(this)"></th>
    <th class="col-n">#</th>
    ${shHdr.map((h, i) => `<th onclick="sortSh(${i})" class="${sCol === i ? 'srt' : ''}"><div class="th-i">${h}${sCol === i ? (sAsc ? ' ↑' : ' ↓') : ''}</div></th>`).join('')}
  </tr>`;
  
  if (!pRows.length) {
    document.getElementById('s-tbody').innerHTML = `<tr><td colspan="${shHdr.length + 2}" style="text-align:center;padding:2.5rem;color:var(--ink3)">No records found</td></tr>`;
  } else {
    document.getElementById('s-tbody').innerHTML = pRows.map((row, ri) => {
      const absI = shRows.findIndex(r => r === row);
      let dispRow = [...row];
      
      if (fareIdx >= 0 && expIdx >= 0 && plIdx >= 0) {
        const f = parseFloat(dispRow[fareIdx]) || 0;
        const e = parseFloat(dispRow[expIdx]) || 0;
        dispRow[plIdx] = (f - e).toFixed(2);
      }
      
      return `<tr data-ri="${absI}">
        <td class="col-cb"><input type="checkbox" class="rc" onchange="updDel()"></td>
        <td class="rn">${start + ri + 1}</td>
        ${dispRow.map((c, ci) => {
          const h = shHdr[ci]?.toLowerCase() || '';
          const isFare = ci === fareIdx;
          const isExp = ci === expIdx;
          const isPL = ci === plIdx;
          const isVeh = h.includes('vehicle');
          const num = parseFloat(c);
          
          if (isPL) {
            const neg = num < 0;
            return `<td><span class="pl-pill ${neg ? 'loss' : 'profit'}">${neg ? '▼' : '▲'} ₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>`;
          }
          if (!ce) {
            if (isFare || isExp) return `<td><span class="amt">₹${parseFloat(c) >= 0 ? '' : '-'}${Math.abs(parseFloat(c) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>`;
            if (isVeh) return `<td><span class="veh-tag">${c}</span></td>`;
            return `<td><span style="color:var(--ink2)">${c}</span></td>`;
          }
          if (isFare || isExp) return `<td><input class="ce amt" value="${String(c).replace(/"/g, '&quot;')}" onchange="updCell(${absI},${ci},this.value);autoCalcPL(${absI})"></td>`;
          if (isPL) return `<td><input class="ce" style="color:${num < 0 ? 'var(--red)' : 'var(--green)'};font-weight:700" value="${String(c).replace(/"/g, '&quot;')}" readonly></td>`;
          return `<td><input class="ce${isVeh ? ' veh-inp' : ''}" value="${String(c).replace(/"/g, '&quot;')}" onchange="updCell(${absI},${ci},this.value)${isVeh ? ';renderVehNav()' : ''}"></td>`;
        }).join('')}
      </tr>`;
    }).join('');
  }
  
  const tot = filtRows.length;
  const infoEl = document.getElementById('s-info');
  
  const fareIdx2 = shHdr.findIndex(h => /fare/i.test(h));
  const expIdx2 = shHdr.findIndex(h => /expense/i.test(h));
  
  if (fareIdx2 >= 0 && expIdx2 >= 0) {
    const totalFare = shRows.reduce((s, r) => s + (parseFloat(r[fareIdx2]) || 0), 0);
    const totalExp = shRows.reduce((s, r) => s + (parseFloat(r[expIdx2]) || 0), 0);
    const totalPL = totalFare - totalExp;
    const fmt = n => '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    
    infoEl.innerHTML =
      `<span style="margin-right:1rem">Showing <strong>${Math.min(start + 1, tot)}–${Math.min(start + PG, tot)}</strong> of <strong>${tot}</strong> rows</span>` +
      `<span style="color:var(--green);font-weight:700">Fare: ${fmt(totalFare)}</span>` +
      `<span style="margin:0 .5rem;color:var(--ink3)">|</span>` +
      `<span style="color:var(--red);font-weight:700">Exp: ${fmt(totalExp)}</span>` +
      `<span style="margin:0 .5rem;color:var(--ink3)">|</span>` +
      `<span style="color:${totalPL >= 0 ? 'var(--blue)' : 'var(--amber)'};font-weight:700">${totalPL >= 0 ? 'Profit' : 'Loss'}: ${fmt(totalPL)}</span>`;
  } else {
    infoEl.innerHTML = `Showing <strong>${Math.min(start + 1, tot)}–${Math.min(start + PG, tot)}</strong> of <strong>${tot}</strong> rows`;
  }
  
  const pages = Math.ceil(tot / PG);
  const pEl = document.getElementById('s-pag');
  pEl.innerHTML = '';
  if (pages > 1) {
    for (let p = 1; p <= Math.min(pages, 9); p++) {
      const b = document.createElement('div');
      b.className = 'pb' + (p === pg ? ' on' : '');
      b.textContent = p;
      b.onclick = () => { pg = p; renderSh(); };
      pEl.appendChild(b);
    }
  }
  document.getElementById('sa').checked = false;
}

function autoCalcPL(ri) {
  const fareIdx = shHdr.findIndex(h => /fare/i.test(h));
  const expIdx = shHdr.findIndex(h => /expense/i.test(h));
  const plIdx = shHdr.findIndex(h => /profit|loss|p.*l/i.test(h));
  if (fareIdx < 0 || expIdx < 0 || plIdx < 0) return;
  
  const f = parseFloat(shRows[ri][fareIdx]) || 0;
  const e = parseFloat(shRows[ri][expIdx]) || 0;
  shRows[ri][plIdx] = (f - e).toFixed(2);
  DB[curY][curM].rows = shRows.map(r => [...r]);
  
  renderSh();
  renderCharts();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(fbSave, 2500);
}

function updCell(ri, ci, v) {
  if (!canEdit(CU.role)) return;
  
  shRows[ri][ci] = v;
  DB[curY][curM].rows = shRows.map(r => [...r]);
  
  const fareIdx = shHdr.findIndex(h => /fare/i.test(h));
  const expIdx = shHdr.findIndex(h => /expense/i.test(h));
  const plIdx = shHdr.findIndex(h => /profit|loss|p.*l/i.test(h));
  
  if (plIdx >= 0 && (ci === fareIdx || ci === expIdx)) {
    const f = parseFloat(shRows[ri][fareIdx] || 0) || 0;
    const e = parseFloat(shRows[ri][expIdx] || 0) || 0;
    shRows[ri][plIdx] = (f - e).toFixed(2);
    DB[curY][curM].rows = shRows.map(r => [...r]);
  }
  
  renderSh();
  renderCharts();
  toast('Cell updated');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(fbSave, 2500);
}

function filterSh() {
  srchQ = document.getElementById('s-srch').value;
  pg = 1;
  renderSh();
}

function sortSh(c) {
  if (c === undefined) { sCol = 0; sAsc = true; }
  else if (sCol === c) sAsc = !sAsc;
  else { sCol = c; sAsc = true; }
  pg = 1;
  renderSh();
}

function togAll(cb) {
  document.querySelectorAll('.rc').forEach(c => c.checked = cb.checked);
  updDel();
}

function updDel() {
  document.getElementById('btn-del').style.display = document.querySelectorAll('.rc:checked').length ? 'inline-flex' : 'none';
}

function delSel() {
  if (!canEdit(CU.role)) return;
  
  const rm = new Set();
  document.querySelectorAll('tbody tr').forEach(tr => {
    const cb = tr.querySelector('.rc');
    if (cb && cb.checked) {
      const i = parseInt(tr.dataset.ri);
      if (!isNaN(i)) rm.add(i);
    }
  });
  
  if (!rm.size) return;
  
  shRows = shRows.filter((_, i) => !rm.has(i));
  DB[curY][curM].rows = shRows.map(r => [...r]);
  document.getElementById('btn-del').style.display = 'none';
  
  renderSh();
  renderCharts();
  renderVehNav();
  toast(`${rm.size} row(s) deleted`);
  fbSave();
}

// ─────────────────────────────────────────────────────
//  MODAL
// ─────────────────────────────────────────────────────
function openMod() {
  if (!canEdit(CU.role)) return;
  document.getElementById('mod-flds').innerHTML = shHdr.map((h, i) => `<div class="mf"><label>${h}</label><input class="mi" id="mf-${i}" placeholder="${h}"></div>`).join('');
  document.getElementById('add-mb').classList.add('open');
}

function closeMod() {
  document.getElementById('add-mb').classList.remove('open');
}

function saveMod() {
  const row = shHdr.map((_, i) => document.getElementById('mf-' + i)?.value || '');
  
  const fareIdx = shHdr.findIndex(h => /fare/i.test(h));
  const expIdx = shHdr.findIndex(h => /expense/i.test(h));
  const plIdx = shHdr.findIndex(h => /profit|loss|p.*l/i.test(h));
  
  if (fareIdx >= 0 && expIdx >= 0 && plIdx >= 0) {
    const f = parseFloat(row[fareIdx]) || 0;
    const e = parseFloat(row[expIdx]) || 0;
    row[plIdx] = (f - e).toFixed(2);
  }
  
  shRows.push(row);
  DB[curY][curM].rows = shRows.map(r => [...r]);
  closeMod();
  pg = Math.ceil(shRows.length / PG);
  renderSh();
  renderCharts();
  renderVehNav();
  toast('Row added');
  fbSave();
}

document.getElementById('add-mb').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeMod();
});

// ─────────────────────────────────────────────────────
//  EXPORT
// ─────────────────────────────────────────────────────
function expCSV() {
  const r = [shHdr, ...shRows];
  const csv = r.map(x => x.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  dlBlob(new Blob([csv], { type: 'text/csv' }), `${curY}_${curM}.csv`);
  toast('CSV exported');
}

function expXLSX() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([shHdr, ...shRows]);
  XLSX.utils.book_append_sheet(wb, ws, curM || 'Sheet1');
  XLSX.writeFile(wb, `${curY}_${curM}.xlsx`);
  toast('Excel exported');
}

function dlBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

// ─────────────────────────────────────────────────────
//  VEHICLE PDF SYSTEM
// ─────────────────────────────────────────────────────
function getVehicles() {
  const vehIdx = shHdr.findIndex(h => /vehicle/i.test(h));
  const set = new Set(manualVehicles);
  if (vehIdx >= 0) {
    shRows.forEach(r => { const v = String(r[vehIdx] || '').trim(); if (v) set.add(v); });
  }
  return [...set].sort();
}

function addManualVehicle() {
  if (!canEdit(CU.role)) { toast('Only Admin can add vehicles'); return; }
  const v = prompt('Enter vehicle number (e.g. 7486):');
  if (!v || !v.trim()) return;
  const vn = v.trim().toUpperCase();
  const existing = getVehicles();
  if (existing.includes(vn)) { toast('Vehicle ' + vn + ' already in list'); return; }
  manualVehicles.push(vn);
  renderVehNav();
  openVehPdf(vn);
  toast('Vehicle ' + vn + ' added — upload its PDF');
}

function vehPdfKey(veh) {
  return `veh_${curY}_${curM}_${veh}`;
}

function getVehPdf(veh) {
  return pdfStore[vehPdfKey(veh)] || null;
}

function renderVehNav() {
  const vehs = getVehicles();
  const nav = document.getElementById('veh-nav');
  const section = document.getElementById('veh-pdf-section');
  if (!nav) return;
  
  if (!vehs.length) {
    nav.innerHTML = `<span class="veh-nav-empty">No vehicle numbers found — make sure your data has a "Vehicle No" column</span>`;
    if (section) section.style.display = 'block';
    return;
  }
  
  if (section) section.style.display = 'block';
  nav.innerHTML = vehs.map(v => {
    const hasPdf = !!getVehPdf(v);
    const isActive = v === curVeh;
    return `<button class="veh-btn${isActive ? ' active' : ''}${hasPdf ? '' : ' no-pdf'}" onclick="openVehPdf('${v}')">
      <span class="veh-pdf-dot"></span>🚛 ${v}${hasPdf ? ' 📄' : ''}
    </button>`;
  }).join('');
  
  const sub = document.getElementById('veh-pdf-sub');
  if (sub) sub.textContent = `${vehs.length} vehicle${vehs.length !== 1 ? 's' : ''} · Click to view PDF`;
}

function openVehPdf(veh) {
  curVeh = veh;
  renderVehNav();
  
  const panel = document.getElementById('veh-pdf-panel');
  panel.style.display = 'block';
  document.getElementById('veh-pdf-vname').textContent = '🚛 ' + veh;
  
  const uploadWrap = document.getElementById('btn-veh-upload-wrap');
  if (uploadWrap) uploadWrap.style.display = canEdit(CU.role) ? 'inline-flex' : 'none';
  
  const hint = document.getElementById('veh-pdf-hint');
  if (hint) hint.style.display = canEdit(CU.role) ? '' : 'none';
  
  refreshVehPdfPanel();
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeVehPdfPanel() {
  curVeh = null;
  pdfJsVeh = null;
  pdfJsDoc = null;
  document.getElementById('veh-pdf-panel').style.display = 'none';
  renderVehNav();
}

function showUrlInput() {
  document.getElementById('pdf-url-bar').style.display = 'flex';
  document.getElementById('pdf-url-inp').focus();
}

function setPdfUrl() {
  const url = document.getElementById('pdf-url-inp').value.trim();
  if (!url) { toast('Please enter a URL'); return; }
  if (!curVeh) return;
  
  const key = vehPdfKey(curVeh);
  const name = url.split('/').pop().split('?')[0] || 'document.pdf';
  if (!name.endsWith('.pdf')) name += '.pdf';
  
  pdfStore[key] = { name, url, vehicle: curVeh };
  fbSavePdf(key, { name, url, vehicle: curVeh });
  
  pdfJsVeh = null;
  pdfJsDoc = null;
  refreshVehPdfPanel();
  document.getElementById('pdf-url-bar').style.display = 'none';
  document.getElementById('pdf-url-inp').value = '';
  toast('PDF URL set for vehicle ' + curVeh);
}

// ─────────────────────────────────────────────────────
//  PDF.js INLINE VIEWER
// ─────────────────────────────────────────────────────
let pdfJsDoc = null, pdfJsPage = 1, pdfJsZoom = 1.2, pdfJsRendering = false, pdfJsVeh = null;

function pdfJsInit() {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}
pdfJsInit();

async function renderPdfPage(pageNum) {
  if (!pdfJsDoc || pdfJsRendering) return;
  pdfJsRendering = true;
  
  try {
    const page = await pdfJsDoc.getPage(pageNum);
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: pdfJsZoom * dpr });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = (viewport.width / dpr) + 'px';
    canvas.style.height = (viewport.height / dpr) + 'px';
    
    await page.render({ canvasContext: ctx, viewport }).promise;
    
    pdfJsPage = pageNum;
    document.getElementById('pdf-page-info').textContent = `${pageNum} / ${pdfJsDoc.numPages}`;
    document.getElementById('pdf-zoom-info').textContent = Math.round(pdfJsZoom * 100) + '%';
  } catch (e) {
    console.warn('PDF render error:', e);
  }
  pdfJsRendering = false;
}

function pdfNextPage() {
  if (pdfJsDoc && pdfJsPage < pdfJsDoc.numPages) renderPdfPage(pdfJsPage + 1);
}

function pdfPrevPage() {
  if (pdfJsDoc && pdfJsPage > 1) renderPdfPage(pdfJsPage - 1);
}

function pdfZoomIn() {
  pdfJsZoom = Math.min(pdfJsZoom + 0.3, 4);
  renderPdfPage(pdfJsPage);
}

function pdfZoomOut() {
  pdfJsZoom = Math.max(pdfJsZoom - 0.3, 0.5);
  renderPdfPage(pdfJsPage);
}

async function loadPdfInViewer(dataUrl, storageUrl) {
  if (!window.pdfjsLib) {
    showPdfFallback(storageUrl);
    return;
  }
  
  document.getElementById('pdf-loading').style.display = 'block';
  document.getElementById('pdf-controls').style.display = 'none';
  document.getElementById('pdf-canvas-wrap').style.display = 'none';
  
  pdfJsDoc = null;
  pdfJsPage = 1;
  pdfJsZoom = 1.2;
  pdfJsRendering = false;
  
  try {
    const src = dataUrl || storageUrl;
    if (!src) return;
    pdfJsDoc = await window.pdfjsLib.getDocument(src).promise;
    
    document.getElementById('pdf-loading').style.display = 'none';
    document.getElementById('pdf-controls').style.display = 'flex';
    document.getElementById('pdf-canvas-wrap').style.display = 'block';
    
    await renderPdfPage(1);
  } catch (e) {
    console.warn('PDF load error:', e);
    document.getElementById('pdf-loading').style.display = 'none';
    showPdfFallback(storageUrl);
  }
}

function showPdfFallback(url) {
  document.getElementById('pdf-canvas-wrap').style.display = 'none';
  document.getElementById('pdf-controls').style.display = 'none';
  document.getElementById('pdf-loading').innerHTML = `
    <div style="padding:2rem;text-align:center">
      <div style="font-size:2rem;margin-bottom:.5rem">📄</div>
      <div style="font-size:.85rem;color:var(--ink2);margin-bottom:1rem">PDF loaded — tap to view</div>
      <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
        <button class="btn-open-pdf" onclick="openVehPdfTab()">🔗 Open PDF</button>
        <button class="btn-open-pdf btn-open-secondary" onclick="downloadVehPdf()">⬇ Download</button>
      </div>
    </div>`;
  document.getElementById('pdf-loading').style.display = 'block';
}

function refreshVehPdfPanel() {
  if (!curVeh) return;
  
  const p = getVehPdf(curVeh);
  document.getElementById('veh-pdf-fname').textContent = p ? p.name : 'No PDF uploaded';
  document.getElementById('veh-pdf-empty').style.display = p ? 'none' : 'block';
  document.getElementById('veh-pdf-viewer').style.display = p ? 'block' : 'none';
  document.getElementById('btn-veh-rm').style.display = (p && canEdit(CU.role)) ? 'inline-flex' : 'none';
  
  if (p) {
    const needReload = pdfJsVeh !== curVeh || !pdfJsDoc;
    if (needReload) {
      pdfJsVeh = curVeh;
      if (p.dataUrl) {
        loadPdfInViewer(p.dataUrl, p.url);
      } else if (p.url) {
        loadPdfInViewer(null, p.url);
        fetch(p.url)
          .then(r => r.blob())
          .then(blob => new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result);
            fr.onerror = rej;
            fr.readAsDataURL(blob);
          }))
          .then(dataUrl => {
            const key = vehPdfKey(curVeh);
            if (pdfStore[key]) pdfStore[key].dataUrl = dataUrl;
            if (pdfJsVeh === curVeh) loadPdfInViewer(dataUrl, p.url);
          })
          .catch(() => {});
      }
    }
  } else {
    pdfJsDoc = null;
    pdfJsVeh = null;
    document.getElementById('pdf-loading').style.display = 'none';
    document.getElementById('pdf-controls').style.display = 'none';
    document.getElementById('pdf-canvas-wrap').style.display = 'none';
  }
  renderVehNav();
}

function openVehPdfTab() {
  const p = getVehPdf(curVeh);
  if (!p) return;
  
  if (p.url) {
    const w = window.open(p.url, '_blank');
    if (!w) window.location.href = p.url;
    return;
  }
  
  if (p.dataUrl) {
    try {
      const b64 = p.dataUrl.split(',')[1];
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      const blob = new Blob([buf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) { const a = document.createElement('a'); a.href = url; a.download = p.name; a.click(); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      window.open(p.dataUrl, '_blank');
    }
  }
}

function handleVehPdf(file) {
  if (!file || !curVeh) return;
  if (!canEdit(CU.role)) { toast('No upload permission'); return; }
  if (file.type !== 'application/pdf') { toast('Please select a PDF file'); return; }
  
  const rd = new FileReader();
  rd.onload = function(e) {
    const dataUrl = e.target.result;
    const key = vehPdfKey(curVeh);
    pdfStore[key] = { name: file.name, dataUrl, vehicle: curVeh };
    fbSavePdf(key, { name: file.name, dataUrl, vehicle: curVeh });
    pdfJsVeh = null;
    pdfJsDoc = null;
    refreshVehPdfPanel();
    toast(`PDF uploaded for vehicle ${curVeh}: ${file.name}`);
    document.getElementById('fi-veh-pdf').value = '';
  };
  rd.readAsDataURL(file);
}

function downloadVehPdf() {
  const p = getVehPdf(curVeh);
  if (!p) return;
  
  if (p.dataUrl) {
    const a = document.createElement('a');
    a.href = p.dataUrl;
    a.download = p.name;
    a.click();
  } else if (p.url) {
    const a = document.createElement('a');
    a.href = p.url;
    a.download = p.name;
    a.target = '_blank';
    a.click();
  }
  toast('Downloading: ' + p.name);
}

function removeVehPdf() {
  if (!curVeh || !canEdit(CU.role)) return;
  const k = vehPdfKey(curVeh);
  delete pdfStore[k];
  fbRemovePdf(k);
  refreshVehPdfPanel();
  toast('PDF removed for vehicle ' + curVeh);
}

// ─────────────────────────────────────────────────────
//  PDF FIREBASE SYNC
// ─────────────────────────────────────────────────────
async function fbSavePdf(key, pdfObj) {
  if (!fbReady || !window._fbStor) {
    toast('PDF saved locally (cloud not ready)');
    return;
  }
  
  try {
    setSyncStatus('syncing', 'Uploading PDF…');
    const storRef = window._fbSRef(window._fbStor, `alam_enterprises/pdfs/${key}`);
    await window._fbUploadStr(storRef, pdfObj.dataUrl, 'data_url', { contentType: 'application/pdf' });
    const url = await window._fbGetDlUrl(storRef);
    
    const meta = { name: pdfObj.name, vehicle: pdfObj.vehicle, url };
    const dbRef = window._fbRef(window._fbDb, `alam_enterprises/pdf_meta/${key}`);
    await window._fbSet(dbRef, meta);
    
    pdfStore[key] = { ...meta, dataUrl: pdfObj.dataUrl };
    setSyncStatus('synced', 'PDF Synced ✓');
    toast('PDF uploaded & synced ✓');
  } catch (e) {
    console.warn('PDF sync error:', e);
    setSyncStatus('error', 'PDF sync failed');
    toast('PDF saved locally (sync failed)');
  }
}

async function fbRemovePdf(key) {
  if (!fbReady) return;
  try {
    if (window._fbStor) {
      try {
        const storRef = window._fbSRef(window._fbStor, `alam_enterprises/pdfs/${key}`);
        await window._fbDelObj(storRef);
      } catch (_) {}
    }
    const dbRef = window._fbRef(window._fbDb, `alam_enterprises/pdf_meta/${key}`);
    await window._fbRemove(dbRef);
  } catch (e) {
    console.warn('PDF remove error:', e);
  }
}

function fbSubscribePdfs() {
  if (!fbReady || !window._fbDb) return;
  const dbRef = window._fbRef(window._fbDb, 'alam_enterprises/pdf_meta');
  fbPdfUnsubscribe = window._fbOnValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      Object.keys(data).forEach(k => {
        if (data[k]) {
          const existing = pdfStore[k];
          pdfStore[k] = { ...data[k], dataUrl: existing ? existing.dataUrl : null };
        }
      });
      if (curY && curM) { renderVehNav(); if (curVeh) refreshVehPdfPanel(); }
    }
  }, (err) => { console.warn('PDF meta listen error:', err); });
}

// ─────────────────────────────────────────────────────
//  VEHICLE ANALYTICS
// ─────────────────────────────────────────────────────
let curVehGlobal = null;
let vehCharts = {};
let vehAnalyticsYear = null;

function goVehicle(veh) {
  curVehGlobal = veh;
  vehAnalyticsYear = null;
  renderSBVehicles();
  showV('v-vehicle');
  setBC([{ l: 'Years', f: 'goYears()' }, { l: '🚛 ' + veh }]);
  renderVehicleAnalytics(veh);
}

function renderVehicleAnalytics(veh) {
  const container = document.getElementById('veh-analytics-content');
  if (!container) return;
  
  const availYears = Object.keys(DB).map(Number).sort((a, b) => b - a);
  if (!vehAnalyticsYear) vehAnalyticsYear = availYears[0] || CY;
  
  const monthData = MONTHS.map(m => {
    const d = DB[vehAnalyticsYear] && DB[vehAnalyticsYear][m];
    if (!d) return { month: m, fare: 0, exp: 0, profit: 0, trips: 0, hasData: false };
    
    const vi = d.headers.findIndex(h => /vehicle/i.test(h));
    const { incC, expC } = detectPLCols(d.headers);
    const rows = vi >= 0 ? d.rows.filter(r => String(r[vi] || '').trim() === veh) : [];
    
    if (!rows.length) return { month: m, fare: 0, exp: 0, profit: 0, trips: 0, hasData: false };
    
    const fare = rows.reduce((s, r) => s + (incC >= 0 ? parseFloat(r[incC]) || 0 : 0), 0);
    const exp = rows.reduce((s, r) => s + (expC >= 0 ? parseFloat(r[expC]) || 0 : 0), 0);
    return { month: m, fare, exp, profit: fare - exp, trips: rows.length, hasData: true };
  });
  
  const totalFare = monthData.reduce((s, x) => s + x.fare, 0);
  const totalExp = monthData.reduce((s, x) => s + x.exp, 0);
  const totalProfit = totalFare - totalExp;
  const totalTrips = monthData.reduce((s, x) => s + x.trips, 0);
  const profitMonths = monthData.filter(x => x.hasData && x.profit >= 0).length;
  const lossMonths = monthData.filter(x => x.hasData && x.profit < 0).length;
  const maxAbs = Math.max(...monthData.map(x => Math.abs(x.profit)), 1);
  
  const fmt = v => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const yearTabs = availYears.map(y => `<button class="veh-year-tab${y === vehAnalyticsYear ? ' on' : ''}" onclick="vehAnalyticsYear=${y};renderVehicleAnalytics('${veh}')">${y}</button>`).join('');
  
  container.innerHTML = `
    <div class="veh-analytics-header">
      <div>
        <div class="veh-analytics-title">🚛 Vehicle Analytics</div>
        <div class="veh-analytics-sub">All-year profit & loss breakdown · click any month row to open it</div>
      </div>
      <div class="veh-tag-big">🚛 ${veh}</div>
    </div>
    <div class="veh-year-tabs">${yearTabs}</div>
    <div class="veh-annual-stats">
      <div class="veh-stat-card"><div class="veh-stat-label">Total Fare</div><div class="veh-stat-val" style="color:var(--blue)">${fmt(totalFare)}</div></div>
      <div class="veh-stat-card"><div class="veh-stat-label">Total Expenses</div><div class="veh-stat-val" style="color:var(--red)">${fmt(totalExp)}</div></div>
      <div class="veh-stat-card"><div class="veh-stat-label">Net ${totalProfit >= 0 ? 'Profit' : 'Loss'}</div><div class="veh-stat-val ${totalProfit >= 0 ? 'profit' : 'loss'}">${fmt(totalProfit)}</div></div>
      <div class="veh-stat-card"><div class="veh-stat-label">Total Trips</div><div class="veh-stat-val">${totalTrips}</div></div>
      <div class="veh-stat-card"><div class="veh-stat-label">Profit Months</div><div class="veh-stat-val profit">${profitMonths}</div></div>
      <div class="veh-stat-card"><div class="veh-stat-label">Loss Months</div><div class="veh-stat-val ${lossMonths > 0 ? 'loss' : ''}">${lossMonths}</div></div>
    </div>
    <div class="veh-charts-grid">
      <div class="ch-card"><div class="ch-label">Monthly Fare vs Expenses (${vehAnalyticsYear})</div><div class="ch-wrap" style="height:200px"><canvas id="vch-bar"></canvas></div></div>
      <div class="ch-card"><div class="ch-label">Monthly Profit / Loss (${vehAnalyticsYear})</div><div class="ch-wrap" style="height:200px"><canvas id="vch-pl"></canvas></div></div>
    </div>
    <div class="veh-monthly-table">
      <div class="vmt-head">📅 Month-by-Month Breakdown — Vehicle ${veh} · ${vehAnalyticsYear}</div>
      <div style="overflow-x:auto">
      <table class="vmt-table">
        <thead><tr><th>Month</th><th>Trips</th><th>Total Fare</th><th>Expenses</th><th>Profit / Loss</th><th>P&L Bar</th></tr></thead>
        <tbody>${monthData.map((x, i) => `
          <tr onclick="goSheet(${vehAnalyticsYear},'${x.month}')" style="cursor:pointer" title="Open ${x.month} sheet">
            <td class="month-name">${String(i + 1).padStart(2, '0')} ${x.month}</td>
            <td class="num">${x.hasData ? x.trips : '—'}</td>
            <td class="num" style="color:var(--blue)">${x.hasData ? fmt(x.fare) : '—'}</td>
            <td class="num" style="color:var(--red)">${x.hasData ? fmt(x.exp) : '—'}</td>
            <td class="${x.hasData ? (x.profit >= 0 ? 'profit' : 'loss') : 'no-data'}">${x.hasData ? (x.profit >= 0 ? '▲ ' : '▼ ') + fmt(x.profit) : 'No data'}</td>
            <td class="vmt-bar-cell">${x.hasData ? `<div class="vmt-bar-wrap"><div class="vmt-bar-fill${x.profit < 0 ? ' neg' : ''}" style="width:${Math.round(Math.abs(x.profit) / maxAbs * 100)}%"></div></div>` : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  
  ['vch-bar', 'vch-pl'].forEach(id => { const c = vehCharts[id]; if (c) { c.destroy(); delete vehCharts[id]; } });
  
  const labels = MONTHS.map(m => m.slice(0, 3));
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { font: { size: 9 }, boxWidth: 10 } } },
    scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') }, beginAtZero: true } }
  };
  
  vehCharts['vch-bar'] = new Chart(document.getElementById('vch-bar'), {
    type: 'bar', data: { labels, datasets: [
      { label: 'Fare', data: monthData.map(x => x.fare), backgroundColor: '#2563ebbb', borderColor: '#2563eb', borderWidth: 1, borderRadius: 3 },
      { label: 'Expenses', data: monthData.map(x => x.exp), backgroundColor: '#dc2626bb', borderColor: '#dc2626', borderWidth: 1, borderRadius: 3 }
    ] }, options: { ...baseOpts }
  });
  
  const plColors = monthData.map(x => x.profit >= 0 ? '#05966988' : '#dc262688');
  vehCharts['vch-pl'] = new Chart(document.getElementById('vch-pl'), {
    type: 'bar', data: { labels, datasets: [
      { label: 'Profit/Loss', data: monthData.map(x => x.profit), backgroundColor: plColors, borderColor: plColors.map(c => c.slice(0, 7)), borderWidth: 1, borderRadius: 3 }
    ] }, options: { ...baseOpts, scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') } } } }
  });
}

// ─────────────────────────────────────────────────────
//  CHARTS
// ─────────────────────────────────────────────────────
const CC = ['#f59e0b', '#dc2626', '#059669', '#2563eb', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#10b981', '#6366f1'];

function dch(id) {
  if (CHT[id]) { CHT[id].destroy(); delete CHT[id]; }
}

function detectPLCols(headers) {
  const inc = ['fare', 'received', 'income', 'revenue', 'freight', 'earning', 'collection', 'inward', 'credit', 'sales', 'turnover', 'total fare'];
  const exp = ['expense', 'cost', 'fuel', 'maintenance', 'payroll', 'salary', 'insurance', 'repair', 'toll', 'loading', 'unloading', 'debit', 'payment', 'outward'];
  const lbl = ['vehicle', 'name', 'party', 'route', 'description', 'particulars', 'narration', 'id', 'date', 'month'];
  
  let incC = -1, expC = -1, lblC = -1;
  
  headers.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (incC < 0 && inc.some(k => hl.includes(k))) incC = i;
    if (expC < 0 && exp.some(k => hl.includes(k))) expC = i;
    if (lblC < 0 && lbl.some(k => hl.includes(k))) lblC = i;
  });
  
  if (lblC < 0) {
    for (let i = 0; i < headers.length; i++) {
      if (isNaN(parseFloat(shRows[0]?.[i] || ''))) { lblC = i; break; }
    }
    if (lblC < 0) lblC = 0;
  }
  
  if (incC < 0 || expC < 0) {
    const numCols = [];
    for (let i = 0; i < headers.length; i++) {
      if (shRows.slice(0, 5).every(r => !isNaN(parseFloat(r[i] || '')) || r[i] === '')) {
        numCols.push(i);
      }
    }
    if (numCols.length >= 2) { if (incC < 0) incC = numCols[0]; if (expC < 0) expC = numCols[1]; }
    else if (numCols.length === 1) { if (incC < 0) incC = numCols[0]; }
  }
  
  return { incC, expC, lblC };
}

function renderCharts() {
  if (!shRows.length) return;
  
  const { incC, expC, lblC } = detectPLCols(shHdr);
  const vehIdx = shHdr.findIndex(h => /vehicle/i.test(h));
  
  let lbs, incVals, expVals;
  
  if (vehIdx >= 0 && incC >= 0 && expC >= 0) {
    const agg = {};
    shRows.forEach(r => {
      const v = String(r[vehIdx] || 'Other').trim();
      if (!agg[v]) agg[v] = { inc: 0, exp: 0 };
      agg[v].inc += parseFloat(r[incC]) || 0;
      agg[v].exp += parseFloat(r[expC]) || 0;
    });
    const keys = Object.keys(agg).sort();
    lbs = keys;
    incVals = keys.map(k => agg[k].inc);
    expVals = keys.map(k => agg[k].exp);
  } else {
    const display = shRows.slice(0, 14);
    lbs = display.map(r => String(r[lblC] || '').slice(0, 12));
    incVals = display.map(r => incC >= 0 ? parseFloat(r[incC]) || 0 : 0);
    expVals = display.map(r => expC >= 0 ? parseFloat(r[expC]) || 0 : 0);
  }
  
  const profVals = incVals.map((v, i) => v - expVals[i]);
  const totInc = incVals.reduce((a, b) => a + b, 0);
  const totExp = expVals.reduce((a, b) => a + b, 0);
  const totProfit = totInc - totExp;
  
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { font: { size: 9 }, boxWidth: 10 } } },
    scales: { x: { ticks: { font: { size: 9 }, maxRotation: 45 } }, y: { ticks: { font: { size: 9 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') }, beginAtZero: true } }
  };
  
  // Bar Chart
  dch('bar');
  if (incC >= 0 && expC >= 0) {
    CHT['bar'] = new Chart(document.getElementById('ch-bar'), {
      type: 'bar', data: { labels: lbs, datasets: [
        { label: shHdr[incC] || 'Total Fare', data: incVals, backgroundColor: '#059669bb', borderColor: '#059669', borderWidth: 1, borderRadius: 4 },
        { label: shHdr[expC] || 'Expenses', data: expVals, backgroundColor: '#dc2626bb', borderColor: '#dc2626', borderWidth: 1, borderRadius: 4 }
      ] }, options: { ...baseOpts }
    });
  } else {
    const numC = incC >= 0 ? incC : expC >= 0 ? expC : 0;
    const vals = shRows.slice(0, 14).map(r => parseFloat(r[numC]) || 0);
    CHT['bar'] = new Chart(document.getElementById('ch-bar'), {
      type: 'bar', data: { labels: lbs, datasets: [{ label: shHdr[numC] || 'Value', data: vals, backgroundColor: CC[0] + 'bb', borderColor: CC[0], borderWidth: 1, borderRadius: 4 }] }, options: { ...baseOpts }
    });
  }
  
  // Pie Chart
  dch('pie');
  if (incC >= 0 && expC >= 0 && (totInc > 0 || totExp > 0)) {
    const profit = Math.max(0, totProfit);
    const loss = Math.max(0, -totProfit);
    const pieLabels = ['Total Fare', 'Total Expenses'].concat(profit > 0 ? ['Net Profit'] : ['Net Loss']);
    const pieData = [totInc, totExp].concat(profit > 0 ? [profit] : [loss]);
    const pieColors = ['#059669', '#dc2626'].concat(profit > 0 ? ['#2563eb'] : ['#f59e0b']);
    CHT['pie'] = new Chart(document.getElementById('ch-pie'), {
      type: 'pie', data: { labels: pieLabels, datasets: [{ data: pieData, backgroundColor: pieColors, borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 9 }, boxWidth: 10 } } } }
    });
  } else {
    let catC = -1;
    for (let c = 0; c < shHdr.length; c++) {
      const vs = shRows.map(r => r[c]).filter(v => v && isNaN(parseFloat(v)));
      const u = new Set(vs).size;
      if (u >= 2 && u <= 15) { catC = c; break; }
    }
    if (catC >= 0) {
      const freq = {};
      shRows.forEach(r => { const k = r[catC] || 'Other'; freq[k] = (freq[k] || 0) + 1; });
      const cl = Object.keys(freq), cv = cl.map(k => freq[k]);
      CHT['pie'] = new Chart(document.getElementById('ch-pie'), {
        type: 'pie', data: { labels: cl, datasets: [{ data: cv, backgroundColor: CC.slice(0, cl.length) }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 9 }, boxWidth: 10 } } } }
      });
    }
  }
  
  // Line Chart
  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { font: { size: 9 }, boxWidth: 10 } } },
    scales: { x: { ticks: { font: { size: 9 }, maxRotation: 45 } }, y: { ticks: { font: { size: 9 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') }, beginAtZero: false } }
  };
  
  dch('line');
  if (incC >= 0 && expC >= 0) {
    CHT['line'] = new Chart(document.getElementById('ch-line'), {
      type: 'line', data: { labels: lbs, datasets: [
        { label: 'Total Fare', data: incVals, borderColor: '#059669', backgroundColor: '#05966920', fill: false, tension: .35, pointRadius: 4 },
        { label: 'Expenses', data: expVals, borderColor: '#dc2626', backgroundColor: '#dc262620', fill: false, tension: .35, pointRadius: 4 },
        { label: 'Profit/Loss', data: profVals, borderColor: '#2563eb', backgroundColor: '#2563eb15', fill: true, tension: .35, pointRadius: 4 }
      ] }, options: { ...lineOpts }
    });
  } else {
    const numC = incC >= 0 ? incC : expC >= 0 ? expC : 0;
    const vals = shRows.slice(0, 14).map(r => parseFloat(r[numC]) || 0);
    CHT['line'] = new Chart(document.getElementById('ch-line'), {
      type: 'line', data: { labels: lbs, datasets: [{ label: shHdr[numC] || 'Value', data: vals, borderColor: CC[2], backgroundColor: CC[2] + '20', fill: true, tension: .35, pointRadius: 3 }] }, options: { ...lineOpts }
    });
  }
  
  // Horizontal Bar Chart
  dch('hbar');
  if (incC >= 0) {
    const sorted = lbs.map((l, i) => ({ l, inc: incVals[i], exp: expVals[i] })).sort((a, b) => b.inc - a.inc).slice(0, 10);
    CHT['hbar'] = new Chart(document.getElementById('ch-hbar'), {
      type: 'bar', data: { labels: sorted.map(x => x.l), datasets: [
        { label: 'Total Fare', data: sorted.map(x => x.inc), backgroundColor: '#059669aa', borderRadius: 4 },
        { label: 'Expenses', data: sorted.map(x => x.exp), backgroundColor: '#dc2626aa', borderRadius: 4 }
      ] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { font: { size: 9 }, boxWidth: 10 } } },
        scales: { x: { ticks: { font: { size: 9 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') } }, y: { ticks: { font: { size: 9 } } } } }
    });
  } else {
    const numC = expC >= 0 ? expC : 0;
    const top = shRows.map(r => ({ l: String(r[lblC] || '').slice(0, 14), v: parseFloat(r[numC]) || 0 })).sort((a, b) => b.v - a.v).slice(0, 8);
    CHT['hbar'] = new Chart(document.getElementById('ch-hbar'), {
      type: 'bar', data: { labels: top.map(x => x.l), datasets: [{ data: top.map(x => x.v), backgroundColor: CC.map(c => c + 'aa'), borderRadius: 3 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 } } } } }
    });
  }
}

// ─────────────────────────────────────────────────────
//  TOAST NOTIFICATION
// ─────────────────────────────────────────────────────
let toastT = null;

function toast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('t-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2800);
}

// ─────────────────────────────────────────────────────
//  FIREBASE OFFLINE FALLBACK
// ─────────────────────────────────────────────────────
setTimeout(() => {
  if (!fbReady && !window._firebaseReady) {
    setFbStatus('offline');
    setSyncStatus('error', 'Local only — check internet');
  }
}, 10000);