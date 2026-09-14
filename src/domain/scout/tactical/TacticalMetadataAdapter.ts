import type { Skill } from '../entities/Skill';
import type { ScoutEventMetadata } from '../events/ScoutEvent';
import {
  TACTICAL_METADATA_SCHEMA_VERSION,
  type BallTrajectory,
  type CourtLocation,
  type TacticalMetadata,
} from './TacticalMetadata';
import { canonicalCourtLocation } from './CourtGeometry';
import type { ZoneSystemProfile } from './ZoneSystemProfile';

function zone(zoneId: number | undefined): CourtLocation | undefined {
  return zoneId === undefined ? undefined : { zoneId: String(zoneId) };
}

function compact<T extends object>(value: T): T | undefined {
  return Object.values(value).some((item) => item !== undefined) ? value : undefined;
}

function mergeDefined<T extends object>(previous: T | undefined, patch: T | undefined): T {
  return {
    ...previous,
    ...Object.fromEntries(Object.entries(patch ?? {}).filter(([, value]) => value !== undefined)),
  } as T;
}

function capturedTrajectory(metadata: ScoutEventMetadata): BallTrajectory | undefined {
  const draft = metadata.captureDraft;
  return compact({
    origin: draft?.origin ?? zone(metadata.originZone),
    target: draft?.target ?? zone(metadata.targetZone),
    direction: draft?.direction ?? metadata.direction,
    captureMethod:
      draft?.captureMethod ??
      (draft?.origin || draft?.target || draft?.direction
        ? ('selected' as const)
        : metadata.originZone !== undefined ||
            metadata.targetZone !== undefined ||
            metadata.direction
          ? ('typed' as const)
          : undefined),
  });
}

export function toTacticalMetadata(metadata: ScoutEventMetadata, skill?: Skill): TacticalMetadata {
  if (metadata.tactical) return metadata.tactical;
  const draft = metadata.captureDraft;
  const trajectory = capturedTrajectory(metadata);
  const tactical: TacticalMetadata = {
    trajectory,
    rotation: metadata.rotation,
    setterPosition: draft?.setterPosition ?? metadata.setterPosition,
    phase: draft?.phase ?? metadata.phase,
  };
  if (skill === 'serve')
    return {
      ...tactical,
      serve: compact({ serveType: draft?.skillType ?? metadata.skillType, trajectory }),
    };
  if (skill === 'reception')
    return {
      ...tactical,
      reception: compact({
        contactLocation: draft?.origin ?? zone(metadata.originZone),
        grade: draft?.receptionGrade ?? metadata.receptionGrade,
      }),
    };
  if (skill === 'set')
    return {
      ...tactical,
      set: compact({
        setType: draft?.skillType ?? metadata.skillType,
        setterCall: draft?.setterCall ?? metadata.setterCall,
        targetLocation: draft?.target ?? zone(metadata.targetZone),
      }),
    };
  if (skill === 'attack')
    return {
      ...tactical,
      attack: compact({
        attackType: draft?.skillType ?? metadata.skillType,
        trajectory,
        combination: draft?.combination ?? metadata.attackCombination,
        tempo: draft?.tempo ?? metadata.attackTempo,
        blockersCount: draft?.blockersCount ?? metadata.blockersCount,
      }),
    };
  if (skill === 'block')
    return {
      ...tactical,
      block: compact({
        blockersCount: draft?.blockersCount ?? metadata.blockersCount,
        touchLocation: draft?.target ?? zone(metadata.targetZone),
      }),
    };
  return tactical;
}

export function normalizeTacticalMetadata(
  metadata: ScoutEventMetadata | undefined,
  skill?: Skill,
  zoneSystem?: ZoneSystemProfile,
): ScoutEventMetadata | undefined {
  if (!metadata) return undefined;
  // spatial is already executor-relative and uses a separate service surface, not CourtLocation.
  // Preserve it verbatim while normalizing only legacy tactical locations.
  if (metadata.tactical && metadata.captureDraft) {
    // Normalize the new draft separately so its orientation does not rotate existing locations.
    const patch = normalizeTacticalMetadata(
      { ...metadata, tactical: undefined },
      skill,
      zoneSystem,
    )!;
    const previous = metadata.tactical;
    const next = patch.tactical!;
    const tactical = mergeDefined(previous, next);
    return {
      ...patch,
      tactical: {
        ...tactical,
        trajectory: mergeDefined(previous.trajectory, next.trajectory),
        reception: mergeDefined(previous.reception, next.reception),
        set: mergeDefined(previous.set, next.set),
        block: mergeDefined(previous.block, next.block),
        serve: {
          ...mergeDefined(previous.serve, next.serve),
          trajectory: mergeDefined(previous.serve?.trajectory, next.serve?.trajectory),
        },
        attack: {
          ...mergeDefined(previous.attack, next.attack),
          trajectory: mergeDefined(previous.attack?.trajectory, next.attack?.trajectory),
        },
      },
    };
  }
  if (
    metadata.schemaVersion === TACTICAL_METADATA_SCHEMA_VERSION &&
    metadata.tactical &&
    !metadata.captureDraft
  )
    return metadata;
  const canonical = { ...metadata } as {
    -readonly [Key in keyof ScoutEventMetadata]: ScoutEventMetadata[Key];
  };
  delete canonical.captureDraft;
  const tactical = toTacticalMetadata(metadata, skill);
  const orientation = metadata.captureDraft?.orientation ?? 'canonical';
  const location = (value: CourtLocation | undefined) =>
    value ? canonicalCourtLocation(value, orientation, zoneSystem) : undefined;
  const normalizeTrajectory = (value: BallTrajectory | undefined): BallTrajectory | undefined =>
    value
      ? {
          ...value,
          ...(value.origin ? { origin: location(value.origin) } : {}),
          ...(value.target ? { target: location(value.target) } : {}),
        }
      : undefined;
  const canonicalTactical: TacticalMetadata = {
    ...tactical,
    ...(tactical.trajectory ? { trajectory: normalizeTrajectory(tactical.trajectory) } : {}),
    ...(tactical.serve
      ? {
          serve: {
            ...tactical.serve,
            ...(tactical.serve.trajectory
              ? { trajectory: normalizeTrajectory(tactical.serve.trajectory) }
              : {}),
          },
        }
      : {}),
    ...(tactical.reception
      ? {
          reception: {
            ...tactical.reception,
            ...(tactical.reception.contactLocation
              ? { contactLocation: location(tactical.reception.contactLocation) }
              : {}),
          },
        }
      : {}),
    ...(tactical.set
      ? {
          set: {
            ...tactical.set,
            ...(tactical.set.targetLocation
              ? { targetLocation: location(tactical.set.targetLocation) }
              : {}),
          },
        }
      : {}),
    ...(tactical.attack
      ? {
          attack: {
            ...tactical.attack,
            ...(tactical.attack.trajectory
              ? { trajectory: normalizeTrajectory(tactical.attack.trajectory) }
              : {}),
            ...(tactical.attack.blockTouchLocation
              ? { blockTouchLocation: location(tactical.attack.blockTouchLocation) }
              : {}),
          },
        }
      : {}),
    ...(tactical.block
      ? {
          block: {
            ...tactical.block,
            ...(tactical.block.touchLocation
              ? { touchLocation: location(tactical.block.touchLocation) }
              : {}),
          },
        }
      : {}),
  };
  return {
    ...canonical,
    schemaVersion: TACTICAL_METADATA_SCHEMA_VERSION,
    tactical: canonicalTactical,
  };
}

function trajectory(
  metadata: ScoutEventMetadata | undefined,
  skill?: Skill,
): BallTrajectory | undefined {
  if (!metadata) return undefined;
  const tactical = toTacticalMetadata(metadata, skill);
  if (skill === 'serve') return tactical.serve?.trajectory ?? tactical.trajectory;
  if (skill === 'attack') return tactical.attack?.trajectory ?? tactical.trajectory;
  return tactical.trajectory;
}

function zoneNumber(location: CourtLocation | undefined): number | undefined {
  if (!location?.zoneId) return undefined;
  const value = Number(location.zoneId);
  return Number.isFinite(value) ? value : undefined;
}

export const tacticalValue = {
  skillType(metadata: ScoutEventMetadata | undefined, skill?: Skill): string | undefined {
    if (!metadata) return undefined;
    const tactical = toTacticalMetadata(metadata, skill);
    return (
      tactical.serve?.serveType ??
      tactical.set?.setType ??
      tactical.attack?.attackType ??
      metadata.skillType
    );
  },
  originZone(metadata: ScoutEventMetadata | undefined, skill?: Skill): number | undefined {
    return zoneNumber(trajectory(metadata, skill)?.origin) ?? metadata?.originZone;
  },
  originZoneId(metadata: ScoutEventMetadata | undefined, skill?: Skill): string | undefined {
    return trajectory(metadata, skill)?.origin?.zoneId ?? metadata?.originZone?.toString();
  },
  originLocation(
    metadata: ScoutEventMetadata | undefined,
    skill?: Skill,
  ): CourtLocation | undefined {
    return trajectory(metadata, skill)?.origin;
  },
  targetZone(metadata: ScoutEventMetadata | undefined, skill?: Skill): number | undefined {
    const tactical = metadata ? toTacticalMetadata(metadata, skill) : undefined;
    return (
      zoneNumber(trajectory(metadata, skill)?.target) ??
      zoneNumber(tactical?.set?.targetLocation) ??
      metadata?.targetZone
    );
  },
  targetZoneId(metadata: ScoutEventMetadata | undefined, skill?: Skill): string | undefined {
    const tactical = metadata ? toTacticalMetadata(metadata, skill) : undefined;
    return (
      trajectory(metadata, skill)?.target?.zoneId ??
      tactical?.set?.targetLocation?.zoneId ??
      metadata?.targetZone?.toString()
    );
  },
  targetLocation(
    metadata: ScoutEventMetadata | undefined,
    skill?: Skill,
  ): CourtLocation | undefined {
    const tactical = metadata ? toTacticalMetadata(metadata, skill) : undefined;
    return trajectory(metadata, skill)?.target ?? tactical?.set?.targetLocation;
  },
  direction(metadata: ScoutEventMetadata | undefined, skill?: Skill): string | undefined {
    return trajectory(metadata, skill)?.direction ?? metadata?.direction;
  },
  receptionGrade(metadata: ScoutEventMetadata | undefined) {
    return metadata
      ? (toTacticalMetadata(metadata, 'reception').reception?.grade ?? metadata.receptionGrade)
      : undefined;
  },
  rotation(metadata: ScoutEventMetadata | undefined): number | undefined {
    return metadata ? (toTacticalMetadata(metadata).rotation ?? metadata.rotation) : undefined;
  },
  setterPosition(metadata: ScoutEventMetadata | undefined): number | undefined {
    return metadata
      ? (toTacticalMetadata(metadata).setterPosition ?? metadata.setterPosition)
      : undefined;
  },
  setterCall(metadata: ScoutEventMetadata | undefined): string | undefined {
    return metadata
      ? (toTacticalMetadata(metadata, 'set').set?.setterCall ?? metadata.setterCall)
      : undefined;
  },
  attackCombination(metadata: ScoutEventMetadata | undefined): string | undefined {
    return metadata
      ? (toTacticalMetadata(metadata, 'attack').attack?.combination ?? metadata.attackCombination)
      : undefined;
  },
  attackTempo(metadata: ScoutEventMetadata | undefined): string | undefined {
    return metadata
      ? (toTacticalMetadata(metadata, 'attack').attack?.tempo ?? metadata.attackTempo)
      : undefined;
  },
  blockersCount(metadata: ScoutEventMetadata | undefined, skill?: Skill): number | undefined {
    if (!metadata) return undefined;
    const tactical = toTacticalMetadata(metadata, skill);
    return (
      tactical.attack?.blockersCount ?? tactical.block?.blockersCount ?? metadata.blockersCount
    );
  },
  phase(metadata: ScoutEventMetadata | undefined) {
    return metadata ? (toTacticalMetadata(metadata).phase ?? metadata.phase) : undefined;
  },
};
