import type { MetricDefinition } from '../../definitions/MetricDefinition';
import { scopedEvents } from '../../queries/scoutEventQueries';

export const ATTACK_EVENNESS_METRIC_ID = 'advanced.attack_evenness';

export interface AttackEvennessReference {
  readonly playerId: string;
  readonly expectedShare: number;
}

function normalize(values: readonly number[]): readonly number[] | null {
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total > 0 ? values.map((value) => value / total) : null;
}

export function attackEvenness(
  observed: readonly number[],
  expected: readonly number[],
): number | null {
  if (observed.length === 0 || observed.length !== expected.length) return null;
  const observedShares = normalize(observed);
  const expectedShares = normalize(expected);
  if (!observedShares || !expectedShares) return null;
  const distance = observedShares.reduce(
    (sum, value, index) => sum + Math.abs(value - expectedShares[index]),
    0,
  );
  return Math.max(0, Math.min(1, 1 - distance / 2));
}

export function createAttackEvennessMetricDefinition(): MetricDefinition {
  return {
    id: ATTACK_EVENNESS_METRIC_ID,
    name: 'Attack Evenness',
    requiredFields: ['skill', 'playerId', 'attackEvennessReference'],
    calculate(context) {
      const attacks = scopedEvents({ ...context, scope: { ...context.scope, skill: 'attack' } });
      const reference = context.attackEvennessReference ?? [];
      const observed = reference.map(
        ({ playerId }) => attacks.filter((event) => event.playerId === playerId).length,
      );
      const value = attackEvenness(
        observed,
        reference.map(({ expectedShare }) => expectedShare),
      );
      if (value === null || attacks.length === 0) {
        return {
          metricId: ATTACK_EVENNESS_METRIC_ID,
          value: null,
          numerator: 0,
          denominator: attacks.length,
          available: false,
          reasonUnavailable: 'insufficient_reference_sample',
        };
      }
      return {
        metricId: ATTACK_EVENNESS_METRIC_ID,
        value,
        numerator: value * attacks.length,
        denominator: attacks.length,
        available: true,
        breakdown: reference.map((item, index) => ({
          key: item.playerId,
          label: item.playerId,
          value: attacks.length ? observed[index] / attacks.length : null,
          numerator: observed[index],
          denominator: attacks.length,
          components: { expectedShare: item.expectedShare },
        })),
      };
    },
  };
}
