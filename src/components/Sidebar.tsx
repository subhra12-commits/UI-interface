import React from 'react';
import { HelpCircle, Home, LogOut, X } from 'lucide-react';
import {
  MOTHERS_HUT_CONTACT,
  OFFICIAL_LOGO_FALLBACK_SRC,
  OFFICIAL_LOGO_SRC,
} from '../data/projects';
import { BotanicalCornerLeaves, OrnamentalDivider } from './BotanicalOrnament';

export type ActiveSection = 'dashboard' | 'help';

interface SidebarProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const handleNavClick = (section: ActiveSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const navContent = (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-b from-[#5F0E15] via-[#520B11] to-[#3E060B] px-4 py-6 text-[#FDF5E6]">
      {/* Subtle botanical bottom-left watermark */}
      <BotanicalCornerLeaves
        className="pointer-events-none absolute -bottom-2 -left-3 h-44 w-44 rotate-180 opacity-45"
        color="#9B4D36"
      />

      <div className="relative z-10">
        {/* Official Mother's Hut Logo */}
        <div className="flex flex-col items-center px-2 pt-1 pb-4 text-center">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className="group rounded-2xl bg-white p-2 shadow-[0_8px_22px_rgba(0,0,0,0.35)] ring-1 ring-[#E8B14B]/40 transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B94B]"
            aria-label="Mother's Hut Dashboard Home"
          >
            <img
              src={OFFICIAL_LOGO_SRC}
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== OFFICIAL_LOGO_FALLBACK_SRC) {
                  img.src = OFFICIAL_LOGO_FALLBACK_SRC;
                }
              }}
              alt="Mother's Hut official logo"
              referrerPolicy="no-referrer"
              className="h-18 w-18 rounded-xl object-contain xl:h-20 xl:w-20"
            />
          </button>

          <span className="font-display mt-2.5 text-[19px] font-bold tracking-tight text-[#FFF7E8]">
            {MOTHERS_HUT_CONTACT.brandName}
          </span>
        </div>

        <OrnamentalDivider className="my-3" />

        {/* Navigation: Strictly Dashboard and Help & Support */}
        <nav aria-label="Workspace Navigation" className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            aria-current={activeSection === 'dashboard' ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm font-semibold transition-all duration-200 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B94B] ${
              activeSection === 'dashboard'
                ? 'bg-gradient-to-r from-[#F6C361] to-[#E5A73B] text-[#3B0B0F] shadow-[0_4px_14px_rgba(232,174,71,0.35)]'
                : 'text-[#F6EAD9] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('help')}
            aria-current={activeSection === 'help' ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm font-semibold transition-all duration-200 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B94B] ${
              activeSection === 'help'
                ? 'bg-gradient-to-r from-[#F6C361] to-[#E5A73B] text-[#3B0B0F] shadow-[0_4px_14px_rgba(232,174,71,0.35)]'
                : 'text-[#F6EAD9] hover:bg-white/10 hover:text-white'
            }`}
          >
            <HelpCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Help &amp; Support</span>
          </button>
        </nav>

        <OrnamentalDivider className="my-4.5" />

        <button
          type="button"
          onClick={() => {
            onCloseMobile();
            onLogout();
          }}
          className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm font-medium text-[#F1DCC6] transition-colors duration-200 hover:bg-white/10 hover:text-white whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B94B]"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>

      <div className="relative z-10 px-2 pt-4 text-center text-[10px] text-[#E8D5BE]/70">
        NH-12, Krishnanagar · Est. 2013
      </div>
    </div>
  );

  return (
    <>
      {/* Persistent Desktop Sidebar */}
      <aside className="hidden lg:block lg:w-[228px] lg:shrink-0 lg:shadow-[4px_0_24px_rgba(45,8,10,0.18)] xl:w-[244px]">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-[#230608]/60 backdrop-blur-[2px] transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full w-72 max-w-[82vw] shadow-2xl">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="absolute top-3 right-3 z-20 rounded-full bg-white/10 p-2 text-[#FDF5E6] transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-[#F2B94B]"
            >
              <X className="h-4 w-4" />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
