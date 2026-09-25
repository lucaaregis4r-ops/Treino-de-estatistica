import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from './MatchMetadata';
import { resolveMatchSport } from './MatchSport';

const base: MatchMetadata = {
  id: 'm', name: 'A x B', teamAId: 'a', teamBId: 'b', createdAt: 1,
  status: 'in_progress', codeProfileId: 'neutral', codeProfileVersion: '1',
  complexityProfileId: 'basic',
};

describe('resolveMatchSport', () => {
  it('uses the explicit persisted sport as authority', () => {
    expect(resolveMatchSport({ ...base, sport: 'football', initialServingTeamId: 'a' })).toBe('football');
  });
  it('recognizes legacy volleyball only from volleyball evidence', () => {
    expect(resolveMatchSport({ ...base, initialServingTeamId: 'a' })).toBe('volleyball');
  });
  it('does not silently classify ambiguous legacy data', () => {
    expect(resolveMatchSport(base)).toBeUndefined();
  });
});
