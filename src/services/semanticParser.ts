import { InterpretedDocument, SemanticItem, ContentType, Stroke } from '../types/ink';

// Spanish action verbs indicating tasks
const TASK_VERBS = [
  'comprar', 'llamar', 'revisar', 'pagar', 'enviar', 'hacer', 'terminar',
  'estudiar', 'ir', 'cocinar', 'limpiar', 'escribir', 'entregar', 'buscar',
  'pedir', 'preguntar', 'mandar', 'reservar', 'organizar', 'sacar', 'recoger',
  'llevar', 'arreglar', 'cambiar', 'firmar', 'actualizar', 'leer', 'preparar'
];

// Event indicator words
const EVENT_WORDS = [
  'reunión', 'reunion', 'cita', 'junta', 'llamada', 'cumpleaños', 'cumple',
  'evento', 'clase', 'vuelo', 'conferencia', 'médico', 'medico', 'dentista',
  'almuerzo', 'cena', 'desayuno', 'partido', 'entrenamiento'
];

// Relative dates
const DATE_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /\b(hoy)\b/i, label: 'Hoy' },
  { regex: /\b(mañana|manana)\b/i, label: 'Mañana' },
  { regex: /\b(pasado mañana|pasado manana)\b/i, label: 'Pasado mañana' },
  { regex: /\b(el lunes|lunes)\b/i, label: 'Lunes' },
  { regex: /\b(el martes|martes)\b/i, label: 'Martes' },
  { regex: /\b(el miércoles|miercoles|el miercoles)\b/i, label: 'Miércoles' },
  { regex: /\b(el jueves|jueves)\b/i, label: 'Jueves' },
  { regex: /\b(el viernes|viernes)\b/i, label: 'Viernes' },
  { regex: /\b(el sábado|sabado|el sabado)\b/i, label: 'Sábado' },
  { regex: /\b(el domingo|domingo)\b/i, label: 'Domingo' },
  { regex: /\b(el fin de semana|fin de semana)\b/i, label: 'Fin de semana' },
  { regex: /\b(próxima semana|proxima semana)\b/i, label: 'Próxima semana' },
  { regex: /\b(\d{1,2}\s+(?:de\s+)?(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*)\b/i, label: 'Fecha' },
];

// Time patterns: "7 pm", "19:00", "a las 10", "10:30 am", "10 h", "10 hs"
const TIME_PATTERNS: RegExp[] = [
  /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.))\b/i,
  /\b([01]?\d|2[0-3]):([0-5]\d)\b/,
  /\b(?:a las|las)\s*(\d{1,2}(?::\d{2})?)\b/i,
  /\b(\d{1,2})\s*(?:h|hrs|horas)\b/i,
];

// Detect tags like #compras or mentions like @carlos
function extractTagsAndMentions(text: string): { cleanText: string; tags: string[] } {
  const tags: string[] = [];
  const tagMatches = text.match(/#[a-záéíóúñ0-9_]+/gi);
  if (tagMatches) {
    tags.push(...tagMatches.map(t => t.toLowerCase()));
  }
  const mentionMatches = text.match(/@[a-záéíóúñ0-9_]+/gi);
  if (mentionMatches) {
    tags.push(...mentionMatches.map(m => m.toLowerCase()));
  }
  return { cleanText: text, tags };
}

// Extract detected date string
function extractDate(text: string): { cleanText: string; date: string | null } {
  for (const { regex, label } of DATE_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      const detected = match[0];
      const clean = text.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
      return { cleanText: clean, date: label.startsWith('Fecha') ? detected : label };
    }
  }
  return { cleanText: text, date: null };
}

// Extract detected time string
function extractTime(text: string): { cleanText: string; time: string | null } {
  for (const regex of TIME_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      const timeStr = match[0].trim();
      const clean = text.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
      return { cleanText: clean, time: timeStr };
    }
  }
  return { cleanText: text, time: null };
}

// Clean up connecting prepositions left hanging after date/time extraction
function sanitizeActionText(text: string): string {
  return text
    .replace(/^[-•*□☐☑✓✔]\s*/, '')
    .replace(/\b(a las|para el|para|el|a)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Parses raw text lines (from OCR or ink clustering) into structured semantic items
 */
export function parseHandwrittenTextToSemantic(rawText: string): InterpretedDocument {
  if (!rawText.trim()) {
    return {
      title: 'Hoja en blanco',
      cleanedText: '',
      type: 'note',
      items: [],
      confidence: 1,
      lastAnalyzedTimestamp: Date.now(),
    };
  }

  // Split into lines or distinct comma/semicolon clauses if single line
  let rawLines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // If user wrote multiple things separated by commas and contains action verbs or list items:
  if (rawLines.length === 1 && (rawLines[0].includes(',') || rawLines[0].includes(' y '))) {
    const splitByConjunction = rawLines[0]
      .split(/,|\by\b/)
      .map(s => s.trim())
      .filter(s => s.length > 1);
    if (splitByConjunction.length >= 2) {
      rawLines = splitByConjunction;
    }
  }

  const items: SemanticItem[] = [];
  let taskCount = 0;
  let eventCount = 0;
  let listItemCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    let working = line;
    let completed = false;

    // Checkbox gestures: "□ leche", "[ ] pan", "✓ llamar"
    const checkboxMatch = working.match(/^([□☐\[\s*\]]|[☑✓✔]|\bx\b|\b-\b)\s*/i);
    let hasExplicitCheckbox = false;
    if (checkboxMatch) {
      hasExplicitCheckbox = true;
      const marker = checkboxMatch[1];
      if (/^[☑✓✔x]$/i.test(marker)) {
        completed = true;
      }
      working = working.replace(/^([□☐\[\s*\]]|[☑✓✔]|\bx\b|\b-\b)\s*/i, '');
    }

    // Strike-through indicators in text
    if (working.startsWith('~~') && working.endsWith('~~')) {
      completed = true;
      working = working.slice(2, -2).trim();
    }

    const { cleanText: afterDate, date } = extractDate(working);
    const { cleanText: afterTime, time } = extractTime(afterDate);
    const { cleanText: afterTags, tags } = extractTagsAndMentions(afterTime);
    const finalItemText = sanitizeActionText(afterTags);

    if (!finalItemText) continue;

    // Determine type: task, event, list_item, or note
    const lower = finalItemText.toLowerCase();
    const words = lower.split(/\s+/);
    const firstWord = words[0];

    const hasTaskVerb = TASK_VERBS.some(v => firstWord === v || lower.startsWith(v + ' '));
    const hasEventWord = EVENT_WORDS.some(e => lower.includes(e));

    let type: SemanticItem['type'] = 'note';

    if (hasEventWord && (date || time)) {
      type = 'event';
      eventCount++;
    } else if (hasTaskVerb || hasExplicitCheckbox || (date && words.length <= 6)) {
      type = 'task';
      taskCount++;
    } else if (rawLines.length > 2 && words.length <= 4) {
      type = 'list_item';
      listItemCount++;
    } else {
      type = 'note';
    }

    // Priority detection: "urgente", "importante", "!!!"
    let priority: SemanticItem['priority'] = 'normal';
    if (lower.includes('urgente') || lower.includes('importante') || lower.includes('!!!')) {
      priority = 'high';
    }

    // Capitalize first letter nicely
    const capitalizedText = finalItemText.charAt(0).toUpperCase() + finalItemText.slice(1);

    items.push({
      id: `item-${Date.now()}-${i}`,
      type,
      text: capitalizedText,
      rawText: line,
      completed,
      date,
      time,
      priority,
      tags,
    });
  }

  // Determine overall document type
  let docType: ContentType = 'note';
  if (taskCount > 0 && taskCount >= eventCount && taskCount >= listItemCount) {
    docType = 'task';
  } else if (eventCount > 0 && eventCount >= taskCount) {
    docType = 'event';
  } else if (listItemCount > 1 || (items.length > 1 && items.every(it => it.type === 'list_item' || it.type === 'task'))) {
    docType = 'list';
  } else if (items.length > 1) {
    docType = 'mixed';
  }

  // Generate a clean title
  let title = 'Nota del día';
  if (items.length > 0) {
    if (docType === 'list') {
      title = `Lista de ${items[0].text.split(' ')[0] || 'compras'}`;
    } else {
      title = items[0].text.length > 30 ? items[0].text.substring(0, 30) + '...' : items[0].text;
    }
  }

  // Suggestion when confidence is borderline or single item
  let suggestion: string | null = null;
  if (items.length === 1 && items[0].type === 'note' && items[0].text.split(' ').length <= 4) {
    suggestion = `¿Quieres convertir "${items[0].text}" en una tarea pendiente?`;
  }

  const cleanedText = items
    .map(it => {
      const datePart = it.date ? ` [${it.date}]` : '';
      const timePart = it.time ? ` [${it.time}]` : '';
      const prefix = it.type === 'task' || it.type === 'list_item' ? (it.completed ? '☑ ' : '☐ ') : '';
      return `${prefix}${it.text}${datePart}${timePart}`;
    })
    .join('\n');

  return {
    title,
    cleanedText,
    type: docType,
    items,
    confidence: items.length > 0 ? 0.92 : 0.6,
    suggestion,
    lastAnalyzedTimestamp: Date.now(),
  };
}

/**
 * Analyzes raw strokes to detect natural gestures:
 * 1. Strike-through (line cutting through existing ink strokes)
 * 2. Checkbox drawing (small square / loop on the left)
 * 3. Zig-zag erasure (rapid oscillating stroke)
 */
export function detectInkGestures(strokes: Stroke[]): {
  strikeThroughs: Stroke[];
  checkboxStrokes: Stroke[];
  erasureStrokes: Stroke[];
} {
  const strikeThroughs: Stroke[] = [];
  const checkboxStrokes: Stroke[] = [];
  const erasureStrokes: Stroke[] = [];

  for (const stroke of strokes) {
    if (stroke.points.length < 3) continue;

    const b = stroke.bounds;
    const aspect = b.width / Math.max(b.height, 1);

    // 1. Strike-through: mostly horizontal, wide, relatively low height
    if (b.width > 50 && b.height < 25 && aspect > 3.0) {
      strikeThroughs.push(stroke);
    }

    // 2. Square checkbox: roughly 1:1 aspect ratio, small dimension (12px - 36px)
    if (b.width >= 12 && b.width <= 40 && b.height >= 12 && b.height <= 40 && aspect >= 0.7 && aspect <= 1.4) {
      const first = stroke.points[0];
      const last = stroke.points[stroke.points.length - 1];
      const dist = Math.hypot(first.x - last.x, first.y - last.y);
      // If closed or near-closed polygon
      if (dist < 15) {
        checkboxStrokes.push(stroke);
      }
    }

    // 3. Zig-zag erase: rapid reversal of direction in X
    let directionChanges = 0;
    let lastDx = 0;
    for (let i = 2; i < stroke.points.length; i++) {
      const dx = stroke.points[i].x - stroke.points[i - 1].x;
      if (Math.abs(dx) > 3) {
        if (lastDx !== 0 && Math.sign(dx) !== Math.sign(lastDx)) {
          directionChanges++;
        }
        lastDx = dx;
      }
    }
    if (directionChanges >= 4 && b.width < 120 && b.height < 60) {
      erasureStrokes.push(stroke);
    }
  }

  return { strikeThroughs, checkboxStrokes, erasureStrokes };
}
