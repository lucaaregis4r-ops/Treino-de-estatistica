import { createVolleyballMetricDefinitions } from '../metrics/volleyball/volleyballMetrics';
import { MetricRegistry } from './MetricRegistry';
import { createTacticalMetricDefinitions } from '../metrics/tactical/tacticalMetrics';
import { createExpectedSideoutMetricDefinition } from '../metrics/advanced/expectedSideout';
import { createExpectedBreakpointMetricDefinition } from '../metrics/advanced/expectedBreakpoint';
import { createAttackEvennessMetricDefinition } from '../metrics/advanced/attackEvenness';
import { createSetterRepetitionMetricDefinition } from '../metrics/advanced/setterRepetition';
import { createSetterAttackConversionMetricDefinition } from '../metrics/advanced/setterAttackConversion';

export function createDefaultMetricRegistry(): MetricRegistry {
  return new MetricRegistry([
    ...createVolleyballMetricDefinitions(),
    ...createTacticalMetricDefinitions(),
    createExpectedSideoutMetricDefinition(),
    createExpectedBreakpointMetricDefinition(),
    createAttackEvennessMetricDefinition(),
    createSetterRepetitionMetricDefinition(),
    createSetterAttackConversionMetricDefinition(),
  ]);
}
