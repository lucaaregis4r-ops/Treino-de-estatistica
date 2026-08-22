import { describe, expect, it } from 'vitest';
import { basicProfile, tacticalProfile } from '../../../profiles/complexity/profiles';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from './ScoutValidationContext';
import { ValidationEngine } from './ValidationEngine';

const candidate: CanonicalScoutEventCandidate = {
  playerNumber: 8,
  skill: 'attack',
  evaluation: 'excellent',
  outcome: 'point',
  rawCode: '08A#',
  normalizedCode: '08A#',
};

const context: ScoutValidationContext = {
  matchId: 'match_1',
  rallyId: 'rally_1',
  teamId: 'team_a',
  setNumber: 1,
  scoreBefore: { teamA: 0, teamB: 0 },
  sequence: 1,
  roster: [{ id: 'team_a_08', teamId: 'team_a', number: 8 }],
};

describe('ValidationEngine', () => {
  const engine = new ValidationEngine();

  it('returns ok for a valid basic event', () => {
    expect(engine.validate(candidate, basicProfile, context)).toEqual({
      valid: true,
      severity: 'ok',
      issues: [],
    });
  });

  it('returns a non-blocking warning for an unregistered player', () => {
    const result = engine.validate(candidate, basicProfile, { ...context, roster: [] });

    expect(result.valid).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.issues[0]?.code).toBe('player_not_registered');
  });

  it('does not block fields classified as recommended by the active profile', () => {
    const result = engine.validate(candidate, tacticalProfile, context);

    expect(result).toEqual({ valid: true, severity: 'ok', issues: [] });
  });

  it('still rejects a missing field explicitly classified as blocking', () => {
    const result = engine.validate(
      candidate,
      {
        ...tacticalProfile,
        captureRequirements: {
          ...tacticalProfile.captureRequirements,
          originZone: 'blocking',
        },
      },
      context,
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      expect.objectContaining({ code: 'profile_required_field_missing', path: 'originZone' }),
    ]);
  });

  it('returns an error for a non-contiguous sequence', () => {
    const result = engine.validate(candidate, basicProfile, {
      ...context,
      previousSequence: 1,
      sequence: 3,
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('non_contiguous_sequence');
  });

  it('keeps unusual tactical ranges as warnings when all required fields exist', () => {
    const result = engine.validate(
      {
        ...candidate,
        metadata: {
          skillType: 'power',
          originZone: 10,
          targetZone: 6,
          direction: 'diagonal',
        },
      },
      tacticalProfile,
      context,
    );

    expect(result.valid).toBe(true);
    expect(result.severity).toBe('warning');
    expect(result.issues[0]?.code).toBe('unusual_tactical_zone');
  });
});
