import { createVolleyballMetricDefinitions } from '../metrics/volleyball/volleyballMetrics';
import { MetricRegistry } from './MetricRegistry';
import { createTacticalMetricDefinitions } from '../metrics/tactical/tacticalMetrics';

export function createDefaultMetricRegistry(): MetricRegistry {
  return new MetricRegistry([
    ...createVolleyballMetricDefinitions(),
    ...createTacticalMetricDefinitions(),
  ]);
}
