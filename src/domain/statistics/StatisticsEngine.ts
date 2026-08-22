import type { MetricContext } from './definitions/MetricDefinition';
import type { MetricResult } from './metrics/MetricResult';
import { MetricRegistry } from './registry/MetricRegistry';

export class StatisticsEngine {
  constructor(private readonly registry: MetricRegistry) {}

  calculate(metricIds: readonly string[], context: MetricContext): readonly MetricResult[] {
    return metricIds.map((metricId) => {
      const definition = this.registry.get(metricId);
      if (!definition) {
        return {
          metricId,
          value: null,
          available: false,
          reasonUnavailable: 'Métrica não registrada.',
        };
      }
      return definition.calculate(context);
    });
  }
}
