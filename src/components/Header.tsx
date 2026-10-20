import React from 'react';
import { Calendar, Settings, LogOut } from 'lucide-react';
import type { HouseMember } from '../types.js';
import { getCalendarWeek } from '../types.js';

interface HeaderProps {
  houseName: string;
  currentMember: HouseMember | null;
  currentWeekNumber: number;
  activeTab: 'tasks' | 'schedule' | 'housemates' | 'activity';
  setActiveTab: (tab: 'tasks' | 'schedule' | 'housemates' | 'activity') => void;
  onOpenSchedule: () => void;
  onOpenAdmin: () => void;
  onLogout?: () => void;
  pendingExcusesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  houseName,
  currentMember,
  currentWeekNumber,
  activeTab,
  setActiveTab,
  onOpenSchedule,
  onOpenAdmin,
  onLogout,
  pendingExcusesCount,
}) => {
  const weekInfo = getCalendarWeek(currentWeekNumber);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 w-full max-w-full overflow-hidden">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-sm shrink-0">
            H
          </div>
          <div className="leading-tight min-w-0">
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate block">
              {houseName || 'Our House'}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-500 truncate block">
              {weekInfo.headerLabel} · {currentMember ? currentMember.name : 'Connected'}
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links for Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'tasks'
                ? 'text-slate-900 dark:text-white font-semibold border-b-2 border-slate-900 dark:border-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Duties
          </button>
          <button
            onClick={() => {
              setActiveTab('schedule');
              onOpenSchedule();
            }}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'text-slate-900 dark:text-white font-semibold border-b-2 border-slate-900 dark:border-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('housemates')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'housemates'
                ? 'text-slate-900 dark:text-white font-semibold border-b-2 border-slate-900 dark:border-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Housemates
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'activity'
                ? 'text-slate-900 dark:text-white font-semibold border-b-2 border-slate-900 dark:border-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Activity
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSchedule}
            className="md:hidden px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            Schedule
          </button>

          {/* Only rendered for Gunateja (Admin) - discreet Settings button without any 'Admin' label */}
          {currentMember?.isAdmin && (
            <button
              onClick={onOpenAdmin}
              title="House Settings"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 relative border border-slate-200 dark:border-slate-700 shrink-0"
              aria-label="House Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
              {pendingExcusesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          )}

          {/* Log out / Switch profile button so housemates can test from first page */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Log out / Switch profile (Return to first page)"
              className="px-2 sm:px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
