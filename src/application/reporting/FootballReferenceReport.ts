import type { MarkovComparison } from '../../domain/football/FootballReferenceMarkov';

export interface FootballReferenceReport {
  readonly sport: 'football';
  readonly sourceLabel: string;
  readonly coverage: string;
  readonly shots: { readonly reference: number; readonly local: number; readonly combined?: number; readonly denominatorReference: number; readonly denominatorLocal: number };
  readonly markov: readonly MarkovComparison[];
  readonly limitations: readonly string[];
}

/** Report payload for the existing report/export pipeline; no new renderer or backend. */
export function buildFootballReferenceReport(input: Omit<FootballReferenceReport, 'sport'>): FootballReferenceReport {
  return { sport: 'football', ...input };
}
