import React, { useState } from 'react';
import { InkPage, SemanticItem } from '../types/ink';
import { formatFriendlyDate, getTodayDateString } from '../services/storage';
import { Calendar as CalendarIcon, Clock, ArrowRight, CheckCircle, Circle } from 'lucide-react';

interface CalendarViewProps {
  pages: InkPage[];
  onNavigateToPage: (pageId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  pages,
  onNavigateToPage,
}) => {
  const todayStr = getTodayDateString();
  const { dayName: todayDay, formattedDate: todayFormatted } = formatFriendlyDate(todayStr);

  // Collect all dated items or events across pages
  const scheduledItems: { page: InkPage; item: SemanticItem }[] = [];
  for (const page of pages) {
    if (page.interpreted?.items) {
      for (const item of page.interpreted.items) {
        if (item.date || item.time || item.type === 'event') {
          scheduledItems.push({ page, item });
        }
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-[#F7F7F5] overflow-y-auto p-4 sm:p-8">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
          <div>
            <h1 className="text-xl font-serif font-medium text-[#222222]">Calendario y Agenda</h1>
            <p className="text-xs text-[#666666]">
              Hoy es {todayDay}, {todayFormatted}
            </p>
          </div>
        </div>

        {/* Timeline / Agenda List */}
        {scheduledItems.length === 0 ? (
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-12 text-center text-[#888888]">
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-[#CCCCCC]" />
            <p className="text-xs uppercase tracking-widest mb-1">Sin eventos ni citas programadas</p>
            <p className="text-sm font-light">
              Escribe citas como "reunión lunes 10" o "cita médico mañana" para verlas aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduledItems.map(({ page, item }) => (
              <div
                key={item.id}
                className="bg-white border border-[#EAEAEA] rounded-xl p-4 flex items-start justify-between shadow-xs hover:border-[#CCCCCC] transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-[#F7F7F5] border border-[#EAEAEA] text-[#222222] mt-0.5">
                    {item.type === 'event' ? (
                      <CalendarIcon className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-[#222222]">{item.text}</h4>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-[#666666]">
                      {item.date && (
                        <span className="font-semibold text-[#222222]">{item.date}</span>
                      )}
                      {item.time && (
                        <span>• a las {item.time}</span>
                      )}
                      <span className="text-[#AAAAAA]">• {page.title}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToPage(page.id)}
                  className="p-1.5 rounded text-[#888888] hover:text-[#222222] hover:bg-[#F7F7F5] transition-colors"
                  title="Ver nota"
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
