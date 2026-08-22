import type { TacticalInputProfile } from '../../types';

export const defaultTacticalInput = Object.freeze({
  fields: Object.freeze({
    origin: Object.freeze({ prefix: 'o' }),
    target: Object.freeze({ prefix: 't' }),
    direction: Object.freeze({
      prefix: 'd',
      values: Object.freeze({ d: 'diagonal', p: 'paralela', c: 'centro' }),
    }),
    skillType: Object.freeze({ prefix: 'y' }),
    setterCall: Object.freeze({ prefix: 'l' }),
    combination: Object.freeze({ prefix: 'c' }),
    tempo: Object.freeze({ prefix: 'q' }),
    blockers: Object.freeze({ prefix: 'b' }),
  }),
  zoneSystem: Object.freeze({
    id: 'indoor-six-zone',
    version: '2.0.0',
    name: 'Quadra indoor regulamentar — posições 1 a 6',
    zones: Object.freeze([
      Object.freeze({
        id: '4',
        name: 'Zona 4',
        aliases: Object.freeze(['z4']),
        x: 1 / 6,
        y: 1 / 4,
      }),
      Object.freeze({
        id: '3',
        name: 'Zona 3',
        aliases: Object.freeze(['z3']),
        x: 1 / 2,
        y: 1 / 4,
      }),
      Object.freeze({
        id: '2',
        name: 'Zona 2',
        aliases: Object.freeze(['z2']),
        x: 5 / 6,
        y: 1 / 4,
      }),
      Object.freeze({
        id: '5',
        name: 'Zona 5',
        aliases: Object.freeze(['z5']),
        x: 1 / 6,
        y: 3 / 4,
      }),
      Object.freeze({
        id: '1',
        name: 'Zona 1',
        aliases: Object.freeze(['z1']),
        x: 5 / 6,
        y: 3 / 4,
      }),
      Object.freeze({
        id: '6',
        name: 'Zona 6',
        aliases: Object.freeze(['z6']),
        x: 1 / 2,
        y: 3 / 4,
      }),
    ]),
    directionRules: Object.freeze([
      Object.freeze({
        id: 'paralela',
        originZoneIds: Object.freeze(['4', '5']),
        targetZoneIds: Object.freeze(['1', '2']),
      }),
      Object.freeze({
        id: 'paralela',
        originZoneIds: Object.freeze(['1', '2']),
        targetZoneIds: Object.freeze(['4', '5']),
      }),
      Object.freeze({ id: 'centro', targetZoneIds: Object.freeze(['3', '6']) }),
      Object.freeze({
        id: 'diagonal',
        originZoneIds: Object.freeze(['4', '5']),
        targetZoneIds: Object.freeze(['4', '5']),
      }),
      Object.freeze({
        id: 'diagonal',
        originZoneIds: Object.freeze(['1', '2']),
        targetZoneIds: Object.freeze(['1', '2']),
      }),
      Object.freeze({
        id: 'diagonal',
        originZoneIds: Object.freeze(['3', '6']),
        targetZoneIds: Object.freeze(['1', '2', '4', '5']),
      }),
    ]),
  }),
  shortcuts: Object.freeze({
    quickEditor: 'Alt+T',
    focusScout: 'Alt+S',
    editLast: 'ArrowUp',
    selectOrigin: 'Alt+O',
    selectTarget: 'Alt+D',
  }),
} satisfies TacticalInputProfile);
