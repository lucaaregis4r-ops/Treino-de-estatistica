import type { MetricDefinition } from '../../definitions/MetricDefinition';
import type { MetricResult } from '../MetricResult';
import { receptionGrade, scopedEvents } from '../../queries/scoutEventQueries';

export const EXPECTED_SIDEOUT_METRIC_ID = 'advanced.expected_sideout';
export const INSUFFICIENT_REFERENCE_SAMPLE = 'insufficient_reference_sample';

export interface ExpectedRateReference {
  readonly key: string;
  readonly opportunities: number;
  readonly successes: number;
  readonly rate: number;
}

export function expectedRate(
  metricId: string,
  observedKeys: readonly string[],
  references: readonly ExpectedRateReference[] | undefined,
): MetricResult {
  const referenceByKey = new Map(
    (references ?? [])
      .filter(
        (reference) =>
          reference.opportunities > 0 &&
          reference.successes >= 0 &&
          reference.successes <= reference.opportunities &&
          Number.isFinite(reference.rate) &&
          reference.rate >= 0 &&
          reference.rate <= 1,
      )
      .map((reference) => [reference.key, reference]),
  );
  const matched = observedKeys.map((key) => referenceByKey.get(key));
  const referenceSampleSize = [...new Set(matched.filter(Boolean))].reduce(
    (sum, reference) => sum + (reference?.opportunities ?? 0),
    0,
  );
  if (
    observedKeys.length === 0 ||
    matched.some((reference) => !reference) ||
    referenceSampleSize === 0
  ) {
    return {
      metricId,
      value: null,
      numerator: 0,
      denominator: observedKeys.length,
      available: false,
      reasonUnavailable: INSUFFICIENT_REFERENCE_SAMPLE,
      referenceSampleSize,
    };
  }
  const expectedSuccesses = matched.reduce((sum, reference) => sum + (reference?.rate ?? 0), 0);
  return {
    metricId,
    value: expectedSuccesses / observedKeys.length,
    numerator: expectedSuccesses,
    denominator: observedKeys.length,
    available: true,
    referenceSampleSize,
  };
}

export function createExpectedSideoutMetricDefinition(): MetricDefinition {
  return {
    id: EXPECTED_SIDEOUT_METRIC_ID,
    name: 'Expected Sideout',
    requiredFields: ['skill', 'receptionGrade', 'expectedSideoutReferences'],
    calculate(context) {
      const keys = scopedEvents({ ...context, scope: { ...context.scope, skill: 'reception' } })
        .map(receptionGrade)
        .filter((grade): grade is NonNullable<typeof grade> => Boolean(grade));
      return expectedRate(EXPECTED_SIDEOUT_METRIC_ID, keys, context.expectedSideoutReferences);
    },
  };
}
