import { describe, expect, it } from 'vitest';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import { TacticalInputInterpreter } from './TacticalInputInterpreter';

describe('TacticalInputInterpreter', () => {
  const interpreter = new TacticalInputInterpreter();

  it('interprets every tactical dimension through profile-defined prefixes and aliases', () => {
    const result = interpreter.interpret('oz4 t1 dd ypower lX1 c31 qfast b2', defaultCompactV1);

    expect(result.ok && result.value).toEqual({
      originZoneId: '4',
      targetZoneId: '1',
      direction: 'diagonal',
      skillType: 'power',
      setterCall: 'X1',
      combination: '31',
      tempo: 'fast',
      blockers: 2,
    });
  });

  it('rejects unknown zones and invalid blockers without producing partial values', () => {
    expect(interpreter.interpret('o99', defaultCompactV1).ok).toBe(false);
    expect(interpreter.interpret('b4', defaultCompactV1).ok).toBe(false);
  });
});
