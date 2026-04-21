import { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import * as XLSX from 'xlsx';

const PG = 12;

export default function SheetTable({ data, curY, curM, searchQ, setSearchQ, onUpload }) {
  const { currentUser, updateDb, toast } = useAppContext();
  const canEdit = currentUser.role === 'admin';
  
  const [sCol, setSCol] = useState(-1);
  const [sAsc, setSAsc] = useState(true);
  const [pg, setPg] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRowData, setNewRowData] = useState([]);
  
  let shHdr = data.headers || [];
  let shRows = data.rows || [];

  // Derived indices
  const fareIdx = shHdr.findIndex(h => /fare/i.test(h));
  const expIdx = shHdr.findIndex(h => /expense/i.test(h));
  const plIdx = shHdr.findIndex(h => /profit|loss|p.*l/i.test(h));

  const getFilt = () => {
    let r = [...shRows];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      r = r.filter(row => row.some(c => String(c).toLowerCase().includes(q)));
    }
    if (sCol >= 0) {
      r.sort((a, b) => {
        let av = a[sCol] || '', bv = b[sCol] || '';
        const na = parseFloat(av), nb = parseFloat(bv);
        if (!isNaN(na) && !isNaN(nb)) { av = na; bv = nb; }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
        return sAsc ? (av > bv ? 1 : av < bv ? -1 : 0) : (av < bv ? 1 : av > bv ? -1 : 0);
      });
    }
    return r;
  };

  const filtRows = getFilt();
  const start = (pg - 1) * PG;
  const pRows = filtRows.slice(start, start + PG);
  const tot = filtRows.length;
  const pages = Math.ceil(tot / PG);

  const handleSort = (c) => {
    if (c === undefined) { setSCol(0); setSAsc(true); }
    else if (sCol === c) setSAsc(!sAsc);
    else { setSCol(c); setSAsc(true); }
    setPg(1);
  };

  const expXLSX = () => {
    const ws = XLSX.utils.aoa_to_sheet([shHdr, ...shRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `Data_${curM}_${curY}.xlsx`);
  };

  const expCSV = () => {
    const ws = XLSX.utils.aoa_to_sheet([shHdr, ...shRows]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Data_${curM}_${curY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCellChange = (absI, ci, val) => {
    if (!canEdit) return;
    const newRows = shRows.map((r, i) => i === absI ? [...r] : r);
    newRows[absI][ci] = val;

    if (plIdx >= 0 && (ci === fareIdx || ci === expIdx)) {
      const f = parseFloat(newRows[absI][fareIdx] || 0) || 0;
      const e = parseFloat(newRows[absI][expIdx] || 0) || 0;
      newRows[absI][plIdx] = (f - e).toFixed(2);
    }
    updateDb(curY, curM, { headers: shHdr, rows: newRows });
  };

  const handleDel = () => {
    if (!canEdit || !selectedRows.size) return;
    const newRows = shRows.filter((_, i) => !selectedRows.has(i));
    updateDb(curY, curM, { headers: shHdr, rows: newRows });
    setSelectedRows(new Set());
    toast(`${selectedRows.size} row(s) deleted`);
  };

  const toggleAll = (e) => {
    if (e.target.checked) setSelectedRows(new Set(pRows.map(r => shRows.findIndex(orig => orig === r))));
    else setSelectedRows(new Set());
  };

  const toggleRow = (absI) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(absI)) newSet.delete(absI);
    else newSet.add(absI);
    setSelectedRows(newSet);
  };

  const handleAddRow = () => {
    if (!canEdit) return;
    const finalRow = [...newRowData];
    // Fill empty cells
    while (finalRow.length < shHdr.length) finalRow.push('');
    
    // Auto calc pl
    if (fareIdx >= 0 && expIdx >= 0 && plIdx >= 0) {
      const f = parseFloat(finalRow[fareIdx]) || 0;
      const e = parseFloat(finalRow[expIdx]) || 0;
      finalRow[plIdx] = (f - e).toFixed(2);
    }
    
    const newRows = [...shRows, finalRow];
    updateDb(curY, curM, { headers: shHdr, rows: newRows });
    setIsModalOpen(false);
    setNewRowData([]);
    toast('Row added');
    setPg(Math.ceil(newRows.length / PG));
  };

  // Top total stats
  let infoHtml = `Showing <strong>${Math.min(start + 1, tot)}–${Math.min(start + PG, tot)}</strong> of <strong>${tot}</strong> rows`;
  let statsExtra = null;
  if (fareIdx >= 0 && expIdx >= 0) {
    const totalFare = shRows.reduce((s, r) => s + (parseFloat(r[fareIdx]) || 0), 0);
    const totalExp = shRows.reduce((s, r) => s + (parseFloat(r[expIdx]) || 0), 0);
    const totalPL = totalFare - totalExp;
    const fmt = n => '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    statsExtra = (
      <>
        <span className="text-green font-[700] ml-3">Fare: {fmt(totalFare)}</span>
        <span className="mx-[0.5rem] text-ink3">|</span>
        <span className="text-red font-[700]">Exp: {fmt(totalExp)}</span>
        <span className="mx-[0.5rem] text-ink3">|</span>
        <span className={`font-[700] ${totalPL >= 0 ? 'text-blue' : 'text-amber'}`}>{totalPL >= 0 ? 'Profit' : 'Loss'}: {fmt(totalPL)}</span>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-[0.65rem] flex-wrap bg-surface border border-border rounded-r2 p-[0.65rem_0.9rem] shadow-sh">
        <div className="flex items-center gap-[0.5rem] flex-wrap">
          <div className="flex items-center gap-[0.35rem] bg-surface2 border border-border rounded-[8px] p-[0.36rem_0.65rem] transition-colors focus-within:border-gold">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              placeholder="Search…" 
              className="bg-transparent border-none outline-none font-lato text-[0.82rem] text-ink w-[130px] placeholder-ink3 max-md:w-[90px]"
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); setPg(1); }}
            />
          </div>
          {canEdit && <button className="inline-flex items-center gap-[0.35rem] p-[0.38rem_0.8rem] rounded-[7px] font-lato text-[0.78rem] font-[700] cursor-pointer transition-all duration-150 whitespace-nowrap bg-green-soft text-green border border-green/15 hover:bg-[#d1fae5]" onClick={() => { setNewRowData(new Array(shHdr.length).fill('')); setIsModalOpen(true); }}>＋ Add Row</button>}
          <button className="inline-flex items-center gap-[0.35rem] p-[0.38rem_0.8rem] rounded-[7px] font-lato text-[0.78rem] font-[700] cursor-pointer transition-all duration-150 whitespace-nowrap bg-surface2 text-ink2 border border-border hover:bg-surface3" onClick={() => handleSort()}>⇅ Sort</button>
          
          <label className="inline-flex items-center gap-[0.35rem] p-[0.38rem_0.8rem] rounded-[7px] font-lato text-[0.78rem] font-[700] cursor-pointer transition-all duration-150 whitespace-nowrap bg-amber-soft text-amber border border-amber/15 hover:bg-[#fef3c7]">
            ↑ Replace File
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { if(e.target.files[0]) onUpload(e.target.files[0]); e.target.value=''; }} />
          </label>
        </div>
        
        <div className="flex items-center gap-[0.5rem] flex-wrap">
          <button className="inline-flex items-center gap-[0.35rem] p-[0.38rem_0.8rem] rounded-[7px] font-lato text-[0.78rem] font-[700] cursor-pointer transition-all duration-150 whitespace-nowrap bg-surface2 text-ink2 border border-border hover:bg-surface3" onClick={expXLSX}>⬇ Excel</button>
          <button className="inline-flex items-center gap-[0.35rem] p-[0.38rem_0.8rem] rounded-[7px] font-lato text-[0.78rem] font-[700] cursor-pointer transition-all duration-150 whitespace-nowrap bg-surface2 text-ink2 border border-border hover:bg-surface3" onClick={expCSV}>⬇ CSV</button>
          {canEdit && selectedRows.size > 0 && (
            <button className="inline-flex items-center gap-[0.35rem] p-[0.38rem_0.8rem] rounded-[7px] font-lato text-[0.78rem] font-[700] cursor-pointer transition-all duration-150 whitespace-nowrap bg-red-soft text-red border border-red/15 hover:bg-[#fee2e2]" onClick={handleDel}>✕ Delete</button>
          )}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-r2 overflow-hidden shadow-sh">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto w-full block">
          <table className="w-full border-collapse min-w-[500px] text-[0.83rem]">
            <thead>
              <tr>
                <th className="bg-surface2 p-[0.6rem_0.85rem] text-left text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border whitespace-nowrap sticky top-0 z-[5] w-[34px] text-center"><input type="checkbox" className="accent-gold w-[12px] h-[12px] cursor-pointer" onChange={toggleAll} /></th>
                <th className="bg-surface2 p-[0.6rem_0.85rem] text-left text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border whitespace-nowrap sticky top-0 z-[5] w-[38px] text-center">#</th>
                {shHdr.map((h, i) => (
                  <th key={i} className={`bg-surface2 p-[0.6rem_0.85rem] text-left text-[0.66rem] font-[700] uppercase tracking-[0.07em] text-ink3 border-b border-border whitespace-nowrap sticky top-0 z-[5] cursor-pointer select-none transition-colors hover:text-gold2 ${sCol === i ? 'text-gold2' : ''}`} onClick={() => handleSort(i)}>
                    <div className="flex items-center gap-[0.28rem]">{h}{sCol === i ? (sAsc ? ' ↑' : ' ↓') : ''}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!pRows.length ? (
                <tr><td colSpan={shHdr.length + 2} className="text-center p-[2.5rem] text-ink3">No records found</td></tr>
              ) : (
                pRows.map((row, ri) => {
                  const absI = shRows.findIndex(r => r === row);
                  let dispRow = [...row];
                  if (fareIdx >= 0 && expIdx >= 0 && plIdx >= 0) {
                    const f = parseFloat(dispRow[fareIdx]) || 0;
                    const e = parseFloat(dispRow[expIdx]) || 0;
                    dispRow[plIdx] = (f - e).toFixed(2);
                  }
                  
                  return (
                    <tr key={absI} className="border-b border-border transition-colors hover:bg-surface2 last:border-b-0">
                      <td className="p-[0.5rem_0.85rem] text-ink align-middle w-[34px] text-center">
                        <input type="checkbox" className="accent-gold w-[12px] h-[12px] cursor-pointer" checked={selectedRows.has(absI)} onChange={() => toggleRow(absI)} />
                      </td>
                      <td className="p-[0.5rem_0.85rem] align-middle text-center text-ink3 font-mono text-[0.7rem] w-[38px]">{start + ri + 1}</td>
                      {dispRow.map((c, ci) => {
                        const h = shHdr[ci]?.toLowerCase() || '';
                        const isFare = ci === fareIdx;
                        const isExp = ci === expIdx;
                        const isPL = ci === plIdx;
                        const isVeh = h.includes('vehicle');
                        const num = parseFloat(c) || 0;

                        if (isPL) {
                          const neg = num < 0;
                          return (
                            <td key={ci} className="p-[0.5rem_0.85rem] text-ink align-middle">
                              <span className={`inline-flex items-center gap-[0.28rem] p-[0.18rem_0.6rem] rounded-full font-mono text-[0.78rem] font-[700] ${neg ? 'bg-red-soft text-red border border-red/15' : 'bg-green-soft text-green border border-green/18'}`}>
                                {neg ? '▼' : '▲'} ₹{Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                          );
                        }

                        if (!canEdit) {
                          if (isFare || isExp) return <td key={ci} className="p-[0.5rem_0.85rem] align-middle"><span className={`font-mono text-[0.8rem] font-[500] ${parseFloat(c) < 0 ? 'text-red' : 'text-green'}`}>₹{parseFloat(c) >= 0 ? '' : '-'}{Math.abs(parseFloat(c) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></td>;
                          if (isVeh) return <td key={ci} className="p-[0.5rem_0.85rem] align-middle"><span className="inline-block p-[0.12rem_0.45rem] bg-blue-soft text-blue rounded-[6px] font-mono text-[0.78rem] font-[700] border border-blue/15">{c}</span></td>;
                          return <td key={ci} className="p-[0.5rem_0.85rem] align-middle"><span className="text-ink2">{c}</span></td>;
                        }

                        if (isFare || isExp) return (
                          <td key={ci} className="p-[0.5rem_0.85rem] align-middle">
                            <input className={`bg-transparent outline-none w-full p-[0.18rem_0.28rem] rounded-[4px] min-w-[65px] transition-all focus:bg-amber-soft focus:shadow-[0_0_0_2px_#f59e0b] font-mono text-[0.8rem] font-[500] ${parseFloat(c) < 0 ? 'text-red' : 'text-green'}`} value={c} onChange={e => handleCellChange(absI, ci, e.target.value)} />
                          </td>
                        );

                        if (isPL) return (
                          <td key={ci} className="p-[0.5rem_0.85rem] align-middle">
                            <input className="bg-transparent border-none outline-none w-full p-[0.18rem_0.28rem] rounded-[4px] min-w-[65px] font-lato text-[0.83rem]" style={{ color: num < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }} value={c} readOnly />
                          </td>
                        );

                        return (
                          <td key={ci} className="p-[0.5rem_0.85rem] align-middle">
                            <input className={`bg-transparent outline-none w-full font-lato text-[0.83rem] text-ink p-[0.18rem_0.28rem] rounded-[4px] min-w-[65px] transition-all focus:bg-amber-soft focus:shadow-[0_0_0_2px_#f59e0b] ${isVeh ? 'font-mono font-[700]' : ''}`} value={c} onChange={e => handleCellChange(absI, ci, e.target.value)} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-[0.6rem_0.9rem] bg-surface2 border-t border-border flex-wrap gap-[0.45rem]">
          <div className="text-[0.72rem] text-ink3 font-mono flex items-center gap-[0.3rem] flex-wrap">
            <span dangerouslySetInnerHTML={{ __html: infoHtml }} />
            {statsExtra}
          </div>
          
          <div className="flex items-center gap-[0.28rem]">
            {pages > 1 && Array.from({ length: Math.min(pages, 9) }).map((_, i) => {
              const p = i + 1;
              return (
                <div 
                  key={p} 
                  className={`w-[26px] h-[26px] flex items-center justify-center rounded-[6px] text-[0.72rem] font-mono cursor-pointer border transition-all duration-150 ${p === pg ? 'bg-gold text-white border-gold' : 'bg-surface text-ink2 border-border hover:bg-surface3'}`}
                  onClick={() => setPg(p)}
                >
                  {p}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-[1rem] animate-vIn" onClick={() => setIsModalOpen(false)}>
          <div className="bg-surface rounded-r2 w-full max-w-[500px] shadow-sh3 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-[1.4rem_1.6rem] border-b border-border font-syne text-[1.1rem] font-[700] text-ink">Add New Row</div>
            <div className="p-[1.6rem] max-h-[60vh] overflow-y-auto grid grid-cols-2 gap-[1rem] max-sm:grid-cols-1">
              {shHdr.map((h, i) => (
                <div key={i} className="flex flex-col gap-[0.35rem]">
                  <label className="text-[0.68rem] font-[700] uppercase tracking-[0.05em] text-ink3">{h}</label>
                  <input 
                    className="w-full p-[0.55rem_0.75rem] border-[1.5px] border-border rounded-[8px] bg-surface2 text-ink text-[0.88rem] outline-none transition-colors focus:border-gold focus:bg-amber-soft"
                    placeholder={h}
                    value={newRowData[i] || ''}
                    onChange={e => {
                      const nr = [...newRowData];
                      nr[i] = e.target.value;
                      setNewRowData(nr);
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="p-[1rem_1.6rem] border-t border-border flex justify-end gap-[0.6rem] bg-surface2">
              <button className="p-[0.5rem_1rem] bg-surface text-ink2 border border-border rounded-[8px] text-[0.85rem] font-[600] cursor-pointer hover:bg-surface3 transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="p-[0.5rem_1.1rem] bg-gold text-[#0a0e1a] border-none rounded-[8px] text-[0.85rem] font-[700] cursor-pointer hover:bg-gold2 hover:shadow-[0_4px_12px_rgba(245,158,11,0.4)] transition-all" onClick={handleAddRow}>Save Row</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
