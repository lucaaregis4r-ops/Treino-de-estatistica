import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import { type ValidationIssue, type ValidationResult, validationResult } from './validation';

export class SyntaxValidator {
  validate(candidate: CanonicalScoutEventCandidate): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (candidate.playerNumber < 1 || candidate.playerNumber > 99) {
      issues.push({
        code: 'invalid_player_number',
        message: 'Player number must be between 1 and 99.',
        path: 'playerNumber',
      });
    }
    if (candidate.normalizedCode.length === 0 || /\s/.test(candidate.normalizedCode)) {
      issues.push({
        code: 'invalid_normalized_code',
        message: 'Normalized code must be non-empty and contain no spaces.',
        path: 'normalizedCode',
      });
    }

    return validationResult(issues);
  }
}
