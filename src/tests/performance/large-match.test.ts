import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { MatchEvent } from '../../domain/match/events/MatchEvent';
import { projectScoutTimeline } from '../../domain/match/events/ScoutTimeline';
import { StatisticsEngine } from '../../domain/statistics/StatisticsEngine';
import { createDefaultMetricRegistry } from '../../domain/statistics/registry/createDefaultMetricRegistry';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';

describe('large match', () => {
  it('persists, projects, and calculates metrics for 5,000 events', async () => {
    const databaseName = `scout-trainer-large-${crypto.randomUUID()}`;
    const database = new ScoutTrainerDatabase(databaseName);
    const repository = new IndexedDbEventRepository(database);
    const events: MatchEvent[] = Array.from({ length: 5_000 }, (_, index) => ({
      type: 'scout_registered',
      event: {
        id: `event_${index + 1}`,
        matchId: 'large_match',
        rallyId: `rally_${index + 1}`,
        sequence: index + 1,
        teamId: index % 2 === 0 ? 'team_a' : 'team_b',
        playerId: index % 2 === 0 ? 'player_a' : 'player_b',
        skill: 'attack',
        outcome: index % 4 === 0 ? 'point' : 'continuation',
        evaluation: index % 4 === 0 ? 'excellent' : 'positive',
        setNumber: Math.floor(index / 1_000) + 1,
        scoreBefore: { teamA: 0, teamB: 0 },
        timestamp: index + 1,
        rawCode: index % 4 === 0 ? '01A#' : '01A+',
        codeProfileId: 'default_compact_v1',
        codeProfileVersion: '1.0.0',
        complexityProfileId: 'basic',
      },
    }));

    try {
      const startedAt = performance.now();
      const appended = await repository.appendMany(events);
      const stored = await repository.listByMatch('large_match');
      if (!stored.ok) throw stored.error;
      const timeline = projectScoutTimeline(stored.value);
      const results = new StatisticsEngine(createDefaultMetricRegistry()).calculate(
        ['volleyball.attack.volume', 'volleyball.attack.points'],
        { events: timeline.map((item) => item.event) },
      );
      const elapsed = performance.now() - startedAt;

      expect(appended.ok).toBe(true);
      expect(stored.value).toHaveLength(5_000);
      expect(timeline).toHaveLength(5_000);
      expect(results[0]).toMatchObject({ value: 5_000, available: true });
      expect(results[1]).toMatchObject({ value: 1_250, available: true });
      expect(elapsed).toBeLessThan(10_000);
    } finally {
      await database.close();
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(request.error ?? new Error('Could not delete large-match database.'));
      });
    }
  }, 15_000);
});
