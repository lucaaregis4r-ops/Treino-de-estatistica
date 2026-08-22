import { isProfileVersion } from '../core/schema/version';
import { isSkill } from '../domain/scout/entities/Skill';
import {
  type ValidationIssue,
  type ValidationResult,
  validationResult,
} from '../domain/scout/validators/validation';
import type { Profile } from './types';
import type { CaptureRequirement } from '../domain/scout/completeness/CaptureNeed';

const PROFILE_ID_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CAPTURE_REQUIREMENTS = new Set<CaptureRequirement>([
  'blocking',
  'recommended',
  'optional',
  'derived',
]);
const TACTICAL_INPUT_FIELDS = [
  'origin',
  'target',
  'direction',
  'skillType',
  'setterCall',
  'combination',
  'tempo',
  'blockers',
] as const;

function duplicates(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function requiredText(value: string, path: string, issues: ValidationIssue[]): void {
  if (value.trim().length === 0) {
    issues.push({ code: 'required', message: `${path} is required.`, path });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTacticalInput(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const fields = value.fields;
  const zoneSystem = value.zoneSystem;
  const shortcuts = value.shortcuts;
  if (!isRecord(fields) || !isRecord(zoneSystem) || !isRecord(shortcuts)) return false;
  const prefixes = TACTICAL_INPUT_FIELDS.flatMap((field) => {
    const definition = fields[field];
    return isRecord(definition) && typeof definition.prefix === 'string' && definition.prefix.trim()
      ? [definition.prefix.toLocaleLowerCase()]
      : [];
  });
  if (prefixes.length !== TACTICAL_INPUT_FIELDS.length || duplicates(prefixes).length > 0)
    return false;
  if (!Array.isArray(zoneSystem.zones) || zoneSystem.zones.length === 0) return false;
  const zoneIds = zoneSystem.zones.flatMap((zone) =>
    isRecord(zone) && typeof zone.id === 'string' && zone.id.trim() ? [zone.id] : [],
  );
  if (zoneIds.length !== zoneSystem.zones.length || duplicates(zoneIds).length > 0) return false;
  return ['quickEditor', 'focusScout', 'editLast', 'selectOrigin', 'selectTarget'].every(
    (shortcut) => {
      const configured = shortcuts[shortcut];
      return typeof configured === 'string' && configured.trim().length > 0;
    },
  );
}

export class ProfileValidator {
  validate(profile: Profile): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!PROFILE_ID_PATTERN.test(profile.id)) {
      issues.push({
        code: 'invalid_profile_id',
        message: 'Profile id must use lowercase letters, numbers, underscores, or hyphens.',
        path: 'id',
      });
    }

    if (!isProfileVersion(profile.version)) {
      issues.push({
        code: 'invalid_profile_version',
        message: 'Profile version must be a semantic version.',
        path: 'version',
      });
    }

    requiredText(profile.name, 'name', issues);

    switch (profile.kind) {
      case 'code': {
        if (profile.grammar.length === 0) {
          issues.push({
            code: 'empty_grammar',
            message: 'Code grammar cannot be empty.',
            path: 'grammar',
          });
        }
        if (duplicates(profile.grammar).length > 0) {
          issues.push({
            code: 'duplicate_grammar_field',
            message: 'Grammar fields must be unique.',
            path: 'grammar',
          });
        }
        if (Object.keys(profile.skills).length === 0) {
          issues.push({
            code: 'empty_skill_map',
            message: 'At least one skill code is required.',
            path: 'skills',
          });
        }
        if (Object.values(profile.skills).some((skill) => !isSkill(skill))) {
          issues.push({
            code: 'invalid_skill',
            message: 'Skill map contains an unknown skill.',
            path: 'skills',
          });
        }
        if (Object.keys(profile.evaluations).length === 0) {
          issues.push({
            code: 'empty_evaluation_map',
            message: 'At least one evaluation code is required.',
            path: 'evaluations',
          });
        }
        if (
          profile.grammar.includes('team') &&
          (!profile.teamCodes ||
            !profile.teamCodes.home.trim() ||
            !profile.teamCodes.away.trim() ||
            profile.teamCodes.home.toLocaleUpperCase() ===
              profile.teamCodes.away.toLocaleUpperCase())
        ) {
          issues.push({
            code: 'invalid_team_codes',
            message: 'Team grammar requires different home and away codes.',
            path: 'teamCodes',
          });
        }
        if (
          Object.entries(profile.outcomeMappings ?? {}).some(
            ([skill, mappings]) => !isSkill(skill) || Object.keys(mappings ?? {}).length === 0,
          )
        ) {
          issues.push({
            code: 'invalid_outcome_mapping',
            message: 'Outcome mappings must reference known skills and contain mappings.',
            path: 'outcomeMappings',
          });
        }
        if (profile.tacticalInput && !validTacticalInput(profile.tacticalInput))
          issues.push({
            code: 'invalid_tactical_input',
            message: 'Tactical input requires fields, unique zones, and keyboard shortcuts.',
            path: 'tacticalInput',
          });
        break;
      }
      case 'complexity': {
        if (profile.requiredFields.length === 0) {
          issues.push({
            code: 'empty_required_fields',
            message: 'A complexity profile must require at least one field.',
            path: 'requiredFields',
          });
        }
        if (duplicates([...profile.requiredFields, ...profile.optionalFields]).length > 0) {
          issues.push({
            code: 'duplicate_complexity_field',
            message: 'Complexity fields cannot be repeated.',
            path: 'requiredFields',
          });
        }
        if (
          Object.values(profile.captureRequirements ?? {}).some(
            (requirement) => !CAPTURE_REQUIREMENTS.has(requirement),
          )
        ) {
          issues.push({
            code: 'invalid_capture_requirement',
            message: 'Capture requirements contain an unsupported classification.',
            path: 'captureRequirements',
          });
        }
        break;
      }
      case 'competition': {
        if (
          !ISO_DATE_PATTERN.test(profile.effectiveDate) ||
          Number.isNaN(Date.parse(profile.effectiveDate))
        ) {
          issues.push({
            code: 'invalid_effective_date',
            message: 'Competition effective date must use YYYY-MM-DD.',
            path: 'effectiveDate',
          });
        }
        requiredText(profile.sourceDescription, 'sourceDescription', issues);
        if (duplicates(profile.metricIds).length > 0) {
          issues.push({
            code: 'duplicate_metric_id',
            message: 'Metric ids must be unique.',
            path: 'metricIds',
          });
        }
        break;
      }
      case 'training': {
        requiredText(profile.complexityProfileId, 'complexityProfileId', issues);
        if (profile.enabledSkills.length === 0) {
          issues.push({
            code: 'empty_enabled_skills',
            message: 'A training profile must enable at least one skill.',
            path: 'enabledSkills',
          });
        }
        if (
          profile.targetAccuracy !== undefined &&
          (profile.targetAccuracy < 0 || profile.targetAccuracy > 1)
        ) {
          issues.push({
            code: 'invalid_target_accuracy',
            message: 'Target accuracy must be between 0 and 1.',
            path: 'targetAccuracy',
          });
        }
        if (profile.targetAverageTimeMs !== undefined && profile.targetAverageTimeMs <= 0) {
          issues.push({
            code: 'invalid_target_time',
            message: 'Target average time must be positive.',
            path: 'targetAverageTimeMs',
          });
        }
        if (
          profile.exerciseCount !== undefined &&
          (!Number.isSafeInteger(profile.exerciseCount) || profile.exerciseCount <= 0)
        ) {
          issues.push({
            code: 'invalid_exercise_count',
            message: 'Exercise count must be a positive integer.',
            path: 'exerciseCount',
          });
        }
        break;
      }
    }

    return validationResult(issues);
  }
}
