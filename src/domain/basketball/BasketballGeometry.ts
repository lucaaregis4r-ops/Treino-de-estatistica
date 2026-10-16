import type { Point } from './BasketballScout';

/**
 * FIBA Official Basketball Court Dimensions (meters):
 * Width (X): 28m
 * Height (Y): 15m
 * Left hoop center: (1.575, 7.5)
 * Right hoop center: (26.425, 7.5)
 * 3-point radius: 6.75m
 * Corner 3-point distance from sideline: 0.9m (baseline X=0 to X=2.99 on left; X=28 to X=25.01 on right)
 * Restricted area radius: 1.25m
 * Paint / Key: width 4.9m, length 5.8m (Y from 5.05 to 9.95, X from 0 to 5.8 on left; 22.2 to 28 on right)
 */

export type BasketballShotZone = 'rim' | 'paint' | 'mid_range' | 'corner_3' | 'arc_3';

export const BASKETBALL_ZONE_LABELS: Record<BasketballShotZone, string> = {
  rim: 'Aro (< 2m)',
  paint: 'Garrafão / Pintura',
  mid_range: 'Meia Distância',
  corner_3: '3PT Zona Morta (Corner)',
  arc_3: '3PT Perímetro (Arco)',
};

/**
 * Calculates whether a shot coordinate (normalized 0..1) is a 2-point or 3-point shot
 * according to official FIBA geometry.
 */
export function calculateBasketballShotValue(point: Point): 2 | 3 {
  const X = point.x * 28;
  const Y = point.y * 15;
  const isLeftHalf = point.x < 0.5;
  const hoopX = isLeftHalf ? 1.575 : 26.425;
  const hoopY = 7.5;

  // Corner 3s: within 0.9m of either sideline, before the arc cutoff
  if (isLeftHalf && X <= 2.99 && (Y <= 0.9 || Y >= 14.1)) {
    return 3;
  }
  if (!isLeftHalf && X >= 25.01 && (Y <= 0.9 || Y >= 14.1)) {
    return 3;
  }

  const dx = X - hoopX;
  const dy = Y - hoopY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance >= 6.75 ? 3 : 2;
}

/**
 * Classifies a shot location into strategic basketball zones.
 */
export function classifyBasketballShotZone(point: Point): BasketballShotZone {
  const X = point.x * 28;
  const Y = point.y * 15;
  const isLeftHalf = point.x < 0.5;
  const hoopX = isLeftHalf ? 1.575 : 26.425;
  const hoopY = 7.5;

  const dx = X - hoopX;
  const dy = Y - hoopY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Corner 3
  if ((isLeftHalf && X <= 2.99 && (Y <= 0.9 || Y >= 14.1)) ||
      (!isLeftHalf && X >= 25.01 && (Y <= 0.9 || Y >= 14.1))) {
    return 'corner_3';
  }

  // Above the break 3
  if (distance >= 6.75) {
    return 'arc_3';
  }

  // Rim (< 2.0 meters from hoop)
  if (distance <= 2.0) {
    return 'rim';
  }

  // Paint / Key area
  const inPaintX = isLeftHalf ? X <= 5.8 : X >= 22.2;
  const inPaintY = Y >= 5.05 && Y <= 9.95;
  if (inPaintX && inPaintY) {
    return 'paint';
  }

  // Mid-range (inside arc, outside paint and rim)
  return 'mid_range';
}

/**
 * Returns the hoop center coordinate for the target basket based on shot position.
 */
export function getTargetHoopPosition(point: Point): Point {
  const isLeft = point.x < 0.5;
  return {
    x: (isLeft ? 1.575 : 26.425) / 28,
    y: 7.5 / 15,
  };
}
