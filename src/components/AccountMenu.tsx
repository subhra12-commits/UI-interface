import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, HelpCircle, Home, LogOut, User } from 'lucide-react';
import type { ActiveSection } from './Sidebar';

interface AccountMenuProps {
  onNavigate: (section: ActiveSection) => void;
  onLogout: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ onNavigate, onLogout }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-2.5">
      <div className="hidden items-center gap-1.5 rounded-full border border-[#EAD9BE] bg-white/90 px-3 py-1 text-[11.5px] font-semibold text-[#3B1715] shadow-sm sm:inline-flex">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#1F8A4D]" aria-hidden="true" />
        <span className="whitespace-nowrap">Welcome Back!</span>
      </div>

      <span className="hidden h-5 w-px bg-[#D7C0A0] sm:block" aria-hidden="true" />

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open workspace account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5A0D14] text-[#FDF5E6] shadow-md ring-2 ring-white/80 transition-transform duration-150 hover:scale-105 hover:bg-[#73121B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E5A73B]"
      >
        <User className="h-4.5 w-4.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-12 right-0 z-40 w-64 overflow-hidden rounded-2xl border border-[#EAD9BE] bg-[#FFFBF2] p-2 shadow-xl"
        >
          <div className="border-b border-[#EAD9BE] px-3 py-2.5">
            <div className="text-sm font-bold text-[#5A0D14]">Mother&apos;s Hut Operator</div>
            <div className="text-xs text-[#6B4C46]">Restaurant Intelligence Portal</div>
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate('dashboard');
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#3B1715] transition-colors hover:bg-[#F5E6CD]"
            >
              <Home className="h-4 w-4 text-[#5A0D14]" aria-hidden="true" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate('help');
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#3B1715] transition-colors hover:bg-[#F5E6CD]"
            >
              <HelpCircle className="h-4 w-4 text-[#5A0D14]" aria-hidden="true" />
              <span>Help &amp; Support</span>
            </button>
          </div>

          <div className="border-t border-[#EAD9BE] pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-[#8C211D] transition-colors hover:bg-[#FDEBE8]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
