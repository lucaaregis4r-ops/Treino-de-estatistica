import type { CourtLocation } from '../../../domain/scout/tactical/TacticalMetadata';

export interface CourtRectangle {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function normalizedCourtPoint(
  clientX: number,
  clientY: number,
  rectangle: CourtRectangle,
): CourtLocation {
  return {
    x: Math.max(0, Math.min(1, (clientX - rectangle.left) / rectangle.width)),
    y: Math.max(0, Math.min(1, (clientY - rectangle.top) / rectangle.height)),
  };
}
