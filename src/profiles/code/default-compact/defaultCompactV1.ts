import type { CodeProfile } from '../../types';
import { defaultTacticalInput } from './defaultTacticalInput';

export const defaultCompactV1 = Object.freeze({
  kind: 'code',
  id: 'default_compact_v1',
  version: '1.0.0',
  name: 'Default Compact v1',
  grammar: Object.freeze(['player', 'skill', 'evaluation']),
  skills: Object.freeze({
    S: 'serve',
    R: 'reception',
    A: 'attack',
    B: 'block',
    D: 'dig',
    E: 'set',
    F: 'free_ball',
  }),
  evaluations: Object.freeze({
    '#': 'excellent',
    '+': 'positive',
    '!': 'neutral',
    '-': 'negative',
    '/': 'very_negative',
    '=': 'error',
  }),
  aliases: Object.freeze({}),
  characterEquivalents: Object.freeze({}),
  tacticalInput: defaultTacticalInput,
  outcomeMappings: Object.freeze({
    serve: Object.freeze({ '#': 'ace', '=': 'error' }),
    reception: Object.freeze({ '#': 'perfect', '=': 'error' }),
    attack: Object.freeze({ '#': 'point', '=': 'error' }),
    block: Object.freeze({ '#': 'point', '=': 'error' }),
  }),
} satisfies CodeProfile);
