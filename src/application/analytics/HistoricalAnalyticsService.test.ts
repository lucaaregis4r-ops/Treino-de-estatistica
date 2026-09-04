import { describe, expect, it, vi } from 'vitest';
import type { MatchAnalyticsSnapshot } from '../../domain/analytics/MatchAnalyticsSnapshot';
import type { AnalyticsSnapshotRepository } from '../ports/repositories/AnalyticsSnapshotRepository';
import { success } from '../../core/result/Result';
import { HistoricalAnalyticsService } from './HistoricalAnalyticsService';
import type { MatchReportModel } from '../reporting/MatchReportModel';

function createMockSnapshotRepository(): AnalyticsSnapshotRepository {
  const store = new Map<string, MatchAnalyticsSnapshot>();
  return {
    save: vi.fn(async (snapshot: MatchAnalyticsSnapshot) => {
      store.set(snapshot.matchId, snapshot);
      return success(undefined);
    }),
    findById: vi.fn(async (matchId: string) => {
      return success(store.get(matchId) ?? null);
    }),
    list: vi.fn(async () => {
      return success([...store.values()]);
    }),
    deleteByMatchId: vi.fn(async (matchId: string) => {
      store.delete(matchId);
      return success(undefined);
    }),
  };
}

function createMockReport(matchId: string, teamId: string, eventCount: number): MatchReportModel {
  return {
    metadata: {
      id: matchId,
      name: 'Test Match',
      teamAId: teamId,
      teamBId: 'team_b',
      createdAt: 1,
      status: 'in_progress',
      initialServingTeamId: teamId,
      scoringRules: { setsToWin: 3, regularSetTarget: 25, decidingSetTarget: 15, minimumLead: 2 },
      codeProfileId: 'default_compact_v1',
      codeProfileVersion: '1.0.0',
      complexityProfileId: 'tactical',
    },
    eventCount,
    durationMs: 0,
    score: { teamA: 0, teamB: 0 },
    sets: [],
    teams: [{ id: teamId, name: 'Team A' }, { id: 'team_b', name: 'Team B' }],
    players: [],
    attack: [],
    serve: [],
    reception: [],
    block: [],
    rotations: [],
    sideout: [],
    breakpoint: [],
    setterDistribution: [],
    teamSummary: [
      {
        teamId,
        attackEfficiency: { value: 0.5, numerator: 10, denominator: 20 },
        serveEfficiency: { value: 0.2, numerator: 4, denominator: 20 },
        receptionPositive: { value: 0.8, numerator: 16, denominator: 20 },
        receptionExcellent: { value: 0.4, numerator: 8, denominator: 20 },
        sideout: { value: 0.6, numerator: 12, denominator: 20 },
        breakpoint: { value: 0.3, numerator: 6, denominator: 20 },
        blocks: 5,
        aces: 3,
        errors: 4,
      },
    ],
    tactical: {
      attackDirections: [],
      attackBySetterPosition: [],
      directionsBySetterPosition: [],
    },
    advanced: {
      expectedSideout: [],
      expectedBreakpoint: [],
      attackEvenness: [],
      setterRepetition: [],
      setterAttackConversion: [],
    },
  };
}

describe('HistoricalAnalyticsService', () => {
  describe('buildSnapshot', () => {
    it('creates and persists a snapshot from a report', async () => {
      const repo = createMockSnapshotRepository();
      const service = new HistoricalAnalyticsService(repo);
      const report = createMockReport('match_1', 'team_a', 50);

      await service.buildSnapshot('match_1', report, 50);

      expect(repo.save).toHaveBeenCalledTimes(1);
      const saved = (repo.save as ReturnType<typeof vi.fn>).mock.calls[0][0] as MatchAnalyticsSnapshot;
      expect(saved.matchId).toBe('match_1');
      expect(saved.eventCount).toBe(50);
      expect(saved.lastSequence).toBe(50);
      expect(saved.schemaVersion).toBe(1);
      expect(saved.teamSummary).toHaveLength(1);
      expect(saved.teamSummary[0].teamId).toBe('team_a');
      expect(saved.teamSummary[0].sideoutNumerator).toBe(12);
      expect(saved.teamSummary[0].sideoutDenominator).toBe(20);
    });
  });

  describe('isSnapshotValid', () => {
    it('returns true when snapshot matches current state', async () => {
      const repo = createMockSnapshotRepository();
      const service = new HistoricalAnalyticsService(repo);
      const report = createMockReport('match_1', 'team_a', 50);

      await service.buildSnapshot('match_1', report, 50);
      const valid = await service.isSnapshotValid('match_1', 50, 50);

      expect(valid).toBe(true);
    });

    it('returns false when event count differs', async () => {
      const repo = createMockSnapshotRepository();
      const service = new HistoricalAnalyticsService(repo);
      const report = createMockReport('match_1', 'team_a', 50);

      await service.buildSnapshot('match_1', report, 50);
      const valid = await service.isSnapshotValid('match_1', 55, 55);

      expect(valid).toBe(false);
    });

    it('returns false when no snapshot exists', async () => {
      const repo = createMockSnapshotRepository();
      const service = new HistoricalAnalyticsService(repo);

      const valid = await service.isSnapshotValid('match_1', 50, 50);

      expect(valid).toBe(false);
    });
  });

  describe('invalidateAndRebuild', () => {
    it('deletes old snapshot and creates new one', async () => {
      const repo = createMockSnapshotRepository();
      const service = new HistoricalAnalyticsService(repo);
      const report1 = createMockReport('match_1', 'team_a', 50);
      const report2 = createMockReport('match_1', 'team_a', 55);

      await service.buildSnapshot('match_1', report1, 50);
      expect(repo.save).toHaveBeenCalledTimes(1);

      await service.invalidateAndRebuild('match_1', report2, 55);
      expect(repo.deleteByMatchId).toHaveBeenCalledWith('match_1');
      expect(repo.save).toHaveBeenCalledTimes(2);

      const snapshot = await service.getValidSnapshot('match_1', 55, 55);
      expect(snapshot).not.toBeNull();
      expect(snapshot!.eventCount).toBe(55);
    });
  });

  describe('getTeamSeries', () => {
    it('aggregates team metrics across multiple matches', async () => {
      const repo = createMockSnapshotRepository();
      const service = new HistoricalAnalyticsService(repo);
      const report1 = createMockReport('match_1', 'team_a', 50);
      const report2 = createMockReport('match_2', 'team_a', 60);

      await service.buildSnapshot('match_1', report1, 50);
      await service.buildSnapshot('match_2', report2, 60);

      const series = await service.getTeamSeries(['match_1', 'match_2'], 'team_a');

      expect(series.teamId).toBe('team_a');
      expect(series.matchCount).toBe(2);
      expect(series.sideout).toBeCloseTo(0.6);
      expect(series.breakpoint).toBeCloseTo(0.3);
      expect(series.blocks).toBe(10);
      expect(series.aces).toBe(6);
      expect(series.errors).toBe(8);
    });

    it('returns empty series when no matches found', async () => {
      const repo = createMockSnapshotRepository();
      const service = new HistoricalAnalyticsService(repo);

      const series = await service.getTeamSeries(['match_1'], 'team_a');

      expect(series.matchCount).toBe(0);
      expect(series.sideout).toBeNull();
    });
  });

  describe('buildHistoricalReferences', () => {
    it('builds sideout and breakpoint references', async () => {
      const repo = createMockSnapshotRepository();
      const service = new HistoricalAnalyticsService(repo);
      const report1 = createMockReport('match_1', 'team_a', 50);
      const report2 = createMockReport('match_2', 'team_a', 60);

      await service.buildSnapshot('match_1', report1, 50);
      await service.buildSnapshot('match_2', report2, 60);

      const refs = await service.buildHistoricalReferences(['match_1', 'match_2']);

      const sideoutRef = refs.sideoutByTeamId.get('team_a');
      expect(sideoutRef).toBeDefined();
      expect(sideoutRef!.numerator).toBe(24);
      expect(sideoutRef!.denominator).toBe(40);
      expect(sideoutRef!.matchCount).toBe(2);

      const bpRef = refs.breakpointByTeamId.get('team_a');
      expect(bpRef).toBeDefined();
      expect(bpRef!.numerator).toBe(12);
      expect(bpRef!.denominator).toBe(40);
      expect(bpRef!.matchCount).toBe(2);
    });
  });
});
