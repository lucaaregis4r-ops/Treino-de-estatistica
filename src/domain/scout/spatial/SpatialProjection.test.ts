import { describe, expect, it } from 'vitest';
import { defaultTacticalInput } from '../../../profiles/code/default-compact/defaultTacticalInput';
import type { ScoutEvent } from '../events/ScoutEvent';
import { canonicalCourtLocation, normalizedCourtPoint } from '../tactical/CourtGeometry';
import { CourtCoordinateValidator } from '../validators/CourtCoordinateValidator';
import { SpatialProjection } from './SpatialProjection';

function event(
  id: string,
  skill: ScoutEvent['skill'],
  tactical: NonNullable<ScoutEvent['metadata']>['tactical'],
  outcome: ScoutEvent['outcome'] = 'continuation',
): ScoutEvent {
  return {
    id,
    matchId: 'match',
    rallyId: id,
    sequence: Number(id.slice(-1)) || 1,
    teamId: 'team_a',
    playerId: 'player_1',
    skill,
    evaluation: 'positive',
    outcome,
    setNumber: 1,
    scoreBefore: { teamA: 0, teamB: 0 },
    timestamp: 1,
    rawCode: id,
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    metadata: { schemaVersion: '2.0.0', tactical },
  };
}

describe('canonical court geometry and spatial projection', () => {
  it('normalizes display geometry, canonicalizes orientation and builds density/routes/matrix', () => {
    expect(normalizedCourtPoint(150, 100, { left: 100, top: 50, width: 100, height: 100 })).toEqual(
      {
        x: 0.5,
        y: 0.5,
      },
    );
    expect(
      normalizedCourtPoint(300, 200, { left: 200, top: 100, width: 200, height: 200 }),
    ).toEqual({
      x: 0.5,
      y: 0.5,
    });
    expect(
      canonicalCourtLocation({ x: 0.2, y: 0.25 }, 'rotated_180', defaultTacticalInput.zoneSystem),
    ).toMatchObject({ x: 0.8, y: 0.75, zoneId: '1' });

    const projection = new SpatialProjection().project(
      [
        event('attack_1', 'attack', {
          attack: {
            trajectory: {
              origin: { x: 0.2, y: 0.25 },
              target: { x: 0.84, y: 0.75 },
            },
          },
        }),
        event('attack_2', 'attack', {
          attack: { trajectory: { origin: { zoneId: '4' }, target: { zoneId: '1' } } },
        }),
        event('serve_3', 'serve', {
          serve: { trajectory: { target: { zoneId: '6' } } },
        }),
        event('reception_4', 'reception', {
          reception: { contactLocation: { x: 0.5, y: 0.75 } },
        }),
      ],
      undefined,
      defaultTacticalInput.zoneSystem,
    );

    expect(projection.samples).toHaveLength(4);
    expect(projection.density).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ preset: 'attack_target', zoneId: '1', count: 2 }),
        expect.objectContaining({ preset: 'serve_target', zoneId: '6', count: 1 }),
        expect.objectContaining({ preset: 'reception_contact', zoneId: '6', count: 1 }),
      ]),
    );
    expect(projection.trajectories).toHaveLength(1);
    expect(projection.matrix).toContainEqual({
      teamId: 'team_a',
      skill: 'attack',
      originZoneId: '4',
      targetZoneId: '1',
      count: 2,
    });
  });

  it('rejects persisted coordinates outside the canonical range', () => {
    const result = new CourtCoordinateValidator().validate({
      playerNumber: 1,
      skill: 'attack',
      evaluation: 'positive',
      outcome: 'continuation',
      rawCode: '01A+',
      normalizedCode: '01A+',
      metadata: {
        schemaVersion: '2.0.0',
        tactical: { attack: { trajectory: { target: { x: 1.1, y: 0.5 } } } },
      },
    });

    expect(result).toMatchObject({
      valid: false,
      severity: 'error',
      issues: [expect.objectContaining({ code: 'invalid_court_coordinate' })],
    });
  });

  it('calculates attack point rate and sample volume per target region', () => {
    const attacks = Array.from({ length: 10 }, (_, index) =>
      event(
        `attack_${index + 1}`,
        'attack',
        { attack: { trajectory: { target: { x: 0.84, y: 0.75 } } } },
        index < 6 ? 'point' : 'continuation',
      ),
    );
    const [cell] = new SpatialProjection().project(
      attacks,
      undefined,
      defaultTacticalInput.zoneSystem,
    ).density;

    expect(cell).toMatchObject({
      preset: 'attack_target',
      attempts: 10,
      points: 6,
      errors: 0,
      pointRate: 0.6,
    });
  });

  it('calculates reception sideout rate from the existing rally winners', () => {
    const receptions = Array.from({ length: 10 }, (_, index) =>
      event(
        `reception_${index + 1}`,
        'reception',
        { reception: { contactLocation: { x: 0.2, y: 0.75 } } },
        index < 7 ? 'excellent' : 'continuation',
      ),
    );
    const projection = new SpatialProjection().project(
      receptions,
      {
        contacts: [],
        rallies: receptions.map((reception, index) => ({
          rallyId: reception.rallyId,
          servingTeamId: 'team_b',
          winnerTeamId: index < 7 ? 'team_a' : 'team_b',
          transitionTeamIds: [],
        })),
        rotationByTeamId: {},
      },
      defaultTacticalInput.zoneSystem,
    );

    expect(projection.density[0]).toMatchObject({
      preset: 'reception_contact',
      receptions: 10,
      sideouts: 7,
      sideoutRate: 0.7,
    });
  });
});
