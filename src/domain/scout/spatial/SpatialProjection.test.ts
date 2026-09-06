import { describe, expect, it } from 'vitest';
import { defaultTacticalInput } from '../../../profiles/code/default-compact/defaultTacticalInput';
import type { ScoutEvent } from '../events/ScoutEvent';
import { canonicalCourtLocation, normalizedCourtPoint } from '../tactical/CourtGeometry';
import { CourtCoordinateValidator } from '../validators/CourtCoordinateValidator';
import { SpatialProjection, spatialDensityAt } from './SpatialProjection';

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
        expect.objectContaining({ preset: 'attack_target', zoneId: '1', count: 1 }),
        expect.objectContaining({ preset: 'reception_contact', zoneId: '6', count: 1 }),
      ]),
    );
    expect(projection.trajectories).toHaveLength(1);
    expect(projection.samples[1].target).toEqual({ zoneId: '1' });
    expect(projection.density.some((cell) => cell.preset === 'serve_target')).toBe(false);
    expect(projection.matrix).toContainEqual({
      teamId: 'team_a',
      skill: 'attack',
      originZoneId: '4',
      targetZoneId: '1',
      count: 2,
    });
  });

  it('adds nearby radial density, separates distant points and surfaces, and retains volume', () => {
    const point = { surface: 'court' as const, x: 0.4, y: 0.5 };
    const nearby = { ...point, x: 0.42 };
    const far = { ...point, x: 0.9 };
    const one = spatialDensityAt([point], 'court', 0.4, 0.5);
    expect(one).toBe(1);
    expect(spatialDensityAt([point, nearby], 'court', 0.4, 0.5)).toBeGreaterThan(one);
    expect(spatialDensityAt([point, far], 'court', 0.4, 0.5)).toBe(one);
    expect(spatialDensityAt([point, point, point], 'court', 0.4, 0.5)).toBe(3);
    expect(spatialDensityAt([{ ...point, surface: 'serviceZone' }], 'court', 0.4, 0.5)).toBe(0);
    expect(spatialDensityAt([point], 'serviceZone', 0.4, 0.5)).toBe(0);
  });

  it('prioritizes V2 endpoints and projects reception destinations and external serve routes', () => {
    const origin = { surface: 'court' as const, x: 0.23, y: 0.46 };
    const destination = { surface: 'court' as const, x: 0.43, y: 0.25 };
    const reception: ScoutEvent = {
      ...event('receive_1', 'reception', { reception: { contactLocation: { x: 0.9, y: 0.9 } } }),
      metadata: { spatial: { origin, destination } },
    };
    const serve: ScoutEvent = {
      ...event('serve_2', 'serve', undefined),
      metadata: {
        spatial: {
          origin: { surface: 'serviceZone', x: 0.7, y: 0.8 },
          destination: { ...destination, x: 0.8 },
        },
      },
    };
    const projection = new SpatialProjection().project([reception, serve]);
    expect(projection.samples[0]).toMatchObject({ source: 'spatial', origin, target: destination });
    expect(projection.density.map((cell) => cell.preset)).toEqual([
      'reception_contact',
      'reception_target',
      'serve_target',
      'serve_origin',
    ]);
    expect(projection.density.find((cell) => cell.preset === 'serve_origin')).toMatchObject({
      surface: 'serviceZone',
    });
    expect(projection.trajectories).toHaveLength(2);
    expect(projection.trajectories[1].origin).toEqual(serve.metadata?.spatial?.origin);
    const corrected = { ...serve, metadata: { spatial: { origin, destination } } };
    expect(new SpatialProjection().project([corrected]).samples).toHaveLength(1);
    expect(new SpatialProjection().project([corrected]).trajectories[0].origin).toEqual(origin);
    expect(new SpatialProjection().project([])).toEqual({
      samples: [],
      density: [],
      trajectories: [],
      matrix: [],
    });
  });

  it('does not fabricate a destination or route for legacy reception contacts', () => {
    const projection = new SpatialProjection().project([
      event('receive_1', 'reception', { reception: { contactLocation: { x: 0.2, y: 0.3 } } }),
    ]);
    expect(projection.samples[0].source).toBe('legacy');
    expect(projection.density.map((cell) => cell.preset)).toEqual(['reception_contact']);
    expect(projection.trajectories).toEqual([]);
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
