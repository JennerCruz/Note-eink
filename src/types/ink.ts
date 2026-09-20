export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export type InkTool = 'pen' | 'pencil' | 'highlighter' | 'eraser';

export interface StrokeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Stroke {
  id: string;
  tool: InkTool;
  color: string;
  width: number;
  points: Point[];
  bounds: StrokeBounds;
  timestamp: number;
}

export type ContentType = 'note' | 'task' | 'list' | 'event' | 'mixed';

export interface SemanticItem {
  id: string;
  type: 'task' | 'list_item' | 'event' | 'note';
  text: string;
  rawText?: string;
  completed?: boolean;
  date?: string | null;
  time?: string | null;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
  associatedStrokeIds?: string[];
  bounds?: StrokeBounds;
}

export interface InterpretedDocument {
  title: string;
  cleanedText: string;
  summary?: string;
  type: ContentType;
  items: SemanticItem[];
  confidence: number;
  suggestion?: string | null;
  lastAnalyzedTimestamp: number;
}

export type ViewMode = 'original' | 'handwriting' | 'font';
export type PaperType = 'blank' | 'ruled' | 'dots' | 'grid';
export type DigitalFontFamily = 'Inter' | 'Newsreader' | 'Space Mono';

export interface GlyphSample {
  char: string;
  strokes: Stroke[];
  width: number;
  height: number;
  baselineOffset?: number;
}

export interface HandwritingProfile {
  id: string;
  name: string;
  slantAngle: number; // degrees: e.g. -5 to 15
  strokeWidth: number; // base thickness
  letterSpacing: number; // multiplier
  lineHeight: number; // in pixels
  wobbleFactor: number; // 0 to 1 for human natural micro-variations
  glyphs: Record<string, GlyphSample>;
  isTrained: boolean;
  updatedAt: number;
}

export interface InkPage {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  createdAt: number;
  updatedAt: number;
  strokes: Stroke[];
  viewMode: ViewMode;
  paperType: PaperType;
  digitalFont: DigitalFontFamily;
  interpreted?: InterpretedDocument;
  userOverrideMode?: boolean;
}

export interface SearchResult {
  pageId: string;
  pageTitle: string;
  pageDate: string;
  matchedText: string;
  itemType: string;
  completed?: boolean;
}
