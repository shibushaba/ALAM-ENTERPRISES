import { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import * as XLSX from 'xlsx';
import SheetTable from './SheetTable';
import SheetCharts from './SheetCharts';
import SheetPdf from './SheetPdf';
import UploadArea from './UploadArea';

// Helper to make sample data
const makeSample = (year, month) => {
  let s = year * 100 + (month.charCodeAt(0)); // simple seed
  const r = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  
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
    
    return [
      'TRP-' + String(1000 + i + 1),
      veh, route, fare.toFixed(2), exp.toFixed(2), profit.toFixed(2),
      `${year}-01-01`, profit < 0 ? 'Loss' : 'Profit'
    ];
  });
  return { headers, rows };
};

export default function SheetView() {
  const { curY, curM, db, updateDb, toast, currentUser } = useAppContext();
  
  const [searchQ, setSearchQ] = useState('');
  
  const data = db[curY]?.[curM];
  const hasData = !!data;
  const canEdit = currentUser.role === 'admin';

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!canEdit) { toast('No edit permission'); return; }
    
    const ext = file.name.split('.').pop().toLowerCase();
    const rd = new FileReader();
    
    rd.onload = e => {
      let headers = [], rows = [];
      try {
        if (ext === 'csv') {
          const txt = e.target.result;
          const lines = txt.split('\n').filter(l => l.trim());
          headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
          rows = lines.slice(1).map(l => l.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
        } else {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const jsData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (!jsData.length) { toast('Empty file'); return; }
          headers = jsData[0].map(String);
          rows = jsData.slice(1).map(r => r.map(c => String(c || '')));
        }
      } catch (err) {
        toast('Error reading file');
        return;
      }
      
      const cleanRows = rows.map(r => { 
        while (r.length < headers.length) r.push(''); 
        return r.slice(0, headers.length); 
      });
      
      updateDb(curY, curM, { headers, rows: cleanRows });
      toast(`Loaded ${cleanRows.length} rows · ${file.name}`);
    };
    
    ext === 'csv' ? rd.readAsText(file) : rd.readAsArrayBuffer(file);
  };

  const handleLoadSample = () => {
    const sample = makeSample(curY, curM);
    updateDb(curY, curM, sample);
    toast('Sample data loaded');
  };

  return (
    <div className="animate-vIn">
      <div className="mb-[1.4rem]">
        <h1 className="font-syne text-[1.55rem] font-[700] text-ink tracking-tight">
          {curM} <span className="text-gold">{curY}</span>
        </h1>
        <p className="text-ink3 text-[0.85rem] mt-[0.22rem]">
          {canEdit ? 'Click any cell to edit data instantly' : 'Viewer access is read-only'}
        </p>
      </div>

      {!canEdit && (
        <div className="bg-amber-soft border border-amber/20 rounded-r p-[0.55rem_0.85rem] text-[0.78rem] text-amber font-[600] flex items-center gap-[0.45rem] mb-[0.25rem]">
          ⚠ You have <strong className="mx-[0.2rem]">Viewer</strong> access — editing is disabled.
        </div>
      )}

      {!hasData ? (
        <UploadArea onUpload={handleFileUpload} onLoadSample={handleLoadSample} />
      ) : (
        <div className="flex flex-col gap-[1.1rem]">
          <SheetTable data={data} curY={curY} curM={curM} searchQ={searchQ} setSearchQ={setSearchQ} onUpload={handleFileUpload} />
          <SheetPdf data={data} curY={curY} curM={curM} />
          <SheetCharts data={data} />
        </div>
      )}
    </div>
  );
}
