import type { Player } from '../../domain/match/entities/Player';
import type { Team } from '../../domain/match/entities/Team';
import {
  ROTATION_POSITIONS,
  type CourtRotationPosition,
  type SetLineup,
} from '../../domain/match/lineup/SetLineup';
import type { MatchState } from '../../domain/match/state/MatchState';
import type { TacticalRallyProjection } from '../../domain/rally/context/TacticalRallyProjection';
import type { ScoutEvent } from '../../domain/scout/events/ScoutEvent';
import { tacticalValue } from '../../domain/scout/tactical/TacticalMetadataAdapter';
import type { StatisticsScope } from '../../domain/statistics/definitions/MetricDefinition';
import { receptionGrade, scopedEvents } from '../../domain/statistics/queries/scoutEventQueries';
import { StatisticsEngine } from '../../domain/statistics/StatisticsEngine';
import type {
  AttackDirectionReport,
  AuditableMetric,
  MatchReportModel,
  RallyRateReport,
  SetterDistributionReport,
  SetterPositionAttackReport,
  SetterPositionDirectionReport,
  AdvancedAuditableMetric,
  AttackEvennessReport,
} from '../reporting/MatchReportModel';
import type { ExpectedRateReference } from '../../domain/statistics/metrics/advanced/expectedSideout';
import type { AttackEvennessReference } from '../../domain/statistics/metrics/advanced/attackEvenness';
import { EXPECTED_SIDEOUT_METRIC_ID } from '../../domain/statistics/metrics/advanced/expectedSideout';
import { EXPECTED_BREAKPOINT_METRIC_ID } from '../../domain/statistics/metrics/advanced/expectedBreakpoint';
import { ATTACK_EVENNESS_METRIC_ID } from '../../domain/statistics/metrics/advanced/attackEvenness';
import { setterRepetitionReports } from '../../domain/statistics/metrics/advanced/setterRepetition';
import { setterAttackConversionReports } from '../../domain/statistics/metrics/advanced/setterAttackConversion';
import type { MetricResult } from '../../domain/statistics/metrics/MetricResult';
import { SpatialProjection } from '../../domain/scout/spatial/SpatialProjection';
import type { ZoneSystemProfile } from '../../domain/scout/tactical/ZoneSystemProfile';

export interface MatchAnalyticsInput {
  readonly events: readonly ScoutEvent[];
  readonly state: MatchState;
  readonly roster: readonly Player[];
  readonly teams: readonly Team[];
  readonly lineups: readonly SetLineup[];
  readonly tacticalRally: TacticalRallyProjection;
  readonly expectedSideoutReferences?: Readonly<Record<string, readonly ExpectedRateReference[]>>;
  readonly expectedBreakpointReferences?: Readonly<
    Record<string, readonly ExpectedRateReference[]>
  >;
  readonly attackEvennessReferences?: Readonly<Record<string, readonly AttackEvennessReference[]>>;
  readonly zoneSystem?: ZoneSystemProfile;
}

export type AttackDrillDownFilter = Pick<
  StatisticsScope,
  | 'teamId'
  | 'playerId'
  | 'setterPlayerId'
  | 'setterPosition'
  | 'originZone'
  | 'targetZone'
  | 'direction'
  | 'attackType'
  | 'attackCombination'
  | 'phase'
  | 'receptionGrade'
  | 'blockersCount'
>;

function auditable(numerator: number, denominator: number): AuditableMetric {
  return Object.freeze({
    value: denominator === 0 ? null : numerator / denominator,
    numerator,
    denominator,
  });
}

function advancedMetric(result: MetricResult): AdvancedAuditableMetric {
  return Object.freeze({
    value: result.value,
    numerator: result.numerator ?? 0,
    denominator: result.denominator ?? 0,
    available: result.available,
    ...(result.reasonUnavailable ? { reasonUnavailable: result.reasonUnavailable } : {}),
    ...(result.referenceSampleSize !== undefined
      ? { referenceSampleSize: result.referenceSampleSize }
      : {}),
  });
}

function outcome(events: readonly ScoutEvent[], value: string): number {
  return events.filter((event) => event.outcome === value).length;
}

function attackEfficiency(events: readonly ScoutEvent[]): AuditableMetric {
  const points = outcome(events, 'point');
  const errors = outcome(events, 'error');
  const blocked = outcome(events, 'blocked');
  return auditable(points - errors - blocked, events.length);
}

function combineMetrics(metrics: readonly AuditableMetric[]): AuditableMetric {
  return auditable(
    metrics.reduce((sum, metric) => sum + metric.numerator, 0),
    metrics.reduce((sum, metric) => sum + metric.denominator, 0),
  );
}

function uniqueSets(playerId: string, input: MatchAnalyticsInput): number {
  const sets = new Set(
    input.events.filter((event) => event.playerId === playerId).map((event) => event.setNumber),
  );
  input.lineups.forEach((lineup) => {
    if (Object.values(lineup.slots).some((slot) => slot.playerId === playerId)) {
      sets.add(lineup.setNumber);
    }
  });
  return sets.size;
}

function eventContact(input: MatchAnalyticsInput, event: ScoutEvent) {
  return input.tacticalRally.contacts.find((contact) => contact.sourceEventId === event.id);
}

function scopedRallyIds(
  input: MatchAnalyticsInput,
  teamId: string,
  scope: { playerId?: string; setNumber?: number; rotation?: CourtRotationPosition },
  kind: 'sideout' | 'breakpoint',
): Set<string> | undefined {
  if (!scope.playerId && !scope.setNumber && !scope.rotation) return undefined;
  return new Set(
    input.events
      .filter((event) => {
        if (event.teamId !== teamId) return false;
        if (scope.setNumber && event.setNumber !== scope.setNumber) return false;
        if (scope.playerId && event.playerId !== scope.playerId) return false;
        if (scope.playerId && event.skill !== (kind === 'sideout' ? 'reception' : 'serve')) {
          return false;
        }
        const contact = eventContact(input, event);
        return !scope.rotation || contact?.rotation === scope.rotation;
      })
      .map((event) => event.rallyId),
  );
}

function rallyRate(
  input: MatchAnalyticsInput,
  teamId: string,
  kind: 'sideout' | 'breakpoint',
  scope: { playerId?: string; setNumber?: number; rotation?: CourtRotationPosition } = {},
): AuditableMetric {
  const eligibleRallies = scopedRallyIds(input, teamId, scope, kind);
  const opportunities = input.tacticalRally.rallies.filter((rally) => {
    if (!rally.winnerTeamId || !rally.servingTeamId) return false;
    if (eligibleRallies && !eligibleRallies.has(rally.rallyId)) return false;
    return kind === 'sideout' ? rally.servingTeamId !== teamId : rally.servingTeamId === teamId;
  });
  return auditable(
    opportunities.filter((rally) => rally.winnerTeamId === teamId).length,
    opportunities.length,
  );
}

function rateReports(
  input: MatchAnalyticsInput,
  teamId: string,
  kind: 'sideout' | 'breakpoint',
): readonly RallyRateReport[] {
  const players = input.roster.filter((player) => player.teamId === teamId);
  const sets = Array.from({ length: input.state.currentSet }, (_, index) => index + 1);
  return Object.freeze([
    { teamId, rate: rallyRate(input, teamId, kind) },
    ...players.map((player) => ({
      teamId,
      playerId: player.id,
      rate: rallyRate(input, teamId, kind, { playerId: player.id }),
    })),
    ...sets.map((setNumber) => ({
      teamId,
      setNumber,
      rate: rallyRate(input, teamId, kind, { setNumber }),
    })),
    ...ROTATION_POSITIONS.map((rotation) => ({
      teamId,
      rotation,
      rate: rallyRate(input, teamId, kind, { rotation }),
    })),
  ]);
}

function attackDirections(input: MatchAnalyticsInput): readonly AttackDirectionReport[] {
  const groups = new Map<
    string,
    {
      dimensions: Omit<
        AttackDirectionReport,
        'volume' | 'points' | 'errors' | 'blocked' | 'efficiency'
      >;
      events: ScoutEvent[];
    }
  >();
  for (const event of input.events) {
    if (event.skill !== 'attack' || !event.playerId) continue;
    const contact = eventContact(input, event);
    const setterPosition = event.setterPosition ?? contact?.setterPosition;
    if (!setterPosition || !contact) continue;
    const dimensions = {
      teamId: event.teamId,
      setNumber: event.setNumber,
      playerId: event.playerId,
      ...((event.setterPlayerId ?? contact.setterPlayerId)
        ? { setterPlayerId: event.setterPlayerId ?? contact.setterPlayerId }
        : {}),
      setterPosition,
      ...(tacticalValue.originZoneId(event.metadata, event.skill)
        ? { originZone: tacticalValue.originZoneId(event.metadata, event.skill) }
        : {}),
      ...(tacticalValue.targetZoneId(event.metadata, event.skill)
        ? { targetZone: tacticalValue.targetZoneId(event.metadata, event.skill) }
        : {}),
      ...(tacticalValue.direction(event.metadata, event.skill)
        ? { direction: tacticalValue.direction(event.metadata, event.skill) }
        : {}),
      ...(tacticalValue.skillType(event.metadata, event.skill)
        ? { attackType: tacticalValue.skillType(event.metadata, event.skill) }
        : {}),
      ...(tacticalValue.attackCombination(event.metadata)
        ? { attackCombination: tacticalValue.attackCombination(event.metadata) }
        : {}),
      phase: contact.phase,
      ...(contact.receptionForAttack?.grade
        ? { receptionGrade: contact.receptionForAttack.grade }
        : {}),
      ...(tacticalValue.blockersCount(event.metadata, event.skill) !== undefined
        ? { blockersCount: tacticalValue.blockersCount(event.metadata, event.skill) }
        : {}),
    } satisfies Omit<
      AttackDirectionReport,
      'volume' | 'points' | 'errors' | 'blocked' | 'efficiency'
    >;
    const key = JSON.stringify(dimensions);
    const group = groups.get(key) ?? { dimensions, events: [] };
    group.events.push(event);
    groups.set(key, group);
  }
  return Object.freeze(
    [...groups.values()].map(({ dimensions, events }) => ({
      ...dimensions,
      volume: events.length,
      points: outcome(events, 'point'),
      errors: outcome(events, 'error'),
      blocked: outcome(events, 'blocked'),
      efficiency: attackEfficiency(events),
    })),
  );
}

function setterDistribution(
  directions: readonly AttackDirectionReport[],
): readonly SetterDistributionReport[] {
  const groups = new Map<
    string,
    {
      readonly teamId: string;
      readonly setterPosition: CourtRotationPosition;
      readonly receptionGrade?: AttackDirectionReport['receptionGrade'];
      readonly attackerPlayerId: string;
      readonly attackZone?: string;
      readonly attackCombination?: string;
      volume: number;
    }
  >();
  directions.forEach((row) => {
    const dimensions = {
      teamId: row.teamId,
      setterPosition: row.setterPosition,
      ...(row.receptionGrade ? { receptionGrade: row.receptionGrade } : {}),
      attackerPlayerId: row.playerId,
      ...(row.originZone ? { attackZone: row.originZone } : {}),
      ...(row.attackCombination ? { attackCombination: row.attackCombination } : {}),
    };
    const key = JSON.stringify(dimensions);
    const group = groups.get(key) ?? { ...dimensions, volume: 0 };
    group.volume += row.volume;
    groups.set(key, group);
  });
  const totals = new Map<string, number>();
  groups.forEach((row) => {
    const key = JSON.stringify([row.teamId, row.setterPosition, row.receptionGrade ?? '']);
    totals.set(key, (totals.get(key) ?? 0) + row.volume);
  });
  return Object.freeze(
    [...groups.values()].map((row) => {
      const key = JSON.stringify([row.teamId, row.setterPosition, row.receptionGrade ?? '']);
      const denominator = totals.get(key) ?? 0;
      return {
        ...row,
        volume: row.volume,
        share: auditable(row.volume, denominator),
      };
    }),
  );
}

function attackBySetterPosition(
  directions: readonly AttackDirectionReport[],
): readonly SetterPositionAttackReport[] {
  const groups = new Map<string, Omit<SetterPositionAttackReport, 'efficiency'>>();
  directions.forEach((row) => {
    const key = JSON.stringify([row.teamId, row.playerId, row.setterPosition]);
    const current = groups.get(key) ?? {
      teamId: row.teamId,
      playerId: row.playerId,
      setterPosition: row.setterPosition,
      volume: 0,
      points: 0,
      errors: 0,
      blocked: 0,
    };
    groups.set(key, {
      ...current,
      volume: current.volume + row.volume,
      points: current.points + row.points,
      errors: current.errors + row.errors,
      blocked: current.blocked + row.blocked,
    });
  });
  return Object.freeze(
    [...groups.values()].map((row) => ({
      ...row,
      efficiency: auditable(row.points - row.errors - row.blocked, row.volume),
    })),
  );
}

function directionsBySetterPosition(
  directions: readonly AttackDirectionReport[],
  attacksByPosition: readonly SetterPositionAttackReport[],
): readonly SetterPositionDirectionReport[] {
  const groups = new Map<string, Omit<SetterPositionDirectionReport, 'efficiency' | 'share'>>();
  directions.forEach((row) => {
    const direction = row.direction ?? 'não informada';
    const key = JSON.stringify([row.teamId, row.playerId, row.setterPosition, direction]);
    const current = groups.get(key) ?? {
      teamId: row.teamId,
      playerId: row.playerId,
      setterPosition: row.setterPosition,
      direction,
      volume: 0,
      points: 0,
      errors: 0,
      blocked: 0,
    };
    groups.set(key, {
      ...current,
      volume: current.volume + row.volume,
      points: current.points + row.points,
      errors: current.errors + row.errors,
      blocked: current.blocked + row.blocked,
    });
  });
  return Object.freeze(
    [...groups.values()].map((row) => {
      const denominator =
        attacksByPosition.find(
          (attack) =>
            attack.teamId === row.teamId &&
            attack.playerId === row.playerId &&
            attack.setterPosition === row.setterPosition,
        )?.volume ?? 0;
      return {
        ...row,
        efficiency: auditable(row.points - row.errors - row.blocked, row.volume),
        share: auditable(row.volume, denominator),
      };
    }),
  );
}

export class MatchAnalyticsService {
  constructor(
    private readonly statisticsEngine: StatisticsEngine,
    private readonly spatialProjection = new SpatialProjection(),
  ) {}

  queryAttacks(input: MatchAnalyticsInput, filter: AttackDrillDownFilter): readonly ScoutEvent[] {
    return scopedEvents({
      events: input.events,
      tacticalRally: input.tacticalRally,
      scope: { ...filter, skill: 'attack' },
    });
  }

  build(input: MatchAnalyticsInput): MatchReportModel {
    const attacks = input.roster.map((player) => {
      const events = input.events.filter(
        (event) => event.playerId === player.id && event.skill === 'attack',
      );
      const points = outcome(events, 'point');
      const errors = outcome(events, 'error');
      const blocked = outcome(events, 'blocked');
      const engineEfficiency = this.statisticsEngine.calculate(['volleyball.attack.efficiency'], {
        events: input.events,
        scope: { playerId: player.id },
      })[0];
      return {
        playerId: player.id,
        teamId: player.teamId,
        volume: events.length,
        points,
        errors,
        blocked,
        continuity: events.length - points - errors - blocked,
        pointRate: auditable(points, events.length),
        errorRate: auditable(errors, events.length),
        blockedRate: auditable(blocked, events.length),
        efficiency: engineEfficiency
          ? auditable(engineEfficiency.numerator ?? 0, engineEfficiency.denominator ?? 0)
          : attackEfficiency(events),
      };
    });
    const serves = input.roster.map((player) => {
      const events = input.events.filter(
        (event) => event.playerId === player.id && event.skill === 'serve',
      );
      const aces = outcome(events, 'ace');
      const errors = outcome(events, 'error');
      return {
        playerId: player.id,
        teamId: player.teamId,
        volume: events.length,
        aces,
        errors,
        continuity: events.length - aces - errors,
        aceRate: auditable(aces, events.length),
        errorRate: auditable(errors, events.length),
        efficiency: auditable(aces - errors, events.length),
      };
    });
    const receptions = input.roster.map((player) => {
      const events = input.events.filter(
        (event) => event.playerId === player.id && event.skill === 'reception',
      );
      const grades = events.map(receptionGrade);
      const A = grades.filter((grade) => grade === 'A').length;
      const B = grades.filter((grade) => grade === 'B').length;
      const C = grades.filter((grade) => grade === 'C').length;
      const errors = grades.filter((grade) => grade === 'ERROR').length;
      return {
        playerId: player.id,
        teamId: player.teamId,
        volume: events.length,
        A,
        B,
        C,
        errors,
        positiveRate: auditable(A + B, events.length),
        excellentRate: auditable(A, events.length),
      };
    });
    const blocks = input.roster.map((player) => {
      const events = input.events.filter(
        (event) => event.playerId === player.id && event.skill === 'block',
      );
      const points = outcome(events, 'point');
      const errors = outcome(events, 'error');
      return {
        playerId: player.id,
        teamId: player.teamId,
        points,
        touches: events.length - points - errors,
        errors,
        pointsPerSet: auditable(points, uniqueSets(player.id, input)),
      };
    });
    const rotations = input.teams.flatMap((team) =>
      ROTATION_POSITIONS.map((rotation) => {
        const rotationEvents = input.events.filter((event) => {
          const contact = eventContact(input, event);
          return event.teamId === team.id && contact?.rotation === rotation;
        });
        const rotationAttacks = rotationEvents.filter((event) => event.skill === 'attack');
        const rotationReceptions = rotationEvents.filter((event) => event.skill === 'reception');
        const positive = rotationReceptions.filter((event) =>
          ['A', 'B'].includes(receptionGrade(event) ?? ''),
        ).length;
        return {
          teamId: team.id,
          rotation,
          sideout: rallyRate(input, team.id, 'sideout', { rotation }),
          breakpoint: rallyRate(input, team.id, 'breakpoint', { rotation }),
          attackEfficiency: attackEfficiency(rotationAttacks),
          receptionPositive: auditable(positive, rotationReceptions.length),
          aces: outcome(
            rotationEvents.filter((event) => event.skill === 'serve'),
            'ace',
          ),
          errors: rotationEvents.filter((event) => event.outcome === 'error').length,
        };
      }),
    );
    const directionRows = attackDirections(input);
    const attacksByPosition = attackBySetterPosition(directionRows);
    const directionsByPosition = directionsBySetterPosition(directionRows, attacksByPosition);
    const sideout = input.teams.flatMap((team) => rateReports(input, team.id, 'sideout'));
    const breakpoint = input.teams.flatMap((team) => rateReports(input, team.id, 'breakpoint'));
    const teamSummary = input.teams.map((team) => {
      const teamAttacks = attacks.filter((row) => row.teamId === team.id);
      const teamServes = serves.filter((row) => row.teamId === team.id);
      const teamReceptions = receptions.filter((row) => row.teamId === team.id);
      const overallSideout =
        sideout.find(
          (row) => row.teamId === team.id && !row.playerId && !row.setNumber && !row.rotation,
        )?.rate ?? auditable(0, 0);
      const overallBreakpoint =
        breakpoint.find(
          (row) => row.teamId === team.id && !row.playerId && !row.setNumber && !row.rotation,
        )?.rate ?? auditable(0, 0);
      return {
        teamId: team.id,
        attackEfficiency: combineMetrics(teamAttacks.map((row) => row.efficiency)),
        serveEfficiency: combineMetrics(teamServes.map((row) => row.efficiency)),
        receptionPositive: combineMetrics(teamReceptions.map((row) => row.positiveRate)),
        receptionExcellent: combineMetrics(teamReceptions.map((row) => row.excellentRate)),
        sideout: overallSideout,
        breakpoint: overallBreakpoint,
        blocks: blocks
          .filter((row) => row.teamId === team.id)
          .reduce((sum, row) => sum + row.points, 0),
        aces: teamServes.reduce((sum, row) => sum + row.aces, 0),
        errors:
          teamAttacks.reduce((sum, row) => sum + row.errors, 0) +
          teamServes.reduce((sum, row) => sum + row.errors, 0),
      };
    });
    const expectedSideout = input.teams.flatMap((team) => {
      const references = input.expectedSideoutReferences?.[team.id];
      const scopes = [
        { teamId: team.id },
        ...input.roster
          .filter((player) => player.teamId === team.id)
          .map((player) => ({ teamId: team.id, playerId: player.id })),
      ];
      return scopes.map((scope) => ({
        ...scope,
        rate: advancedMetric(
          this.statisticsEngine.calculate([EXPECTED_SIDEOUT_METRIC_ID], {
            events: input.events,
            tacticalRally: input.tacticalRally,
            scope,
            expectedSideoutReferences: references,
          })[0],
        ),
      }));
    });
    const expectedBreakpoint = input.teams.flatMap((team) => {
      const references = input.expectedBreakpointReferences?.[team.id];
      const scopes = [
        { teamId: team.id },
        ...input.roster
          .filter((player) => player.teamId === team.id)
          .map((player) => ({ teamId: team.id, playerId: player.id })),
      ];
      return scopes.map((scope) => ({
        ...scope,
        rate: advancedMetric(
          this.statisticsEngine.calculate([EXPECTED_BREAKPOINT_METRIC_ID], {
            events: input.events,
            tacticalRally: input.tacticalRally,
            scope,
            expectedBreakpointReferences: references,
          })[0],
        ),
      }));
    });
    const attackEvenness = input.teams.flatMap((team): readonly AttackEvennessReport[] => {
      const scopes: StatisticsScope[] = [
        { teamId: team.id },
        ...ROTATION_POSITIONS.map((rotation) => ({ teamId: team.id, rotation })),
        ...ROTATION_POSITIONS.map((setterPosition) => ({ teamId: team.id, setterPosition })),
        ...(['sideout', 'breakpoint', 'transition'] as const).map((phase) => ({
          teamId: team.id,
          phase,
        })),
        ...(['A', 'B', 'C', 'ERROR'] as const).map((receptionGrade) => ({
          teamId: team.id,
          receptionGrade,
        })),
      ];
      return scopes.map((scope) => {
        const result = this.statisticsEngine.calculate([ATTACK_EVENNESS_METRIC_ID], {
          events: input.events,
          tacticalRally: input.tacticalRally,
          scope,
          attackEvennessReference: input.attackEvennessReferences?.[team.id],
        })[0];
        return {
          teamId: team.id,
          ...(scope.rotation ? { rotation: scope.rotation as CourtRotationPosition } : {}),
          ...(scope.setterPosition ? { setterPosition: scope.setterPosition } : {}),
          ...(scope.phase ? { phase: scope.phase } : {}),
          ...(scope.receptionGrade ? { receptionGrade: scope.receptionGrade } : {}),
          evenness: advancedMetric(result),
          distribution: Object.freeze(
            (result.breakdown ?? []).map((item) => ({
              playerId: item.key,
              volume: item.numerator,
              observedShare: item.value,
              expectedShare: item.components?.expectedShare ?? 0,
            })),
          ),
        };
      });
    });
    const setterRepetition = setterRepetitionReports(input.events, input.tacticalRally).map(
      (row) => ({
        ...row,
        repeatRate: auditable(row.repeats, row.opportunities),
      }),
    );
    const setterAttackConversion = setterAttackConversionReports(
      input.events,
      input.tacticalRally,
    ).map((row) => ({
      ...row,
      killRate: auditable(row.points, row.volume),
      attackEfficiency: auditable(row.points - row.errors - row.blocked, row.volume),
    }));
    const timestamps = input.events.map((event) => event.timestamp);

    return Object.freeze({
      metadata: input.state.metadata,
      eventCount: input.events.length,
      durationMs: timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : 0,
      score: input.state.score,
      sets: input.state.sets,
      teams: Object.freeze(input.teams.map((team) => ({ id: team.id, name: team.name }))),
      players: Object.freeze(
        input.roster.map((player) => ({
          id: player.id,
          teamId: player.teamId,
          number: player.number,
          name: player.name ?? `Jogador ${player.number}`,
        })),
      ),
      attack: Object.freeze(attacks),
      serve: Object.freeze(serves),
      reception: Object.freeze(receptions),
      block: Object.freeze(blocks),
      rotations: Object.freeze(rotations),
      sideout: Object.freeze(sideout),
      breakpoint: Object.freeze(breakpoint),
      setterDistribution: setterDistribution(directionRows),
      teamSummary: Object.freeze(teamSummary),
      tactical: Object.freeze({
        attackDirections: directionRows,
        attackBySetterPosition: attacksByPosition,
        directionsBySetterPosition: directionsByPosition,
      }),
      advanced: Object.freeze({
        expectedSideout: Object.freeze(expectedSideout),
        expectedBreakpoint: Object.freeze(expectedBreakpoint),
        attackEvenness: Object.freeze(attackEvenness),
        setterRepetition: Object.freeze(setterRepetition),
        setterAttackConversion: Object.freeze(setterAttackConversion),
      }),
      spatial: this.spatialProjection.project(input.events, input.tacticalRally, input.zoneSystem),
    });
  }
}
