import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stroke, Point, InkTool, PaperType, HandwritingProfile } from '../types/ink';
import { calculateStrokeBounds, calculateStrokeSlant } from '../services/handwritingNormalizer';
import { HandwritingRenderer } from '../services/handwritingRenderer';
import { Undo, Redo, Eraser, Pen, Edit3, Highlighter, Trash2, Sparkles } from 'lucide-react';

interface InkCanvasProps {
  strokes: Stroke[];
  onStrokesChange: (newStrokes: Stroke[]) => void;
  paperType: PaperType;
  profile: HandwritingProfile;
  readOnly?: boolean;
}

export const InkCanvas: React.FC<InkCanvasProps> = ({
  strokes,
  onStrokesChange,
  paperType,
  profile,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<InkTool>('pen');
  const [strokeWidth, setStrokeWidth] = useState<number>(2.4);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([strokes]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Resize canvas according to device pixel ratio for super crisp e-ink feel
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.floor(rect.width);
    const height = Math.max(Math.floor(rect.height), 700);

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    renderCanvas();
  }, [strokes, paperType]);

  useEffect(() => {
    updateCanvasSize();
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  // Redraw canvas whenever strokes or paperType change
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Draw Paper Texture / Rule Lines
    drawPaperBackground(ctx, width, height, paperType);

    // Draw existing strokes
    HandwritingRenderer.drawStrokesToCanvas(ctx, strokes);

    // Draw active stroke being drawn right now
    if (currentPoints.length > 0) {
      const activeColor =
        activeTool === 'pen' ? '#222222' : activeTool === 'pencil' ? '#555555' : '#888888';
      const tempStroke: Stroke = {
        id: 'active',
        tool: activeTool,
        color: activeColor,
        width: activeTool === 'highlighter' ? 14 : strokeWidth,
        points: currentPoints,
        bounds: calculateStrokeBounds(currentPoints),
        timestamp: Date.now(),
      };
      HandwritingRenderer.drawStrokesToCanvas(ctx, [tempStroke]);
    }

    ctx.restore();
  }, [strokes, currentPoints, activeTool, strokeWidth, paperType]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer event handlers with touch/stylus/pressure capture
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    setIsDrawing(true);
    setCurrentPoints([{ x, y, pressure, time: Date.now() }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    // Stroke Eraser tool: deletes strokes that intersect current pointer position
    if (activeTool === 'eraser') {
      const remainingStrokes = strokes.filter((stroke) => {
        return !stroke.points.some((p) => Math.hypot(p.x - x, p.y - y) < 18);
      });
      if (remainingStrokes.length !== strokes.length) {
        commitStrokes(remainingStrokes);
      }
      return;
    }

    setCurrentPoints((prev) => [...prev, { x, y, pressure, time: Date.now() }]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Safe catch
      }
    }

    setIsDrawing(false);

    if (activeTool === 'eraser') {
      setCurrentPoints([]);
      return;
    }

    if (currentPoints.length > 0) {
      const bounds = calculateStrokeBounds(currentPoints);
      const activeColor =
        activeTool === 'pen' ? '#222222' : activeTool === 'pencil' ? '#555555' : '#666666';

      const newStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        tool: activeTool,
        color: activeColor,
        width: activeTool === 'highlighter' ? 14 : strokeWidth,
        points: currentPoints,
        bounds,
        timestamp: Date.now(),
      };

      commitStrokes([...strokes, newStroke]);
    }

    setCurrentPoints([]);
  };

  const commitStrokes = (newStrokes: Stroke[]) => {
    onStrokesChange(newStrokes);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newStrokes);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      onStrokesChange(history[nextIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      onStrokesChange(history[nextIndex]);
    }
  };

  const handleClear = () => {
    if (strokes.length > 0) {
      commitStrokes([]);
    }
  };

  // Quick handwriting sample injection for quick testing on devices without stylus
  const injectSample = (text: string) => {
    const { strokes: newStrokes } = HandwritingRenderer.textToVectorStrokes(
      text,
      profile,
      40,
      strokes.length > 0 ? (strokes[strokes.length - 1].bounds.maxY + 40) : 55,
      680,
      { fontSize: 26 }
    );
    commitStrokes([...strokes, ...newStrokes]);
  };

  return (
    <div className="relative w-full flex-1 flex flex-col min-h-[500px]" ref={containerRef}>
      {/* Minimalist Floating Tool Header */}
      {!readOnly && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#F7F7F5]/90 backdrop-blur-xs border-b border-[#EAEAEA] z-10 select-none">
          {/* Pen / Pencil / Eraser Switcher */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="tool-pen-btn"
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTool === 'pen'
                  ? 'bg-[#222222] text-[#F7F7F5]'
                  : 'bg-white text-[#444444] border border-[#EAEAEA] hover:bg-[#EAEAEA]'
              }`}
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Pluma</span>
            </button>

            <button
              id="tool-pencil-btn"
              type="button"
              onClick={() => setActiveTool('pencil')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTool === 'pencil'
                  ? 'bg-[#222222] text-[#F7F7F5]'
                  : 'bg-white text-[#444444] border border-[#EAEAEA] hover:bg-[#EAEAEA]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Lápiz</span>
            </button>

            <button
              id="tool-highlighter-btn"
              type="button"
              onClick={() => setActiveTool('highlighter')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTool === 'highlighter'
                  ? 'bg-[#222222] text-[#F7F7F5]'
                  : 'bg-white text-[#444444] border border-[#EAEAEA] hover:bg-[#EAEAEA]'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Resaltador</span>
            </button>

            <button
              id="tool-eraser-btn"
              type="button"
              onClick={() => setActiveTool('eraser')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTool === 'eraser'
                  ? 'bg-[#222222] text-[#F7F7F5]'
                  : 'bg-white text-[#444444] border border-[#EAEAEA] hover:bg-[#EAEAEA]'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Borrador</span>
            </button>
          </div>

          {/* History and Quick Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Stroke Thickness Selector */}
            <div className="hidden sm:flex items-center space-x-1 text-xs text-[#666666] mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#222222]" />
              <input
                type="range"
                min="1.5"
                max="5"
                step="0.5"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                className="w-16 h-1 bg-[#EAEAEA] accent-[#222222] cursor-pointer"
                title="Grosor de trazo"
              />
            </div>

            <button
              id="btn-undo"
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-md text-[#444444] hover:bg-[#EAEAEA] disabled:opacity-30 disabled:hover:bg-transparent"
              title="Deshacer"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-redo"
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-md text-[#444444] hover:bg-[#EAEAEA] disabled:opacity-30 disabled:hover:bg-transparent"
              title="Rehacer"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>

            <button
              id="btn-clear-canvas"
              type="button"
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-1.5 rounded-md text-[#666666] hover:bg-[#EAEAEA] hover:text-red-700 disabled:opacity-30"
              title="Limpiar hoja"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Handwriting Simulation Bar for fast testing */}
      {!readOnly && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#FFFFFF] border-b border-[#EAEAEA] text-[11px] text-[#666666] overflow-x-auto">
          <div className="flex items-center space-x-2 shrink-0">
            <Sparkles className="w-3 h-3 text-[#444444]" />
            <span className="font-medium text-[#444444]">Escribir rápido:</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => injectSample('comprar leche mañana')}
              className="px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#EAEAEA] hover:border-[#222222] transition-colors"
            >
              "comprar leche mañana"
            </button>
            <button
              type="button"
              onClick={() => injectSample('llamar a Juan 7 pm')}
              className="px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#EAEAEA] hover:border-[#222222] transition-colors"
            >
              "llamar a Juan 7 pm"
            </button>
            <button
              type="button"
              onClick={() => injectSample('reunión lunes 10')}
              className="px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#EAEAEA] hover:border-[#222222] transition-colors"
            >
              "reunión lunes 10"
            </button>
            <button
              type="button"
              onClick={() => injectSample('leche\npan\nhuevos\ncafé')}
              className="px-2 py-0.5 rounded bg-[#F7F7F5] border border-[#EAEAEA] hover:border-[#222222] transition-colors"
            >
              "lista de compras"
            </button>
          </div>
        </div>
      )}

      {/* Interactive Writing Canvas */}
      <div className="relative flex-1 w-full overflow-hidden touch-none cursor-crosshair">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 block w-full h-full"
        />

        {strokes.length === 0 && !isDrawing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-[#AAAAAA] select-none">
            <div className="font-sans text-xs tracking-widest uppercase mb-1">
              Área libre de escritura
            </div>
            <div className="text-sm font-light">
              Escribe con tu dedo, stylus o lápiz aquí
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Paper pattern drawer
function drawPaperBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  type: PaperType
) {
  // Base paper color
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  if (type === 'blank') {
    return;
  }

  if (type === 'ruled') {
    ctx.save();
    ctx.strokeStyle = '#EAEAEA';
    ctx.lineWidth = 1;
    const lineStep = 38;

    for (let y = 60; y < height; y += lineStep) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(width - 30, y);
      ctx.stroke();
    }

    // Left vertical margin guide line
    ctx.strokeStyle = '#F0ECE1';
    ctx.beginPath();
    ctx.moveTo(65, 0);
    ctx.lineTo(65, height);
    ctx.stroke();

    ctx.restore();
  } else if (type === 'dots') {
    ctx.save();
    ctx.fillStyle = '#D5D5D0';
    const dotSpacing = 28;
    for (let x = 30; x < width - 20; x += dotSpacing) {
      for (let y = 40; y < height - 20; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  } else if (type === 'grid') {
    ctx.save();
    ctx.strokeStyle = '#F0F0ED';
    ctx.lineWidth = 1;
    const gridStep = 24;
    for (let x = 30; x < width - 20; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 30; y < height - 20; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
