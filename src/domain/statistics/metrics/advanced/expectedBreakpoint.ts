import type { MetricDefinition } from '../../definitions/MetricDefinition';
import { scopedEvents } from '../../queries/scoutEventQueries';
import { expectedRate } from './expectedSideout';

export const EXPECTED_BREAKPOINT_METRIC_ID = 'advanced.expected_breakpoint';

export function createExpectedBreakpointMetricDefinition(): MetricDefinition {
  return {
    id: EXPECTED_BREAKPOINT_METRIC_ID,
    name: 'Expected Breakpoint',
    requiredFields: ['skill', 'evaluation', 'expectedBreakpointReferences'],
    calculate(context) {
      const keys = scopedEvents({ ...context, scope: { ...context.scope, skill: 'serve' } })
        .map((event) => event.evaluation)
        .filter((evaluation): evaluation is string => Boolean(evaluation));
      return expectedRate(
        EXPECTED_BREAKPOINT_METRIC_ID,
        keys,
        context.expectedBreakpointReferences,
      );
    },
  };
}
