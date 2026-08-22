import type { ComplexityProfile } from '../../../profiles/types';
import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import { type ValidationIssue, type ValidationResult, validationResult } from './validation';
import { tacticalValue } from '../tactical/TacticalMetadataAdapter';

export class TacticalMetadataValidator {
  validate(candidate: CanonicalScoutEventCandidate, profile: ComplexityProfile): ValidationResult {
    if (profile.level === 'basic' || profile.level === 'operational') {
      return validationResult([]);
    }
    const metadata = candidate.metadata;
    const issues: ValidationIssue[] = [];
    for (const [path, zone] of [
      ['originZone', tacticalValue.originZone(metadata, candidate.skill)],
      ['targetZone', tacticalValue.targetZone(metadata, candidate.skill)],
    ] as const) {
      if (zone !== undefined && (!Number.isInteger(zone) || zone < 1 || zone > 9)) {
        issues.push({
          code: 'unusual_tactical_zone',
          message: `${path} fora da faixa tática 1–9.`,
          path,
        });
      }
    }
    const rotation = tacticalValue.rotation(metadata);
    if (rotation !== undefined && (rotation < 1 || rotation > 6)) {
      issues.push({
        code: 'unusual_rotation',
        message: 'Rotação fora da faixa 1–6.',
        path: 'rotation',
      });
    }
    if (
      tacticalValue.setterPosition(metadata) !== undefined &&
      (tacticalValue.setterPosition(metadata)! < 1 || tacticalValue.setterPosition(metadata)! > 6)
    ) {
      issues.push({
        code: 'unusual_setter_position',
        message: 'Posição do levantador fora da faixa 1–6.',
        path: 'setterPosition',
      });
    }
    if (
      tacticalValue.blockersCount(metadata, candidate.skill) !== undefined &&
      (tacticalValue.blockersCount(metadata, candidate.skill)! < 0 ||
        tacticalValue.blockersCount(metadata, candidate.skill)! > 3)
    ) {
      issues.push({
        code: 'unusual_blockers_count',
        message: 'Quantidade de bloqueadores fora da faixa 0–3.',
        path: 'blockersCount',
      });
    }
    return validationResult(issues, 'warning');
  }
}
