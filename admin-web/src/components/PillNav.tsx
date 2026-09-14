import React, { useState, useRef, useEffect } from 'react';

export type PillNavItem = {
  id?: string;
  label: string;
  href: string;
  ariaLabel?: string;
};

export interface PillNavProps {
  logo?: string;
  logoAlt?: string;
  showLogo?: boolean;
  items: PillNavItem[];
  activeHref?: string;
  className?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  onItemClick?: (item: PillNavItem) => void;
  initialLoadAnimation?: boolean;
}

export const PillNav: React.FC<PillNavProps> = ({
  logo,
  logoAlt = 'Logo',
  showLogo = false,
  items,
  activeHref,
  className = '',
  baseColor = '#FF671F',
  pillColor = '#0F172A',
  hoveredPillTextColor = '#FFFFFF',
  pillTextColor = '#FFFFFF',
  onMobileMenuClick,
  onItemClick
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    onMobileMenuClick?.();
  };

  return (
    <div className="relative w-full z-[100] flex items-center justify-center">
      <nav
        className={`w-full flex items-center justify-center box-border ${className}`}
        aria-label="Primary Navigation"
      >
        {/* Optional Logo */}
        {showLogo && logo && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (items?.[0] && onItemClick) onItemClick(items[0]);
            }}
            className="rounded-full p-1 inline-flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-orange-200 mr-2 transition-transform hover:rotate-180 duration-300"
            style={{
              width: '36px',
              height: '36px',
              background: baseColor
            }}
          >
            <img src={logo} alt={logoAlt} className="w-full h-full object-contain block" />
          </button>
        )}

          {/* Desktop Dynamic Smooth Pill Navbar Container */}
          <div
            className="relative items-center rounded-full hidden md:flex overflow-x-auto w-full max-w-full no-scrollbar shadow-md border border-orange-200/40"
            style={{
              height: '46px',
              background: baseColor,
              padding: '3px'
            }}
          >
            <ul
              role="menubar"
              className="list-none flex items-center justify-between w-full m-0 p-0 h-full gap-0.5"
            >
              {items.map((item) => {
                const isActive = activeHref === item.href || activeHref === item.id;
                const words = item.label.trim().split(/\s+/);

                let labelContent;
                if (words.length <= 1) {
                  labelContent = (
                    <span className="font-black text-[11px] uppercase tracking-wider whitespace-nowrap">
                      {item.label}
                    </span>
                  );
                } else if (words.length === 2) {
                  labelContent = (
                    <div className="flex flex-col items-center justify-center leading-[1.05] text-[10px] font-black uppercase tracking-tight py-0.5 text-center whitespace-nowrap">
                      <span>{words[0]}</span>
                      <span>{words[1]}</span>
                    </div>
                  );
                } else {
                  const mid = Math.ceil(words.length / 2);
                  const line1 = words.slice(0, mid).join(' ');
                  const line2 = words.slice(mid).join(' ');
                  labelContent = (
                    <div className="flex flex-col items-center justify-center leading-[1.05] text-[10px] font-black uppercase tracking-tight py-0.5 text-center whitespace-nowrap">
                      <span>{line1}</span>
                      <span>{line2}</span>
                    </div>
                  );
                }

                return (
                  <li key={item.id || item.href} role="none" className="flex-1 flex h-full justify-center min-w-0">
                    <button
                      type="button"
                      role="menuitem"
                      aria-label={item.ariaLabel || item.label}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onItemClick) onItemClick(item);
                      }}
                      className={`w-full relative overflow-hidden inline-flex items-center justify-center h-full rounded-full box-border cursor-pointer px-2 sm:px-2.5 transition-all duration-200 ease-out transform ${
                        isActive
                          ? 'bg-[#0F172A] text-white shadow-md scale-[1.02]'
                          : 'bg-transparent text-white/90 hover:bg-[#0F172A]/80 hover:text-white hover:scale-[1.02]'
                      }`}
                    >
                      <span className="relative z-10 flex items-center justify-center w-full px-0.5">
                        {labelContent}
                      </span>
                      {isActive && (
                        <span
                          className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-rail-orange shadow-sm animate-pulse"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          className="md:hidden rounded-full border-0 flex flex-col items-center justify-center gap-1 cursor-pointer p-0 relative shrink-0 shadow-md"
          style={{
            width: '36px',
            height: '36px',
            background: baseColor
          }}
        >
          <span
            className={`w-4 h-0.5 rounded bg-white transition-all duration-200 ${
              isMobileMenuOpen ? 'rotate-45 translate-y-1' : ''
            }`}
          />
          <span
            className={`w-4 h-0.5 rounded bg-white transition-all duration-200 ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-1' : ''
            }`}
          />
        </button>
      </nav>

      {/* Mobile Dynamic Slide-down Dropdown Menu */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden absolute top-[44px] left-0 right-0 rounded-2xl shadow-2xl z-[998] border border-orange-200/50 overflow-hidden backdrop-blur-lg bg-slate-900/95 p-2 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <ul className="list-none m-0 p-0 flex flex-col gap-1">
            {items.map((item) => {
              const isActive = activeHref === item.href || activeHref === item.id;

              return (
                <li key={item.id || item.href}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsMobileMenuOpen(false);
                      if (onItemClick) onItemClick(item);
                    }}
                    className={`w-full text-left py-2.5 px-4 text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
                      isActive
                        ? 'bg-rail-orange text-white font-extrabold shadow-sm'
                        : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PillNav;
