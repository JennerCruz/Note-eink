import { Stroke, StrokeBounds, Point } from '../types/ink';

export interface InkLineCluster {
  id: string;
  strokes: Stroke[];
  bounds: StrokeBounds;
  baselineY: number;
  xHeight: number;
  ascenderY: number;
  descenderY: number;
  meanStrokeHeight: number;
}

export interface NormalizedInkResult {
  clusters: InkLineCluster[];
  normalizedStrokes: Stroke[];
  averageSlantAngle: number;
  dominantHeight: number;
  suggestedBaselineStep: number;
}

/**
 * Computes exact bounding box for a set of points or strokes
 */
export function calculateStrokeBounds(points: Point[]): StrokeBounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

/**
 * Calculates slant/incline angle of a stroke by regression of points
 */
export function calculateStrokeSlant(points: Point[]): number {
  if (points.length < 5) return 0;
  // Calculate average tangent for downward strokes
  let sumAngles = 0;
  let count = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    // Look at downward vertical-ish movements (typical in handwriting stems)
    if (dy > 3) {
      const angle = (Math.atan2(dx, dy) * 180) / Math.PI; // 0 is straight down, positive is slanting right
      if (Math.abs(angle) < 45) {
        sumAngles += angle;
        count++;
      }
    }
  }

  return count > 0 ? sumAngles / count : 0;
}

/**
 * HandwritingNormalizer:
 * Takes raw unconstrained ink strokes, clusters them into horizontal writing lines,
 * calculates baseline, x-height, ascenders/descenders, and normalizes them onto uniform
 * aligned baselines while retaining the user's authentic stroke style, curvature, and pressure!
 */
export class HandwritingNormalizer {
  /**
   * Clusters strokes into distinct writing lines based on vertical proximity
   */
  public static clusterStrokesIntoLines(strokes: Stroke[]): InkLineCluster[] {
    if (strokes.length === 0) return [];

    // Sort strokes primarily by vertical center, then horizontal start
    const sorted = [...strokes].sort((a, b) => {
      const centerY_A = (a.bounds.minY + a.bounds.maxY) / 2;
      const centerY_B = (b.bounds.minY + b.bounds.maxY) / 2;
      return centerY_A - centerY_B;
    });

    const clusters: { strokes: Stroke[]; bounds: StrokeBounds }[] = [];

    for (const stroke of sorted) {
      const strokeCenterY = (stroke.bounds.minY + stroke.bounds.maxY) / 2;
      const strokeHeight = stroke.bounds.height;

      // Check if this stroke overlaps with an existing cluster
      let assignedCluster = -1;
      for (let c = 0; c < clusters.length; c++) {
        const clusterCenterY = (clusters[c].bounds.minY + clusters[c].bounds.maxY) / 2;
        const threshold = Math.max(clusterHeight(clusters[c].bounds), strokeHeight) * 0.75 + 15;

        if (Math.abs(strokeCenterY - clusterCenterY) < threshold) {
          assignedCluster = c;
          break;
        }
      }

      if (assignedCluster >= 0) {
        clusters[assignedCluster].strokes.push(stroke);
        clusters[assignedCluster].bounds = expandBounds(clusters[assignedCluster].bounds, stroke.bounds);
      } else {
        clusters.push({
          strokes: [stroke],
          bounds: { ...stroke.bounds },
        });
      }
    }

    // Sort each line cluster horizontally (left-to-right) and compute typography metrics
    return clusters.map((cluster, index) => {
      cluster.strokes.sort((a, b) => a.bounds.minX - b.bounds.minX);

      const b = cluster.bounds;
      // In handwriting, the baseline is typically at ~75% down from top of the line bounding box
      const baselineY = b.minY + b.height * 0.78;
      const xHeight = b.height * 0.45;
      const ascenderY = b.minY;
      const descenderY = b.maxY;
      const meanStrokeHeight = b.height;

      return {
        id: `line-${index}`,
        strokes: cluster.strokes,
        bounds: b,
        baselineY,
        xHeight,
        ascenderY,
        descenderY,
        meanStrokeHeight,
      };
    });
  }

  /**
   * Normalizes strokes to a target line height (e.g. 36px) and uniform line baselines
   * while preserving individual letter curvatures, pressure, and stroke personality!
   */
  public static normalizeInk(
    strokes: Stroke[],
    options: {
      targetLineHeight?: number;
      targetStartX?: number;
      targetStartY?: number;
      lineGap?: number;
    } = {}
  ): NormalizedInkResult {
    const targetLineHeight = options.targetLineHeight || 36;
    const targetStartX = options.targetStartX || 40;
    const targetStartY = options.targetStartY || 60;
    const lineGap = options.lineGap || 18;

    const clusters = this.clusterStrokesIntoLines(strokes);
    if (clusters.length === 0) {
      return {
        clusters: [],
        normalizedStrokes: [],
        averageSlantAngle: 0,
        dominantHeight: targetLineHeight,
        suggestedBaselineStep: targetLineHeight + lineGap,
      };
    }

    let totalSlant = 0;
    let slantCount = 0;
    let totalHeight = 0;

    for (const stroke of strokes) {
      const slant = calculateStrokeSlant(stroke.points);
      if (slant !== 0) {
        totalSlant += slant;
        slantCount++;
      }
      totalHeight += stroke.bounds.height;
    }

    const averageSlantAngle = slantCount > 0 ? totalSlant / slantCount : 4;
    const dominantHeight = strokes.length > 0 ? totalHeight / strokes.length : 32;

    const normalizedStrokes: Stroke[] = [];
    let currentY = targetStartY;

    clusters.forEach((cluster) => {
      // Scale factor to normalize huge or tiny handwriting to proportional legible height
      const originalHeight = Math.max(cluster.bounds.height, 10);
      const scaleY = targetLineHeight / originalHeight;
      // Proportional scale on X to avoid stretching or squishing letter forms
      const scaleX = scaleY;

      let currentX = targetStartX;
      const originalMinX = cluster.bounds.minX;

      cluster.strokes.forEach((stroke) => {
        // Compute position relative to the line's start
        const relativeX = (stroke.bounds.minX - originalMinX) * scaleX;
        const targetX = currentX + relativeX;

        // Align each stroke relative to the normalized baseline
        const relativeY = (stroke.bounds.minY - cluster.baselineY) * scaleY;
        const targetStrokeBaseY = currentY + targetLineHeight * 0.75;
        const targetYPos = targetStrokeBaseY + relativeY;

        const newPoints: Point[] = stroke.points.map((p) => ({
          x: targetX + (p.x - stroke.bounds.minX) * scaleX,
          y: targetYPos + (p.y - stroke.bounds.minY) * scaleY,
          pressure: p.pressure ?? 0.5,
          time: p.time,
        }));

        const newBounds = calculateStrokeBounds(newPoints);

        normalizedStrokes.push({
          ...stroke,
          id: `norm-${stroke.id}`,
          points: newPoints,
          bounds: newBounds,
          width: Math.max(1.5, stroke.width * Math.sqrt(scaleY)),
        });
      });

      currentY += targetLineHeight + lineGap;
    });

    return {
      clusters,
      normalizedStrokes,
      averageSlantAngle,
      dominantHeight,
      suggestedBaselineStep: targetLineHeight + lineGap,
    };
  }
}

function clusterHeight(b: StrokeBounds): number {
  return b.height;
}

function expandBounds(a: StrokeBounds, b: StrokeBounds): StrokeBounds {
  const minX = Math.min(a.minX, b.minX);
  const minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.maxX, b.maxX);
  const maxY = Math.max(a.maxY, b.maxY);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
