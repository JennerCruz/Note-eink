import React, { useState } from 'react';
import { InkPage, HandwritingProfile } from '../types/ink';
import { formatFriendlyDate } from '../services/storage';
import { Plus, Trash2, Calendar, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

interface NotesViewProps {
  pages: InkPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onCreateNewPage: () => void;
  onDeletePage: (pageId: string) => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onCreateNewPage,
  onDeletePage,
}) => {
  const [filter, setFilter] = useState<string>('all');

  return (
    <div className="flex-1 flex flex-col w-full bg-[#F7F7F5] overflow-y-auto p-4 sm:p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
          <div>
            <h1 className="text-xl font-serif font-medium text-[#222222]">Mis Páginas y Notas</h1>
            <p className="text-xs text-[#666666]">
              {pages.length} {pages.length === 1 ? 'cuaderno registrado' : 'cuadernos registrados'}
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateNewPage}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#222222] text-white text-xs font-medium hover:bg-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva hoja limpia</span>
          </button>
        </div>

        {/* List of Pages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((page) => {
            const { dayName, formattedDate } = formatFriendlyDate(page.date);
            const isActive = page.id === activePageId;
            const itemsCount = page.interpreted?.items.length || 0;
            const tasksCount = page.interpreted?.items.filter((it) => it.type === 'task').length || 0;
            const strokesCount = page.strokes.length;

            return (
              <div
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`relative group p-5 bg-white border rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'border-[#222222] shadow-sm ring-1 ring-[#222222]'
                    : 'border-[#EAEAEA] hover:border-[#CCCCCC] hover:shadow-xs'
                }`}
              >
                {/* Top Date & Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 text-xs text-[#666666]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {dayName}, {formattedDate}
                    </span>
                  </div>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#222222] text-white">
                      Hoja Activa
                    </span>
                  )}
                </div>

                {/* Page Title & Snippet */}
                <h3 className="text-base font-medium text-[#222222] mb-1">
                  {page.title || 'Sin título'}
                </h3>

                <p className="text-xs text-[#666666] line-clamp-2 min-h-[32px] mb-3 font-mono">
                  {page.interpreted?.cleanedText || (
                    strokesCount > 0
                      ? `${strokesCount} trazos manuscritos registrados`
                      : 'Hoja en blanco'
                  )}
                </p>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[11px] text-[#888888] pt-3 border-t border-[#F0F0ED]">
                  <div className="flex items-center space-x-3">
                    <span>{strokesCount} trazos</span>
                    {tasksCount > 0 && <span>{tasksCount} tareas</span>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('¿Eliminar esta hoja de notas?')) {
                          onDeletePage(page.id);
                        }
                      }}
                      className="p-1 rounded text-[#888888] hover:text-red-600 transition-colors"
                      title="Eliminar hoja"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-[#CCCCCC] group-hover:text-[#222222] transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
