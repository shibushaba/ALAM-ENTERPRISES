import { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function detectPLCols(headers, rows) {
  const inc = ['fare', 'received', 'income', 'revenue', 'freight', 'earning', 'collection', 'inward', 'credit', 'sales', 'turnover', 'total fare'];
  const exp = ['expense', 'cost', 'fuel', 'maintenance', 'payroll', 'salary', 'insurance', 'repair', 'toll', 'loading', 'unloading', 'debit', 'payment', 'outward'];
  
  let incC = -1, expC = -1;
  
  headers.forEach((h, i) => {
    const hl = h.toLowerCase();
    if (incC < 0 && inc.some(k => hl.includes(k))) incC = i;
    if (expC < 0 && exp.some(k => hl.includes(k))) expC = i;
  });
  
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
  return { incC, expC };
}

export default function VehicleAnalyticsView() {
  const { db, curVeh, monthsList, goSheet } = useAppContext();
  const availYears = Object.keys(db).map(Number).sort((a,b) => b - a);
  const CY = new Date().getFullYear();
  const [activeYear, setActiveYear] = useState(availYears.includes(CY) ? CY : (availYears[0] || CY));

  const monthData = useMemo(() => {
    return monthsList.map(m => {
      const d = db[activeYear]?.[m];
      if (!d) return { month: m, fare: 0, exp: 0, profit: 0, trips: 0, hasData: false };
      
      const vi = d.headers.findIndex(h => /vehicle/i.test(h));
      const { incC, expC } = detectPLCols(d.headers, d.rows);
      const rows = vi >= 0 ? d.rows.filter(r => String(r[vi] || '').trim() === curVeh) : [];
      
      if (!rows.length) return { month: m, fare: 0, exp: 0, profit: 0, trips: 0, hasData: false };
      
      const fare = rows.reduce((s, r) => s + (incC >= 0 ? parseFloat(r[incC]) || 0 : 0), 0);
      const exp = rows.reduce((s, r) => s + (expC >= 0 ? parseFloat(r[expC]) || 0 : 0), 0);
      return { month: m, fare, exp, profit: fare - exp, trips: rows.length, hasData: true };
    });
  }, [db, activeYear, curVeh, monthsList]);

  const totalFare = monthData.reduce((s, x) => s + x.fare, 0);
  const totalExp = monthData.reduce((s, x) => s + x.exp, 0);
  const totalProfit = totalFare - totalExp;
  const totalTrips = monthData.reduce((s, x) => s + x.trips, 0);
  const profitMonths = monthData.filter(x => x.hasData && x.profit >= 0).length;
  const lossMonths = monthData.filter(x => x.hasData && x.profit < 0).length;
  const maxAbs = Math.max(...monthData.map(x => Math.abs(x.profit)), 1);

  const fmt = (v) => '₹' + Math.abs(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const labels = monthsList.map(m => m.slice(0, 3));
  const baseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { font: { size: 9 }, boxWidth: 10 } } },
    scales: { x: { ticks: { font: { size: 9 } } }, y: { ticks: { font: { size: 9 }, callback: v => '₹' + Number(v).toLocaleString('en-IN') }, beginAtZero: true } }
  };

  const barData = {
    labels,
    datasets: [
      { label: 'Fare', data: monthData.map(x => x.fare), backgroundColor: '#2563ebbb', borderColor: '#2563eb', borderWidth: 1, borderRadius: 3 },
      { label: 'Expenses', data: monthData.map(x => x.exp), backgroundColor: '#dc2626bb', borderColor: '#dc2626', borderWidth: 1, borderRadius: 3 }
    ]
  };

  const plColors = monthData.map(x => x.profit >= 0 ? '#05966988' : '#dc262688');
  const plData = {
    labels,
    datasets: [
      { label: 'Profit/Loss', data: monthData.map(x => x.profit), backgroundColor: plColors, borderColor: plColors.map(c => c.slice(0, 7)), borderWidth: 1, borderRadius: 3 }
    ]
  };

  return (
    <div className="animate-vIn">
      <div className="flex items-center gap-[1rem] flex-wrap mb-[1.4rem]">
        <div>
          <h1 className="font-syne text-[1.55rem] font-[700] text-ink tracking-tight">🚛 Vehicle Analytics</h1>
          <p className="text-ink3 text-[0.85rem] mt-[0.22rem]">All-year profit & loss breakdown · click any month row to open it</p>
        </div>
        <div className="inline-flex items-center gap-[0.45rem] p-[0.45rem_1rem] bg-amber-soft border-[1.5px] border-amber/25 rounded-[10px] font-mono text-[1.2rem] font-[800] text-gold2">
          🚛 {curVeh}
        </div>
      </div>

      <div className="flex gap-[0.5rem] flex-wrap mb-[1.25rem]">
        {availYears.map(y => (
          <button 
            key={y}
            className={`p-[0.35rem_0.9rem] rounded-[8px] text-[0.78rem] font-[700] cursor-pointer border-[1.5px] transition-all duration-150 font-mono ${y === activeYear ? 'border-gold text-white bg-gradient-to-br from-amber-500 to-amber-400 shadow-[0_3px_10px_rgba(245,158,11,0.3)]' : 'border-border2 bg-surface2 text-ink2 hover:border-gold hover:text-gold2 hover:bg-amber-soft'}`}
            onClick={() => setActiveYear(y)}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[0.9rem] mb-[1.4rem] max-sm:grid-cols-2">
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.65rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Total Fare</div>
          <div className="font-mono text-[1.25rem] text-blue">{fmt(totalFare)}</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.65rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Total Expenses</div>
          <div className="font-mono text-[1.25rem] text-red">{fmt(totalExp)}</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.65rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Net {totalProfit >= 0 ? 'Profit' : 'Loss'}</div>
          <div className={`font-mono text-[1.25rem] ${totalProfit >= 0 ? 'text-green' : 'text-red'}`}>{fmt(totalProfit)}</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.65rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Total Trips</div>
          <div className="font-mono text-[1.25rem] text-ink">{totalTrips}</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.65rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Profit Months</div>
          <div className="font-mono text-[1.25rem] text-green">{profitMonths}</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.65rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Loss Months</div>
          <div className={`font-mono text-[1.25rem] ${lossMonths > 0 ? 'text-red' : 'text-ink'}`}>{lossMonths}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[1rem] mb-[1.25rem] max-md:grid-cols-1">
        <div className="bg-surface border border-border rounded-r2 p-[1.1rem] shadow-sh">
          <div className="text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.6rem]">Monthly Fare vs Expenses ({activeYear})</div>
          <div className="h-[200px]"><Bar data={barData} options={baseOpts} /></div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1.1rem] shadow-sh">
          <div className="text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.6rem]">Monthly Profit / Loss ({activeYear})</div>
          <div className="h-[200px]"><Bar data={plData} options={baseOpts} /></div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-r2 overflow-hidden shadow-sh mb-[1.25rem]">
        <div className="bg-surface2 p-[0.65rem_1rem] border-b border-border font-syne text-[0.9rem] font-[700] text-ink">
          📅 Month-by-Month Breakdown — Vehicle {curVeh} · {activeYear}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[0.82rem]">
            <thead>
              <tr>
                <th className="bg-surface2 p-[0.55rem_0.85rem] text-left text-[0.64rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border">Month</th>
                <th className="bg-surface2 p-[0.55rem_0.85rem] text-left text-[0.64rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border">Trips</th>
                <th className="bg-surface2 p-[0.55rem_0.85rem] text-left text-[0.64rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border">Total Fare</th>
                <th className="bg-surface2 p-[0.55rem_0.85rem] text-left text-[0.64rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border">Expenses</th>
                <th className="bg-surface2 p-[0.55rem_0.85rem] text-left text-[0.64rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border">Profit / Loss</th>
                <th className="bg-surface2 p-[0.55rem_0.85rem] text-left text-[0.64rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border">P&L Bar</th>
              </tr>
            </thead>
            <tbody>
              {monthData.map((x, i) => (
                <tr 
                  key={x.month} 
                  className="border-b border-border cursor-pointer transition-colors hover:bg-surface2 last:border-b-0"
                  title={`Open ${x.month} sheet`}
                  onClick={() => goSheet(activeYear, x.month)}
                >
                  <td className="p-[0.5rem_0.85rem] text-ink font-[700] text-ink2">{String(i + 1).padStart(2, '0')} {x.month}</td>
                  <td className="p-[0.5rem_0.85rem] text-ink font-mono text-[0.8rem]">{x.hasData ? x.trips : '—'}</td>
                  <td className="p-[0.5rem_0.85rem] text-blue font-mono text-[0.8rem]">{x.hasData ? fmt(x.fare) : '—'}</td>
                  <td className="p-[0.5rem_0.85rem] text-red font-mono text-[0.8rem]">{x.hasData ? fmt(x.exp) : '—'}</td>
                  <td className={`p-[0.5rem_0.85rem] font-mono text-[0.8rem] font-[700] ${x.hasData ? (x.profit >= 0 ? 'text-green' : 'text-red') : 'text-ink3 italic text-[0.75rem] font-normal font-sans'}`}>
                    {x.hasData ? (x.profit >= 0 ? '▲ ' : '▼ ') + fmt(x.profit) : 'No data'}
                  </td>
                  <td className="p-[0.5rem_0.85rem] text-ink w-[120px]">
                    {x.hasData ? (
                      <div className="h-[8px] bg-bg2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${x.profit < 0 ? 'bg-red' : 'bg-green'}`} style={{ width: `${Math.round(Math.abs(x.profit) / maxAbs * 100)}%` }} />
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
