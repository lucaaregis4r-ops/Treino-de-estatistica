import type { CourtRotationPosition } from '../../match/lineup/SetLineup';
import type { TacticalRallyProjection } from '../../rally/context/TacticalRallyProjection';
import type { RallyPhase, ScoutEvent } from '../events/ScoutEvent';
import { CourtZoneResolver } from '../tactical/CourtGeometry';
import type { CourtLocation } from '../tactical/TacticalMetadata';
import { tacticalValue, toTacticalMetadata } from '../tactical/TacticalMetadataAdapter';
import type { ZoneSystemProfile } from '../tactical/ZoneSystemProfile';
import type { SpatialPoint } from './SpatialMetadata';

export type SpatialHeatmapPreset =
  | 'attack_target'
  | 'serve_target'
  | 'reception_contact'
  | 'attack_origin'
  | 'serve_origin'
  | 'reception_target';
export type SpatialLocation = CourtLocation & { readonly surface?: SpatialPoint['surface'] };

export interface SpatialSample {
  readonly eventId: string;
  readonly teamId: string;
  readonly playerId?: string;
  readonly skill: ScoutEvent['skill'];
  readonly evaluation?: string;
  readonly outcome?: ScoutEvent['outcome'];
  readonly sideout?: boolean;
  readonly setNumber: number;
  readonly rotation?: CourtRotationPosition;
  readonly setterPosition?: CourtRotationPosition;
  readonly phase?: RallyPhase;
  readonly origin?: SpatialLocation;
  readonly target?: SpatialLocation;
  readonly source?: 'spatial' | 'legacy';
  readonly heatmapPreset?: SpatialHeatmapPreset;
}

export interface SpatialDensityCell {
  readonly teamId: string;
  readonly preset: SpatialHeatmapPreset;
  readonly surface?: SpatialPoint['surface'];
  readonly x: number;
  readonly y: number;
  readonly zoneId?: string;
  readonly count: number;
  readonly attempts: number;
  readonly points: number;
  readonly errors: number;
  readonly pointRate: number | undefined;
  readonly receptions?: number;
  readonly sideouts?: number;
  readonly sideoutRate?: number | undefined;
}

export interface SpatialTrajectory {
  readonly teamId: string;
  readonly skill: ScoutEvent['skill'];
  readonly origin: SpatialLocation;
  readonly target: SpatialLocation;
  readonly count: number;
}

export interface SpatialMatrixCell {
  readonly teamId: string;
  readonly skill: ScoutEvent['skill'];
  readonly originZoneId: string;
  readonly targetZoneId: string;
  readonly count: number;
}

export interface SpatialAnalyticsProjection {
  readonly samples: readonly SpatialSample[];
  readonly density: readonly SpatialDensityCell[];
  readonly trajectories: readonly SpatialTrajectory[];
  readonly matrix: readonly SpatialMatrixCell[];
}

function heatmapPreset(event: ScoutEvent): SpatialHeatmapPreset | undefined {
  if (event.skill === 'attack') return 'attack_target';
  if (event.skill === 'serve') return 'serve_target';
  if (event.skill === 'reception') return 'reception_contact';
  return undefined;
}

function bucket(value: number): number {
  return Math.min(5, Math.floor(value * 6));
}

function plottedLocation(location: SpatialLocation | undefined, profile?: ZoneSystemProfile) {
  if (!location) return undefined;
  const resolver = new CourtZoneResolver();
  if (location.x !== undefined && location.y !== undefined) {
    if (
      !Number.isFinite(location.x) ||
      !Number.isFinite(location.y) ||
      location.x < 0 ||
      location.x > 1 ||
      location.y < 0 ||
      location.y > 1
    )
      return undefined;
    const zone = profile && !location.surface ? resolver.resolve(location, profile) : undefined;
    return zone ? { ...location, zoneId: zone.id } : location;
  }
  return location.zoneId ? { zoneId: location.zoneId } : undefined;
}

/** Additive radial kernel in physical surface proportions; never normalizes away volume. */
export function spatialDensityAt(
  points: readonly SpatialLocation[],
  surface: SpatialPoint['surface'],
  x: number,
  y: number,
): number {
  return points.reduce((sum, point) => {
    if ((point.surface ?? 'court') !== surface || point.x === undefined || point.y === undefined)
      return sum;
    const distance = Math.hypot((point.x - x) * (surface === 'court' ? 2 : 0.2), point.y - y);
    const radius = 0.18;
    return distance >= radius ? sum : sum + (1 - (distance / radius) ** 2) ** 2;
  }, 0);
}

export class SpatialProjection {
  project(
    events: readonly ScoutEvent[],
    tacticalRally?: TacticalRallyProjection,
    zoneSystem?: ZoneSystemProfile,
  ): SpatialAnalyticsProjection {
    const samples: SpatialSample[] = events.flatMap((event) => {
      const contact = tacticalRally?.contacts.find((item) => item.sourceEventId === event.id);
      const rally = tacticalRally?.rallies.find((item) => item.rallyId === event.rallyId);
      const tactical = event.metadata ? toTacticalMetadata(event.metadata, event.skill) : undefined;
      const spatial = event.metadata?.spatial;
      const origin = plottedLocation(
        spatial
          ? spatial.origin
          : event.skill === 'reception'
            ? tactical?.reception?.contactLocation
            : tacticalValue.originLocation(event.metadata, event.skill),
        zoneSystem,
      );
      const target = plottedLocation(
        spatial
          ? spatial.destination
          : event.skill === 'reception'
            ? tactical?.reception?.contactLocation
            : event.skill === 'block'
              ? tactical?.block?.touchLocation
              : tacticalValue.targetLocation(event.metadata, event.skill),
        zoneSystem,
      );
      if (!origin && !target) return [];
      return [
        {
          eventId: event.id,
          teamId: event.teamId,
          ...(event.playerId ? { playerId: event.playerId } : {}),
           skill: event.skill,
           ...(event.evaluation ? { evaluation: event.evaluation } : {}),
          source: spatial ? 'spatial' : 'legacy',
          ...(event.outcome ? { outcome: event.outcome } : {}),
          ...(event.skill === 'reception' && rally
            ? {
                sideout:
                  rally.winnerTeamId === event.teamId && rally.servingTeamId !== event.teamId,
              }
            : {}),
          setNumber: event.setNumber,
          ...((event.lineupContext?.rotationPosition ?? contact?.rotation)
            ? { rotation: event.lineupContext?.rotationPosition ?? contact?.rotation }
            : {}),
          ...((event.setterPosition ?? contact?.setterPosition)
            ? { setterPosition: event.setterPosition ?? contact?.setterPosition }
            : {}),
          ...((tacticalValue.phase(event.metadata) ?? contact?.phase)
            ? { phase: tacticalValue.phase(event.metadata) ?? contact?.phase }
            : {}),
          ...(origin ? { origin } : {}),
          ...(target ? { target } : {}),
          ...(heatmapPreset(event) ? { heatmapPreset: heatmapPreset(event) } : {}),
        } satisfies SpatialSample,
      ];
    });

    const densityGroups = new Map<string, SpatialDensityCell>();
    samples.forEach((sample) => {
      const selections: readonly [SpatialHeatmapPreset | undefined, SpatialLocation | undefined][] =
        [
          [sample.heatmapPreset, sample.skill === 'reception' ? sample.origin : sample.target],
          [
            sample.skill === 'attack'
              ? 'attack_origin'
              : sample.skill === 'serve'
                ? 'serve_origin'
                : sample.skill === 'reception'
                  ? 'reception_target'
                  : undefined,
            sample.skill === 'reception'
              ? sample.source === 'spatial'
                ? sample.target
                : undefined
              : sample.origin,
          ],
        ];
      selections.forEach(([preset, location]) => {
        if (!preset || location?.x === undefined || location.y === undefined) return;
        const xBucket = bucket(location.x);
        const yBucket = bucket(location.y);
        const key = JSON.stringify([
          sample.teamId,
          preset,
          location.surface ?? 'court',
          xBucket,
          yBucket,
        ]);
        const current = densityGroups.get(key);
        const attempts = (current?.attempts ?? 0) + 1;
        const receptions =
          sample.heatmapPreset === 'reception_contact'
            ? (current?.receptions ?? 0) + 1
            : current?.receptions;
        const sideouts =
          sample.heatmapPreset === 'reception_contact'
            ? (current?.sideouts ?? 0) + (sample.sideout ? 1 : 0)
            : current?.sideouts;
        densityGroups.set(key, {
          teamId: sample.teamId,
          preset,
          surface: location.surface ?? 'court',
          x: (xBucket + 0.5) / 6,
          y: (yBucket + 0.5) / 6,
          ...(location.zoneId ? { zoneId: location.zoneId } : {}),
          count: (current?.count ?? 0) + 1,
          attempts,
          points: (current?.points ?? 0) + (sample.outcome === 'point' ? 1 : 0),
          errors: (current?.errors ?? 0) + (sample.outcome === 'error' ? 1 : 0),
          pointRate:
            attempts > 0
              ? ((current?.points ?? 0) + (sample.outcome === 'point' ? 1 : 0)) / attempts
              : undefined,
          ...(receptions !== undefined ? { receptions } : {}),
          ...(sideouts !== undefined ? { sideouts } : {}),
          ...(receptions !== undefined
            ? { sideoutRate: receptions > 0 ? (sideouts ?? 0) / receptions : undefined }
            : {}),
        });
      });
    });

    const trajectoryGroups = new Map<string, SpatialTrajectory>();
    samples.forEach((sample) => {
      const { origin, target } = sample;
      if (sample.skill === 'reception' && sample.source === 'legacy') return;
      if (
        origin?.x === undefined ||
        origin.y === undefined ||
        target?.x === undefined ||
        target.y === undefined
      )
        return;
      const key = JSON.stringify([
        sample.teamId,
        sample.skill,
        origin.surface ?? 'court',
        target.surface ?? 'court',
        bucket(origin.x),
        bucket(origin.y),
        bucket(target.x),
        bucket(target.y),
      ]);
      const current = trajectoryGroups.get(key);
      trajectoryGroups.set(key, {
        teamId: sample.teamId,
        skill: sample.skill,
        origin,
        target,
        count: (current?.count ?? 0) + 1,
      });
    });

    const matrixGroups = new Map<string, SpatialMatrixCell>();
    samples.forEach((sample) => {
      if (sample.skill === 'reception' && sample.source === 'legacy') return;
      if (!sample.origin?.zoneId || !sample.target?.zoneId) return;
      const key = JSON.stringify([
        sample.teamId,
        sample.skill,
        sample.origin.zoneId,
        sample.target.zoneId,
      ]);
      const current = matrixGroups.get(key);
      matrixGroups.set(key, {
        teamId: sample.teamId,
        skill: sample.skill,
        originZoneId: sample.origin.zoneId,
        targetZoneId: sample.target.zoneId,
        count: (current?.count ?? 0) + 1,
      });
    });

    return Object.freeze({
      samples: Object.freeze(samples),
      density: Object.freeze([...densityGroups.values()]),
      trajectories: Object.freeze([...trajectoryGroups.values()]),
      matrix: Object.freeze([...matrixGroups.values()]),
    });
  }
}
