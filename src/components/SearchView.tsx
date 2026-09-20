import React, { useState } from 'react';
import { InkPage, SearchResult } from '../types/ink';
import { AIService } from '../services/aiService';
import { Search, Sparkles, Calendar, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';

interface SearchViewProps {
  pages: InkPage[];
  onNavigateToPage: (pageId: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  pages,
  onNavigateToPage,
}) => {
  const [query, setQuery] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState<boolean>(false);

  // Search across pages and recognized semantic items
  const results: SearchResult[] = [];
  const qClean = query.trim().toLowerCase();

  if (qClean.length > 0) {
    for (const page of pages) {
      // Check page title
      if (page.title.toLowerCase().includes(qClean)) {
        results.push({
          pageId: page.id,
          pageTitle: page.title,
          pageDate: page.date,
          matchedText: page.title,
          itemType: 'Título de nota',
        });
      }

      // Check interpreted items
      if (page.interpreted?.items) {
        for (const it of page.interpreted.items) {
          const itemText = it.text.toLowerCase();
          const rawText = (it.rawText || '').toLowerCase();
          const tagMatches = it.tags?.some((t) => t.toLowerCase().includes(qClean));

          if (itemText.includes(qClean) || rawText.includes(qClean) || tagMatches) {
            results.push({
              pageId: page.id,
              pageTitle: page.title,
              pageDate: page.date,
              matchedText: it.text,
              itemType: it.type === 'task' ? 'Tarea' : it.type === 'event' ? 'Evento' : 'Nota',
              completed: it.completed,
            });
          }
        }
      }
    }
  }

  const handleAskAI = async () => {
    if (!query.trim()) return;
    setIsAskingAI(true);
    setAiAnswer(null);
    try {
      const answer = await AIService.askNotes(query, pages);
      setAiAnswer(answer);
    } finally {
      setIsAskingAI(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-[#F7F7F5] overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="border-b border-[#EAEAEA] pb-4">
          <h1 className="text-xl font-serif font-medium text-[#222222]">Búsqueda Inteligente</h1>
          <p className="text-xs text-[#666666]">
            Encuentra texto digital, escritura manuscrita reconocida, tareas, fechas y etiquetas.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-[#888888]" />
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskAI();
            }}
            placeholder="Buscar en notas (ej. 'leche', 'reunión', 'Juan', '#compras')..."
            className="w-full pl-11 pr-24 py-3 bg-white border border-[#EAEAEA] rounded-xl text-sm text-[#222222] placeholder-[#AAAAAA] focus:outline-hidden focus:border-[#222222] shadow-xs"
          />

          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={handleAskAI}
              disabled={isAskingAI}
              className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-[#222222] text-white text-xs font-medium hover:bg-black transition-colors flex items-center space-x-1"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAskingAI ? 'animate-spin' : ''}`} />
              <span>{isAskingAI ? 'Consultando...' : 'Preguntar IA'}</span>
            </button>
          )}
        </div>

        {/* AI Answer Box if generated */}
        {aiAnswer && (
          <div className="p-4 bg-white border border-[#222222] rounded-xl shadow-xs animate-fadeIn">
            <div className="flex items-center space-x-2 text-xs font-semibold text-[#222222] uppercase tracking-wider mb-2">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Respuesta del Asistente InkFlow</span>
            </div>
            <p className="text-sm text-[#333333] whitespace-pre-line leading-relaxed">
              {aiAnswer}
            </p>
          </div>
        )}

        {/* Search Results List */}
        {query.trim().length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
              Resultados de búsqueda ({results.length})
            </div>

            {results.length === 0 ? (
              <div className="bg-white border border-[#EAEAEA] rounded-xl p-8 text-center text-[#888888]">
                <p className="text-sm">No se encontraron resultados para "{query}".</p>
              </div>
            ) : (
              <div className="bg-white border border-[#EAEAEA] rounded-xl divide-y divide-[#F0F0ED] overflow-hidden">
                {results.map((r, i) => (
                  <div
                    key={`${r.pageId}-${i}`}
                    onClick={() => onNavigateToPage(r.pageId)}
                    className="p-4 flex items-center justify-between hover:bg-[#F7F7F5] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#222222]">{r.matchedText}</div>
                      <div className="flex items-center space-x-2 text-xs text-[#888888] mt-0.5">
                        <span className="font-medium text-[#444444]">{r.itemType}</span>
                        <span>• {r.pageTitle}</span>
                        <span>• {r.pageDate}</span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#CCCCCC]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
