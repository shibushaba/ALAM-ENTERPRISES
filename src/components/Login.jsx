import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function Login() {
  const { login, syncStatus } = useAppContext();
  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (login(username, password)) {
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0a0e1a] overflow-hidden relative flex-col md:flex-row">
      {/* Background Graphic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-[55%] bg-gradient-to-b from-transparent via-[#0d1220] to-[#0a0e1a] z-10" />
        {/* City silhouette (simplified for component, could use full SVG string from original in index.css) */}
        <div className="absolute bottom-0 left-0 right-0 h-[38%] opacity-30 z-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 1200 300\\' preserveAspectRatio=\\'xMidYMax slice\\'%3E%3Crect x=\\'0\\' y=\\'0\\' width=\\'1200\\' height=\\'300\\' fill=\\'%230a0e1a\\'/%3E%3Crect x=\\'10\\' y=\\'180\\' width=\\'60\\' height=\\'120\\' fill=\\'%230d1525\\'/%3E%3C/svg%3E')] bg-bottom bg-cover bg-no-repeat" />
        <div className="absolute inset-0 z-0 opacity-15 bg-[radial-gradient(circle,rgba(255,255,255,0.7)_1px,transparent_1px),radial-gradient(circle,rgba(255,255,255,0.4)_1px,transparent_1px)]" style={{ backgroundSize: '80px 80px, 40px 40px', backgroundPosition: '0 0, 40px 40px' }} />
        
        {/* Vehicles */}
        <div className="absolute bottom-0 left-0 right-0 h-[12px] z-50 pointer-events-none">
          <div className="absolute bottom-[2px] w-[28px] h-[7px] rounded-[3px] animate-driveBy bg-gradient-to-r from-amber-400 to-amber-500 bottom-[5px]" style={{ animationDuration: '8s', animationDelay: '0s' }} />
          <div className="absolute bottom-[2px] w-[22px] h-[7px] rounded-[3px] animate-driveBy bg-gradient-to-r from-blue-400 to-blue-500 bottom-0" style={{ animationDuration: '12s', animationDelay: '3s' }} />
          <div className="absolute bottom-[2px] w-[34px] h-[7px] rounded-[3px] animate-driveBy bg-gradient-to-r from-red-400 to-red-500 bottom-[5px]" style={{ animationDuration: '10s', animationDelay: '6s' }} />
          <div className="absolute bottom-[2px] w-[20px] h-[7px] rounded-[3px] animate-driveBy bg-gradient-to-r from-lime-400 to-lime-500 bottom-0" style={{ animationDuration: '15s', animationDelay: '1.5s' }} />
        </div>
      </div>

      <div className="absolute rounded-full blur-[100px] pointer-events-none z-0 w-[600px] h-[600px] bg-[rgba(37,99,235,0.18)] -top-[200px] -left-[200px] animate-orbPulse" />
      <div className="absolute rounded-full blur-[100px] pointer-events-none z-0 w-[450px] h-[450px] bg-[rgba(245,158,11,0.08)] -bottom-[150px] -right-[100px] animate-orbPulse" style={{ animationDirection: 'reverse', animationDuration: '10s' }} />
      <div className="absolute rounded-full blur-[100px] pointer-events-none z-0 w-[300px] h-[300px] bg-[rgba(124,58,237,0.1)] top-[30%] left-[40%] animate-orbPulse" style={{ animationDelay: '2s', animationDuration: '12s' }} />

      <div className="flex-1 flex flex-col justify-center p-[4rem] relative z-10 min-w-0 md:[flex:1] sm:py-[2.5rem] sm:px-[2rem] max-md:p-[2rem_1.25rem_1rem]">
        <div className="flex items-center gap-[0.85rem] mb-[2.5rem]">
          <div className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center text-[1.5rem] shrink-0 shadow-[0_4px_24px_rgba(245,158,11,0.4),0_0_0_1px_rgba(245,158,11,0.2)] bg-gradient-to-br from-amber-500 via-amber-400 to-amber-500">
            🚛
          </div>
          <div>
            <div className="font-syne text-[1.5rem] font-[800] text-white tracking-tight leading-tight">Alam Enterprises</div>
            <span className="text-[0.58rem] font-[700] uppercase tracking-[0.15em] text-white/35 block mt-[0.15rem]">Transport & Logistics</span>
          </div>
        </div>
        <div className="font-syne text-[clamp(2rem,4vw,3.2rem)] font-[800] text-white leading-tight tracking-tight mb-[1.2rem] max-md:text-[2rem]">
          Moving <em className="bg-gradient-to-r from-amber-500 via-amber-400 to-blue-400 bg-clip-text text-transparent not-italic">freight</em>,<br/>tracking <em className="bg-gradient-to-r from-amber-500 via-amber-400 to-blue-400 bg-clip-text text-transparent not-italic">records</em>.
        </div>
      </div>

      <div className="w-full md:w-[440px] shrink-0 flex items-center justify-center p-[3rem_2.5rem] relative z-10 max-md:p-[1.5rem_1.5rem_2.5rem]">
        <div className="w-full bg-white/5 backdrop-blur-[24px] border border-white/10 rounded-[24px] p-[2.4rem] shadow-[0_24px_80px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)] max-md:p-[2rem_1.5rem]">
          <div className="text-center mb-[2rem] pb-[1.5rem] border-b border-white/5">
            <div className="font-syne text-[1.4rem] font-[800] text-white tracking-wide max-sm:text-[1.1rem]">ALAM ENTERPRISES</div>
            <span className="text-[0.7rem] font-[700] uppercase tracking-[0.15em] text-gold mt-[0.25rem] block">Data Ledger System</span>
          </div>
          <div className="font-syne text-[1.25rem] font-[700] text-white mb-[0.25rem]">Welcome back</div>
          <div className="text-white/40 text-[0.82rem] mb-[1.75rem]">Sign in to continue</div>
          
          <div className="mb-[1.1rem]">
            <label className="block text-[0.68rem] font-[700] uppercase tracking-[0.1em] text-white/40 mb-[0.45rem]">Select Role</label>
            <div className="grid grid-cols-2 gap-[0.5rem]">
              <div 
                className={`p-[0.7rem] border-[1.5px] rounded-[10px] text-center cursor-pointer text-[0.85rem] font-[600] transition-all duration-200 ${role === 'admin' ? 'border-gold text-gold bg-amber-500/10' : 'border-white/10 text-white/40 bg-white/5 hover:border-amber-500/50 hover:text-white/80 hover:bg-amber-500/10'}`}
                onClick={() => { setRole('admin'); setUsername(''); setPassword(''); }}
              >
                👑 Admin
              </div>
              <div 
                className={`p-[0.7rem] border-[1.5px] rounded-[10px] text-center cursor-pointer text-[0.85rem] font-[600] transition-all duration-200 ${role === 'viewer' ? 'border-gold text-gold bg-amber-500/10' : 'border-white/10 text-white/40 bg-white/5 hover:border-amber-500/50 hover:text-white/80 hover:bg-amber-500/10'}`}
                onClick={() => { setRole('viewer'); setUsername(''); setPassword(''); }}
              >
                👁 Viewer
              </div>
            </div>
          </div>
          
          <div className="mb-[1.1rem]">
            <label className="block text-[0.68rem] font-[700] uppercase tracking-[0.1em] text-white/40 mb-[0.45rem]">Username</label>
            <input 
              className="w-full p-[0.8rem_1.1rem] bg-white/5 border-[1.5px] border-white/10 rounded-[10px] text-white font-lato text-[0.95rem] outline-none transition-all duration-200 focus:border-gold focus:bg-amber-500/10 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] placeholder-white/20" 
              type="text" 
              placeholder="Enter username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          
          <div className="mb-[1.1rem]">
            <label className="block text-[0.68rem] font-[700] uppercase tracking-[0.1em] text-white/40 mb-[0.45rem]">Password</label>
            <input 
              className="w-full p-[0.8rem_1.1rem] bg-white/5 border-[1.5px] border-white/10 rounded-[10px] text-white font-lato text-[0.95rem] outline-none transition-all duration-200 focus:border-gold focus:bg-amber-500/10 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.15)] placeholder-white/20" 
              type="password" 
              placeholder="Enter password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          
          <button 
            className="w-full p-[0.9rem] bg-gradient-to-br from-amber-500 to-amber-400 text-[#0a0e1a] border-none rounded-[10px] font-syne text-[1rem] font-[800] cursor-pointer transition-all duration-200 mt-[0.3rem] tracking-wide shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:-translate-y-[2px] hover:shadow-[0_8px_32px_rgba(245,158,11,0.5)] active:translate-y-0"
            onClick={handleLogin}
          >
            Sign In →
          </button>
          
          {error && (
            <div className="mt-[0.75rem] p-[0.65rem_0.9rem] bg-red-600/15 border border-red-600/30 rounded-[8px] text-red-300 text-[0.8rem] text-center">
              ⚠ Invalid username or password
            </div>
          )}

          <div className="flex items-center gap-[0.45rem] mt-[1.2rem] p-[0.55rem_0.8rem] rounded-[8px] text-[0.72rem] font-[600] bg-white/5 border border-white/5 text-white/35">
            <div className={`w-[6px] h-[6px] rounded-full shrink-0 transition-colors duration-300 ${syncStatus !== 'error' ? 'bg-amber-400 animate-blink' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'}`} />
            <span>{syncStatus !== 'error' ? 'Connecting to cloud…' : 'Cloud connected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
