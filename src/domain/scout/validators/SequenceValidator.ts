import type { ScoutValidationContext } from './ScoutValidationContext';
import { type ValidationIssue, type ValidationResult, validationResult } from './validation';

export class SequenceValidator {
  validate(context: ScoutValidationContext): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!Number.isSafeInteger(context.sequence) || context.sequence < 1) {
      issues.push({
        code: 'invalid_sequence',
        message: 'Event sequence must be a positive integer.',
        path: 'sequence',
      });
    } else if (
      context.previousSequence !== undefined &&
      context.sequence !== context.previousSequence + 1
    ) {
      issues.push({
        code: 'non_contiguous_sequence',
        message: `Expected sequence ${context.previousSequence + 1}.`,
        path: 'sequence',
      });
    }

    return validationResult(issues);
  }
}
