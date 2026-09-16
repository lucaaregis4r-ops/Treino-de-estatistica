import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIProviderError } from '../../../application/ai/AIProvider';
import { GeminiProvider } from './GeminiProvider';

const payload = {
  schemaVersion: 'scout-trainer-0.45' as const,
  questionId: 'attack_trajectories' as const,
  answerType: 'spatial_region' as const,
  status: 'available' as const,
  filters: {},
  sample: { n: 8, unit: 'event' as const, completeRallies: 8 },
  findings: [{ findingId: 'f-1', label: 'região 1 -> região 2', numbers: { n: 8, deltaVsBaseline: 0.25 }, sample: { n: 8, unit: 'event' as const }, baseline: { pointProbability: 0.5 }, available: true, caveats: [] }],
  caveats: [],
};

afterEach(() => vi.unstubAllGlobals());

describe('GeminiProvider', () => {
  it('parses only the structured text and does not put aggregates in a raw event format', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toContain('attack_trajectories');
      expect(init?.body).not.toContain('ScoutEvent');
      expect(init?.body).not.toContain('"x"');
      expect(init?.body).not.toContain('"y"');
      return Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"summary":"ok","observations":[],"cautions":[]}' }] } }] }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(new GeminiProvider({ apiKey: 'memory-only', endpoint: 'https://example.test' }).explain(payload)).resolves.toMatchObject({ summary: 'ok' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([401, 403])('maps HTTP %s without exposing the key', async (status) => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status }))));
    await expect(new GeminiProvider({ apiKey: 'secret-in-memory', endpoint: 'https://example.test' }).explain(payload))
      .rejects.toMatchObject({ code: status === 401 ? 'unauthorized' : 'forbidden' });
  });

  it('rejects invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not-json' }] } }] }), { status: 200 }))));
    await expect(new GeminiProvider({ apiKey: 'memory-only', endpoint: 'https://example.test' }).explain(payload))
      .rejects.toBeInstanceOf(AIProviderError);
  });
});
