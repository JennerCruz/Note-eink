import { InkPage, HandwritingProfile, Stroke, ViewMode, PaperType } from '../types/ink';
import { createDefaultHandwritingProfile, HandwritingRenderer } from './handwritingRenderer';
import { parseHandwrittenTextToSemantic } from './semanticParser';

const STORAGE_KEY_PAGES = 'inkflow_pages_v1';
const STORAGE_KEY_PROFILE = 'inkflow_profile_v1';
const STORAGE_KEY_ACTIVE_PAGE = 'inkflow_active_page_id';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatFriendlyDate(dateStr: string): { dayName: string; formattedDate: string } {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
    return {
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      formattedDate: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1),
    };
  } catch {
    return { dayName: 'Hoy', formattedDate: dateStr };
  }
}

/**
 * Creates sample initial notes to provide an authentic, instant experience matching user prompt examples:
 * - "comprar leche mañana"
 * - "llamar a Juan 7 pm"
 * - "reunión lunes 10"
 * - "leche \n pan \n huevos \n café \n jabón"
 */
function createInitialPages(profile: HandwritingProfile): InkPage[] {
  const today = getTodayDateString();

  // Generate vector ink strokes for the sample text
  const sample1Text = 'comprar leche mañana\nllamar a Juan 7 pm\nreunión lunes 10';
  const { strokes: s1 } = HandwritingRenderer.textToVectorStrokes(
    sample1Text,
    profile,
    45,
    55,
    650,
    { fontSize: 26 }
  );

  const page1Interpreted = parseHandwrittenTextToSemantic(sample1Text);

  const page1: InkPage = {
    id: `page-${today}`,
    date: today,
    title: 'Notas de Hoy',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    strokes: s1,
    viewMode: 'original',
    paperType: 'ruled',
    digitalFont: 'Inter',
    interpreted: page1Interpreted,
  };

  const sample2Text = 'leche\npan\nhuevos\ncafé\njabón';
  const { strokes: s2 } = HandwritingRenderer.textToVectorStrokes(
    sample2Text,
    profile,
    45,
    55,
    650,
    { fontSize: 28 }
  );
  const page2Interpreted = parseHandwrittenTextToSemantic(sample2Text);

  const page2: InkPage = {
    id: 'page-sample-compras',
    date: today,
    title: 'Lista de compras',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    strokes: s2,
    viewMode: 'handwriting',
    paperType: 'ruled',
    digitalFont: 'Inter',
    interpreted: page2Interpreted,
  };

  return [page1, page2];
}

export class StorageService {
  public static loadProfile(): HandwritingProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    }
    const defaultProfile = createDefaultHandwritingProfile();
    this.saveProfile(defaultProfile);
    return defaultProfile;
  }

  public static saveProfile(profile: HandwritingProfile): void {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  }

  public static loadPages(): InkPage[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PAGES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading pages:', e);
    }

    const profile = this.loadProfile();
    const initialPages = createInitialPages(profile);
    this.savePages(initialPages);
    return initialPages;
  }

  public static savePages(pages: InkPage[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PAGES, JSON.stringify(pages));
    } catch (e) {
      console.error('Error saving pages:', e);
    }
  }

  public static getOrCreateTodayPage(): InkPage {
    const today = getTodayDateString();
    const pages = this.loadPages();
    let todayPage = pages.find((p) => p.date === today);

    if (!todayPage) {
      todayPage = {
        id: `page-${today}-${Date.now()}`,
        date: today,
        title: 'Página de hoy',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        strokes: [],
        viewMode: 'original',
        paperType: 'ruled',
        digitalFont: 'Inter',
        interpreted: parseHandwrittenTextToSemantic(''),
      };
      pages.unshift(todayPage);
      this.savePages(pages);
    }

    return todayPage;
  }

  public static savePage(updatedPage: InkPage): void {
    const pages = this.loadPages();
    const index = pages.findIndex((p) => p.id === updatedPage.id);
    if (index >= 0) {
      pages[index] = { ...updatedPage, updatedAt: Date.now() };
    } else {
      pages.unshift({ ...updatedPage, updatedAt: Date.now() });
    }
    this.savePages(pages);
  }

  public static deletePage(pageId: string): InkPage[] {
    const pages = this.loadPages().filter((p) => p.id !== pageId);
    this.savePages(pages);
    return pages;
  }
}
