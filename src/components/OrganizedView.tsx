import React, { useRef, useEffect } from 'react';
import { InkPage, HandwritingProfile, SemanticItem } from '../types/ink';
import { HandwritingRenderer } from '../services/handwritingRenderer';
import { CheckSquare, Square, Calendar, Clock, Tag, HelpCircle, Check, ArrowRight } from 'lucide-react';

interface OrganizedViewProps {
  page: InkPage;
  profile: HandwritingProfile;
  onUpdateItem: (itemId: string, updates: Partial<SemanticItem>) => void;
  onAcceptSuggestion?: () => void;
  onDismissSuggestion?: () => void;
}

export const OrganizedView: React.FC<OrganizedViewProps> = ({
  page,
  profile,
  onUpdateItem,
  onAcceptSuggestion,
  onDismissSuggestion,
}) => {
  const isHandwritingMode = page.viewMode === 'handwriting';
  const interpreted = page.interpreted;
  const items = interpreted?.items || [];
  const suggestion = interpreted?.suggestion;

  return (
    <div className="w-full flex-1 flex flex-col p-4 sm:p-8 bg-[#FFFFFF] min-h-[600px] overflow-y-auto">
      {/* Subtle suggestion banner if interpretation is ambiguous */}
      {suggestion && onAcceptSuggestion && (
        <div className="mb-6 p-3.5 bg-[#F7F7F5] border border-[#EAEAEA] rounded-lg flex items-center justify-between text-xs sm:text-sm text-[#444444] animate-fadeIn">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-[#666666] shrink-0" />
            <span>{suggestion}</span>
          </div>
          <div className="flex items-center space-x-2 ml-4 shrink-0">
            <button
              type="button"
              onClick={onAcceptSuggestion}
              className="px-2.5 py-1 rounded bg-[#222222] text-[#FFFFFF] text-xs font-medium hover:bg-black transition-colors"
            >
              Convertir
            </button>
            <button
              type="button"
              onClick={onDismissSuggestion}
              className="px-2 py-1 rounded text-xs text-[#666666] hover:bg-[#EAEAEA] transition-colors"
            >
              Mantener como nota
            </button>
          </div>
        </div>
      )}

      {/* Empty state if no text recognized yet */}
      {items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-[#AAAAAA] py-16">
          <p className="text-xs uppercase tracking-widest mb-1">Sin contenido interpretado</p>
          <p className="text-sm font-light">Escribe algo en la hoja original para organizar tus notas y tareas.</p>
        </div>
      )}

      {/* Rendered Items */}
      <div className="space-y-4 max-w-2xl mx-auto w-full">
        {items.map((item, index) => {
          const isTask = item.type === 'task' || item.type === 'list_item';
          const isEvent = item.type === 'event';

          return (
            <div
              key={item.id || index}
              className={`group relative flex items-start space-x-3 p-3 rounded-lg transition-colors ${
                item.completed ? 'opacity-50' : 'hover:bg-[#F7F7F5]'
              }`}
            >
              {/* Checkbox for tasks / lists */}
              {isTask ? (
                <button
                  type="button"
                  onClick={() => onUpdateItem(item.id, { completed: !item.completed })}
                  className="mt-0.5 text-[#222222] hover:text-black transition-transform active:scale-95"
                  title={item.completed ? 'Marcar pendiente' : 'Marcar completado'}
                >
                  {item.completed ? (
                    <CheckSquare className="w-5 h-5 text-[#222222]" />
                  ) : (
                    <Square className="w-5 h-5 text-[#666666]" />
                  )}
                </button>
              ) : isEvent ? (
                <div className="mt-0.5 text-[#444444]">
                  <Calendar className="w-5 h-5 text-[#666666]" />
                </div>
              ) : (
                <div className="mt-2 w-2 h-2 rounded-full bg-[#888888] shrink-0" />
              )}

              {/* Content area: either Personal Handwriting canvas or Digital Font */}
              <div className="flex-1 flex flex-col min-w-0">
                {isHandwritingMode ? (
                  // Mode 2: "Mi caligrafía" - rendered as user's authentic personal handwriting vector curves!
                  <HandwritingWordCanvas
                    text={item.text}
                    profile={profile}
                    completed={item.completed}
                  />
                ) : (
                  // Mode 3: "Fuente digital" - clean typography (Inter / Newsreader / Space Mono)
                  <p
                    className={`text-base leading-relaxed tracking-normal transition-all ${
                      item.completed ? 'line-through text-[#888888]' : 'text-[#222222]'
                    } ${
                      page.digitalFont === 'Newsreader'
                        ? 'font-serif text-lg'
                        : page.digitalFont === 'Space Mono'
                        ? 'font-mono text-sm'
                        : 'font-sans'
                    }`}
                  >
                    {item.text}
                  </p>
                )}

                {/* Metadata Pills: Detected Dates, Times, Tags */}
                {(item.date || item.time || (item.tags && item.tags.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {item.date && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F7F7F5] border border-[#EAEAEA] text-[#444444]">
                        <Calendar className="w-3 h-3 text-[#666666]" />
                        <span>{item.date}</span>
                      </span>
                    )}

                    {item.time && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F7F7F5] border border-[#EAEAEA] text-[#444444]">
                        <Clock className="w-3 h-3 text-[#666666]" />
                        <span>{item.time}</span>
                      </span>
                    )}

                    {item.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded text-[11px] bg-[#EAEAEA] text-[#333333]"
                      >
                        <Tag className="w-2.5 h-2.5 mr-0.5" />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Individual word renderer for "Mi Caligrafía" mode
 */
const HandwritingWordCanvas: React.FC<{
  text: string;
  profile: HandwritingProfile;
  completed?: boolean;
}> = ({ text, profile, completed }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const fontSize = 28;
    const { strokes, totalHeight } = HandwritingRenderer.textToVectorStrokes(
      text,
      profile,
      10,
      10,
      600,
      {
        fontSize,
        color: completed ? '#888888' : '#222222',
      }
    );

    const width = 600;
    const height = Math.max(totalHeight + 10, 48);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    HandwritingRenderer.drawStrokesToCanvas(ctx, strokes);

    if (completed) {
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(8, height / 2);
      ctx.lineTo(Math.min(text.length * 18, width - 20), height / 2);
      ctx.stroke();
    }

    ctx.restore();
  }, [text, profile, completed]);

  return (
    <div className="overflow-x-hidden">
      <canvas ref={canvasRef} className="block pointer-events-none" />
    </div>
  );
};
