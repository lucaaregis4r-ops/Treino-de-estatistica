import type { CourtLocation } from './TacticalMetadata';
import type { ZoneDefinition, ZoneSystemProfile } from './ZoneSystemProfile';

export type CourtOrientation = 'canonical' | 'rotated_180';
export type CourtDisplaySide = 'origin' | 'target';

export interface CourtRectangle {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function normalizedCourtPoint(
  clientX: number,
  clientY: number,
  rectangle: CourtRectangle,
): CourtLocation {
  return {
    x: rectangle.width > 0 ? clamp((clientX - rectangle.left) / rectangle.width) : 0,
    y: rectangle.height > 0 ? clamp((clientY - rectangle.top) / rectangle.height) : 0,
  };
}

export function isNormalizedCourtCoordinate(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0 && value <= 1);
}

export class CourtZoneResolver {
  resolve(location: CourtLocation, profile: ZoneSystemProfile): ZoneDefinition | undefined {
    if (location.x === undefined || location.y === undefined) {
      return profile.zones.find((zone) => zone.id === location.zoneId);
    }
    const locationX = location.x;
    const locationY = location.y;
    return profile.zones
      .filter(
        (zone): zone is ZoneDefinition & { readonly x: number; readonly y: number } =>
          zone.x !== undefined && zone.y !== undefined,
      )
      .map((zone) => ({
        zone,
        distance: (zone.x - locationX) ** 2 + (zone.y - locationY) ** 2,
      }))
      .sort((left, right) => left.distance - right.distance)[0]?.zone;
  }

  location(zoneId: string, profile: ZoneSystemProfile): CourtLocation | undefined {
    const zone = profile.zones.find((candidate) => candidate.id === zoneId);
    return zone
      ? {
          zoneId: zone.id,
          ...(zone.x !== undefined ? { x: zone.x } : {}),
          ...(zone.y !== undefined ? { y: zone.y } : {}),
        }
      : undefined;
  }
}

export function canonicalCourtLocation(
  location: CourtLocation,
  orientation: CourtOrientation = 'canonical',
  profile?: ZoneSystemProfile,
): CourtLocation {
  const zoneResolver = new CourtZoneResolver();
  const positioned =
    location.x !== undefined && location.y !== undefined
      ? location
      : profile && location.zoneId
        ? (zoneResolver.location(location.zoneId, profile) ?? location)
        : location;
  const oriented =
    positioned.x !== undefined && positioned.y !== undefined && orientation === 'rotated_180'
      ? { ...positioned, x: 1 - positioned.x, y: 1 - positioned.y }
      : positioned;
  if (!profile || oriented.x === undefined || oriented.y === undefined) return oriented;
  const zone = zoneResolver.resolve(oriented, profile);
  return zone ? { ...oriented, zoneId: zone.id } : oriented;
}

/** Converts the existing two-sided tactical court into the single canonical court convention. */
export function displayPointToCourtLocation(
  point: CourtLocation,
  side: CourtDisplaySide,
  profile?: ZoneSystemProfile,
): CourtLocation {
  const displayX = clamp(point.x ?? 0);
  const displayY = clamp(point.y ?? 0);
  const location =
    side === 'origin'
      ? { x: displayY, y: clamp(1 - displayX * 2) }
      : { x: 1 - displayY, y: clamp(displayX * 2 - 1) };
  return canonicalCourtLocation(location, 'canonical', profile);
}

export function courtLocationToDisplayPoint(
  location: CourtLocation,
  side: CourtDisplaySide,
  profile?: ZoneSystemProfile,
): CourtLocation {
  const positioned =
    location.x !== undefined && location.y !== undefined
      ? location
      : profile && location.zoneId
        ? new CourtZoneResolver().location(location.zoneId, profile)
        : undefined;
  if (!positioned || positioned.x === undefined || positioned.y === undefined) return {};
  return side === 'origin'
    ? { x: (1 - positioned.y) / 2, y: positioned.x }
    : { x: 0.5 + positioned.y / 2, y: 1 - positioned.x };
}
