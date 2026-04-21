import { useAppContext } from '../../context/AppContext';

export default function YearsView() {
  const { db, goMonths, currentUser, addYear } = useAppContext();
  
  const yrs = Object.keys(db).map(Number).sort((a,b) => b - a);
  const totalRecs = yrs.reduce((s, y) => s + Object.values(db[y]).filter(v => v).reduce((a,v) => a + v.rows.length, 0), 0);
  const totalMonths = yrs.reduce((s, y) => s + Object.values(db[y]).filter(v => v).length, 0);

  const CY = new Date().getFullYear();

  const handleAddYear = () => {
    const y = parseInt(prompt('Enter year (e.g. 2028):'));
    if (y && y > 2000 && y < 2200 && !db[y]) {
      addYear(y);
    }
  };

  return (
    <div className="animate-vIn">
      <div className="mb-[1.4rem]">
        <h1 className="font-syne text-[1.55rem] font-[700] text-ink tracking-tight">🚛 Data Workspace</h1>
        <p className="text-ink3 text-[0.85rem] mt-[0.22rem]">Select a year to browse monthly records</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-[0.9rem] mb-[1.4rem] max-md:grid-cols-2 max-sm:grid-cols-1">
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="float-right text-[1.3rem]">📋</div>
          <div className="text-[0.68rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Total Records</div>
          <div className="font-mono text-[1.45rem] text-ink">{totalRecs}</div>
          <div className="text-[0.7rem] text-ink3 mt-[0.15rem]">All years</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="float-right text-[1.3rem]">📅</div>
          <div className="text-[0.68rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Years</div>
          <div className="font-mono text-[1.45rem] text-ink">{yrs.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="float-right text-[1.3rem]">🗓</div>
          <div className="text-[0.68rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Months w/ Data</div>
          <div className="font-mono text-[1.45rem] text-ink">{totalMonths}</div>
        </div>
        <div className="bg-surface border border-border rounded-r2 p-[1rem_1.1rem] shadow-sh">
          <div className="float-right text-[1.3rem]">👤</div>
          <div className="text-[0.68rem] font-[700] uppercase tracking-[0.07em] text-ink3 mb-[0.35rem]">Signed In</div>
          <div className="font-mono text-[1rem] text-ink leading-tight">{currentUser.name.split(' ')[0]}</div>
          <div className="text-[0.7rem] text-ink3 mt-[0.15rem]">{currentUser.role === 'admin' ? 'Administrator' : 'Viewer'}</div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-[1rem] max-md:grid-cols-2 max-sm:grid-cols-1">
        {yrs.map(y => {
          const rows = Object.values(db[y]).filter(v => v).reduce((s, v) => s + v.rows.length, 0);
          const mos = Object.values(db[y]).filter(v => v).length;
          const prog = y < CY ? 100 : y === CY ? Math.round((new Date().getMonth() + 1) / 12 * 100) : 0;
          const isPast = y < CY;
          const isCur = y === CY;
          
          return (
            <div 
              key={y}
              className="bg-surface border-[1.5px] border-border rounded-r2 p-[1.4rem_1.4rem_1.15rem] cursor-pointer transition-all duration-200 shadow-sh relative overflow-hidden animate-cp hover:border-gold hover:-translate-y-[3px] hover:shadow-[0_4px_24px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.06),0_0_0_3px_rgba(245,158,11,0.12)] group"
              onClick={() => goMonths(y)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 transition-opacity duration-250 group-hover:opacity-100 pointer-events-none" />
              
              <div className="flex justify-between items-start mb-[0.85rem] relative z-10">
                <div className={`text-[0.62rem] font-[700] uppercase tracking-[0.07em] px-[0.48rem] py-[0.18rem] rounded-full ${isCur ? 'bg-green-soft text-green' : isPast ? 'bg-surface3 text-ink3' : 'bg-amber-soft text-amber'}`}>
                  {isPast ? 'Completed' : isCur ? '● Active' : 'Upcoming'}
                </div>
                <div className="w-[26px] h-[26px] bg-surface3 rounded-[7px] flex items-center justify-center text-ink3 text-[0.75rem] transition-colors duration-200 group-hover:bg-gold group-hover:text-white">
                  →
                </div>
              </div>
              
              <div className="font-syne text-[2.4rem] font-[800] text-ink leading-none mb-[0.65rem] tracking-tight relative z-10">{y}</div>
              
              <div className="flex gap-[0.9rem] mb-[0.85rem] relative z-10">
                <div>
                  <div className="font-mono text-[0.9rem] text-ink">{rows}</div>
                  <div className="text-[0.65rem] text-ink3 mt-[0.08rem]">Records</div>
                </div>
                <div>
                  <div className="font-mono text-[0.9rem] text-ink">{mos}/12</div>
                  <div className="text-[0.65rem] text-ink3 mt-[0.08rem]">Months</div>
                </div>
              </div>
              
              <div className="h-[3px] bg-bg2 rounded-full overflow-hidden relative z-10">
                <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${prog}%` }} />
              </div>
            </div>
          );
        })}
        
        {currentUser.role === 'admin' && (
          <div 
            className="flex items-center justify-center gap-[0.45rem] bg-surface border-[2px] border-dashed border-border2 rounded-r2 p-[1.4rem] cursor-pointer text-ink3 text-[0.88rem] font-[600] transition-all duration-200 hover:border-gold hover:text-gold2 hover:bg-amber-soft"
            onClick={handleAddYear}
          >
            ＋ Add Year
          </div>
        )}
      </div>
    </div>
  );
}
