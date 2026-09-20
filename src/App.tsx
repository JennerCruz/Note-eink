import React, { useState, useEffect } from 'react';
import { InkPage, HandwritingProfile } from './types/ink';
import { StorageService, getTodayDateString } from './services/storage';
import { TodayView } from './components/TodayView';
import { NotesView } from './components/NotesView';
import { TasksView } from './components/TasksView';
import { CalendarView } from './components/CalendarView';
import { SearchView } from './components/SearchView';
import { NavigationBar, NavTab } from './components/NavigationBar';
import { CalligraphyStudio } from './components/CalligraphyStudio';
import { Feather, BookOpen } from 'lucide-react';

export default function App() {
  const [pages, setPages] = useState<InkPage[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<NavTab>('today');
  const [profile, setProfile] = useState<HandwritingProfile>(() => StorageService.loadProfile());
  const [isCalligraphyStudioOpen, setIsCalligraphyStudioOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize data on mount
  useEffect(() => {
    const loadedPages = StorageService.loadPages();
    const loadedProfile = StorageService.loadProfile();
    setPages(loadedPages);
    setProfile(loadedProfile);

    // Default to today's page
    const todayPage = StorageService.getOrCreateTodayPage();
    setActivePageId(todayPage.id);
    setIsLoading(false);
  }, []);

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];

  const handleUpdatePage = (updated: InkPage) => {
    setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    StorageService.savePage(updated);
  };

  const handleCreateNewPage = () => {
    const today = getTodayDateString();
    const newPage: InkPage = {
      id: `page-${Date.now()}`,
      date: today,
      title: `Folio ${pages.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      strokes: [],
      viewMode: 'original',
      paperType: 'ruled',
      digitalFont: 'Inter',
      interpreted: {
        title: `Folio ${pages.length + 1}`,
        cleanedText: '',
        type: 'note',
        items: [],
        confidence: 1,
        lastAnalyzedTimestamp: Date.now(),
      },
    };

    const updated = [newPage, ...pages];
    setPages(updated);
    StorageService.savePages(updated);
    setActivePageId(newPage.id);
    setCurrentTab('today');
  };

  const handleDeletePage = (pageId: string) => {
    const remaining = StorageService.deletePage(pageId);
    setPages(remaining);
    if (activePageId === pageId && remaining.length > 0) {
      setActivePageId(remaining[0].id);
    }
  };

  const handleSelectPage = (pageId: string) => {
    setActivePageId(pageId);
    setCurrentTab('today');
  };

  const handleToggleTask = (pageId: string, itemId: string, completed: boolean) => {
    const targetPage = pages.find((p) => p.id === pageId);
    if (!targetPage || !targetPage.interpreted) return;

    const newItems = targetPage.interpreted.items.map((it) =>
      it.id === itemId ? { ...it, completed } : it
    );

    const updatedPage: InkPage = {
      ...targetPage,
      interpreted: {
        ...targetPage.interpreted,
        items: newItems,
      },
    };

    handleUpdatePage(updatedPage);
  };

  const handleSaveProfile = (newProfile: HandwritingProfile) => {
    setProfile(newProfile);
    StorageService.saveProfile(newProfile);
  };

  // Calculate pending tasks for notification badge
  const pendingTasksCount = pages.reduce((count, p) => {
    if (!p.interpreted?.items) return count;
    return (
      count +
      p.interpreted.items.filter((it) => (it.type === 'task' || it.type === 'list_item') && !it.completed).length
    );
  }, 0);

  if (isLoading || !activePage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F7F5] text-[#444444]">
        <div className="flex flex-col items-center space-y-2">
          <BookOpen className="w-8 h-8 animate-pulse text-[#222222]" />
          <span className="text-xs uppercase tracking-widest">Abriendo InkFlow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen max-w-full overflow-hidden bg-[#F7F7F5] text-[#222222]">
      {/* Top Brand Bar */}
      <header className="h-10 px-4 bg-[#FFFFFF] border-b border-[#EAEAEA] flex items-center justify-between select-none shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-sm bg-[#222222] flex items-center justify-center text-white text-[10px] font-bold">
            i
          </div>
          <span className="font-serif font-bold text-sm tracking-tight text-[#222222]">
            InkFlow
          </span>
          <span className="text-[10px] text-[#888888] hidden sm:inline">
            — Cuaderno Inteligente
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-[#666666]">
          <button
            type="button"
            onClick={() => setIsCalligraphyStudioOpen(true)}
            className="flex items-center space-x-1 hover:text-[#222222] transition-colors"
          >
            <Feather className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mi Caligrafía</span>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {currentTab === 'today' && (
          <TodayView
            page={activePage}
            profile={profile}
            onUpdatePage={handleUpdatePage}
            onOpenCalligraphyStudio={() => setIsCalligraphyStudioOpen(true)}
          />
        )}

        {currentTab === 'notes' && (
          <NotesView
            pages={pages}
            activePageId={activePageId}
            onSelectPage={handleSelectPage}
            onCreateNewPage={handleCreateNewPage}
            onDeletePage={handleDeletePage}
          />
        )}

        {currentTab === 'tasks' && (
          <TasksView
            pages={pages}
            onToggleTask={handleToggleTask}
            onNavigateToPage={handleSelectPage}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            pages={pages}
            onNavigateToPage={handleSelectPage}
          />
        )}

        {currentTab === 'search' && (
          <SearchView
            pages={pages}
            onNavigateToPage={handleSelectPage}
          />
        )}
      </div>

      {/* Minimalist Bottom Navigation Bar */}
      <NavigationBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenCalligraphyStudio={() => setIsCalligraphyStudioOpen(true)}
        pendingTasksCount={pendingTasksCount}
      />

      {/* Calligraphy Profile Studio Modal */}
      {isCalligraphyStudioOpen && (
        <CalligraphyStudio
          profile={profile}
          onSaveProfile={handleSaveProfile}
          onClose={() => setIsCalligraphyStudioOpen(false)}
        />
      )}
    </div>
  );
}
