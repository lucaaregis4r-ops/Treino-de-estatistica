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
      missingRecommendedFields: ['direction'],
    });
    expect(result.value.event.completeness).toEqual(result.value.completeness);
  });

  it('derives the normal attack origin from the athlete rotation position', () => {
    const result = new RegisterScoutEventUseCase().execute({
      rawCode: '08A#',
      profiles: tacticalProfiles(),
      context: {
        ...context,
        lineup: {
          teamId: 'team_a',
          setNumber: 1,
          positions: { 1: 's1', 2: 's2', 3: 's3', 4: 's4', 5: 's5', 6: 's6' },
          slots: {
            s1: { slotId: 's1', tacticalRole: 'setter', playerId: 'p1' },
            s2: { slotId: 's2', tacticalRole: 'outside_1', playerId: 'team_a_08' },
            s3: { slotId: 's3', tacticalRole: 'middle_1', playerId: 'p3' },
            s4: { slotId: 's4', tacticalRole: 'opposite', playerId: 'p4' },
            s5: { slotId: 's5', tacticalRole: 'outside_2', playerId: 'p5' },
            s6: { slotId: 's6', tacticalRole: 'middle_2', playerId: 'p6' },
          },
        },
      },
      metadata: { direction: 'diagonal' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.event.metadata?.tactical?.attack?.trajectory).toMatchObject({
      origin: { zoneId: '2' },
      direction: 'diagonal',
    });
    expect(result.value.completeness).toEqual({
      status: 'complete',
      missingRecommendedFields: [],
    });
  });

  it('keeps an explicitly captured exceptional attack origin', () => {
    const result = new RegisterScoutEventUseCase().execute({
      rawCode: '08A#',
      profiles: tacticalProfiles(),
      context: {
        ...context,
        lineup: {
          teamId: 'team_a',
          setNumber: 1,
          positions: { 1: 's1', 2: 's2', 3: 's3', 4: 's4', 5: 's5', 6: 's6' },
          slots: {
            s1: { slotId: 's1', tacticalRole: 'setter', playerId: 'p1' },
            s2: { slotId: 's2', tacticalRole: 'outside_1', playerId: 'team_a_08' },
            s3: { slotId: 's3', tacticalRole: 'middle_1', playerId: 'p3' },
            s4: { slotId: 's4', tacticalRole: 'opposite', playerId: 'p4' },
            s5: { slotId: 's5', tacticalRole: 'outside_2', playerId: 'p5' },
            s6: { slotId: 's6', tacticalRole: 'middle_2', playerId: 'p6' },
          },
        },
      },
      metadata: { originZone: 4, direction: 'paralela', attackCombination: 'INV' },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.event.metadata?.tactical?.attack).toMatchObject({
      combination: 'INV',
      trajectory: { origin: { zoneId: '4' }, direction: 'paralela' },
    });
  });
});
