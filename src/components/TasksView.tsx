import React, { useState } from 'react';
import { InkPage, SemanticItem } from '../types/ink';
import { CheckSquare, Square, Calendar, Clock, Tag, ArrowRight } from 'lucide-react';

interface TasksViewProps {
  pages: InkPage[];
  onToggleTask: (pageId: string, itemId: string, completed: boolean) => void;
  onNavigateToPage: (pageId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  pages,
  onToggleTask,
  onNavigateToPage,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Aggregate all tasks and list items across all pages
  const allTasks: { page: InkPage; item: SemanticItem }[] = [];
  for (const page of pages) {
    if (page.interpreted?.items) {
      for (const item of page.interpreted.items) {
        if (item.type === 'task' || item.type === 'list_item') {
          allTasks.push({ page, item });
        }
      }
    }
  }

  const filtered = allTasks.filter(({ item }) => {
    if (filter === 'pending') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  const pendingCount = allTasks.filter(({ item }) => !item.completed).length;

  return (
    <div className="flex-1 flex flex-col w-full bg-[#F7F7F5] overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EAEAEA] pb-4">
          <div>
            <h1 className="text-xl font-serif font-medium text-[#222222]">Tareas y Listas</h1>
            <p className="text-xs text-[#666666]">
              {pendingCount} {pendingCount === 1 ? 'tarea pendiente detectada' : 'tareas pendientes detectadas'}
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center space-x-1 p-1 bg-white border border-[#EAEAEA] rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'all' ? 'bg-[#222222] text-white' : 'text-[#666666] hover:text-[#222222]'
              }`}
            >
              Todas ({allTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-[#222222] text-white'
                  : 'text-[#666666] hover:text-[#222222]'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-[#222222] text-white'
                  : 'text-[#666666] hover:text-[#222222]'
              }`}
            >
              Completadas ({allTasks.length - pendingCount})
            </button>
          </div>
        </div>

        {/* List of Tasks */}
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-12 text-center text-[#888888]">
            <p className="text-xs uppercase tracking-widest mb-1">No hay tareas</p>
            <p className="text-sm font-light">
              Escribe acciones o listas en tu cuaderno y se organizarán aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#EAEAEA] rounded-xl divide-y divide-[#F0F0ED] overflow-hidden shadow-xs">
            {filtered.map(({ page, item }) => (
              <div
                key={item.id}
                className={`p-4 flex items-start space-x-3 transition-colors hover:bg-[#F7F7F5] ${
                  item.completed ? 'bg-[#FAFAFA] opacity-60' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => onToggleTask(page.id, item.id, !item.completed)}
                  className="mt-0.5 text-[#222222] hover:text-black transition-transform active:scale-95 shrink-0"
                >
                  {item.completed ? (
                    <CheckSquare className="w-5 h-5 text-[#222222]" />
                  ) : (
                    <Square className="w-5 h-5 text-[#666666]" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm sm:text-base font-normal ${
                      item.completed ? 'line-through text-[#888888]' : 'text-[#222222]'
                    }`}
                  >
                    {item.text}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#666666]">
                    {item.date && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#EAEAEA]">
                        <Calendar className="w-3 h-3 text-[#666666]" />
                        <span>{item.date}</span>
                      </span>
                    )}

                    {item.time && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#EAEAEA]">
                        <Clock className="w-3 h-3 text-[#666666]" />
                        <span>{item.time}</span>
                      </span>
                    )}

                    {item.tags?.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#EAEAEA] text-[#333333]"
                      >
                        <Tag className="w-2.5 h-2.5 mr-0.5" />
                        <span>{t}</span>
                      </span>
                    ))}

                    <span className="text-[#AAAAAA] ml-auto text-[10px]">
                      De: {page.title || page.date}
                    </span>
                  </div>
                </div>

                {/* Navigate to original note */}
                <button
                  type="button"
                  onClick={() => onNavigateToPage(page.id)}
                  className="p-1.5 text-[#888888] hover:text-[#222222] hover:bg-[#EAEAEA] rounded transition-colors"
                  title="Ver en nota original"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
