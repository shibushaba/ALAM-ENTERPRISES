import { useMemo } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  PointElement, LineElement, ArcElement, Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  PointElement, LineElement, ArcElement, Filler
);

const CC = ['#f59e0b', '#dc2626', '#059669', '#2563eb', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#10b981', '#6366f1'];

function detectPLCols(headers, rows) {
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
      if (isNaN(parseFloat(rows[0]?.[i] || ''))) { lblC = i; break; }
    }
    if (lblC < 0) lblC = 0;
  }
  
  if (incC < 0 || expC < 0) {
    const numCols = [];
    for (let i = 0; i < headers.length; i++) {
      if (rows.slice(0, 5).every(r => !isNaN(parseFloat(r[i] || '')) || r[i] === '')) {
        numCols.push(i);
      }
    }
    if (numCols.length >= 2) { if (incC < 0) incC = numCols[0]; if (expC < 0) expC = numCols[1]; }
    else if (numCols.length === 1) { if (incC < 0) incC = numCols[0]; }
  }
  
  return { incC, expC, lblC };
}

export default function SheetCharts({ data }) {
  const shHdr = data?.headers || [];
  const shRows = data?.rows || [];

  if (!shRows.length) return null;

  const { incC, expC, lblC } = useMemo(() => detectPLCols(shHdr, shRows), [shHdr, shRows]);
  const vehIdx = shHdr.findIndex(h => /vehicle/i.test(h));

  let lbs = [], incVals = [], expVals = [];

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
    scales: { 
      x: { ticks: { font: { size: 9 }, maxRotation: 45 }, grid: { color: '#e6e9f2' } }, 
      y: { ticks: { font: { size: 9 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') }, beginAtZero: true, grid: { color: '#e6e9f2' } } 
    }
  };

  // Bar Data
  const barData = (incC >= 0 && expC >= 0) ? {
    labels: lbs,
    datasets: [
      { label: shHdr[incC] || 'Total Fare', data: incVals, backgroundColor: '#059669bb', borderColor: '#059669', borderWidth: 1, borderRadius: 4 },
      { label: shHdr[expC] || 'Expenses', data: expVals, backgroundColor: '#dc2626bb', borderColor: '#dc2626', borderWidth: 1, borderRadius: 4 }
    ]
  } : (() => {
    const numC = incC >= 0 ? incC : expC >= 0 ? expC : 0;
    const vals = shRows.slice(0, 14).map(r => parseFloat(r[numC]) || 0);
    return {
      labels: lbs,
      datasets: [{ label: shHdr[numC] || 'Value', data: vals, backgroundColor: CC[0] + 'bb', borderColor: CC[0], borderWidth: 1, borderRadius: 4 }]
    };
  })();

  // Pie Data
  let pieData = null;
  if (incC >= 0 && expC >= 0 && (totInc > 0 || totExp > 0)) {
    const profit = Math.max(0, totProfit);
    const loss = Math.max(0, -totProfit);
    pieData = {
      labels: ['Total Fare', 'Total Expenses'].concat(profit > 0 ? ['Net Profit'] : ['Net Loss']),
      datasets: [{ data: [totInc, totExp].concat(profit > 0 ? [profit] : [loss]), backgroundColor: ['#059669', '#dc2626'].concat(profit > 0 ? ['#2563eb'] : ['#f59e0b']), borderWidth: 2, borderColor: '#fff' }]
    };
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
      pieData = { labels: cl, datasets: [{ data: cv, backgroundColor: CC.slice(0, cl.length) }] };
    }
  }

  // Line Data
  const lineOpts = { ...baseOpts };
  const lineData = (incC >= 0 && expC >= 0) ? {
    labels: lbs,
    datasets: [
      { label: 'Total Fare', data: incVals, borderColor: '#059669', backgroundColor: '#05966920', fill: false, tension: 0.35, pointRadius: 4 },
      { label: 'Expenses', data: expVals, borderColor: '#dc2626', backgroundColor: '#dc262620', fill: false, tension: 0.35, pointRadius: 4 },
      { label: 'Profit/Loss', data: profVals, borderColor: '#2563eb', backgroundColor: '#2563eb15', fill: true, tension: 0.35, pointRadius: 4 }
    ]
  } : (() => {
    const numC = incC >= 0 ? incC : expC >= 0 ? expC : 0;
    const vals = shRows.slice(0, 14).map(r => parseFloat(r[numC]) || 0);
    return {
      labels: lbs,
      datasets: [{ label: shHdr[numC] || 'Value', data: vals, borderColor: CC[2], backgroundColor: CC[2] + '20', fill: true, tension: 0.35, pointRadius: 3 }]
    };
  })();

  // HBar Data
  const hbarOpts = { ...baseOpts, indexAxis: 'y' };
  let hbarData = null;
  if (incC >= 0) {
    const sorted = lbs.map((l, i) => ({ l, inc: incVals[i], exp: expVals[i] })).sort((a, b) => b.inc - a.inc).slice(0, 10);
    hbarData = {
      labels: sorted.map(x => x.l),
      datasets: [
        { label: 'Total Fare', data: sorted.map(x => x.inc), backgroundColor: '#059669aa', borderRadius: 4 },
        { label: 'Expenses', data: sorted.map(x => x.exp), backgroundColor: '#dc2626aa', borderRadius: 4 }
      ]
    };
  } else {
    const numC = expC >= 0 ? expC : 0;
    const top = shRows.map(r => ({ l: String(r[lblC] || '').slice(0, 14), v: parseFloat(r[numC]) || 0 })).sort((a, b) => b.v - a.v).slice(0, 8);
    hbarOpts.plugins.legend.display = false;
    hbarData = {
      labels: top.map(x => x.l),
      datasets: [{ data: top.map(x => x.v), backgroundColor: CC.map(c => c + 'aa'), borderRadius: 3 }]
    };
  }

  return (
    <div className="mt-[0.5rem]">
      <div className="font-syne text-[1rem] font-[700] text-ink mb-[0.9rem] flex items-center gap-[0.45rem]">
        📊 Charts 
        <span className="font-[400] text-ink3 text-[0.8rem] font-lato">Auto-generated · Updates live when you edit data</span>
      </div>
      <div className="grid grid-cols-2 gap-[1rem] max-md:grid-cols-1">
        
        <div className="bg-surface border border-border rounded-r2 p-[1.1rem] shadow-sh">
          <div className="text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.6rem]">Total Fare vs Expenses per Vehicle</div>
          <div className="h-[180px]"><Bar data={barData} options={baseOpts} /></div>
        </div>

        <div className="bg-surface border border-border rounded-r2 p-[1.1rem] shadow-sh">
          <div className="text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.6rem]">P&L Summary</div>
          <div className="h-[180px]">
            {pieData && <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 9 }, boxWidth: 10 } } } }} />}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-r2 p-[1.1rem] shadow-sh">
          <div className="text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.6rem]">Fare · Expenses · Profit Trend</div>
          <div className="h-[180px]"><Line data={lineData} options={lineOpts} /></div>
        </div>

        <div className="bg-surface border border-border rounded-r2 p-[1.1rem] shadow-sh">
          <div className="text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.6rem]">Top Vehicles by Fare</div>
          <div className="h-[180px]"><Bar data={hbarData} options={hbarOpts} /></div>
        </div>

      </div>
    </div>
  );
}
