import React from 'react';
import { PenLine, FileText, CheckSquare, Calendar, Search, Feather } from 'lucide-react';

export type NavTab = 'today' | 'notes' | 'tasks' | 'calendar' | 'search';

interface NavigationBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenCalligraphyStudio: () => void;
  pendingTasksCount?: number;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCalligraphyStudio,
  pendingTasksCount = 0,
}) => {
  return (
    <nav
      id="bottom-nav-bar"
      className="w-full bg-[#FFFFFF] border-t border-[#EAEAEA] px-2 py-1.5 flex items-center justify-around select-none z-20 shadow-xs"
    >
      {/* HOY */}
      <button
        id="nav-today-btn"
        type="button"
        onClick={() => onSelectTab('today')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          currentTab === 'today'
            ? 'text-[#222222] font-semibold'
            : 'text-[#888888] hover:text-[#444444]'
        }`}
      >
        <PenLine className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-wider uppercase">HOY</span>
      </button>

      {/* NOTAS */}
      <button
        id="nav-notes-btn"
        type="button"
        onClick={() => onSelectTab('notes')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          currentTab === 'notes'
            ? 'text-[#222222] font-semibold'
            : 'text-[#888888] hover:text-[#444444]'
        }`}
      >
        <FileText className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-wider uppercase">NOTAS</span>
      </button>

      {/* TAREAS */}
      <button
        id="nav-tasks-btn"
        type="button"
        onClick={() => onSelectTab('tasks')}
        className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          currentTab === 'tasks'
            ? 'text-[#222222] font-semibold'
            : 'text-[#888888] hover:text-[#444444]'
        }`}
      >
        <div className="relative">
          <CheckSquare className="w-5 h-5 mb-0.5" />
          {pendingTasksCount > 0 && (
            <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#222222] text-white text-[9px] font-bold flex items-center justify-center">
              {pendingTasksCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-wider uppercase">TAREAS</span>
      </button>

      {/* CALENDARIO */}
      <button
        id="nav-calendar-btn"
        type="button"
        onClick={() => onSelectTab('calendar')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          currentTab === 'calendar'
            ? 'text-[#222222] font-semibold'
            : 'text-[#888888] hover:text-[#444444]'
        }`}
      >
        <Calendar className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-wider uppercase">CALENDARIO</span>
      </button>

      {/* BUSCAR */}
      <button
        id="nav-search-btn"
        type="button"
        onClick={() => onSelectTab('search')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
          currentTab === 'search'
            ? 'text-[#222222] font-semibold'
            : 'text-[#888888] hover:text-[#444444]'
        }`}
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-wider uppercase">BUSCAR</span>
      </button>

      {/* CALIGRAFÍA STUDIO */}
      <button
        id="nav-calligraphy-btn"
        type="button"
        onClick={onOpenCalligraphyStudio}
        className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[#888888] hover:text-[#222222] transition-colors"
        title="Calibrar Mi Caligrafía"
      >
        <Feather className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] tracking-wider uppercase">MI LETRA</span>
      </button>
    </nav>
  );
};
