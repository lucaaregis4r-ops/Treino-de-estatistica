import type { ComplexityProfile, ScoutField } from '../types';

const basicFields = Object.freeze(['player', 'skill', 'evaluation'] satisfies ScoutField[]);
const operationalFields = Object.freeze([
  'team',
  'player',
  'skill',
  'evaluation',
  'rally',
  'set',
] satisfies ScoutField[]);
const tacticalFields = Object.freeze([
  ...operationalFields,
  'skillType',
  'originZone',
  'targetZone',
  'direction',
] satisfies ScoutField[]);
const advancedFields = Object.freeze([
  ...tacticalFields,
  'lineup',
  'rotation',
  'setterPosition',
  'substitutions',
  'attackCombination',
  'attackTempo',
  'blockersCount',
  'phase',
  'transition',
] satisfies ScoutField[]);

const baseCaptureRequirements = Object.freeze({
  player: 'blocking',
  skill: 'blocking',
  evaluation: 'blocking',
  team: 'derived',
  rally: 'derived',
  set: 'derived',
} as const);

const tacticalCaptureRequirements = Object.freeze({
  ...baseCaptureRequirements,
  skillType: 'recommended',
  originZone: 'recommended',
  targetZone: 'recommended',
  direction: 'recommended',
} as const);

export const basicProfile = Object.freeze({
  kind: 'complexity',
  id: 'basic',
  version: '1.0.0',
  name: 'Básico',
  level: 'basic',
  requiredFields: basicFields,
  optionalFields: Object.freeze([]),
  captureRequirements: baseCaptureRequirements,
} satisfies ComplexityProfile);

export const operationalProfile = Object.freeze({
  kind: 'complexity',
  id: 'operational',
  version: '1.0.0',
  name: 'Operacional',
  level: 'operational',
  requiredFields: operationalFields,
  optionalFields: Object.freeze([]),
  captureRequirements: baseCaptureRequirements,
} satisfies ComplexityProfile);

export const tacticalProfile = Object.freeze({
  kind: 'complexity',
  id: 'tactical',
  version: '1.0.0',
  name: 'Tático',
  level: 'tactical',
  requiredFields: tacticalFields,
  optionalFields: Object.freeze([]),
  captureRequirements: tacticalCaptureRequirements,
} satisfies ComplexityProfile);

export const advancedProfile = Object.freeze({
  kind: 'complexity',
  id: 'advanced',
  version: '1.0.0',
  name: 'Avançado',
  level: 'advanced',
  requiredFields: advancedFields,
  optionalFields: Object.freeze([]),
  captureRequirements: Object.freeze({
    ...tacticalCaptureRequirements,
    lineup: 'derived',
    rotation: 'derived',
    setterPosition: 'recommended',
    substitutions: 'optional',
    attackCombination: 'optional',
    attackTempo: 'recommended',
    blockersCount: 'recommended',
    phase: 'recommended',
    transition: 'recommended',
  }),
} satisfies ComplexityProfile);

export const complexityProfiles = Object.freeze([
  basicProfile,
  operationalProfile,
  tacticalProfile,
  advancedProfile,
]);
