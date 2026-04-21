import { useAppContext } from '../../context/AppContext';

export default function MonthsView() {
  const { curY, db, monthsList, goSheet, pdfStore } = useAppContext();

  const data = db[curY] || {};
  const totalRecs = Object.values(data).filter(v => v).reduce((s, v) => s + v.rows.length, 0);
  const dataMonths = Object.values(data).filter(v => v).length;
  const CY = new Date().getFullYear();

  const mx = Math.max(...Object.values(data).filter(v => v).map(v => v.rows.length), 1);

  return (
    <div className="animate-vIn">
      <div className="mb-[1.4rem]">
        <h1 className="font-syne text-[1.55rem] font-[700] text-ink tracking-tight">
          📅 <span className="text-gold">{curY}</span>
        </h1>
        <p className="text-ink3 text-[0.85rem] mt-[0.22rem]">Select a month to view records</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-[0.9rem] mb-[1.4rem] max-md:grid-cols-2 max-sm:grid-cols-1">
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.68rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Records</div>
          <div className="font-mono text-[1.45rem] text-ink">{totalRecs}</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.68rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Months w/ Data</div>
          <div className="font-mono text-[1.45rem] text-ink">{dataMonths}</div>
          <div className="text-[0.7rem] text-ink3 mt-[0.15rem]">of 12</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="text-[0.68rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Year</div>
          <div className="font-mono text-[1.45rem] text-ink">{curY}</div>
          <div className="text-[0.7rem] text-ink3 mt-[0.15rem]">{curY === CY ? 'Current' : curY < CY ? 'Past' : 'Future'}</div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(145px,1fr))] gap-[0.8rem] max-md:grid-cols-3 max-sm:grid-cols-2">
        {monthsList.map((m, i) => {
          const md = data[m];
          const cnt = md ? md.rows.length : 0;
          const pct = cnt ? Math.round((cnt / mx) * 100) : 0;
          const hasPdf = !!(pdfStore[`${curY}_${m}`]);

          return (
            <div 
              key={m}
              className="bg-surface border-[1.5px] border-border rounded-r2 p-[1.1rem] cursor-pointer transition-all duration-[0.18s] shadow-sh hover:border-gold hover:-translate-y-[2px] hover:shadow-sh2 animate-cp"
              style={{ animationDelay: `${i * 0.035}s` }}
              onClick={() => goSheet(curY, m)}
            >
              <div className={`float-right w-[7px] h-[7px] rounded-full mt-[0.15rem] ${cnt ? 'bg-green shadow-[0_0_6px_rgba(5,150,105,0.45)]' : 'bg-border2'}`} />
              
              <div className="font-mono text-[0.68rem] text-ink3 mb-[0.25rem]">{String(i + 1).padStart(2, '0')}</div>
              <div className="font-syne text-[1.05rem] font-[700] text-ink mb-[0.65rem]">{m}</div>
              
              <div className="text-[0.76rem] text-ink3">
                <strong className="text-gold2 font-mono">{cnt}</strong> record{cnt !== 1 ? 's' : ''}
                {hasPdf && <span className="text-purple text-[0.65rem] ml-1">📄 PDF</span>}
              </div>
              
              <div className="h-[3px] bg-bg2 rounded-full mt-[0.5rem] overflow-hidden">
                <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
