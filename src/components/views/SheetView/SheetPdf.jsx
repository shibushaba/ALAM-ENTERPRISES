import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { supabase } from '../../../utils/supabaseClient';

export default function SheetPdf({ data, curY, curM }) {
  const { currentUser, toast, pdfStore, setPdfStore } = useAppContext();
  const canEdit = currentUser.role === 'admin';

  const [curVeh, setCurVeh] = useState(null);
  const [showUrl, setShowUrl] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [pdfStatus, setPdfStatus] = useState('idle'); // idle | loading | rendered | url_only | error
  const [pdfZoom, setPdfZoom] = useState(1.2);
  const [pdfPage, setPdfPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);

  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderingRef = useRef(false);

  // Extract unique vehicles from sheet data
  const vehs = useMemo(() => {
    if (!data?.headers || !data?.rows) return [];
    const vi = data.headers.findIndex(h => /vehicle/i.test(h));
    if (vi < 0) return [];
    const set = new Set();
    data.rows.forEach(r => {
      const v = String(r[vi] || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [data]);

  const pdfKey = curVeh ? `veh_${curY}_${curM}_${curVeh}` : null;
  const p = pdfKey ? pdfStore[pdfKey] : null;

  // Render a specific page onto the canvas
  const renderPage = useCallback(async (num, doc, zoom) => {
    if (!doc || !canvasRef.current || renderingRef.current) return;
    renderingRef.current = true;
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
      setPdfStatus('rendered');
    } catch (e) {
      console.warn('PDF render error:', e);
      setPdfStatus('error');
    } finally {
      renderingRef.current = false;
    }
  }, []);

  // Load PDF from a source (dataUrl or URL)
  const loadPdf = useCallback(async (src) => {
    if (!window.pdfjsLib || !src) {
      setPdfStatus('url_only');
      return;
    }
    setPdfStatus('loading');
    pdfDocRef.current = null;

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      // For cross-origin URLs, use withCredentials:false to avoid CORS blocks
      const loadingTask = typeof src === 'string' && src.startsWith('http')
        ? window.pdfjsLib.getDocument({ url: src, withCredentials: false })
        : window.pdfjsLib.getDocument(src);

      const doc = await loadingTask.promise;
      pdfDocRef.current = doc;
      setTotalPages(doc.numPages);
      setPdfPage(1);
      await renderPage(1, doc, 1.2);
    } catch (e) {
      console.warn('PDF load error:', e);
      // fallback: show open/download buttons instead of canvas
      setPdfStatus('url_only');
    }
  }, [renderPage]);

  // When selected vehicle's PDF changes, reload
  useEffect(() => {
    if (!curVeh) {
      pdfDocRef.current = null;
      setPdfStatus('idle');
      return;
    }
    if (p?.dataUrl || p?.url) {
      loadPdf(p.dataUrl || p.url);
    } else {
      pdfDocRef.current = null;
      setPdfStatus('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, curVeh]);

  const handleZoom = (d) => {
    const z = Math.max(0.5, Math.min(4, pdfZoom + d));
    setPdfZoom(z);
    renderPage(pdfPage, pdfDocRef.current, z);
  };

  const handlePg = (d) => {
    const np = pdfPage + d;
    if (np >= 1 && np <= totalPages) {
      setPdfPage(np);
      renderPage(np, pdfDocRef.current, pdfZoom);
    }
  };

  // --- Persist PDF meta to Supabase safely (outside setState) ---
  const savePdfMeta = useCallback((storeSnapshot) => {
    const metaOnly = {};
    Object.keys(storeSnapshot).forEach(k => {
      if (storeSnapshot[k]) {
        metaOnly[k] = {
          name: storeSnapshot[k].name,
          vehicle: storeSnapshot[k].vehicle,
          url: storeSnapshot[k].url || null,
        };
      }
    });
    supabase.from('app_data')
      .upsert({ id: 'pdf_meta', data: metaOnly })
      .then(({ error }) => { if (error) console.error('pdf_meta save error:', error); });
  }, []);

  // Upload file to Supabase Storage
  const handleUpload = async (file) => {
    if (!file || !curVeh || !canEdit || uploading) return;
    setUploading(true);
    toast('Uploading PDF...');

    try {
      const dataUrl = await new Promise((res, rej) => {
        const rd = new FileReader();
        rd.onload = e => res(e.target.result);
        rd.onerror = rej;
        rd.readAsDataURL(file);
      });

      const key = pdfKey;
      const name = file.name;

      // Optimistic local update with dataUrl so user sees preview immediately
      const optimisticPdf = { name, vehicle: curVeh, dataUrl };
      setPdfStore(prev => ({ ...prev, [key]: optimisticPdf }));

      // Upload to Supabase Storage
      const b64 = dataUrl.split(',')[1];
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

      const fileName = `alam_enterprises/pdfs/${key}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, buf, { contentType: 'application/pdf', upsert: true });

      if (uploadError) {
        console.warn('Supabase storage upload failed:', uploadError.message);
        // Save with dataUrl only (local-only, no public URL)
        setPdfStore(prev => {
          const next = { ...prev, [key]: optimisticPdf };
          savePdfMeta(next);
          return next;
        });
        toast('Saved locally (storage upload failed)');
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(fileName);
      const finalPdf = { name, vehicle: curVeh, url: publicUrl, dataUrl };

      setPdfStore(prev => {
        const next = { ...prev, [key]: finalPdf };
        savePdfMeta(next);
        return next;
      });
      toast('PDF Synced ✓');
    } catch (err) {
      console.error('Upload error:', err);
      toast('Upload error — check console');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSet = () => {
    const url = urlInput.trim();
    if (!url || !curVeh) return;
    const key = pdfKey;
    let name = url.split('/').pop().split('?')[0] || 'document.pdf';
    if (!name.endsWith('.pdf')) name += '.pdf';

    const finalPdf = { name, vehicle: curVeh, url };
    setPdfStore(prev => {
      const next = { ...prev, [key]: finalPdf };
      savePdfMeta(next);
      return next;
    });
    setShowUrl(false);
    setUrlInput('');
    toast('PDF URL saved ✓');
  };

  const dlPdf = () => {
    if (!p) return;
    const a = document.createElement('a');
    a.href = p.dataUrl || p.url;
    a.download = p.name || 'document.pdf';
    if (!p.dataUrl) a.target = '_blank';
    a.click();
  };

  const rmPdf = () => {
    if (!p || !canEdit) return;
    const key = pdfKey;
    pdfDocRef.current = null;
    setPdfStatus('idle');
    setCurVeh(null);
    setPdfStore(prev => {
      const next = { ...prev };
      delete next[key];
      savePdfMeta(next);
      // Also remove from storage (non-blocking)
      supabase.storage.from('pdfs').remove([`alam_enterprises/pdfs/${key}.pdf`])
        .catch(console.warn);
      return next;
    });
    toast('PDF Removed');
  };

  return (
    <div className="bg-surface border border-border rounded-r2 overflow-hidden shadow-sh">
      {/* Header */}
      <div className="flex items-center justify-between p-[0.9rem_1.1rem] bg-surface2 border-b border-border flex-wrap gap-[0.5rem]">
        <div>
          <div className="font-syne text-[1.05rem] font-[700] text-ink">🚛 Vehicle Documents</div>
          <div className="text-[0.76rem] text-ink3 mt-[0.1rem]">Select a vehicle to view or attach its PDF</div>
        </div>
      </div>

      {/* Vehicle Selector */}
      <div className="p-[0.6rem] flex flex-wrap gap-[0.35rem] bg-surface border-b border-border border-dashed">
        {!vehs.length && (
          <span className="text-ink3 text-[0.8rem] p-2">No vehicle numbers found in sheet data.</span>
        )}
        {vehs.map(v => {
          const has = !!pdfStore[`veh_${curY}_${curM}_${v}`];
          return (
            <button
              key={v}
              className={`inline-flex items-center gap-[0.3rem] p-[0.35rem_0.8rem] rounded-[6px] font-mono text-[0.78rem] font-[700] transition-all duration-150 border ${
                curVeh === v
                  ? 'bg-gold text-white border-gold shadow-[0_2px_8px_rgba(245,158,11,0.3)]'
                  : has
                  ? 'bg-blue-soft text-blue border-blue/20 hover:bg-[#dbeafe]'
                  : 'bg-surface2 text-ink2 border-border hover:bg-surface3'
              }`}
              onClick={() => { setCurVeh(v); setShowUrl(false); setUrlInput(''); }}
            >
              <span className={`w-[6px] h-[6px] rounded-full inline-block ${has ? 'bg-current' : 'bg-gray-300'}`} />
              🚛 {v} {has ? '📄' : ''}
            </button>
          );
        })}
      </div>

      {/* PDF Viewer Panel */}
      {curVeh && (
        <div className="bg-[#f0f2f7] animate-vIn border-t border-border mt-[-1px]">

          {/* Toolbar */}
          <div className="flex items-center justify-between p-[0.65rem_1rem] bg-surface border-b border-border flex-wrap gap-[0.5rem]">
            <div className="flex items-center gap-[0.5rem] font-mono text-[0.82rem] font-[700] text-ink">
              <span className="bg-purple text-white p-[0.1rem_0.4rem] rounded text-[0.65rem]">PDF</span>
              <span>🚛 {curVeh}</span>
              <span className="font-lato font-normal text-ink3 truncate max-w-[200px]">{p ? p.name : 'No PDF attached'}</span>
            </div>
            <div className="flex items-center gap-[0.35rem] flex-wrap">
              {canEdit && (
                <label className={`inline-flex items-center justify-center p-[0.35rem_0.75rem] bg-surface2 border border-border rounded-[6px] text-ink2 cursor-pointer font-lato text-[0.78rem] font-[700] hover:bg-surface3 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {uploading ? '⏳ Uploading…' : '📤 Upload'}
                  <input type="file" className="hidden" accept=".pdf" disabled={uploading} onChange={e => handleUpload(e.target.files[0])} />
                </label>
              )}
              {canEdit && (
                <button
                  className="p-[0.35rem_0.75rem] bg-surface2 border border-border rounded-[6px] text-ink2 font-lato text-[0.78rem] font-[700] hover:bg-surface3"
                  onClick={() => { setShowUrl(s => !s); setUrlInput(p?.url || ''); }}
                >
                  🔗 Set URL
                </button>
              )}
              {canEdit && p && (
                <button
                  className="p-[0.35rem_0.75rem] bg-red-soft border border-red/20 text-red rounded-[6px] font-lato text-[0.78rem] font-[700] hover:bg-[#fee2e2]"
                  onClick={rmPdf}
                >
                  ✕ Remove
                </button>
              )}
              <button
                className="p-[0.35rem_0.75rem] bg-surface2 border border-border rounded-[6px] text-ink2 font-lato text-[0.78rem] font-[700] hover:bg-surface3"
                onClick={() => { setCurVeh(null); setPdfStatus('idle'); pdfDocRef.current = null; }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* URL Input Row */}
          {showUrl && (
            <div className="p-[0.85rem_1rem] bg-surface flex items-center gap-[0.5rem] border-b border-border flex-wrap">
              <span className="text-[0.75rem] font-[700] uppercase text-ink3">PDF URL</span>
              <input
                type="url"
                className="flex-1 min-w-[200px] p-[0.35rem_0.6rem] border border-border rounded-[4px] outline-none text-[0.8rem] focus:border-blue"
                placeholder="Paste public PDF link..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlSet()}
                autoFocus
              />
              <button className="p-[0.35rem_0.8rem] bg-blue text-white rounded-[4px] font-[700] text-[0.8rem]" onClick={handleUrlSet}>
                Save URL
              </button>
              <button className="p-[0.35rem_0.8rem] bg-surface2 text-ink2 border border-border rounded-[4px] font-[700] text-[0.8rem]" onClick={() => setShowUrl(false)}>
                Cancel
              </button>
            </div>
          )}

          {/* PDF Display Area */}
          <div className="min-h-[200px] flex flex-col relative bg-[#525659]">

            {/* No PDF */}
            {pdfStatus === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-[2rem] text-white/50 z-10">
                <div className="text-[2.5rem] mb-[0.6rem]">📄</div>
                <div className="font-syne text-[1rem] font-[700] text-white mb-[0.3rem]">No PDF for this vehicle</div>
                {canEdit && <div className="text-[0.8rem]">Click Upload or Set URL to attach a PDF</div>}
              </div>
            )}

            {/* Loading */}
            {pdfStatus === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 z-10">
                <div className="text-[1.8rem] mb-[0.5rem] animate-spin">⏳</div>
                <div className="text-[0.85rem] font-[600]">Loading PDF…</div>
              </div>
            )}

            {/* Canvas render (rendered state) */}
            {(pdfStatus === 'rendered' || pdfStatus === 'loading') && (
              <div className={`flex flex-col z-20 ${pdfStatus === 'loading' ? 'invisible' : ''}`}>
                {/* Page & Zoom Controls */}
                <div className="flex items-center justify-between p-[0.5rem_1rem] bg-surface border-b border-border shadow-sh flex-wrap gap-2">
                  <div className="flex items-center gap-[0.4rem]">
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3 disabled:opacity-40" onClick={() => handlePg(-1)} disabled={pdfPage <= 1}>◀ Prev</button>
                    <span className="font-mono text-[0.8rem] min-w-[60px] text-center">{pdfPage} / {totalPages}</span>
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3 disabled:opacity-40" onClick={() => handlePg(1)} disabled={pdfPage >= totalPages}>Next ▶</button>
                  </div>
                  <div className="flex items-center gap-[0.4rem]">
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3" onClick={() => handleZoom(-0.3)}>− Zoom</button>
                    <span className="font-mono text-[0.8rem] min-w-[50px] text-center">{Math.round(pdfZoom * 100)}%</span>
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3" onClick={() => handleZoom(0.3)}>+ Zoom</button>
                    <button className="p-[0.3rem_0.6rem] bg-surface2 border border-border rounded-[4px] text-[0.75rem] font-[600] hover:bg-surface3 ml-2" onClick={dlPdf}>⬇ DL</button>
                  </div>
                </div>
                <div className="overflow-auto bg-[#525659] p-4 flex justify-center max-h-[500px]">
                  <canvas ref={canvasRef} className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.4)]" />
                </div>
              </div>
            )}

            {/* URL-only fallback (CORS blocked or no pdfjsLib) */}
            {pdfStatus === 'url_only' && p && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-[2rem] text-white/60 z-10">
                <div className="text-[2.5rem] mb-[0.5rem]">📄</div>
                <div className="font-syne text-[0.95rem] font-[700] text-white mb-[0.2rem]">{p.name}</div>
                <div className="text-[0.78rem] mb-[1rem] text-center opacity-70">Preview not available (cross-origin). Open or download below.</div>
                <div className="flex gap-[0.5rem]">
                  <button className="p-[0.45rem_1rem] bg-blue text-white rounded-[6px] font-[700] text-[0.85rem]" onClick={() => window.open(p.url || p.dataUrl, '_blank')}>🔗 Open PDF</button>
                  <button className="p-[0.45rem_1rem] bg-white/10 text-white rounded-[6px] font-[700] text-[0.85rem]" onClick={dlPdf}>⬇ Download</button>
                </div>
              </div>
            )}

            {/* Error state */}
            {pdfStatus === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-[2rem] text-white/60 z-10">
                <div className="text-[2.5rem] mb-[0.5rem]">⚠️</div>
                <div className="font-syne text-[0.95rem] font-[700] text-red-300 mb-[0.5rem]">Could not render PDF</div>
                <div className="flex gap-[0.5rem]">
                  {p?.url && <button className="p-[0.45rem_1rem] bg-blue text-white rounded-[6px] font-[700] text-[0.85rem]" onClick={() => window.open(p.url, '_blank')}>🔗 Open</button>}
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
