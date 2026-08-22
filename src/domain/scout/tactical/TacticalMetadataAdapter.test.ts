import { describe, expect, it } from 'vitest';
import { DirectionResolver } from './DirectionResolver';
import { normalizeTacticalMetadata, tacticalValue } from './TacticalMetadataAdapter';
import type { AttackCombinationDictionary, SetterCallDictionary } from './TacticalDictionaries';
import type { ZoneSystemProfile } from './ZoneSystemProfile';

const court: ZoneSystemProfile = {
  id: 'test-court',
  version: '1.0.0',
  name: 'Test court',
  zones: [
    { id: 'left-back', name: 'Left back', aliases: ['5'] },
    { id: 'right-front', name: 'Right front', aliases: ['2'] },
  ],
  directionRules: [
    { id: 'cross-court', originZoneIds: ['left-back'], targetZoneIds: ['right-front'] },
  ],
};

describe('tactical metadata V2', () => {
  it('adapts legacy V1 attack metadata without discarding its original fields', () => {
    const normalized = normalizeTacticalMetadata(
      {
        skillType: 'power',
        originZone: 5,
        targetZone: 2,
        direction: 'diagonal',
        attackTempo: 'fast',
        attackCombination: 'x1',
        blockersCount: 2,
      },
      'attack',
    );

    expect(normalized).toMatchObject({
      schemaVersion: '2.0.0',
      originZone: 5,
      tactical: {
        attack: {
          attackType: 'power',
          combination: 'x1',
          tempo: 'fast',
          blockersCount: 2,
          trajectory: {
            origin: { zoneId: '5' },
            target: { zoneId: '2' },
            direction: 'diagonal',
          },
        },
      },
    });
    expect(tacticalValue.targetZone(normalized, 'attack')).toBe(2);
  });

  it('keeps an explicit direction and only derives one from configured profile rules', () => {
    const resolver = new DirectionResolver();
    expect(
      resolver.resolve(
        { origin: { zoneId: '5' }, target: { zoneId: '2' }, direction: 'manual' },
        court,
      ).direction,
    ).toBe('manual');
    expect(
      resolver.resolve({ origin: { zoneId: '5' }, target: { zoneId: '2' } }, court),
    ).toMatchObject({ direction: 'cross-court', captureMethod: 'derived' });
  });

  it('turns a transient keyboard/court draft into canonical skill metadata', () => {
    const normalized = normalizeTacticalMetadata(
      {
        captureDraft: {
          origin: { zoneId: 'left-back', x: 0.2, y: 0.8 },
          target: { zoneId: 'right-front', x: 0.8, y: 0.2 },
          direction: 'cross-court',
          captureMethod: 'drawn',
          skillType: 'power',
          combination: '31',
          tempo: 'fast',
          blockersCount: 2,
        },
      },
      'attack',
    );

    expect(normalized).not.toHaveProperty('captureDraft');
    expect(normalized).toMatchObject({
      schemaVersion: '2.0.0',
      tactical: {
        attack: {
          attackType: 'power',
          combination: '31',
          tempo: 'fast',
          blockersCount: 2,
          trajectory: {
            origin: { zoneId: 'left-back', x: 0.2 },
            target: { zoneId: 'right-front', y: 0.2 },
            direction: 'cross-court',
            captureMethod: 'drawn',
          },
        },
      },
    });
  });

  it('allows club-specific setter and combination dictionaries', () => {
    const setterCalls: SetterCallDictionary = {
      id: 'club-setter-calls',
      version: '1.0.0',
      name: 'Club setter calls',
      entries: [
        { id: 'custom-call', label: 'Call chosen by the club', targetZoneId: 'right-front' },
      ],
    };
    const combinations: AttackCombinationDictionary = {
      id: 'club-combinations',
      version: '1.0.0',
      name: 'Club combinations',
      entries: [{ id: 'custom-combo', label: 'Club-specific combination', tempo: 'club-tempo' }],
    };

    expect(setterCalls.entries[0]?.id).toBe('custom-call');
    expect(combinations.entries[0]?.tempo).toBe('club-tempo');
  });

  it('maps a configured setter call and target into set metadata', () => {
    expect(
      normalizeTacticalMetadata(
        { captureDraft: { setterCall: 'X1', target: { zoneId: 'right-front' } } },
        'set',
      ),
    ).toMatchObject({
      tactical: { set: { setterCall: 'X1', targetLocation: { zoneId: 'right-front' } } },
    });
  });
});
