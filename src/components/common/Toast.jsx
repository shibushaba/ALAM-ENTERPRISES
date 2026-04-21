import { useAppContext } from '../../context/AppContext';

export default function Toast() {
  const { toastMsg } = useAppContext();

  return (
    <div className={`fixed bottom-[1.5rem] right-[1.5rem] z-[9999] bg-ink text-white rounded-[10px] p-[0.65rem_1rem] text-[0.8rem] font-[600] flex items-center gap-[0.5rem] shadow-sh3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${toastMsg ? 'translate-y-0 opacity-100' : 'translate-y-[20px] opacity-0'}`}>
      <div className="w-[5px] h-[5px] rounded-full bg-[#4ade80]" />
      <span>{toastMsg || 'Saved'}</span>
    </div>
  );
}
