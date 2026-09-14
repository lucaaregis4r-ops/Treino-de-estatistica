import { describe, expect, it } from 'vitest';
import { DirectionResolver } from '../../../domain/scout/tactical/DirectionResolver';
import { defaultTacticalInput } from './defaultTacticalInput';

describe('default indoor tactical model', () => {
  it('uses the six regulation volleyball positions', () => {
    expect(defaultTacticalInput.zoneSystem.zones.map((zone) => zone.id).sort()).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
  });

  it('derives tactical direction from origin and mirrored target zones', () => {
    const resolver = new DirectionResolver();
    expect(
      resolver.resolve(
        { origin: { zoneId: '4' }, target: { zoneId: '1' } },
        defaultTacticalInput.zoneSystem,
      ).direction,
    ).toBe('paralela');
    expect(
      resolver.resolve(
        { origin: { zoneId: '4' }, target: { zoneId: '5' } },
        defaultTacticalInput.zoneSystem,
      ).direction,
    ).toBe('diagonal');
    expect(
      resolver.resolve(
        { origin: { zoneId: '3' }, target: { zoneId: '6' } },
        defaultTacticalInput.zoneSystem,
      ).direction,
    ).toBe('paragonal');
  });
});
