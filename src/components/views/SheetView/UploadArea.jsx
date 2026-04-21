import { useRef, useState } from 'react';

export default function UploadArea({ onUpload, onLoadSample }) {
  const [isDrag, setIsDrag] = useState(false);
  const fileRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDrag(false);
    if (e.dataTransfer.files[0]) onUpload(e.dataTransfer.files[0]);
  };

  return (
    <div className="block">
      <div 
        className={`border-[2px] border-dashed rounded-r2 p-[2.5rem] text-center cursor-pointer transition-all duration-200 ${isDrag ? 'border-gold bg-amber-soft' : 'border-border2 bg-surface2 hover:border-gold hover:bg-amber-soft'}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
        onDragLeave={() => setIsDrag(false)}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileRef} 
          accept=".xlsx,.xls,.csv" 
          className="hidden" 
          onChange={(e) => onUpload(e.target.files[0])} 
        />
        <div className="text-[2.4rem] mb-[0.65rem]">📂</div>
        <div className="font-syne text-[1rem] font-[700] text-ink mb-[0.3rem]">Upload Excel or CSV file</div>
        <div className="text-ink3 text-[0.8rem]">Drag & drop .xlsx, .xls, .csv — or click to browse</div>
      </div>
      <div className="text-center my-[0.85rem] text-ink3 text-[0.78rem]">— or —</div>
      <div className="flex justify-center">
        <button 
          className="inline-flex items-center gap-[0.35rem] p-[0.38rem_0.8rem] rounded-[7px] font-lato text-[0.78rem] font-[700] cursor-pointer border border-gold2 bg-gold text-white transition-all duration-150 whitespace-nowrap hover:bg-gold2 hover:shadow-[0_3px_12px_rgba(245,158,11,0.3)]"
          onClick={onLoadSample}
        >
          ✦ Load Sample Data
        </button>
      </div>
    </div>
  );
}
