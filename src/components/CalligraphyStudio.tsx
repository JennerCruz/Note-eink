import React, { useState, useRef, useEffect } from 'react';
import { HandwritingProfile, Stroke, Point } from '../types/ink';
import { HandwritingRenderer } from '../services/handwritingRenderer';
import { calculateStrokeBounds } from '../services/handwritingNormalizer';
import { PenTool, Check, RotateCcw, Sliders, Sparkles } from 'lucide-react';

interface CalligraphyStudioProps {
  profile: HandwritingProfile;
  onSaveProfile: (newProfile: HandwritingProfile) => void;
  onClose: () => void;
}

const SAMPLE_TRAINING_CHARACTERS = [
  { label: 'Vocales', chars: ['a', 'e', 'i', 'o', 'u'] },
  { label: 'Consonantes comunes', chars: ['m', 'p', 'l', 's', 'r', 't', 'c'] },
  { label: 'Especiales', chars: ['á', 'é', 'í', 'ó', 'ú', 'ñ'] },
  { label: 'Números', chars: ['1', '2', '3', '7', '0'] },
];

export const CalligraphyStudio: React.FC<CalligraphyStudioProps> = ({
  profile,
  onSaveProfile,
  onClose,
}) => {
  const [activeChar, setActiveChar] = useState<string>('a');
  const [slantAngle, setSlantAngle] = useState<number>(profile.slantAngle);
  const [strokeWidth, setStrokeWidth] = useState<number>(profile.strokeWidth);
  const [letterSpacing, setLetterSpacing] = useState<number>(profile.letterSpacing);
  const [wobbleFactor, setWobbleFactor] = useState<number>(profile.wobbleFactor);
  const [isTrained, setIsTrained] = useState<boolean>(profile.isTrained);

  // Local copy of glyphs
  const [glyphs, setGlyphs] = useState(profile.glyphs);

  // Canvas for drawing active character sample
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [charStrokes, setCharStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  // Preview canvas
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redraw preview canvas whenever parameters change
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 580;
    const height = 180;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Draw lined notebook background
    ctx.strokeStyle = '#EAEAEA';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 60);
    ctx.lineTo(width - 20, 60);
    ctx.moveTo(20, 115);
    ctx.lineTo(width - 20, 115);
    ctx.stroke();

    const currentProfile: HandwritingProfile = {
      ...profile,
      slantAngle,
      strokeWidth,
      letterSpacing,
      wobbleFactor,
      glyphs,
    };

    const previewText = 'Comprar leche mañana\nReunión lunes 10:00';
    const { strokes } = HandwritingRenderer.textToVectorStrokes(
      previewText,
      currentProfile,
      30,
      25,
      width - 40,
      { fontSize: 26, color: '#222222' }
    );

    HandwritingRenderer.drawStrokesToCanvas(ctx, strokes);

    ctx.restore();
  }, [profile, slantAngle, strokeWidth, letterSpacing, wobbleFactor, glyphs]);

  // Redraw active character training canvas
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 160;
    const height = 160;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Guide lines (baseline, x-height, ascender)
    ctx.strokeStyle = '#EAEAEA';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // x-height guide
    ctx.beginPath();
    ctx.moveTo(15, 65);
    ctx.lineTo(width - 15, 65);
    ctx.stroke();

    // baseline guide
    ctx.strokeStyle = '#D5D5D0';
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(15, 115);
    ctx.lineTo(width - 15, 115);
    ctx.stroke();

    // Existing recorded strokes for this char
    const existing = glyphs[activeChar]?.strokes || charStrokes;
    HandwritingRenderer.drawStrokesToCanvas(ctx, existing, { overrideColor: '#222222' });

    // Active stroke
    if (currentPoints.length > 0) {
      const activeStroke: Stroke = {
        id: 'active',
        tool: 'pen',
        color: '#222222',
        width: strokeWidth,
        points: currentPoints,
        bounds: calculateStrokeBounds(currentPoints),
        timestamp: Date.now(),
      };
      HandwritingRenderer.drawStrokesToCanvas(ctx, [activeStroke]);
    }

    ctx.restore();
  }, [activeChar, glyphs, charStrokes, currentPoints, strokeWidth]);

  // Switch active character
  const handleSelectChar = (char: string) => {
    setActiveChar(char);
    setCharStrokes(glyphs[char]?.strokes || []);
    setCurrentPoints([]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setCurrentPoints([{ x, y, pressure: 0.6, time: Date.now() }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPoints((prev) => [...prev, { x, y, pressure: 0.6, time: Date.now() }]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length > 0) {
      const newStroke: Stroke = {
        id: `glyph-${activeChar}-${Date.now()}`,
        tool: 'pen',
        color: '#222222',
        width: strokeWidth,
        points: currentPoints,
        bounds: calculateStrokeBounds(currentPoints),
        timestamp: Date.now(),
      };

      const updatedStrokes = [...charStrokes, newStroke];
      setCharStrokes(updatedStrokes);

      // Save to glyph map
      const allPoints = updatedStrokes.flatMap((s) => s.points);
      const bounds = calculateStrokeBounds(allPoints);

      setGlyphs((prev) => ({
        ...prev,
        [activeChar]: {
          char: activeChar,
          strokes: updatedStrokes,
          width: bounds.width,
          height: bounds.height,
        },
      }));
      setIsTrained(true);
    }
    setCurrentPoints([]);
  };

  const handleClearChar = () => {
    setCharStrokes([]);
    setGlyphs((prev) => {
      const copy = { ...prev };
      delete copy[activeChar];
      return copy;
    });
  };

  const handleSave = () => {
    const updated: HandwritingProfile = {
      ...profile,
      slantAngle,
      strokeWidth,
      letterSpacing,
      wobbleFactor,
      glyphs,
      isTrained: true,
      updatedAt: Date.now(),
    };
    onSaveProfile(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] border border-[#EAEAEA] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA]">
          <div>
            <h2 className="text-lg font-semibold text-[#222222]">Mi Caligrafía Personal</h2>
            <p className="text-xs text-[#666666]">
              "Mi propia letra, pero organizada sobre un renglón perfecto."
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[#666666] hover:bg-[#EAEAEA] text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Live Preview Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#444444]">
                Vista previa en tiempo real
              </span>
              <span className="text-xs text-[#888888]">
                {isTrained ? 'Perfil entrenado' : 'Modelo geométrico base'}
              </span>
            </div>
            <div className="p-3 bg-[#F7F7F5] border border-[#EAEAEA] rounded-lg overflow-x-auto flex justify-center">
              <canvas ref={previewCanvasRef} className="block" />
            </div>
          </div>

          {/* Character Training Pad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[#F7F7F5] border border-[#EAEAEA] rounded-lg flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-medium text-[#444444]">
                  Escribe la letra: <strong className="text-base text-[#222222] font-serif">{activeChar}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleClearChar}
                  className="text-xs text-[#666666] hover:text-red-600 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Borrar</span>
                </button>
              </div>

              <div className="relative border-2 border-dashed border-[#CCCCCC] rounded-lg bg-white overflow-hidden touch-none cursor-crosshair">
                <canvas
                  ref={drawCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="block"
                />
              </div>
              <p className="text-[11px] text-[#888888] mt-2 text-center">
                Dibuja con tu dedo o lápiz sobre la línea guía
              </p>
            </div>

            {/* Character Selector Palette */}
            <div className="space-y-3">
              <span className="text-xs font-medium text-[#444444]">
                Muestras para calibrar tu estilo:
              </span>
              {SAMPLE_TRAINING_CHARACTERS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="text-[11px] text-[#666666]">{group.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.chars.map((char) => {
                      const hasSample = !!glyphs[char];
                      return (
                        <button
                          key={char}
                          type="button"
                          onClick={() => handleSelectChar(char)}
                          className={`w-7 h-7 rounded text-sm font-medium transition-all ${
                            activeChar === char
                              ? 'bg-[#222222] text-white shadow-xs'
                              : hasSample
                              ? 'bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]'
                              : 'bg-white text-[#666666] border border-[#EAEAEA] hover:border-[#222222]'
                          }`}
                        >
                          {char}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Normalization & Aesthetic Sliders */}
          <div className="space-y-4 pt-2 border-t border-[#EAEAEA]">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-[#444444]">
              <Sliders className="w-3.5 h-3.5" />
              <span>Ajustes de Normalización Caligráfica</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Slant angle */}
              <div>
                <div className="flex justify-between text-[#444444] mb-1">
                  <span>Inclinación de trazo</span>
                  <span>{slantAngle}°</span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="18"
                  value={slantAngle}
                  onChange={(e) => setSlantAngle(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#EAEAEA] accent-[#222222] cursor-pointer"
                />
              </div>

              {/* Stroke width */}
              <div>
                <div className="flex justify-between text-[#444444] mb-1">
                  <span>Grosor de plumilla</span>
                  <span>{strokeWidth.toFixed(1)} px</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.1"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#EAEAEA] accent-[#222222] cursor-pointer"
                />
              </div>

              {/* Spacing */}
              <div>
                <div className="flex justify-between text-[#444444] mb-1">
                  <span>Espaciado entre letras</span>
                  <span>{(letterSpacing * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.85"
                  max="1.3"
                  step="0.05"
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#EAEAEA] accent-[#222222] cursor-pointer"
                />
              </div>

              {/* Human natural variation */}
              <div>
                <div className="flex justify-between text-[#444444] mb-1">
                  <span>Variación orgánica humana</span>
                  <span>{(wobbleFactor * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.05"
                  value={wobbleFactor}
                  onChange={(e) => setWobbleFactor(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#EAEAEA] accent-[#222222] cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#F7F7F5] border-t border-[#EAEAEA]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#666666] hover:bg-[#EAEAEA] rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center space-x-2 px-5 py-2 text-xs font-medium bg-[#222222] text-white hover:bg-black rounded-md transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Guardar mi caligrafía</span>
          </button>
        </div>
      </div>
    </div>
  );
};
