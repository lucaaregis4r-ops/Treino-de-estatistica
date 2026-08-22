import type { BallTrajectory, CourtLocation } from './TacticalMetadata';
import type { ZoneSystemProfile } from './ZoneSystemProfile';

function canonicalZoneId(
  location: CourtLocation | undefined,
  profile: ZoneSystemProfile,
): string | undefined {
  if (!location?.zoneId) return undefined;
  const normalized = location.zoneId.trim().toLocaleLowerCase();
  return profile.zones.find(
    (zone) =>
      zone.id.toLocaleLowerCase() === normalized ||
      zone.aliases?.some((alias) => alias.toLocaleLowerCase() === normalized),
  )?.id;
}

export class DirectionResolver {
  resolve(trajectory: BallTrajectory, profile: ZoneSystemProfile): BallTrajectory {
    if (trajectory.direction?.trim()) return trajectory;
    const originId = canonicalZoneId(trajectory.origin, profile);
    const targetId = canonicalZoneId(trajectory.target, profile);
    if (!originId || !targetId) return trajectory;
    const rule = profile.directionRules?.find(
      (candidate) =>
        (!candidate.originZoneIds || candidate.originZoneIds.includes(originId)) &&
        candidate.targetZoneIds.includes(targetId),
    );
    return rule ? { ...trajectory, direction: rule.id, captureMethod: 'derived' } : trajectory;
  }
}
