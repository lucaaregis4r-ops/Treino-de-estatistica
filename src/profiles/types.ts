import type { ProfileVersion } from '../core/schema/version';
import type { Skill } from '../domain/scout/entities/Skill';
import type { CaptureRequirement } from '../domain/scout/completeness/CaptureNeed';
import type { ZoneSystemProfile } from '../domain/scout/tactical/ZoneSystemProfile';

export type ProfileKind = 'code' | 'complexity' | 'competition' | 'training';

export type ScoutField =
  | 'team'
  | 'player'
  | 'skill'
  | 'evaluation'
  | 'rally'
  | 'set'
  | 'skillType'
  | 'originZone'
  | 'targetZone'
  | 'direction'
  | 'lineup'
  | 'rotation'
  | 'setterPosition'
  | 'setterCall'
  | 'substitutions'
  | 'attackCombination'
  | 'attackTempo'
  | 'blockersCount'
  | 'phase'
  | 'transition';

export interface BaseProfile {
  readonly kind: ProfileKind;
  readonly id: string;
  readonly version: ProfileVersion;
  readonly name: string;
}

export interface CodeProfile extends BaseProfile {
  readonly kind: 'code';
  readonly grammar: readonly ScoutField[];
  readonly skills: Readonly<Record<string, Skill>>;
  readonly evaluations: Readonly<Record<string, string>>;
  readonly teamCodes?: Readonly<{ home: string; away: string }>;
  readonly aliases?: Readonly<Record<string, string>>;
  readonly characterEquivalents?: Readonly<Record<string, string>>;
  readonly outcomeMappings?: Readonly<Partial<Record<Skill, Readonly<Record<string, string>>>>>;
  readonly tacticalInput?: TacticalInputProfile;
}

export type TacticalInputField =
  | 'origin'
  | 'target'
  | 'direction'
  | 'skillType'
  | 'setterCall'
  | 'combination'
  | 'tempo'
  | 'blockers';

export interface TacticalInputFieldProfile {
  readonly prefix: string;
  readonly values?: Readonly<Record<string, string>>;
}

export interface TacticalKeyboardShortcuts {
  readonly quickEditor: string;
  readonly focusScout: string;
  readonly editLast: string;
  readonly selectOrigin: string;
  readonly selectTarget: string;
}

export interface TacticalInputProfile {
  readonly fields: Readonly<Record<TacticalInputField, TacticalInputFieldProfile>>;
  readonly zoneSystem: ZoneSystemProfile;
  readonly shortcuts: TacticalKeyboardShortcuts;
}

export type ComplexityLevel = 'basic' | 'operational' | 'tactical' | 'advanced';

export interface ComplexityProfile extends BaseProfile {
  readonly kind: 'complexity';
  readonly level: ComplexityLevel;
  readonly requiredFields: readonly ScoutField[];
  readonly optionalFields: readonly ScoutField[];
  readonly captureRequirements?: Readonly<Partial<Record<ScoutField, CaptureRequirement>>>;
}

export interface CompetitionProfile extends BaseProfile {
  readonly kind: 'competition';
  readonly effectiveDate: string;
  readonly sourceDescription: string;
  readonly sourceReferences: readonly string[];
  readonly requiredFields: readonly ScoutField[];
  readonly metricIds: readonly string[];
}

export interface TrainingProfile extends BaseProfile {
  readonly kind: 'training';
  readonly complexityProfileId: string;
  readonly competitionProfileId?: string;
  readonly enabledSkills: readonly Skill[];
  readonly targetAccuracy?: number;
  readonly targetAverageTimeMs?: number;
  readonly exerciseCount?: number;
}

export type Profile = CodeProfile | ComplexityProfile | CompetitionProfile | TrainingProfile;

export interface ProfileByKind {
  readonly code: CodeProfile;
  readonly complexity: ComplexityProfile;
  readonly competition: CompetitionProfile;
  readonly training: TrainingProfile;
}
