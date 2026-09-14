import { describe, expect, it } from 'vitest';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import type { Skill } from '../entities/Skill';
import type { ScoutEventMetadata } from '../events/ScoutEvent';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import { HybridScoutMerger } from '../mapper/HybridScoutMerger';
import { VisualScoutMapper } from '../mapper/VisualScoutMapper';
import { normalizeTacticalMetadata } from '../tactical/TacticalMetadataAdapter';
import { CourtCoordinateValidator } from '../validators/CourtCoordinateValidator';
import type { SpatialMetadata } from './SpatialMetadata';

const spatial: SpatialMetadata = {
  origin: { surface: 'court', x: 0.123456789012345, y: 0.987654321098765 },
  destination: { surface: 'court', x: 0.876543210987654, y: 0.012345678901234 },
};

function candidate(
  value: unknown = spatial,
  skill: Skill = 'attack',
): CanonicalScoutEventCandidate {
  return {
    playerNumber: 8,
    skill,
    evaluation: 'positive',
    outcome: 'positive',
    rawCode: '08A+',
    normalizedCode: '08A+',
    metadata: { spatial: value as SpatialMetadata },
  };
}

describe('SpatialMetadata V2', () => {
  const validator = new CourtCoordinateValidator();

  it('preserves legacy events with no spatial capture', () => {
    expect(validator.validate({ ...candidate(), metadata: undefined }).valid).toBe(true);
    expect(validator.validate({ ...candidate(), metadata: { originZone: 4 } }).valid).toBe(true);
  });

  it.each(['attack', 'serve', 'reception', 'set', 'dig'] as const)(
    'accepts both points for %s',
    (skill) => {
      const value: SpatialMetadata = {
        origin: { ...spatial.origin, surface: skill === 'serve' ? 'serviceZone' : 'court' },
        destination: { ...spatial.destination, x: ['attack', 'serve'].includes(skill) ? 1 : 0.5 },
      };
      expect(validator.validate(candidate(value, skill)).valid).toBe(true);
    },
  );

  it.each([0, 1])(
    'accepts local service strip boundary %s without clamping it to court x=0',
    (x) => {
      const value: SpatialMetadata = { ...spatial, origin: { surface: 'serviceZone', x, y: x } };
      expect(validator.validate(candidate(value, 'serve')).valid).toBe(true);
      expect(normalizeTacticalMetadata({ spatial: value }, 'serve')?.spatial).toEqual(value);
    },
  );

  it.each(['origin', 'destination'] as const)(
    'requires %s and validates each axis and surface',
    (endpoint) => {
      for (const missing of [undefined, null]) {
        expect(validator.validate(candidate({ ...spatial, [endpoint]: missing })).valid).toBe(
          false,
        );
      }
      for (const axis of ['x', 'y']) {
        for (const invalid of [NaN, Infinity, -Infinity, -0.001, 1.001, undefined, null, '0.2']) {
          const result = validator.validate(
            candidate({ ...spatial, [endpoint]: { ...spatial[endpoint], [axis]: invalid } }),
          );
          expect(result.issues).toContainEqual(
            expect.objectContaining({
              code: 'invalid_spatial_coordinate',
              path: `metadata.spatial.${endpoint}.${axis}`,
            }),
          );
        }
      }
      expect(
        validator.validate(
          candidate({ ...spatial, [endpoint]: { ...spatial[endpoint], surface: 'outside' } }),
        ).valid,
      ).toBe(false);
    },
  );

  it('rejects malformed spatial objects', () => {
    for (const value of [null, {}, 3, 'court']) {
      expect(validator.validate(candidate(value)).valid).toBe(false);
    }
  });

  it('accepts free-form court points without interpreting the action', () => {
    for (const skill of ['attack', 'reception', 'set', 'dig', 'serve'] as const) {
      expect(
        validator.validate(
          candidate({
            origin: { surface: 'serviceZone', x: 0.8, y: 0.1 },
            destination: { surface: 'court', x: 0.2, y: 0.9 },
          }, skill),
        ).valid,
      ).toBe(true);
    }
  });

  it('normalizes tactical drafts without rotating, rounding or replacing primary coordinates', () => {
    const metadata: ScoutEventMetadata = {
      spatial,
      attackTempo: 'fast',
      captureDraft: {
        origin: { zoneId: '4' },
        target: { zoneId: '1' },
        orientation: 'rotated_180',
        combination: 'X1',
      },
    };
    const normalized = normalizeTacticalMetadata(
      metadata,
      'attack',
      defaultCompactV1.tacticalInput?.zoneSystem,
    );
    expect(normalized?.spatial).toEqual(spatial);
    expect(normalized?.attackTempo).toBe('fast');
    expect(normalized?.tactical?.attack?.combination).toBe('X1');
    expect(normalized).not.toHaveProperty('captureDraft');
    expect(normalizeTacticalMetadata(normalized, 'attack')).toEqual(normalized);
    expect(metadata.captureDraft).toBeDefined();
  });

  it('passes spatial-only visual capture and hybrid enrichment without losing tactical metadata', () => {
    const draft = {
      teamId: 'a',
      playerNumber: 8,
      skill: 'attack',
      evaluation: 'positive',
      spatial,
    } as const;
    expect(new VisualScoutMapper().map(draft, defaultCompactV1).metadata?.spatial).toEqual(spatial);
    const typed = {
      ...candidate(),
      metadata: { attackTempo: 'fast', tactical: { attack: { combination: 'X1' } } },
    };
    const merged = new HybridScoutMerger().merge({
      typedTeamId: 'a',
      typedCandidate: typed,
      visualDraft: draft,
      codeProfile: defaultCompactV1,
    });
    if (!merged.ok) throw merged.error;
    expect(merged.value.metadata).toMatchObject({
      spatial,
      attackTempo: 'fast',
      tactical: { attack: { combination: 'X1' } },
    });
    const primary = new HybridScoutMerger().merge({
      typedTeamId: 'a',
      typedCandidate: candidate(),
      visualDraft: { ...draft, spatial: { ...spatial, origin: { ...spatial.origin, x: 0.4 } } },
      codeProfile: defaultCompactV1,
    });
    expect(primary.ok && primary.value.metadata?.spatial).toEqual(spatial);
  });
});
