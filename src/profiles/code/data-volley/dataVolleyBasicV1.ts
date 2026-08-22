import type { CodeProfile } from '../../types';
import { defaultTacticalInput } from '../default-compact/defaultTacticalInput';

/** Public Data Volley basic scouting syntax: team + player + skill + evaluation. */
export const dataVolleyBasicV1 = Object.freeze({
  kind: 'code',
  id: 'data_volley_basic_v1',
  version: '1.0.0',
  name: 'Data Volley',
  grammar: Object.freeze(['team', 'player', 'skill', 'evaluation']),
  teamCodes: Object.freeze({ home: '*', away: 'A' }),
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
