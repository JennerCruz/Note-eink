import { HandwritingProfile, Stroke, Point } from '../types/ink';

export interface RenderWordOptions {
  fontSize?: number;
  color?: string;
  slant?: number;
  wobble?: number;
}

/**
 * Standard vector strokes for character glyphs (represented in a normalized 100x100 box,
 * baseline at y=75, x-height at y=40, ascenders at y=15, descenders at y=95).
 */
const DEFAULT_GLYPH_STROKES: Record<string, number[][][]> = {
  // Each character contains an array of strokes, each stroke is an array of [x, y] coordinates
  a: [[[75, 45], [45, 40], [25, 55], [25, 70], [45, 75], [75, 70], [75, 40], [75, 75], [82, 73]]],
  b: [[[25, 15], [25, 75], [30, 75]], [[25, 48], [55, 42], [75, 52], [75, 68], [50, 75], [25, 74]]],
  c: [[[75, 45], [50, 40], [25, 55], [25, 68], [50, 75], [75, 72]]],
  d: [[[75, 15], [75, 75], [82, 74]], [[75, 48], [50, 42], [25, 55], [25, 68], [50, 75], [75, 72]]],
  e: [[[25, 58], [75, 54], [72, 42], [50, 40], [25, 52], [25, 68], [52, 75], [75, 72]]],
  f: [[[65, 20], [45, 15], [35, 28], [35, 75]], [[20, 45], [55, 45]]],
  g: [[[75, 45], [45, 40], [25, 55], [25, 70], [50, 75], [75, 70], [75, 40]], [[75, 45], [75, 92], [60, 98], [35, 95], [25, 85]]],
  h: [[[25, 15], [25, 75]], [[25, 50], [45, 42], [70, 45], [72, 75]]],
  i: [[[45, 42], [45, 73], [52, 74]], [[45, 26], [45, 28]]],
  j: [[[55, 42], [55, 92], [42, 98], [25, 94]], [[55, 26], [55, 28]]],
  k: [[[25, 15], [25, 75]], [[68, 42], [30, 58], [68, 75]]],
  l: [[[40, 15], [40, 72], [48, 75]]],
  m: [[[20, 45], [20, 75]], [[20, 52], [38, 42], [50, 45], [50, 75]], [[50, 52], [68, 42], [80, 45], [80, 75]]],
  n: [[[25, 45], [25, 75]], [[25, 52], [48, 42], [72, 45], [72, 75]]],
  o: [[[50, 40], [25, 55], [25, 68], [50, 75], [75, 68], [75, 52], [52, 40]]],
  p: [[[25, 42], [25, 98]], [[25, 48], [55, 42], [75, 52], [75, 65], [50, 74], [25, 73]]],
  q: [[[75, 48], [50, 42], [25, 55], [25, 68], [50, 75], [75, 70]], [[75, 42], [75, 98], [85, 90]]],
  r: [[[30, 45], [30, 75]], [[30, 54], [48, 42], [68, 44]]],
  s: [[[70, 45], [45, 40], [28, 48], [35, 58], [68, 62], [65, 72], [40, 75], [25, 70]]],
  t: [[[45, 22], [45, 72], [55, 74]], [[25, 45], [65, 45]]],
  u: [[[28, 42], [28, 68], [48, 75], [72, 68], [72, 42]], [[72, 55], [72, 74]]],
  v: [[[25, 42], [48, 75], [72, 42]]],
  w: [[[20, 42], [35, 75], [50, 52], [65, 75], [80, 42]]],
  x: [[[25, 42], [75, 75]], [[75, 42], [25, 75]]],
  y: [[[25, 42], [48, 68], [72, 42]], [[72, 42], [45, 92], [28, 95]]],
  z: [[[25, 42], [72, 42], [28, 75], [75, 75]]],
  á: [[[75, 45], [45, 40], [25, 55], [25, 70], [45, 75], [75, 70], [75, 40], [75, 75]], [[45, 28], [65, 18]]],
  é: [[[25, 58], [75, 54], [72, 42], [50, 40], [25, 52], [25, 68], [52, 75], [75, 72]], [[45, 28], [65, 18]]],
  í: [[[45, 42], [45, 73], [52, 74]], [[38, 28], [55, 18]]],
  ó: [[[50, 40], [25, 55], [25, 68], [50, 75], [75, 68], [75, 52], [52, 40]], [[45, 28], [65, 18]]],
  ú: [[[28, 42], [28, 68], [48, 75], [72, 68], [72, 42]], [[72, 55], [72, 74]], [[45, 28], [65, 18]]],
  ñ: [[[25, 45], [25, 75]], [[25, 52], [48, 42], [72, 45], [72, 75]], [[25, 26], [42, 20], [58, 28], [75, 22]]],

  // Uppercase
  A: [[[50, 15], [20, 75]], [[50, 15], [80, 75]], [[32, 52], [68, 52]]],
  B: [[[25, 15], [25, 75]], [[25, 15], [60, 15], [72, 28], [60, 45], [25, 45]], [[25, 45], [65, 45], [78, 58], [65, 75], [25, 75]]],
  C: [[[78, 25], [50, 15], [25, 35], [25, 55], [50, 75], [78, 68]]],
  D: [[[25, 15], [25, 75]], [[25, 15], [58, 15], [78, 35], [78, 55], [58, 75], [25, 75]]],
  E: [[[25, 15], [25, 75]], [[25, 15], [75, 15]], [[25, 45], [65, 45]], [[25, 75], [75, 75]]],
  F: [[[25, 15], [25, 75]], [[25, 15], [75, 15]], [[25, 45], [62, 45]]],
  G: [[[78, 25], [50, 15], [25, 35], [25, 55], [50, 75], [75, 75], [75, 48], [55, 48]]],
  H: [[[25, 15], [25, 75]], [[75, 15], [75, 75]], [[25, 45], [75, 45]]],
  I: [[[35, 15], [65, 15]], [[50, 15], [50, 75]], [[35, 75], [65, 75]]],
  J: [[[68, 15], [68, 65], [55, 75], [35, 75], [25, 62]]],
  K: [[[25, 15], [25, 75]], [[75, 18], [28, 48], [75, 75]]],
  L: [[[30, 15], [30, 75]], [[30, 75], [75, 75]]],
  M: [[[20, 75], [20, 15], [50, 52], [80, 15], [80, 75]]],
  N: [[[25, 75], [25, 15], [75, 75], [75, 15]]],
  O: [[[50, 15], [22, 38], [22, 58], [50, 75], [78, 58], [78, 38], [50, 15]]],
  P: [[[25, 15], [25, 75]], [[25, 15], [60, 15], [75, 28], [60, 48], [25, 48]]],
  Q: [[[50, 15], [22, 38], [22, 58], [50, 75], [78, 58], [78, 38], [50, 15]], [[55, 58], [80, 80]]],
  R: [[[25, 15], [25, 75]], [[25, 15], [60, 15], [75, 28], [60, 48], [25, 48]], [[48, 48], [75, 75]]],
  S: [[[72, 25], [48, 15], [28, 28], [35, 42], [68, 50], [72, 65], [50, 75], [25, 68]]],
  T: [[[20, 15], [80, 15]], [[50, 15], [50, 75]]],
  U: [[[25, 15], [25, 62], [48, 75], [75, 62], [75, 15]]],
  V: [[[22, 15], [50, 75], [78, 15]]],
  W: [[[18, 15], [35, 75], [50, 42], [65, 75], [82, 15]]],
  X: [[[25, 15], [75, 75]], [[75, 15], [25, 75]]],
  Y: [[[22, 15], [50, 48], [78, 15]], [[50, 48], [50, 75]]],
  Z: [[[25, 15], [75, 15], [28, 75], [75, 75]]],

  // Digits
  '0': [[[50, 15], [25, 38], [25, 58], [50, 75], [75, 58], [75, 38], [50, 15]]],
  '1': [[[32, 28], [50, 15], [50, 75]], [[30, 75], [70, 75]]],
  '2': [[[28, 30], [45, 15], [68, 22], [70, 38], [25, 75], [75, 75]]],
  '3': [[[25, 20], [68, 18], [45, 42], [70, 52], [68, 72], [42, 75], [25, 68]]],
  '4': [[[60, 75], [60, 15], [20, 52], [78, 52]]],
  '5': [[[68, 15], [30, 15], [28, 42], [55, 38], [72, 50], [70, 68], [48, 75], [25, 70]]],
  '6': [[[65, 20], [35, 35], [25, 55], [45, 75], [70, 68], [68, 50], [40, 45], [26, 55]]],
  '7': [[[25, 15], [75, 15], [42, 75]], [[32, 45], [58, 45]]],
  '8': [[[50, 15], [30, 25], [32, 40], [68, 55], [68, 68], [48, 75], [28, 65], [68, 38], [68, 25], [50, 15]]],
  '9': [[[72, 45], [55, 45], [30, 38], [32, 22], [50, 15], [70, 25], [72, 75]]],

  // Punctuation & symbols
  '.': [[[48, 72], [48, 75]]],
  ',': [[[50, 70], [50, 76], [42, 84]]],
  ':': [[[50, 45], [50, 48]], [[50, 72], [50, 75]]],
  ';': [[[50, 45], [50, 48]], [[50, 70], [50, 76], [42, 84]]],
  '-': [[[30, 55], [70, 55]]],
  '+': [[[30, 55], [70, 55]], [[50, 35], [50, 75]]],
  '!': [[[50, 18], [50, 58]], [[50, 72], [50, 75]]],
  '?': [[[30, 28], [48, 15], [68, 25], [65, 38], [50, 48], [50, 58]], [[50, 72], [50, 75]]],
  '(': [[[60, 15], [40, 45], [60, 75]]],
  ')': [[[40, 15], [60, 45], [40, 75]]],
  '/': [[[25, 75], [75, 15]]],
  '#': [[[35, 20], [35, 75]], [[65, 20], [65, 75]], [[20, 38], [80, 38]], [[20, 58], [80, 58]]],
  '@': [[[68, 48], [50, 40], [35, 52], [35, 68], [52, 75], [75, 68], [75, 45], [50, 25], [20, 45], [20, 72], [45, 88], [75, 85]]],
  ' ': []
};

/**
 * Creates a default handwriting profile for a user
 */
export function createDefaultHandwritingProfile(): HandwritingProfile {
  return {
    id: 'user-profile-default',
    name: 'Mi caligrafía natural',
    slantAngle: 6, // slight natural forward slant
    strokeWidth: 2.2,
    letterSpacing: 1.05,
    lineHeight: 48,
    wobbleFactor: 0.18, // subtle organic human variation
    glyphs: {},
    isTrained: false,
    updatedAt: Date.now(),
  };
}

/**
 * HandwritingRenderer:
 * Takes text and turns it into organized vector handwriting strokes aligned to ruled lines.
 */
export class HandwritingRenderer {
  /**
   * Generates vector strokes for a given string using the user's calligraphy profile
   */
  public static textToVectorStrokes(
    text: string,
    profile: HandwritingProfile,
    startX: number = 40,
    startY: number = 60,
    maxWidth: number = 700,
    options: RenderWordOptions = {}
  ): { strokes: Stroke[]; totalHeight: number } {
    const fontSize = options.fontSize || 32;
    const baseColor = options.color || '#222222';
    const slant = (options.slant !== undefined ? options.slant : profile.slantAngle) * (Math.PI / 180);
    const wobble = options.wobble !== undefined ? options.wobble : profile.wobbleFactor;
    const lineHeight = profile.lineHeight || 48;
    const letterWidth = (fontSize * 0.6) * profile.letterSpacing;

    const strokes: Stroke[] = [];
    let currentX = startX;
    let currentY = startY;

    // Pseudo-random seeded jitter to give natural human variation per character
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const lines = text.split('\n');

    lines.forEach((line) => {
      currentX = startX;
      const chars = Array.from(line);

      for (let cIdx = 0; cIdx < chars.length; cIdx++) {
        const char = chars[cIdx];

        if (char === ' ') {
          currentX += letterWidth * 0.9;
          continue;
        }

        // Wrap to next line if exceeding maxWidth
        if (currentX > maxWidth - 60) {
          currentX = startX;
          currentY += lineHeight;
        }

        // Check if user has a custom trained glyph for this char, else fallback to parametric glyph
        const customGlyph = profile.glyphs[char];
        if (customGlyph && customGlyph.strokes && customGlyph.strokes.length > 0) {
          // Render trained stroke
          const scale = fontSize / Math.max(customGlyph.height || 100, 30);
          customGlyph.strokes.forEach((customStroke, sIdx) => {
            const transformedPoints: Point[] = customStroke.points.map((p) => {
              const xJitter = (pseudoRandom() - 0.5) * wobble * 3;
              const yJitter = (pseudoRandom() - 0.5) * wobble * 3;
              const normalizedX = (p.x - customStroke.bounds.minX) * scale;
              const normalizedY = (p.y - customStroke.bounds.minY) * scale;
              // Apply slant
              const slantedX = normalizedX + (normalizedY - fontSize * 0.5) * Math.tan(slant);

              return {
                x: currentX + slantedX + xJitter,
                y: currentY + normalizedY + yJitter,
                pressure: p.pressure ?? 0.6,
                time: Date.now(),
              };
            });

            strokes.push({
              id: `callig-${char}-${cIdx}-${sIdx}-${Date.now()}`,
              tool: 'pen',
              color: baseColor,
              width: profile.strokeWidth * (fontSize / 32),
              points: transformedPoints,
              bounds: {
                minX: currentX,
                minY: currentY,
                maxX: currentX + letterWidth,
                maxY: currentY + fontSize,
                width: letterWidth,
                height: fontSize,
              },
              timestamp: Date.now(),
            });
          });
        } else {
          // Use parametric glyph template
          const glyphRaw = DEFAULT_GLYPH_STROKES[char] || DEFAULT_GLYPH_STROKES[char.toLowerCase()] || null;
          if (glyphRaw) {
            const charScale = fontSize / 100;
            glyphRaw.forEach((strokeCoords, sIdx) => {
              const points: Point[] = strokeCoords.map(([gx, gy]) => {
                const normX = gx * charScale;
                const normY = gy * charScale;
                const slantedX = normX + (normY - fontSize * 0.5) * Math.tan(slant);
                const xJitter = (pseudoRandom() - 0.5) * wobble * 2.5;
                const yJitter = (pseudoRandom() - 0.5) * wobble * 2.5;

                return {
                  x: currentX + slantedX + xJitter,
                  y: currentY + normY + yJitter,
                  pressure: 0.6 + (pseudoRandom() - 0.5) * 0.2,
                  time: Date.now(),
                };
              });

              strokes.push({
                id: `callig-param-${char}-${cIdx}-${sIdx}`,
                tool: 'pen',
                color: baseColor,
                width: profile.strokeWidth * (fontSize / 32),
                points,
                bounds: {
                  minX: currentX,
                  minY: currentY,
                  maxX: currentX + letterWidth,
                  maxY: currentY + fontSize,
                  width: letterWidth,
                  height: fontSize,
                },
                timestamp: Date.now(),
              });
            });
          }
        }

        currentX += letterWidth;
      }

      currentY += lineHeight;
    });

    return {
      strokes,
      totalHeight: currentY - startY + lineHeight,
    };
  }

  /**
   * Renders strokes cleanly onto a canvas context with smooth Bezier splines
   */
  public static drawStrokesToCanvas(
    ctx: CanvasRenderingContext2D,
    strokes: Stroke[],
    options: {
      scale?: number;
      offsetX?: number;
      offsetY?: number;
      overrideColor?: string;
    } = {}
  ): void {
    const scale = options.scale || 1;
    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;

    ctx.save();

    for (const stroke of strokes) {
      if (stroke.points.length === 0) continue;

      ctx.beginPath();
      ctx.strokeStyle = options.overrideColor || stroke.color;
      ctx.lineWidth = stroke.width * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#D1D5DB';
      } else if (stroke.tool === 'pencil') {
        ctx.globalAlpha = 0.8;
      } else {
        ctx.globalAlpha = 1.0;
      }

      const points = stroke.points;
      if (points.length === 1) {
        const p = points[0];
        ctx.arc((p.x + offsetX) * scale, (p.y + offsetY) * scale, (stroke.width * scale) / 2, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
        continue;
      }

      ctx.moveTo((points[0].x + offsetX) * scale, (points[0].y + offsetY) * scale);

      for (let i = 1; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const midX = ((current.x + next.x) / 2 + offsetX) * scale;
        const midY = ((current.y + next.y) / 2 + offsetY) * scale;
        ctx.quadraticCurveTo(
          (current.x + offsetX) * scale,
          (current.y + offsetY) * scale,
          midX,
          midY
        );
      }

      const last = points[points.length - 1];
      ctx.lineTo((last.x + offsetX) * scale, (last.y + offsetY) * scale);
      ctx.stroke();
    }

    ctx.restore();
  }
}
