import { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { supabase } from '../../../utils/supabaseClient';

export default function SheetPdf({ data, curY, curM }) {
  const { currentUser, toast, pdfStore, setPdfStore } = useAppContext();
  const canEdit = currentUser.role === 'admin';
  
  const [curVeh, setCurVeh] = useState(null);
  const [showUrl, setShowUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isRender, setIsRender] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(1.2);
  const [pdfPage, setPdfPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);

  const vehs = useMemo(() => {
    if (!data?.headers || !data?.rows) return [];
    const vi = data.headers.findIndex(h => /vehicle/i.test(h));
    if (vi < 0) return [];
    const set = new Set();
    data.rows.forEach(r => { const v = String(r[vi] || '').trim(); if (v) set.add(v); });
    return Array.from(set).sort();
  }, [data]);

  const pdfKey = curVeh ? `veh_${curY}_${curM}_${curVeh}` : null;
  const p = pdfKey ? pdfStore[pdfKey] : null;

  useEffect(() => {
    if (p && curVeh) {
      if (p.dataUrl || p.url) {
        loadPdf(p.dataUrl || p.url);
      }
    } else {
      pdfDocRef.current = null;
    }
  }, [p, curVeh]);

  const loadPdf = async (src) => {
    if (!window.pdfjsLib) return;
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    try {
      setIsRender(true);
      const doc = await window.pdfjsLib.getDocument(src).promise;
      pdfDocRef.current = doc;
      setTotalPages(doc.numPages);
      setPdfPage(1);
      renderPage(1, doc, 1.2);
    } catch (e) {
      console.warn('PDF load err:', e);
      pdfDocRef.current = null;
    } finally {
      setIsRender(false);
    }
  };

  const renderPage = async (num, doc = pdfDocRef.current, zoom = pdfZoom) => {
    if (!doc || !canvasRef.current) return;
    try {
      const page = await doc.getPage(num);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: zoom * dpr });
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = (viewport.width / dpr) + 'px';
      canvas.style.height = (viewport.height / dpr) + 'px';
      
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (e) {
      console.error(e);
    }
  };

  const handleZoom = (d) => {
    const z = Math.max(0.5, Math.min(4, pdfZoom + d));
    setPdfZoom(z);
    renderPage(pdfPage, pdfDocRef.current, z);
  };

  const handlePg = (d) => {
    const np = pdfPage + d;
    if (np >= 1 && np <= totalPages) {
      setPdfPage(np);
      renderPage(np);
    }
  };

  const handleUpload = async (file) => {
    if (!file || !curVeh || !canEdit) return;
    const rd = new FileReader();
    rd.onload = async (e) => {
      const dataUrl = e.target.result;
      const name = file.name;
      const key = pdfKey;
      
      // Update local optimistically
      const newPdf = { name, vehicle: curVeh, dataUrl };
      setPdfStore(prev => ({ ...prev, [key]: newPdf }));
      toast('Uploading PDF...');

      try {
        const b64 = dataUrl.split(',')[1];
        const bin = atob(b64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

        const fileName = `alam_enterprises/pdfs/${key}.pdf`;
        const { error } = await supabase.storage.from('pdfs').upload(fileName, buf, { contentType: 'application/pdf', upsert: true });
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(fileName);
        
        const finalPdf = { ...newPdf, url: publicUrl };
        setPdfStore(prev => {
          const next = { ...prev, [key]: finalPdf };
          // Save meta
          const metaOnly = {};
          Object.keys(next).forEach(k => metaOnly[k] = { name: next[k].name, vehicle: next[k].vehicle, url: next[k].url });
          supabase.from('app_data').upsert({ id: 'pdf_meta', data: metaOnly }).catch(console.error);
          return next;
        });
        toast('PDF Synced ✓');
      } catch (err) {
        toast('PDF sync failed (saved local)');
      }
    };
    rd.readAsDataURL(file);
  };

  const handleUrlSet = () => {
    if (!urlInput.trim() || !curVeh) return;
    const url = urlInput.trim();
    const key = pdfKey;
    let name = url.split('/').pop().split('?')[0] || 'document.pdf';
    if (!name.endsWith('.pdf')) name += '.pdf';

    const finalPdf = { name, vehicle: curVeh, url };
    setPdfStore(prev => {
      const next = { ...prev, [key]: finalPdf };
      const metaOnly = {};
      Object.keys(next).forEach(k => metaOnly[k] = { name: next[k].name, vehicle: next[k].vehicle, url: next[k].url });
      supabase.from('app_data').upsert({ id: 'pdf_meta', data: metaOnly }).catch(console.error);
      return next;
    });
    
    setShowUrl(false);
    setUrlInput('');
    toast('PDF URL set');
  };

  const dlPdf = () => {
    if (!p) return;
    if (p.dataUrl) {
      const a = document.createElement('a'); a.href = p.dataUrl; a.download = p.name; a.click();
    } else if (p.url) {
      const a = document.createElement('a'); a.href = p.url; a.download = p.name; a.target = '_blank'; a.click();
    }
  };

  const rmPdf = () => {
    if (!p || !canEdit) return;
    const key = pdfKey;
    setPdfStore(prev => {
      const next = { ...prev };
      delete next[key];
      const metaOnly = {};
      Object.keys(next).forEach(k => metaOnly[k] = { name: next[k].name, vehicle: next[k].vehicle, url: next[k].url });
      supabase.from('app_data').upsert({ id: 'pdf_meta', data: metaOnly }).catch(console.error);
      return next;
    });
    supabase.storage.from('pdfs').remove([`alam_enterprises/pdfs/${key}.pdf`]).catch(console.error);
    toast('PDF Removed');
  };

  return (
    <div className="bg-surface border border-border rounded-r2 overflow-hidden shadow-sh">
      <div className="flex items-center justify-between p-[0.9rem_1.1rem] bg-surface2 border-b border-border flex-wrap gap-[0.5rem]">
        <div>
          <div className="font-syne text-[1.05rem] font-[700] text-ink">🚛 Vehicle Documents</div>
          <div className="text-[0.76rem] text-ink3 mt-[0.1rem]">Click a vehicle to view its PDF</div>
        </div>
      </div>
      
      <div className="p-[0.6rem] flex flex-wrap gap-[0.35rem] bg-surface border-b border-border border-dashed">
        {!vehs.length && <span className="text-ink3 text-[0.8rem] p-2">No vehicle numbers found in data.</span>}
        {vehs.map(v => {
          const has = !!pdfStore[`veh_${curY}_${curM}_${v}`];
          return (
            <button 
              key={v}
              className={`inline-flex items-center gap-[0.3rem] p-[0.35rem_0.8rem] rounded-[6px] font-mono text-[0.78rem] font-[700] transition-all duration-150 ${curVeh === v ? 'bg-gold text-white border-gold shadow-[0_2px_8px_rgba(245,158,11,0.3)]' : has ? 'bg-blue-soft text-blue border border-blue/20 hover:bg-[#dbeafe]' : 'bg-surface2 text-ink2 border border-border hover:bg-surface3'}`}
              onClick={() => { setCurVeh(v); setShowUrl(false); }}
            >
              <div className={`w-[6px] h-[6px] rounded-full ${has ? 'bg-current' : 'bg-transparent'}`} /> 🚛 {v} {has ? '📄' : ''}
            </button>
          );
        })}
      </div>

      {curVeh && (
        <div className="bg-[#f0f2f7] animate-vIn border-t border-border mt-[-1px]">
          <div className="flex items-center justify-between p-[0.65rem_1rem] bg-surface border-b border-border flex-wrap gap-[0.5rem]">
            <div className="flex items-center gap-[0.5rem] font-mono text-[0.82rem] font-[700] text-ink">
              <span className="bg-purple text-white p-[0.1rem_0.4rem] rounded text-[0.65rem]">PDF</span>
              <span>🚛 {curVeh}</span>
              <span className="font-lato font-normal text-ink3 truncate max-w-[200px]">{p ? p.name : 'No PDF'}</span>
            </div>
            
            <div className="flex items-center gap-[0.35rem]">
              {canEdit && (
                <label className="inline-flex items-center justify-center p-[0.35rem_0.75rem] bg-surface2 border border-border rounded-[6px] text-ink2 cursor-pointer font-lato text-[0.78rem] font-[700] hover:bg-surface3">
                  📤 Upload <input type="file" className="hidden" accept=".pdf" onChange={e => handleUpload(e.target.files[0])} />
                </label>
              )}
              {canEdit && <button className="p-[0.35rem_0.75rem] bg-surface2 border border-border rounded-[6px] text-ink2 font-lato text-[0.78rem] font-[700] hover:bg-surface3" onClick={() => setShowUrl(true)}>🔗 Set URL</button>}
              {canEdit && p && <button className="p-[0.35rem_0.75rem] bg-red-soft border border-red/20 text-red rounded-[6px] font-lato text-[0.78rem] font-[700] hover:bg-[#fee2e2]" onClick={rmPdf}>✕ Remove</button>}
              <button className="p-[0.35rem_0.75rem] bg-surface2 border border-border rounded-[6px] text-ink2 font-lato text-[0.78rem] font-[700] hover:bg-surface3" onClick={() => setCurVeh(null)}>✕ Close</button>
            </div>
          </div>

          {showUrl && (
            <div className="p-[0.85rem_1rem] bg-surface flex items-center gap-[0.5rem] border-b border-border">
              <span className="text-[0.75rem] font-[700] uppercase text-ink3">PDF URL</span>
              <input type="url" className="flex-1 p-[0.35rem_0.6rem] border border-border rounded-[4px] outline-none text-[0.8rem]" placeholder="Paste link..." value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUrlSet()} />
              <button className="p-[0.35rem_0.8rem] bg-blue text-white rounded-[4px] font-[700] text-[0.8rem]" onClick={handleUrlSet}>Set URL</button>
              <button className="p-[0.35rem_0.8rem] bg-surface2 text-ink2 border border-border rounded-[4px] font-[700] text-[0.8rem]" onClick={() => setShowUrl(false)}>Cancel</button>
            </div>
          )}

          <div className="min-h-[200px] flex flex-col relative bg-[#525659]">
            {!p ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-[2rem] text-white/50 z-10">
                <div className="text-[2.5rem] mb-[0.6rem]">📄</div>
                <div className="font-syne text-[1rem] font-[700] text-white mb-[0.3rem]">No PDF for this vehicle</div>
                {canEdit && <div className="text-[0.8rem]">Click Upload or Set URL to attach a PDF</div>}
              </div>
            ) : isRender ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 z-10">
                <div className="text-[1.8rem] mb-[0.5rem] animate-spin">⏳</div>
                <div className="text-[0.85rem] font-[600]">Loading PDF…</div>
              </div>
            ) : pdfDocRef.current ? (
              <div className="flex flex-col h-full z-20">
                <div className="flex items-center justify-between p-[0.5rem_1rem] bg-surface border-b border-border shadow-sh">
                  <div className="flex items-center gap-[0.4rem]">
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3" onClick={() => handlePg(-1)}>◀ Prev</button>
                    <span className="font-mono text-[0.8rem] w-[50px] text-center">{pdfPage} / {totalPages}</span>
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3" onClick={() => handlePg(1)}>Next ▶</button>
                  </div>
                  <div className="flex items-center gap-[0.4rem]">
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3" onClick={() => handleZoom(-0.3)}>− Zoom</button>
                    <span className="font-mono text-[0.8rem] w-[50px] text-center">{Math.round(pdfZoom * 100)}%</span>
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3" onClick={() => handleZoom(0.3)}>+ Zoom</button>
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3 ml-2" onClick={dlPdf}>⬇ DL</button>
                  </div>
                </div>
                <div className="overflow-auto bg-[#525659] p-4 flex justify-center max-h-[500px]">
                  <canvas ref={canvasRef} className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.4)]" />
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-[2rem] text-white/50 z-10">
                <div className="text-[2rem] mb-[0.5rem]">📄</div>
                <div className="text-[0.85rem] mb-[1rem]">PDF loaded — tap to view or download</div>
                <div className="flex gap-[0.5rem]">
                  <button className="p-[0.45rem_1rem] bg-blue text-white rounded-[6px] font-[700] text-[0.85rem]" onClick={() => window.open(p.url || p.dataUrl, '_blank')}>🔗 Open</button>
                  <button className="p-[0.45rem_1rem] bg-white/10 text-white rounded-[6px] font-[700] text-[0.85rem]" onClick={dlPdf}>⬇ Download</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
