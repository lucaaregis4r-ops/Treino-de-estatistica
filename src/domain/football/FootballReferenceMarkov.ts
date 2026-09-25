export interface ReferenceState { readonly state: string; readonly outcomes: Readonly<Record<string, number>>; readonly eligible: number; readonly source: string; readonly coverage: string; }
export interface MarkovComparison { readonly state: string; readonly alpha: number; readonly reference: Readonly<Record<string, number>>; readonly local: Readonly<Record<string, number>>; readonly combined?: Readonly<Record<string, number>>; readonly compatible: boolean; readonly reason?: string; }

export function compareMarkov(reference: ReferenceState, local: { readonly state: string; readonly outcomes: Readonly<Record<string, number>>; readonly eligible: number; readonly coverage: string }, alpha: number): MarkovComparison {
  const validCounts = (counts: Readonly<Record<string, number>>) => Object.values(counts).every(n => Number.isFinite(n) && n >= 0) && Object.values(counts).reduce((a, b) => a + b, 0) > 0;
  const valid = Number.isFinite(alpha) && alpha >= 0 && validCounts(reference.outcomes) && validCounts(local.outcomes) && Number.isFinite(reference.eligible) && Number.isFinite(local.eligible) && local.eligible > 0;
  const compatible = valid && reference.state === local.state && reference.coverage === local.coverage && reference.eligible > 0 && Object.keys(reference.outcomes).sort().join('|') === Object.keys(local.outcomes).sort().join('|');
  const refTotal = Object.values(reference.outcomes).reduce((a, b) => a + b, 0); const localTotal = Object.values(local.outcomes).reduce((a, b) => a + b, 0); const keys = Object.keys(reference.outcomes);
  const referenceProb = Object.fromEntries(keys.map((key) => [key, (validCounts(reference.outcomes) ? (reference.outcomes[key] ?? 0) / refTotal : 0)]));
  const localProb = Object.fromEntries(keys.map((key) => [key, validCounts(local.outcomes) ? (local.outcomes[key] ?? 0) / localTotal : 0]));
  const combined = compatible && localTotal > 0 ? Object.fromEntries(keys.map((key) => [key, ((local.outcomes[key] ?? 0) + alpha * (validCounts(reference.outcomes) ? (reference.outcomes[key] ?? 0) / refTotal : 0)) / (localTotal + alpha)])) : undefined;
  return { state: local.state, alpha, reference: referenceProb, local: localProb, ...(combined ? { combined } : {}), compatible, ...(compatible ? {} : { reason: 'state, outcomes or coverage are not equivalent' }) };
}
