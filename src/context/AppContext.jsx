import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const USERS = [
  { username: 'RKR', pass: 'RKR159', name: 'RKR Admin', role: 'admin', ini: 'RK' },
  { username: 'ALAM', pass: 'ALAM786', name: 'Alam Viewer', role: 'viewer', ini: 'AL' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CY = new Date().getFullYear();

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('years'); // 'years', 'months', 'sheet', 'vehicle'
  const [curY, setCurY] = useState(null);
  const [curM, setCurM] = useState(null);
  const [curVeh, setCurVeh] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Data state
  const [db, setDb] = useState({});
  const [syncStatus, setSyncStatus] = useState('syncing'); // syncing, synced, error
  const [toastMsg, setToastMsg] = useState(null);
  const [pdfStore, setPdfStore] = useState({});

  useEffect(() => {
    // Initial empty DB setup for previous, current, next year
    const initialDb = {};
    const ensureY = (y) => {
      initialDb[y] = {};
      MONTHS.forEach(m => initialDb[y][m] = null);
    };
    [CY - 1, CY, CY + 1].forEach(ensureY);
    setDb(initialDb);
  }, []);



  // Supabase Sync Logic
  useEffect(() => {
    if (!currentUser) return;
    setSyncStatus('syncing');
    
    // Fetch initial
    const fetchData = async () => {
      const { data, error } = await supabase.from('app_data').select('data').eq('id', 'ledger').maybeSingle();
      if (!error && data) {
        setDb(prev => {
          const next = { ...prev };
          Object.keys(data.data).forEach(y => {
            if (!next[y]) next[y] = {};
            MONTHS.forEach(m => {
              if (data.data[y] && data.data[y][m]) next[y][m] = data.data[y][m];
            });
          });
          return next;
        });
      }
      const { data: pdfData } = await supabase.from('app_data').select('data').eq('id', 'pdf_meta').maybeSingle();
      if (pdfData?.data) {
        setPdfStore(prev => {
          const next = { ...prev };
          Object.keys(pdfData.data).forEach(k => {
            next[k] = { ...pdfData.data[k], dataUrl: next[k]?.dataUrl || null };
          });
          return next;
        });
      }

      setSyncStatus('synced');
    };
    
    fetchData();

    // Subscribe
    const sub = supabase.channel('public:app_data:ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data', filter: 'id=eq.ledger' }, payload => {
        const newData = payload.new.data;
        if (newData) {
          setDb(prev => {
            const next = { ...prev };
            Object.keys(newData).forEach(y => {
              if (!next[y]) next[y] = {};
              MONTHS.forEach(m => {
                if (newData[y] && newData[y][m]) next[y][m] = newData[y][m];
              });
            });
            return next;
          });
          setSyncStatus('synced');
        }
      }).subscribe();

    const pdfSub = supabase.channel('public:app_data:pdf_meta')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data', filter: 'id=eq.pdf_meta' }, payload => {
        const newData = payload.new.data;
        if (newData) {
          setPdfStore(prev => {
            const next = { ...prev };
            // Update known
            Object.keys(newData).forEach(k => {
              next[k] = { ...newData[k], dataUrl: next[k]?.dataUrl || null };
            });
            // Delete removed
            Object.keys(next).forEach(k => {
              if (!newData[k]) delete next[k];
            });
            return next;
          });
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(sub);
      supabase.removeChannel(pdfSub);
    };
  }, [currentUser]);

  // Auth actions
  const login = (username, password) => {
    const un = username.trim().toUpperCase();
    const u = USERS.find(x => x.username === un && x.pass === password);
    if (!u) return false;
    setCurrentUser(u);
    setView('years');
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurY(null);
    setCurM(null);
    setCurVeh(null);
    setView('years');
  };

  // Nav actions
  const goYears = () => { setCurY(null); setCurM(null); setCurVeh(null); setView('years'); };
  const goMonths = (y) => { setCurY(y); setCurM(null); setCurVeh(null); setView('months'); };
  const goSheet = (y, m) => { setCurY(y); setCurM(m); setCurVeh(null); setView('sheet'); };
  const goVehicle = (v) => { setCurVeh(v); setView('vehicle'); };

  const toast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const saveToCloud = async (currentDb) => {
    setSyncStatus('syncing');
    try {
      await supabase.from('app_data').upsert({ id: 'ledger', data: currentDb });
      setSyncStatus('synced');
    } catch (e) {
      setSyncStatus('error');
    }
  };

  const updateDb = (y, m, data) => {
    setDb(prev => {
      const next = { ...prev };
      if (!next[y]) next[y] = {};
      next[y][m] = data;
      saveToCloud(next);
      return next;
    });
  };

  const addYear = (y) => {
    if (!y || db[y]) return;
    setDb(prev => {
      const next = { ...prev };
      next[y] = {};
      MONTHS.forEach(m => next[y][m] = null);
      saveToCloud(next);
      return next;
    });
    toast(`Year ${y} added`);
  };

  const value = {
    currentUser, login, logout,
    users: USERS,
    isMobileOpen, setIsMobileOpen,
    db, updateDb, addYear, monthsList: MONTHS, currentYear: CY,
    view, setView,
    curY, goYears,
    curM, goMonths,
    curVeh, goVehicle,
    goSheet,
    syncStatus,
    toastMsg, toast,
    pdfStore, setPdfStore
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
