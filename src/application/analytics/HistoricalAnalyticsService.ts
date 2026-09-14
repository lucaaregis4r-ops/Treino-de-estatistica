import type { AnalyticsSnapshotRepository } from '../ports/repositories/AnalyticsSnapshotRepository';
import {
  ANALYTICS_SCHEMA_VERSION,
  createMatchAnalyticsSnapshot,
  type MatchAnalyticsSnapshot,
} from '../../domain/analytics/MatchAnalyticsSnapshot';
import type { MatchReportModel } from '../reporting/MatchReportModel';

export interface HistoricalTeamMetric {
  readonly teamId: string;
  readonly numerator: number;
  readonly denominator: number;
  readonly matchCount: number;
  readonly matches: readonly string[];
}

export interface HistoricalPlayerMetric {
  readonly playerId: string;
  readonly teamId: string;
  readonly skill: 'attack' | 'serve' | 'reception' | 'block';
  readonly numerator: number;
  readonly denominator: number;
  readonly matchCount: number;
  readonly matches: readonly string[];
}

export interface HistoricalReferences {
  readonly sideoutByTeamId: ReadonlyMap<string, HistoricalTeamMetric>;
  readonly breakpointByTeamId: ReadonlyMap<string, HistoricalTeamMetric>;
}

export interface HistoricalPlayerSeries {
  readonly playerId: string;
  readonly teamId: string;
  readonly skill: 'attack' | 'serve' | 'reception' | 'block';
  readonly volume: number;
  readonly efficiency: number | null;
  readonly matchCount: number;
}

export interface HistoricalTeamSeries {
  readonly teamId: string;
  readonly attackEfficiency: number | null;
  readonly serveEfficiency: number | null;
  readonly receptionPositive: number | null;
  readonly receptionExcellent: number | null;
  readonly sideout: number | null;
  readonly breakpoint: number | null;
  readonly blocks: number;
  readonly aces: number;
  readonly errors: number;
  readonly matchCount: number;
}

function buildSnapshotFromReport(
  matchId: string,
  report: MatchReportModel,
  lastSequence: number,
  now: number,
): MatchAnalyticsSnapshot {
  const teamSummary = report.teamSummary.map((summary) => ({
    teamId: summary.teamId,
    attackEfficiencyNumerator: summary.attackEfficiency.numerator,
    attackEfficiencyDenominator: summary.attackEfficiency.denominator,
    serveEfficiencyNumerator: summary.serveEfficiency.numerator,
    serveEfficiencyDenominator: summary.serveEfficiency.denominator,
    receptionPositiveNumerator: summary.receptionPositive.numerator,
    receptionPositiveDenominator: summary.receptionPositive.denominator,
    receptionExcellentNumerator: summary.receptionExcellent.numerator,
    receptionExcellentDenominator: summary.receptionExcellent.denominator,
    sideoutNumerator: summary.sideout.numerator,
    sideoutDenominator: summary.sideout.denominator,
    breakpointNumerator: summary.breakpoint.numerator,
    breakpointDenominator: summary.breakpoint.denominator,
    blocks: summary.blocks,
    aces: summary.aces,
    errors: summary.errors,
  }));

  const playerSummary: MatchAnalyticsSnapshot['playerSummary'] = [
    ...report.attack.map((row) => ({
      playerId: row.playerId,
      teamId: row.teamId,
      skill: 'attack' as const,
      volume: row.volume,
      points: row.points,
      errors: row.errors,
      blocked: row.blocked,
      numerator: row.efficiency.numerator,
      denominator: row.efficiency.denominator,
    })),
    ...report.serve.map((row) => ({
      playerId: row.playerId,
      teamId: row.teamId,
      skill: 'serve' as const,
      volume: row.volume,
      points: row.aces,
      errors: row.errors,
      blocked: 0,
      numerator: row.efficiency.numerator,
      denominator: row.efficiency.denominator,
    })),
    ...report.reception.map((row) => ({
      playerId: row.playerId,
      teamId: row.teamId,
      skill: 'reception' as const,
      volume: row.volume,
      points: row.A + row.B,
      errors: row.errors,
      blocked: 0,
      numerator: row.positiveRate.numerator,
      denominator: row.positiveRate.denominator,
    })),
    ...report.block.map((row) => ({
      playerId: row.playerId,
      teamId: row.teamId,
      skill: 'block' as const,
      volume: row.points + row.touches + row.errors,
      points: row.points,
      errors: row.errors,
      blocked: 0,
      numerator: row.points,
      denominator: row.pointsPerSet.denominator,
    })),
  ];

  return createMatchAnalyticsSnapshot(
    matchId,
    report.eventCount,
    lastSequence,
    now,
    teamSummary,
    playerSummary,
  );
}

function mergeTeamMetrics(
  existing: HistoricalTeamMetric | undefined,
  snapshot: MatchAnalyticsSnapshot['teamSummary'][number],
  matchId: string,
  matchIds: string[],
): HistoricalTeamMetric {
  const isSameMatch = matchIds.includes(matchId);
  return {
    teamId: snapshot.teamId,
    numerator:
      (existing?.numerator ?? 0) +
      (isSameMatch ? 0 : snapshot.sideoutNumerator),
    denominator:
      (existing?.denominator ?? 0) +
      (isSameMatch ? 0 : snapshot.sideoutDenominator),
    matchCount: (existing?.matchCount ?? 0) + (isSameMatch ? 0 : 1),
    matches: isSameMatch ? existing?.matches ?? [] : [...(existing?.matches ?? []), matchId],
  };
}

export class HistoricalAnalyticsService {
  constructor(private readonly snapshotRepository: AnalyticsSnapshotRepository) {}

  async buildSnapshot(
    matchId: string,
    report: MatchReportModel,
    lastSequence: number,
  ): Promise<void> {
    const snapshot = buildSnapshotFromReport(matchId, report, lastSequence, Date.now());
    await this.snapshotRepository.save(snapshot);
  }

  async invalidateAndRebuild(
    matchId: string,
    report: MatchReportModel,
    lastSequence: number,
  ): Promise<void> {
    await this.snapshotRepository.deleteByMatchId(matchId);
    await this.buildSnapshot(matchId, report, lastSequence);
  }

  async isSnapshotValid(matchId: string, currentEventCount: number, currentLastSequence: number): Promise<boolean> {
    const result = await this.snapshotRepository.findById(matchId);
    if (!result.ok || !result.value) return false;
    const snapshot = result.value;
    return (
      snapshot.schemaVersion === ANALYTICS_SCHEMA_VERSION &&
      snapshot.eventCount === currentEventCount &&
      snapshot.lastSequence === currentLastSequence
    );
  }

  async getValidSnapshot(
    matchId: string,
    currentEventCount: number,
    currentLastSequence: number,
  ): Promise<MatchAnalyticsSnapshot | null> {
    const result = await this.snapshotRepository.findById(matchId);
    if (!result.ok || !result.value) return null;
    const snapshot = result.value;
    if (
      snapshot.schemaVersion !== ANALYTICS_SCHEMA_VERSION ||
      snapshot.eventCount !== currentEventCount ||
      snapshot.lastSequence !== currentLastSequence
    ) {
      return null;
    }
    return snapshot;
  }

  async getTeamSeries(
    matchIds: readonly string[],
    teamId: string,
  ): Promise<HistoricalTeamSeries> {
    const allSnapshots = await this.snapshotRepository.list();
    if (!allSnapshots.ok) {
      return {
        teamId,
        attackEfficiency: null,
        serveEfficiency: null,
        receptionPositive: null,
        receptionExcellent: null,
        sideout: null,
        breakpoint: null,
        blocks: 0,
        aces: 0,
        errors: 0,
        matchCount: 0,
      };
    }
    const matchSet = new Set(matchIds);
    const snapshots = allSnapshots.value.filter((s) => matchSet.has(s.matchId));
    const teamSnapshots = snapshots.flatMap((s) =>
      s.teamSummary.filter((t) => t.teamId === teamId).map((t) => ({ ...t, matchId: s.matchId })),
    );
    if (teamSnapshots.length === 0) {
      return {
        teamId,
        attackEfficiency: null,
        serveEfficiency: null,
        receptionPositive: null,
        receptionExcellent: null,
        sideout: null,
        breakpoint: null,
        blocks: 0,
        aces: 0,
        errors: 0,
        matchCount: 0,
      };
    }
    const attackNum = teamSnapshots.reduce((sum, s) => sum + s.attackEfficiencyNumerator, 0);
    const attackDen = teamSnapshots.reduce((sum, s) => sum + s.attackEfficiencyDenominator, 0);
    const serveNum = teamSnapshots.reduce((sum, s) => sum + s.serveEfficiencyNumerator, 0);
    const serveDen = teamSnapshots.reduce((sum, s) => sum + s.serveEfficiencyDenominator, 0);
    const recvPosNum = teamSnapshots.reduce((sum, s) => sum + s.receptionPositiveNumerator, 0);
    const recvPosDen = teamSnapshots.reduce((sum, s) => sum + s.receptionPositiveDenominator, 0);
    const recvExcNum = teamSnapshots.reduce((sum, s) => sum + s.receptionExcellentNumerator, 0);
    const recvExcDen = teamSnapshots.reduce((sum, s) => sum + s.receptionExcellentDenominator, 0);
    const sideoutNum = teamSnapshots.reduce((sum, s) => sum + s.sideoutNumerator, 0);
    const sideoutDen = teamSnapshots.reduce((sum, s) => sum + s.sideoutDenominator, 0);
    const bpNum = teamSnapshots.reduce((sum, s) => sum + s.breakpointNumerator, 0);
    const bpDen = teamSnapshots.reduce((sum, s) => sum + s.breakpointDenominator, 0);
    return {
      teamId,
      attackEfficiency: attackDen === 0 ? null : attackNum / attackDen,
      serveEfficiency: serveDen === 0 ? null : serveNum / serveDen,
      receptionPositive: recvPosDen === 0 ? null : recvPosNum / recvPosDen,
      receptionExcellent: recvExcDen === 0 ? null : recvExcNum / recvExcDen,
      sideout: sideoutDen === 0 ? null : sideoutNum / sideoutDen,
      breakpoint: bpDen === 0 ? null : bpNum / bpDen,
      blocks: teamSnapshots.reduce((sum, s) => sum + s.blocks, 0),
      aces: teamSnapshots.reduce((sum, s) => sum + s.aces, 0),
      errors: teamSnapshots.reduce((sum, s) => sum + s.errors, 0),
      matchCount: teamSnapshots.length,
    };
  }

  async getPlayerSeries(
    matchIds: readonly string[],
    playerId: string,
  ): Promise<readonly HistoricalPlayerSeries[]> {
    const allSnapshots = await this.snapshotRepository.list();
    if (!allSnapshots.ok) return [];
    const matchSet = new Set(matchIds);
    const snapshots = allSnapshots.value.filter((s) => matchSet.has(s.matchId));
    const skills = ['attack', 'serve', 'reception', 'block'] as const;
    return skills
      .map((skill) => {
        const playerSnapshots = snapshots.flatMap((s) =>
          s.playerSummary.filter((p) => p.playerId === playerId && p.skill === skill),
        );
        if (playerSnapshots.length === 0) return null;
        const totalNumerator = playerSnapshots.reduce((sum, p) => sum + p.numerator, 0);
        const totalDenominator = playerSnapshots.reduce((sum, p) => sum + p.denominator, 0);
        return {
          playerId,
          teamId: playerSnapshots[0].teamId,
          skill,
          volume: playerSnapshots.reduce((sum, p) => sum + p.volume, 0),
          efficiency: totalDenominator === 0 ? null : totalNumerator / totalDenominator,
          matchCount: playerSnapshots.length,
        };
      })
      .filter((series): series is HistoricalPlayerSeries => series !== null);
  }

  async buildHistoricalReferences(
    matchIds: readonly string[],
  ): Promise<HistoricalReferences> {
    const allSnapshots = await this.snapshotRepository.list();
    if (!allSnapshots.ok) {
      return {
        sideoutByTeamId: new Map(),
        breakpointByTeamId: new Map(),
      };
    }
    const matchSet = new Set(matchIds);
    const snapshots = allSnapshots.value.filter((s) => matchSet.has(s.matchId));
    const sideoutByTeamId = new Map<string, HistoricalTeamMetric>();
    const breakpointByTeamId = new Map<string, HistoricalTeamMetric>();
    for (const snapshot of snapshots) {
      for (const team of snapshot.teamSummary) {
        const sideoutExisting = sideoutByTeamId.get(team.teamId);
        sideoutByTeamId.set(
          team.teamId,
          mergeTeamMetrics(
            sideoutExisting,
            {
              ...team,
              sideoutNumerator: team.sideoutNumerator,
              sideoutDenominator: team.sideoutDenominator,
            },
            snapshot.matchId,
            [],
          ),
        );
        const bpExisting = breakpointByTeamId.get(team.teamId);
        breakpointByTeamId.set(
          team.teamId,
          mergeTeamMetrics(
            bpExisting,
            {
              ...team,
              sideoutNumerator: team.breakpointNumerator,
              sideoutDenominator: team.breakpointDenominator,
            },
            snapshot.matchId,
            [],
          ),
        );
      }
    }
    return { sideoutByTeamId, breakpointByTeamId };
  }
}
