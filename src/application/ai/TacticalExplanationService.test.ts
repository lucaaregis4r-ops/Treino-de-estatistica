import { describe, expect, it, vi } from 'vitest';
import { TacticalExplanationService } from './TacticalExplanationService';
import type { AIProvider } from './AIProvider';
import type { TacticalQuestionAnswer } from '../analytics/TacticalQuestionService';

const answer: TacticalQuestionAnswer = {
  questionId: 'attack_trajectories', answerType: 'spatial_region', status: 'available',
  filters: { teamId: 'team-a' }, sample: { n: 8, unit: 'event', completeRallies: 8 }, caveats: [],
  findings: [{ findingId: 'attack-a-b', label: 'região A -> região B', numbers: { n: 8, empiricalPointProbability: 0.75, deltaVsBaseline: 0.25 }, sample: { n: 8, unit: 'event', completeRallies: 8 }, filters: { teamId: 'team-a' }, baseline: { pointProbability: 0.5 }, available: true, caveats: [] }],
};

const fake = (value: unknown): AIProvider => ({ explain: vi.fn(() => Promise.resolve(value)) });

describe('TacticalExplanationService', () => {
  it('sends only aggregate DTO and validates a successful answer', async () => {
    const provider = fake({ summary: 'observado', observations: [{ findingId: 'attack-a-b', explanation: 'delta observado' }], cautions: ['não causal'] });
    const result = await new TacticalExplanationService(provider).explain(answer);
    expect(result.status).toBe('available');
    if (result.status === 'available') {
      expect(JSON.stringify(result.payload)).not.toContain('team-a');
      expect(JSON.stringify(result.payload)).not.toContain('ScoutEvent');
      expect(JSON.stringify(result.payload)).not.toContain('apiKey');
      expect(JSON.stringify(result.payload)).not.toContain('origin');
      expect(result.explanation.observations[0]?.findingId).toBe('attack-a-b');
    }
  });

  it('works without a key/provider and does not affect analytics', async () => {
    const result = await new TacticalExplanationService().explain(answer);
    expect(result).toMatchObject({ status: 'unavailable', reason: 'missing_api_key' });
  });

  it('rejects unknown findings and maps timeout', async () => {
    const invalid = await new TacticalExplanationService(fake({ summary: 'x', observations: [{ findingId: 'other', explanation: 'x' }], cautions: [] })).explain(answer);
    expect(invalid).toMatchObject({ status: 'unavailable', reason: 'invalid_response' });
    const slow: AIProvider = { explain: (_payload, options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true })) };
    const timed = await new TacticalExplanationService(slow, 1).explain(answer);
    expect(timed).toMatchObject({ status: 'unavailable', reason: 'timeout' });
  });
});
