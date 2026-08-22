import { describe, expect, it } from 'vitest';
import { ProfileResolver } from '../../../profiles/ProfileResolver';
import { createDefaultProfileRegistry } from '../../../profiles/registry/createDefaultProfileRegistry';
import type { ScoutValidationContext } from '../../../domain/scout/validators/ScoutValidationContext';
import { RegisterScoutEventUseCase } from './RegisterScoutEventUseCase';

function basicProfiles() {
  const resolved = new ProfileResolver(createDefaultProfileRegistry()).resolve({
    code: { id: 'default_compact_v1', version: '1.0.0' },
    complexity: { id: 'basic', version: '1.0.0' },
  });
  if (!resolved.ok) throw resolved.error;
  return resolved.value;
}

function tacticalProfiles() {
  const resolved = new ProfileResolver(createDefaultProfileRegistry()).resolve({
    code: { id: 'default_compact_v1', version: '1.0.0' },
    complexity: { id: 'tactical', version: '1.0.0' },
  });
  if (!resolved.ok) throw resolved.error;
  return resolved.value;
}

const context: ScoutValidationContext = {
  matchId: 'match_1',
  rallyId: 'rally_1',
  teamId: 'team_a',
  setNumber: 1,
  scoreBefore: { teamA: 10, teamB: 9 },
  sequence: 1,
  roster: [{ id: 'team_a_08', teamId: 'team_a', number: 8 }],
};

describe('RegisterScoutEventUseCase', () => {
  it('runs the complete input pipeline and preserves raw input', () => {
    const result = new RegisterScoutEventUseCase().execute({
      rawCode: ' 08a# ',
      profiles: basicProfiles(),
      context,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.normalizedCode).toBe('08A#');
    expect(result.value.event).toMatchObject({
      rawCode: ' 08a# ',
      playerId: 'team_a_08',
      skill: 'attack',
      outcome: 'point',
      codeProfileVersion: '1.0.0',
      complexityProfileId: 'basic',
    });
  });

  it('allows warnings while returning their diagnostics', () => {
    const result = new RegisterScoutEventUseCase().execute({
      rawCode: '17S+',
      profiles: basicProfiles(),
      context: { ...context, roster: [] },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.validation.severity).toBe('warning');
      expect(result.value.event.playerId).toBeUndefined();
    }
  });

  it('blocks structurally invalid input', () => {
    const result = new RegisterScoutEventUseCase().execute({
      rawCode: '08X?',
      profiles: basicProfiles(),
      context,
    });

    expect(result.ok).toBe(false);
  });

  it('persists a valid tactical core and reports recommended fields separately', () => {
    const result = new RegisterScoutEventUseCase().execute({
      rawCode: '08A#',
      profiles: tacticalProfiles(),
      context,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.validation.valid).toBe(true);
    expect(result.value.completeness).toEqual({
      status: 'partial',
      missingRecommendedFields: ['originZone', 'targetZone', 'direction'],
    });
    expect(result.value.event.completeness).toEqual(result.value.completeness);
  });
});
