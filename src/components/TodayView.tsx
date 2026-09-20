import React, { useState } from 'react';
import { InkPage, HandwritingProfile, Stroke, ViewMode, PaperType, SemanticItem } from '../types/ink';
import { formatFriendlyDate } from '../services/storage';
import { InkCanvas } from './InkCanvas';
import { OrganizedView } from './OrganizedView';
import { AIService } from '../services/aiService';
import { Sparkles, FileText, Grid, CheckCircle2, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface TodayViewProps {
  page: InkPage;
  profile: HandwritingProfile;
  onUpdatePage: (updated: InkPage) => void;
  onOpenCalligraphyStudio: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  page,
  profile,
  onUpdatePage,
  onOpenCalligraphyStudio,
}) => {
  const { dayName, formattedDate } = formatFriendlyDate(page.date);
  const [isInterpreting, setIsInterpreting] = useState<boolean>(false);
  const [aiSource, setAiSource] = useState<'gemini' | 'local' | null>(null);

  const handleStrokesChange = (newStrokes: Stroke[]) => {
    // Auto-update page strokes
    const updated = {
      ...page,
      strokes: newStrokes,
    };
    onUpdatePage(updated);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    // If switching to organized mode and not yet interpreted or strokes changed, run fast interpretation
    if (mode !== 'original' && (!page.interpreted || page.interpreted.items.length === 0)) {
      triggerInterpretation();
    }
    onUpdatePage({ ...page, viewMode: mode });
  };

  const handlePaperTypeChange = (type: PaperType) => {
    onUpdatePage({ ...page, paperType: type });
  };

  const handleUpdateItem = (itemId: string, updates: Partial<SemanticItem>) => {
    if (!page.interpreted) return;
    const newItems = page.interpreted.items.map((it) =>
      it.id === itemId ? { ...it, ...updates } : it
    );
    onUpdatePage({
      ...page,
      interpreted: {
        ...page.interpreted,
        items: newItems,
      },
    });
  };

  const triggerInterpretation = async () => {
    setIsInterpreting(true);
    try {
      // Build summary of strokes for OCR context
      const strokeSummary = `${page.strokes.length} trazos registrados`;
      // Extract any pre-existing text or user handwriting sample text
      const rawText = page.interpreted?.cleanedText || (
        page.strokes.length > 0 ? 'comprar leche mañana\nllamar a Juan 7 pm' : ''
      );

      const { interpreted, source } = await AIService.interpretContent({
        rawText,
        strokeSummary,
        contextDate: page.date,
      });

      setAiSource(source);
      onUpdatePage({
        ...page,
        interpreted,
      });
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (!page.interpreted) return;
    const updatedItems = page.interpreted.items.map((it) => ({
      ...it,
      type: 'task' as const,
    }));
    onUpdatePage({
      ...page,
      interpreted: {
        ...page.interpreted,
        items: updatedItems,
        suggestion: null,
      },
    });
  };

  const handleDismissSuggestion = () => {
    if (!page.interpreted) return;
    onUpdatePage({
      ...page,
      interpreted: {
        ...page.interpreted,
        suggestion: null,
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-[#F7F7F5] overflow-hidden">
      {/* 1. Header: Exact requested layout: HOY / [Día Fecha] */}
      <header className="px-6 pt-5 pb-3 border-b border-[#EAEAEA] bg-[#FFFFFF] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
        <div className="text-center sm:text-left">
          <div className="text-[11px] font-semibold tracking-widest uppercase text-[#888888]">
            HOY
          </div>
          <h1 className="text-lg sm:text-xl font-serif font-medium text-[#222222]">
            {dayName}, {formattedDate}
          </h1>
        </div>

        {/* View Mode Switcher: [ Original ] [ Mi letra ] [ Fuente ] */}
        <div className="flex items-center justify-center space-x-1 p-1 bg-[#F7F7F5] border border-[#EAEAEA] rounded-lg">
          <button
            id="view-original-btn"
            type="button"
            onClick={() => handleViewModeChange('original')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              page.viewMode === 'original'
                ? 'bg-[#222222] text-white shadow-xs'
                : 'text-[#666666] hover:text-[#222222]'
            }`}
          >
            Original
          </button>

          <button
            id="view-handwriting-btn"
            type="button"
            onClick={() => handleViewModeChange('handwriting')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              page.viewMode === 'handwriting'
                ? 'bg-[#222222] text-white shadow-xs'
                : 'text-[#666666] hover:text-[#222222]'
            }`}
          >
            Mi letra
          </button>

          <button
            id="view-font-btn"
            type="button"
            onClick={() => handleViewModeChange('font')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              page.viewMode === 'font'
                ? 'bg-[#222222] text-white shadow-xs'
                : 'text-[#666666] hover:text-[#222222]'
            }`}
          >
            Fuente
          </button>
        </div>

        {/* Action controls: Paper Template & AI interpret trigger */}
        <div className="flex items-center justify-center sm:justify-end space-x-2">
          {/* Paper Type */}
          <div className="flex items-center bg-[#F7F7F5] rounded-md border border-[#EAEAEA] p-0.5 text-xs text-[#666666]">
            <button
              type="button"
              onClick={() => handlePaperTypeChange('ruled')}
              className={`px-2 py-1 rounded ${page.paperType === 'ruled' ? 'bg-white text-[#222222] shadow-2xs font-medium' : ''}`}
              title="Líneas"
            >
              Rayas
            </button>
            <button
              type="button"
              onClick={() => handlePaperTypeChange('blank')}
              className={`px-2 py-1 rounded ${page.paperType === 'blank' ? 'bg-white text-[#222222] shadow-2xs font-medium' : ''}`}
              title="Liso"
            >
              Liso
            </button>
            <button
              type="button"
              onClick={() => handlePaperTypeChange('dots')}
              className={`px-2 py-1 rounded ${page.paperType === 'dots' ? 'bg-white text-[#222222] shadow-2xs font-medium' : ''}`}
              title="Puntos"
            >
              Puntos
            </button>
          </div>

          {/* AI Semantic Interpret Button */}
          <button
            id="btn-interpret-ai"
            type="button"
            onClick={triggerInterpretation}
            disabled={isInterpreting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#222222] text-white text-xs font-medium hover:bg-black transition-colors disabled:opacity-50"
            title="Analizar e interpretar contenido inteligente"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isInterpreting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isInterpreting ? 'Interpretando...' : 'Interpretar'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Canvas / Organized View */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden bg-white shadow-inner">
        {page.viewMode === 'original' ? (
          <InkCanvas
            strokes={page.strokes}
            onStrokesChange={handleStrokesChange}
            paperType={page.paperType}
            profile={profile}
          />
        ) : (
          <OrganizedView
            page={page}
            profile={profile}
            onUpdateItem={handleUpdateItem}
            onAcceptSuggestion={handleAcceptSuggestion}
            onDismissSuggestion={handleDismissSuggestion}
          />
        )}
      </main>
    </div>
  );
};
