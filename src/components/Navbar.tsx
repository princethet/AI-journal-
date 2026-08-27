import React from 'react';
import { Sparkles, BookOpen, BarChart3, Calendar, ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';
import type { UserProfile } from '../types';

interface NavbarProps {
  user: UserProfile | null;
  currentTab: 'journal' | 'history' | 'digest';
  onSelectTab: (tab: 'journal' | 'history' | 'digest') => void;
  onOpenThreatModal: () => void;
  onSignOut: () => void;
  isDevPreview?: boolean;
  onToggleDevPreview?: (val?: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentTab,
  onSelectTab,
  onOpenThreatModal,
  onSignOut,
  isDevPreview = true,
  onToggleDevPreview,
}) => {
  return (
    <header id="main-navigation-header" className="sticky top-0 z-40 bg-white border-b border-[#EBE8E4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('journal')}>
            <div className="w-10 h-10 bg-[#1A1A1A] flex items-center justify-center text-white font-sans text-xs font-bold">
              RA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl font-black tracking-tighter uppercase italic text-[#1A1A1A]">
                  ReflectAI
                </span>
                <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 bg-[#FAF9F6] border border-[#EBE8E4] text-[#7D7A74]">
                  Gemini 3.6 Flash
                </span>
              </div>
              <p className="text-[10px] font-sans uppercase tracking-[0.2em] text-[#A09D98] hidden sm:block">
                Principal Coach Edition
              </p>
            </div>
          </div>

          {/* Center Navigation (Only visible when user is logged in) */}
          {user && (
            <nav id="dashboard-nav-tabs" className="hidden md:flex items-center space-x-8 text-xs font-sans font-bold uppercase tracking-widest">
              <button
                id="nav-tab-journal"
                onClick={() => onSelectTab('journal')}
                className={`transition-colors pb-1 cursor-pointer ${
                  currentTab === 'journal'
                    ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]'
                    : 'text-[#A09D98] hover:text-[#1A1A1A] border-b-2 border-transparent'
                }`}
              >
                Active Session
              </button>

              <button
                id="nav-tab-history"
                onClick={() => onSelectTab('history')}
                className={`transition-colors pb-1 cursor-pointer ${
                  currentTab === 'history'
                    ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]'
                    : 'text-[#A09D98] hover:text-[#1A1A1A] border-b-2 border-transparent'
                }`}
              >
                Journal History
              </button>

              <button
                id="nav-tab-digest"
                onClick={() => onSelectTab('digest')}
                className={`transition-colors pb-1 cursor-pointer ${
                  currentTab === 'digest'
                    ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]'
                    : 'text-[#A09D98] hover:text-[#1A1A1A] border-b-2 border-transparent'
                }`}
              >
                Weekly Digest
              </button>
            </nav>
          )}

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            <button
              id="open-threat-modal-btn"
              onClick={onOpenThreatModal}
              title="View Security Threat Model & Rules"
              className="flex items-center gap-1.5 px-3.5 py-2 border border-[#EBE8E4] bg-[#FAF9F6] hover:bg-white text-[#4A4844] text-[11px] font-sans font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1A1A1A]" />
              <span className="hidden sm:inline">Threat Model</span>
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-[#EBE8E4]">
                <div className="flex items-center gap-2.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User Avatar'}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 border border-[#EBE8E4] object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-[#1A1A1A] text-white flex items-center justify-center font-sans font-bold text-xs">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="hidden lg:block text-left font-serif">
                    <p className="text-xs font-bold text-[#1A1A1A] truncate max-w-[130px]">
                      {user.displayName || (user.email === 'test@example.com' ? 'Test User' : 'Demo Explorer')}
                    </p>
                    <p className="text-[10px] font-sans uppercase tracking-wider text-[#A09D98] truncate max-w-[130px]">
                      {user.email === 'test@example.com' 
                        ? 'Test User (Dev Mode)' 
                        : user.isAnonymous 
                          ? 'Guest Sandbox' 
                          : (user.email || 'Isolated Session')}
                    </p>
                  </div>
                </div>

                <button
                  id="sign-out-button"
                  onClick={onSignOut}
                  title="Sign out of your session"
                  className="p-2 text-[#7D7A74] hover:text-[#1A1A1A] hover:bg-[#FAF9F6] transition cursor-pointer"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Tab Bar */}
        {user && (
          <div className="flex md:hidden items-center justify-around py-3 border-t border-[#EBE8E4] font-sans text-[11px] font-bold uppercase tracking-wider">
            <button
              onClick={() => onSelectTab('journal')}
              className={`pb-1 ${currentTab === 'journal' ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]' : 'text-[#A09D98]'}`}
            >
              Session
            </button>
            <button
              onClick={() => onSelectTab('history')}
              className={`pb-1 ${currentTab === 'history' ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]' : 'text-[#A09D98]'}`}
            >
              History
            </button>
            <button
              onClick={() => onSelectTab('digest')}
              className={`pb-1 ${currentTab === 'digest' ? 'text-[#1A1A1A] border-b-2 border-[#1A1A1A]' : 'text-[#A09D98]'}`}
            >
              Digest
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
