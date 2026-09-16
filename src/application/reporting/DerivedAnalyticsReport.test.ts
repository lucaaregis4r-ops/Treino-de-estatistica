import { describe, expect, it } from 'vitest';
import { buildDerivedAnalyticsReport } from './DerivedAnalyticsReport';
import type { SequenceAnalytics } from '../analytics/SequenceAnalyticsService';
import { defaultTacticalInput } from '../../profiles/code/default-compact/defaultTacticalInput';

describe('DerivedAnalyticsReport', () => {
  it('exports opt-in aggregates without sequence/event copies', () => {
    const analytics = { teams: [{ teamId: 'a', sequences: [{ status: 'complete' }], markov: { transitions: [], stateValues: [], matrix: { teamId: 'a', sampleSize: 1, counts: [], rowTotals: {} } }, patterns: { 2: [], 3: [] }, spatial: {} }] } as unknown as SequenceAnalytics;
    const report = buildDerivedAnalyticsReport(analytics, defaultTacticalInput.zoneSystem);
    expect(report.sample).toEqual({ n: 1, unit: 'rally' });
    expect(report.coordinateSystem).toMatchObject({ zoneSystemVersion: defaultTacticalInput.zoneSystem.version, resolution: 6 });
    expect(JSON.stringify(report)).not.toContain('sequences');
    expect(report.smoothing).toEqual({ method: 'none', parameter: null });
  });
});
