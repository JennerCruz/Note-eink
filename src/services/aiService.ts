import { InterpretedDocument, InkPage } from '../types/ink';
import { parseHandwrittenTextToSemantic } from './semanticParser';

export interface InterpretOptions {
  rawText?: string;
  strokeSummary?: string;
  contextDate?: string;
}

export class AIService {
  /**
   * Interprets handwritten text or strokes using Gemini 3.8 Flash on server,
   * falling back seamlessly to client-side rule engine if server is unreachable or offline.
   */
  public static async interpretContent(options: InterpretOptions): Promise<{
    interpreted: InterpretedDocument;
    source: 'gemini' | 'local';
    error?: string;
  }> {
    const fallback = parseHandwrittenTextToSemantic(options.rawText || '');

    try {
      const res = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        return { interpreted: fallback, source: 'local' };
      }

      const data = await res.json();
      if (data.result && data.result.cleanedText) {
        const geminiResult: InterpretedDocument = {
          title: data.result.title || fallback.title,
          cleanedText: data.result.cleanedText,
          summary: data.result.summary,
          type: data.result.type || fallback.type,
          items: (data.result.items || []).map((it: any, idx: number) => ({
            id: `ai-item-${Date.now()}-${idx}`,
            type: it.type || 'note',
            text: it.text,
            completed: !!it.completed,
            date: it.date || null,
            time: it.time || null,
            priority: it.priority || 'normal',
            tags: it.tags || [],
          })),
          confidence: data.result.confidence || 0.95,
          suggestion: data.result.suggestion,
          lastAnalyzedTimestamp: Date.now(),
        };

        return { interpreted: geminiResult, source: 'gemini' };
      }

      return { interpreted: fallback, source: 'local' };
    } catch {
      return { interpreted: fallback, source: 'local' };
    }
  }

  /**
   * Ask questions about user's notebook and notes
   */
  public static async askNotes(question: string, pages: InkPage[]): Promise<string> {
    try {
      const contextNotes = pages.map((p) => ({
        date: p.date,
        title: p.title,
        text: p.interpreted?.cleanedText || '',
      }));

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, notes: contextNotes }),
      });

      if (!res.ok) {
        return this.localSearchFallback(question, pages);
      }

      const data = await res.json();
      return data.answer || this.localSearchFallback(question, pages);
    } catch {
      return this.localSearchFallback(question, pages);
    }
  }

  private static localSearchFallback(question: string, pages: InkPage[]): string {
    const qLower = question.toLowerCase();
    const matches: string[] = [];

    for (const page of pages) {
      if (page.interpreted?.items) {
        for (const it of page.interpreted.items) {
          if (it.text.toLowerCase().includes(qLower)) {
            matches.push(`• [${page.date}] ${it.text}`);
          }
        }
      }
    }

    if (matches.length > 0) {
      return `Encontré las siguientes coincidencias en tus notas:\n\n${matches.join('\n')}`;
    }

    return `No se encontraron menciones directas de "${question}" en tus notas actuales.`;
  }
}
