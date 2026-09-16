import { describe, expect, it } from 'vitest';
import { defaultTacticalInput } from '../../profiles/code/default-compact/defaultTacticalInput';
import type { ScoutEvent } from '../../domain/scout/events/ScoutEvent';
import { SequenceAnalyticsService } from './SequenceAnalyticsService';
import { TacticalQuestionService, TACTICAL_QUESTION_IDS } from './TacticalQuestionService';

function event(rallyId: string, sequence: number, skill: ScoutEvent['skill'], spatial?: boolean): ScoutEvent {
  return {
    id: `${rallyId}-${skill}`,
    matchId: 'match',
    rallyId,
    sequence,
    teamId: 'a',
    skill,
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: sequence,
    rawCode: `${skill}-${rallyId}`,
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    metadata: {
      rotation: 1,
      phase: 'sideout',
      receptionGrade: 'A',
      ...(spatial
        ? {
            spatial: {
              origin: { surface: 'court' as const, x: 1 / 6, y: 1 / 4 },
              destination: { surface: 'court' as const, x: 5 / 6, y: 3 / 4 },
            },
          }
        : {}),
    },
  };
}

function fixture(withSpatial = true) {
  const events = Array.from({ length: 10 }, (_, index) => {
    const rallyId = `r${index + 1}`;
    return [
      event(rallyId, 1, 'serve', withSpatial),
      event(rallyId, 2, 'reception', withSpatial),
      event(rallyId, 3, 'attack', withSpatial),
    ];
  }).flat();
  const tacticalRally = {
    contacts: [],
    rallies: Array.from({ length: 10 }, (_, index) => ({
      rallyId: `r${index + 1}`,
      servingTeamId: 'a',
      winnerTeamId: index < 6 ? 'a' : 'b',
      transitionTeamIds: [],
    })),
    rotationByTeamId: {},
  } as never;
  return new SequenceAnalyticsService().build(
    events,
    [{ id: 'a', name: 'Equipe A' }, { id: 'b', name: 'Equipe B' }] as never,
    tacticalRally,
    defaultTacticalInput.zoneSystem,
  );
}

describe('TacticalQuestionService', () => {
  it('answers all thirteen deterministic questions with structured evidence', () => {
    const service = new TacticalQuestionService();
    const analytics = fixture();
    const filters = { teamId: 'a' } as const;
    const answers = TACTICAL_QUESTION_IDS.map((questionId) => service.answer(analytics, questionId, filters));

    expect(answers).toHaveLength(13);
    expect(new Set(answers.map((answer) => answer.questionId)).size).toBe(13);
    answers.forEach((answer) => {
      expect(answer.filters).toEqual(filters);
      expect(answer.sample.unit).toMatch(/rally|event/);
      answer.findings.forEach((finding) => {
        expect(finding.findingId).toBeTruthy();
        expect(finding.sample.n).toBeGreaterThanOrEqual(0);
        expect(finding.filters).toEqual(expect.objectContaining(filters));
      });
    });
  });

  it('returns the reception baseline and region numbers without generating prose', () => {
    const answer = new TacticalQuestionService().answer(fixture(), 'reception_destination_regions', { teamId: 'a' });
    expect(answer.status).toBe('available');
    expect(answer.findings[0]).toMatchObject({
      findingId: 'reception-target-1',
      sample: { n: 10, unit: 'event', completeRallies: 10 },
      numbers: { n: 10, wins: 6, empiricalPointProbability: 0.6, deltaVsBaseline: 0 },
      baseline: { pointProbability: 0.6 },
    });
    expect(answer).not.toHaveProperty('text');
  });

  it('marks spatial questions unavailable when coordinates are absent and exposes small samples', () => {
    const service = new TacticalQuestionService();
    const missing = service.answer(fixture(false), 'serve_destination_regions', { teamId: 'a' });
    expect(missing).toMatchObject({ status: 'unavailable', reasonUnavailable: 'missing_coordinates' });
    const small = service.answer(fixture(), 'attack_trajectories', { teamId: 'a', setNumber: 2 });
    expect(small).toMatchObject({ status: 'unavailable', reasonUnavailable: 'missing_coordinates' });
  });
});
