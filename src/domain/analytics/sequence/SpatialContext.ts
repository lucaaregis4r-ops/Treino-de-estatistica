import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { CourtZoneResolver, displayPointToCourtLocation } from '../../scout/tactical/CourtGeometry';
import type { CourtLocation } from '../../scout/tactical/TacticalMetadata';
import { tacticalValue } from '../../scout/tactical/TacticalMetadataAdapter';
import type { ZoneSystemProfile } from '../../scout/tactical/ZoneSystemProfile';

export interface SpatialCoordinate {
  readonly x: number;
  readonly y: number;
  readonly surface?: 'court' | 'serviceZone' | 'outZone';
}

export interface SpatialContext {
  readonly origin?: SpatialCoordinate;
  readonly target?: SpatialCoordinate;
  readonly originRegionId?: string;
  readonly targetRegionId?: string;
  readonly coordinateSystemVersion: string;
}

function coordinate(location: CourtLocation | undefined, surface?: SpatialCoordinate['surface']) {
  if (
    location?.x === undefined ||
    location.y === undefined ||
    !Number.isFinite(location.x) ||
    !Number.isFinite(location.y) ||
    location.x < 0 ||
    location.x > 1 ||
    location.y < 0 ||
    location.y > 1
  )
    return undefined;
  return { x: location.x, y: location.y, ...(surface ? { surface } : {}) } satisfies SpatialCoordinate;
}

function region(
  location: CourtLocation | undefined,
  point: SpatialCoordinate | undefined,
  profile: ZoneSystemProfile,
): string | undefined {
  if (point && point.surface !== 'serviceZone' && point.surface !== 'outZone') {
    const local = point.surface === 'court'
      ? displayPointToCourtLocation(point, point.x < .5 ? 'origin' : 'target')
      : point;
    return new CourtZoneResolver().resolve(local, profile)?.id;
  }
  return location?.zoneId;
}

export function spatialContextForEvent(
  event: ScoutEvent,
  zoneSystem: ZoneSystemProfile,
): SpatialContext {
  const spatial = event.metadata?.spatial;
  const originLocation = spatial?.origin ?? tacticalValue.originLocation(event.metadata, event.skill);
  const targetLocation = spatial?.destination ?? tacticalValue.targetLocation(event.metadata, event.skill);
  const origin = coordinate(originLocation, spatial?.origin.surface);
  const target = coordinate(targetLocation, spatial?.destination.surface);

  const originRegionId = region(originLocation, origin, zoneSystem);
  const targetRegionId = region(targetLocation, target, zoneSystem);
  return Object.freeze({
    ...(origin ? { origin } : {}),
    ...(target ? { target } : {}),
    ...(originRegionId ? { originRegionId } : {}),
    ...(targetRegionId ? { targetRegionId } : {}),
    coordinateSystemVersion: zoneSystem.version,
  });
}
