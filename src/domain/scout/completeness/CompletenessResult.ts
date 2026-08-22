import type { ScoutField } from '../../../profiles/types';

export interface CompletenessResult {
  readonly status: 'complete' | 'partial';
  readonly missingRecommendedFields: readonly ScoutField[];
}
