export type ValidationSeverity = 'ok' | 'warning' | 'error';

export interface ValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly severity: ValidationSeverity;
  readonly issues: readonly ValidationIssue[];
}

export const VALID_RESULT: ValidationResult = Object.freeze({
  valid: true,
  severity: 'ok',
  issues: Object.freeze([]),
});

export function validationResult(
  issues: readonly ValidationIssue[],
  severity: Exclude<ValidationSeverity, 'ok'> = 'error',
): ValidationResult {
  if (issues.length === 0) {
    return VALID_RESULT;
  }

  return {
    valid: severity !== 'error',
    severity,
    issues,
  };
}
