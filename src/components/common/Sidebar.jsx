import { useAppContext } from '../../context/AppContext';

export default function Sidebar() {
  const { db, view, curY, goMonths, goYears, goVehicle, curVeh, currentUser, logout, monthsList } = useAppContext();

  // Calculate year stats
  const years = Object.keys(db).map(Number).sort((a, b) => b - a);
  
  // Calculate vehicles list
  const vehSet = new Set();
  Object.keys(db).forEach(y => {
    monthsList.forEach(m => {
      const d = db[y][m];
      if (!d) return;
      const vi = d.headers.findIndex(h => /vehicle/i.test(h));
      if (vi >= 0) {
        d.rows.forEach(r => { 
          const v = String(r[vi] || '').trim(); 
          if (v) vehSet.add(v); 
        });
      }
    });
  });
  const vehs = Array.from(vehSet).sort();

  return (
    <>
      {/* Mobile overlay omitted for layout simplicity, handled via wrapper class if needed */}
      <div className="w-[210px] shrink-0 bg-ink py-[0.75rem] flex flex-col sticky top-[54px] h-[calc(100vh-54px)] overflow-y-auto max-md:hidden">
        <div className="px-[1rem] pb-[0.2rem] pt-[0.5rem] text-[0.62rem] font-[700] uppercase tracking-[0.1em] text-white/20 mt-[0.5rem]">Menu</div>
        
        <div 
          className={`flex items-center gap-[0.6rem] py-[0.5rem] px-[1.1rem] cursor-pointer text-[0.82rem] font-[500] transition-all duration-150 border-l-[2px] ${view === 'years' ? 'text-white bg-amber-500/15 border-l-gold' : 'border-l-transparent text-white/45 hover:text-white/80 hover:bg-white/5'}`}
          onClick={goYears}
        >
          <span className="text-[0.9rem] w-[18px] text-center">🏠</span>
          Dashboard
        </div>
        
        <div 
          className={`flex items-center gap-[0.6rem] py-[0.5rem] px-[1.1rem] cursor-pointer text-[0.82rem] font-[500] transition-all duration-150 border-l-[2px] ${view === 'all_years' ? 'text-white bg-amber-500/15 border-l-gold' : 'border-l-transparent text-white/45 hover:text-white/80 hover:bg-white/5'}`}
          onClick={goYears}
        >
          <span className="text-[0.9rem] w-[18px] text-center">📅</span>
          All Years
        </div>

        <div className="px-[1rem] pb-[0.2rem] pt-[0.5rem] text-[0.62rem] font-[700] uppercase tracking-[0.1em] text-white/20 mt-[0.75rem]">Years</div>
        
        <div className="py-[0.2rem]">
          {years.map(y => {
            const cnt = Object.values(db[y]).filter(v => v).reduce((s, v) => s + v.rows.length, 0);
            const active = y === curY && view !== 'years' && view !== 'vehicle';
            return (
              <div 
                key={y}
                className={`flex items-center justify-between py-[0.42rem] pr-[1.1rem] pl-[2.2rem] cursor-pointer text-[0.8rem] transition-all duration-150 ${(active || y===curY) ? 'text-amber-400 font-[600]' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                onClick={() => goMonths(y)}
              >
                <span>{y}</span>
                <span className="text-[0.62rem] bg-amber-500/20 text-amber-400 px-[0.35rem] py-[0.08rem] rounded-full font-mono">{cnt}</span>
              </div>
            );
          })}
        </div>

        {vehs.length > 0 && (
          <>
            <div className="px-[1rem] pb-[0.2rem] pt-[0.5rem] text-[0.62rem] font-[700] uppercase tracking-[0.1em] text-white/20 mt-[0.75rem] flex items-center justify-between">
              <span>🚛 Vehicles</span>
            </div>
            <div className="py-[0.2rem] max-h-[200px] overflow-y-auto">
              {vehs.map(v => (
                <div 
                  key={v}
                  className={`flex items-center justify-between py-[0.38rem] pr-[1.1rem] pl-[1.9rem] cursor-pointer text-[0.78rem] transition-all duration-150 border-l-[2px] font-mono font-[600] ${curVeh === v ? 'text-amber-400 bg-amber-500/10 border-l-gold' : 'text-white/40 border-l-transparent hover:text-white/80 hover:bg-white/5 hover:border-l-amber-500/40'}`}
                  onClick={() => goVehicle(v)}
                >
                  <span>🚛 {v}</span>
                  <span className="w-[5px] h-[5px] rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)] shrink-0" />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-auto p-[0.85rem] border-t border-white/5">
          <div className="flex items-center gap-[0.5rem]">
            <div className="w-[28px] h-[28px] rounded-full bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center text-[0.65rem] font-[700] text-[#0a0e1a] shrink-0">
              {currentUser.ini}
            </div>
            <div>
              <div className="text-[0.78rem] font-[600] text-white/65">{currentUser.name}</div>
              <div className="text-[0.68rem] text-white/30">{currentUser.role === 'admin' ? 'Administrator' : 'Viewer'}</div>
            </div>
          </div>
          <button 
            className="mt-[0.65rem] w-full p-[0.4rem] bg-white/5 border border-white/10 rounded-[7px] text-white/40 text-[0.72rem] cursor-pointer font-lato transition-all duration-150 hover:bg-red-600/15 hover:text-red-300 hover:border-red-600/20"
            onClick={logout}
          >
            ↩ Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
