import { describe, expect, it } from 'vitest';
import { EventFactory } from '../../../domain/scout/events/EventFactory';
import type { CanonicalScoutEventCandidate } from '../../../domain/scout/mapper/CanonicalScoutEventCandidate';
import type { ScoutValidationContext } from '../../../domain/scout/validators/ScoutValidationContext';
import { ValidationEngine } from '../../../domain/scout/validators/ValidationEngine';
import { CompletenessEvaluator } from '../../../domain/scout/completeness/CompletenessEvaluator';
import { ProfileResolver } from '../../../profiles/ProfileResolver';
import { createDefaultProfileRegistry } from '../../../profiles/registry/createDefaultProfileRegistry';
import { RegisterScoutEventUseCase } from './RegisterScoutEventUseCase';
import { ValidateAndCreateScoutEventUseCase } from './ValidateAndCreateScoutEventUseCase';

const resolved = new ProfileResolver(createDefaultProfileRegistry()).resolve({
  code: { id: 'default_compact_v1', version: '1.0.0' },
  complexity: { id: 'tactical', version: '1.0.0' },
});
if (!resolved.ok) throw resolved.error;

const context: ScoutValidationContext = {
  matchId: 'match_1',
  rallyId: 'rally_1',
  teamId: 'team_a',
  setNumber: 1,
  scoreBefore: { teamA: 10, teamB: 9 },
  sequence: 4,
  roster: [{ id: 'player_8', teamId: 'team_a', number: 8 }],
};

const candidate: CanonicalScoutEventCandidate = {
  playerNumber: 8,
  skill: 'attack',
  evaluation: 'excellent',
  outcome: 'point',
  rawCode: '[VISUAL] ataque #8 ponto',
  normalizedCode: '[NON_PARSEABLE:VISUAL]',
};

function useCase() {
  return new ValidateAndCreateScoutEventUseCase(
    new ValidationEngine(),
    new CompletenessEvaluator(),
    new EventFactory({ createId: () => 'scout_4', now: () => 123 }),
  );
}

describe('ValidateAndCreateScoutEventUseCase', () => {
  it.each(['typed', 'visual', 'hybrid'] as const)(
    'validates and preserves spatial metadata for %s',
    (inputMode) => {
      const spatial = {
        origin: { surface: 'court', x: 0.123456789012345, y: 0.987654321098765 },
        destination: { surface: 'court', x: 0.876543210987654, y: 0.012345678901234 },
      } as const;
      const result = useCase().execute({
        candidate: { ...candidate, metadata: { spatial } },
        inputMode,
        profiles: resolved.value,
        context,
      });
      if (!result.ok) throw result.error;
      expect(result.value.event.metadata?.spatial).toEqual(spatial);
      expect(result.value.event.metadata?.tactical?.attack?.trajectory?.origin).toBeUndefined();
      const invalid = useCase().execute({
        candidate: {
          ...candidate,
          metadata: { spatial: { ...spatial, destination: { ...spatial.destination, x: NaN } } },
        },
        inputMode,
        profiles: resolved.value,
        context,
      });
      expect(invalid.ok).toBe(false);
      if (!invalid.ok)
        expect(invalid.error.issues).toContainEqual(
          expect.objectContaining({ code: 'invalid_spatial_coordinate' }),
        );
      const typed = new RegisterScoutEventUseCase().execute({
        rawCode: '08A#',
        metadata: { spatial },
        profiles: resolved.value,
        context,
      });
      expect(typed.ok && typed.value.event.metadata?.spatial).toEqual(spatial);
    },
  );

  it('keeps the typed route in parity with the canonical-candidate route', () => {
    const typed = new RegisterScoutEventUseCase().execute({
      rawCode: '08A#',
      profiles: resolved.value,
      context,
    });
    const direct = useCase().execute({
      candidate: {
        playerNumber: 8,
        skill: 'attack',
        evaluation: 'excellent',
        outcome: 'point',
        rawCode: '08A#',
        normalizedCode: '08A#',
      },
      inputMode: 'typed',
      profiles: resolved.value,
      context,
    });

    expect(typed.ok).toBe(true);
    expect(direct.ok).toBe(true);
    if (!typed.ok || !direct.ok) return;
    expect({
      playerId: typed.value.event.playerId,
      skill: typed.value.event.skill,
      evaluation: typed.value.event.evaluation,
      outcome: typed.value.event.outcome,
      rawCode: typed.value.event.rawCode,
      normalizedCode: typed.value.event.normalizedCode,
      inputMode: typed.value.event.inputMode,
      completeness: typed.value.completeness,
      validation: typed.value.validation,
    }).toEqual({
      playerId: direct.value.event.playerId,
      skill: direct.value.event.skill,
      evaluation: direct.value.event.evaluation,
      outcome: direct.value.event.outcome,
      rawCode: direct.value.event.rawCode,
      normalizedCode: direct.value.event.normalizedCode,
      inputMode: direct.value.event.inputMode,
      completeness: direct.value.completeness,
      validation: direct.value.validation,
    });
  });

  it('creates an auditable event directly from a canonical candidate without parsing text', () => {
    const result = useCase().execute({
      candidate,
      inputMode: 'visual',
      profiles: resolved.value,
      context,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.event).toMatchObject({
      id: 'scout_4',
      playerId: 'player_8',
      inputMode: 'visual',
      rawCode: '[VISUAL] ataque #8 ponto',
      normalizedCode: '[NON_PARSEABLE:VISUAL]',
      timestamp: 123,
    });
    expect(result.value.completeness).toEqual({
      status: 'partial',
      missingRecommendedFields: ['direction'],
    });
  });

  it('keeps validation failures at the common boundary', () => {
    const result = useCase().execute({
      candidate: { ...candidate, playerNumber: 0 },
      inputMode: 'hybrid',
      profiles: resolved.value,
      context,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe('ValidationError');
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ code: 'invalid_player_number' }),
      );
    }
  });
});
