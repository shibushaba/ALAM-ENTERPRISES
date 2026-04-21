import { useAppContext } from '../../context/AppContext';

export default function TopBar() {
  const { currentUser, logout, syncStatus, goYears, curY, curM, goMonths, view } = useAppContext();

  // Create breadcrumb items
  const parts = [{ l: 'Years', f: goYears }];
  if (curY || view === 'months' || view === 'sheet') {
    parts.push({ l: curY || new Date().getFullYear(), f: () => goMonths(curY || new Date().getFullYear()) });
  }
  if (curM && view === 'sheet') {
    parts.push({ l: curM });
  }

  return (
    <div className="h-[54px] bg-surface border-b border-border flex items-center justify-between px-[1rem] sticky top-0 z-[100] shadow-sh">
      <div className="flex items-center gap-[0.65rem] overflow-hidden min-w-0">
        <div className="hidden max-md:flex w-[36px] h-[36px] items-center justify-center bg-surface2 border border-border rounded-[8px] cursor-pointer text-[1rem] text-ink2 shrink-0">
          ☰
        </div>
        <div className="flex items-center gap-[0.45rem] cursor-pointer shrink-0" onClick={goYears}>
          <div className="w-[28px] h-[28px] bg-gradient-to-br from-amber-500 to-amber-400 rounded-[7px] flex items-center justify-center text-[0.8rem] shrink-0">
            🚛
          </div>
          <span className="font-syne font-[700] text-[0.95rem] text-ink max-sm:hidden">Alam Enterprises</span>
        </div>
        <div className="w-[1px] h-[18px] bg-border shrink-0" />
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-[0.3rem] text-[0.78rem] overflow-hidden">
          {parts.map((p, i) => {
            const last = i === parts.length - 1;
            return (
              <span key={i} className="flex items-center gap-[0.3rem]">
                {i > 0 && <span className="text-border2">/</span>}
                <span 
                  className={`px-[0.3rem] py-[0.18rem] rounded-[5px] transition-all duration-150 whitespace-nowrap ${last ? 'text-ink font-[600] cursor-default' : 'text-ink3 cursor-pointer hover:text-blue hover:bg-blue-soft'}`}
                  onClick={() => !last && p.f && p.f()}
                >
                  {p.l}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-[0.5rem] shrink-0">
        <div className={`hidden sm:flex items-center gap-[0.3rem] px-[0.5rem] py-[0.2rem] rounded-[6px] text-[0.65rem] font-[700] border ${syncStatus === 'syncing' ? 'bg-amber-soft text-amber border-amber/15' : syncStatus === 'error' ? 'bg-red-soft text-red border-red/15' : 'bg-green-soft text-green border-green/15'}`}>
          <div className={`w-[5px] h-[5px] rounded-full bg-current ${syncStatus === 'syncing' ? 'animate-blink' : ''}`} />
          <span>{syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'error' ? 'Offline' : 'Synced ✓'}</span>
        </div>
        
        <span className={`text-[0.64rem] px-[0.45rem] py-[0.15rem] rounded-full font-[700] uppercase tracking-[0.05em] ${currentUser.role === 'admin' ? 'bg-amber-500/15 text-amber-600' : 'bg-purple-soft text-purple'}`}>
          {currentUser.role}
        </span>
        
        <div className="flex items-center gap-[0.4rem] p-[0.28rem_0.65rem_0.28rem_0.28rem] bg-surface2 border border-border rounded-full text-[0.76rem] text-ink2 max-sm:hidden">
          <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center text-[0.6rem] font-[700] text-[#0a0e1a]">
            {currentUser.ini}
          </div>
          <span>{currentUser.name.split(' ')[0]}</span>
        </div>
        
        <button 
          className="px-[0.65rem] py-[0.3rem] bg-surface2 border border-border rounded-[7px] text-[0.73rem] cursor-pointer text-ink3 font-lato transition-all duration-150 hover:bg-red-soft hover:text-red hover:border-red/20"
          onClick={logout}
        >
          ↩ Out
        </button>
      </div>
    </div>
  );
}
