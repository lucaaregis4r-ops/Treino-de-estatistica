import type { ObservedSequence, ObservedStep } from './ObservedSequence';

export const OBSERVED_SEQUENCE_ANALYSIS_VERSION = 'observed-sequences-s3-v1';
export const PATTERN_CANDIDATE_BUDGET = 20_000;
export const PATTERN_TOKEN_BUDGET = 200_000;
export interface SequenceVariant { readonly key: string; readonly label: string; readonly length: number; readonly n: number; readonly eligible: number; readonly incomplete: number; readonly outcomeCounts: Readonly<Record<string, number>>; readonly shotUnits: number; readonly unitIds: readonly string[] }
export interface SequencePattern { readonly key: string; readonly label: string; readonly length: number; readonly support: number; readonly occurrences: number; readonly unitIds: readonly string[] }
export interface SequenceLengthBand { readonly label: string; readonly min: number; readonly max?: number; readonly n: number; readonly eligible: number; readonly outcomes: Readonly<Record<string, number>> }
export interface ObservedSequenceAnalysis { readonly version: typeof OBSERVED_SEQUENCE_ANALYSIS_VERSION; readonly total: number; readonly eligible: number; readonly incomplete: number; readonly exactVariants: readonly SequenceVariant[]; readonly categorizedVariants: readonly SequenceVariant[]; readonly lengthBands: readonly SequenceLengthBand[]; readonly patterns: readonly SequencePattern[]; readonly patternsComplete: boolean; readonly patternCandidates: number }

function category(step: ObservedStep): string {
  if (step.role === 'context') return 'contexto';
  if (step.role === 'terminal') return 'desfecho';
  if (step.role === 'control') return 'controle';
  const kind = step.kind;
  if (kind.includes('shot') || kind.includes('finaliza') || kind === 'attack') return 'finalização/ataque';
  if (kind.includes('pass') || kind === 'set') return 'passe/levantamento';
  if (kind.includes('restart') || kind.includes('kick')) return 'reinício';
  if (kind.includes('foul') || kind.includes('fault')) return 'falta';
  if (kind.includes('reception') || kind.includes('dig') || kind.includes('save')) return 'recepção/defesa';
  if (kind.includes('block')) return 'bloqueio';
  return 'outra ação';
}
const exactToken = (step: ObservedStep) => JSON.stringify([step.role, step.kind, step.teamId ?? '']);
const categoryToken = (step: ObservedStep) => JSON.stringify([category(step), step.teamId ?? '']);
function readable(tokens: readonly string[], categorized: boolean): string {
  return tokens.map(token => { const tuple = JSON.parse(token) as string[]; const kind = categorized ? tuple[0] : tuple[1]; const team = categorized ? tuple[1] : tuple[2]; return `${kind}${team ? ` (${team})` : ''}`; }).join(' → ');
}
function variants(units: readonly ObservedSequence[], tokenFor: (step: ObservedStep) => string, categorized: boolean): readonly SequenceVariant[] {
  const groups = new Map<string, { tokens: string[]; ids: Set<string>; eligible: Set<string>; outcomes: Map<string, Set<string>>; shots: Set<string> }>();
  for (const unit of units) {
    const tokens = unit.steps.map(tokenFor), key = JSON.stringify(tokens);
    const group = groups.get(key) ?? { tokens, ids: new Set<string>(), eligible: new Set<string>(), outcomes: new Map<string, Set<string>>(), shots: new Set<string>() };
    group.ids.add(unit.unitId);
    if (unit.eligibleForOutcome) {
      group.eligible.add(unit.unitId);
      if (unit.outcome) { const ids = group.outcomes.get(unit.outcome) ?? new Set<string>(); ids.add(unit.unitId); group.outcomes.set(unit.outcome, ids); }
    }
    if (unit.steps.some(step => step.kind.includes('shot') || step.kind === 'attack')) group.shots.add(unit.unitId);
    groups.set(key, group);
  }
  return [...groups].map(([key, group]) => ({ key, label: readable(group.tokens, categorized), length: group.tokens.length, n: group.ids.size, eligible: group.eligible.size, incomplete: group.ids.size - group.eligible.size, outcomeCounts: Object.fromEntries([...group.outcomes].map(([outcome, ids]) => [outcome, ids.size])), shotUnits: group.shots.size, unitIds: [...group.ids] })).sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
}
const definitions = [{ label: '1 ação', min: 1, max: 1 }, { label: '2–3 ações', min: 2, max: 3 }, { label: '4–7 ações', min: 4, max: 7 }, { label: '8–15 ações', min: 8, max: 15 }, { label: '16+ ações', min: 16 }] as const;
function lengthBands(units: readonly ObservedSequence[]): readonly SequenceLengthBand[] {
  return definitions.map(band => { const selected = units.filter(unit => unit.steps.length >= band.min && (!('max' in band) || unit.steps.length <= band.max)); const eligible = selected.filter(unit => unit.eligibleForOutcome); const outcomes: Record<string, number> = {}; for (const unit of eligible) if (unit.outcome) outcomes[unit.outcome] = (outcomes[unit.outcome] ?? 0) + 1; return { ...band, n: selected.length, eligible: eligible.length, outcomes }; });
}
function contiguousPatterns(units: readonly ObservedSequence[]) {
  if (units.length < 2) return { patterns: [] as SequencePattern[], complete: true, candidates: 0 };
  const groups = new Map<string, { tokens: string[]; ids: Set<string>; occurrences: number }>();
  let candidates = 0, tokensProcessed = 0, complete = true;
  outer: for (const unit of units) {
    const tokens = unit.steps.map(categoryToken);
    for (let length = 2; length <= tokens.length; length++) for (let start = 0; start + length <= tokens.length; start++) {
      if (candidates >= PATTERN_CANDIDATE_BUDGET || tokensProcessed + length > PATTERN_TOKEN_BUDGET) { complete = false; break outer; }
      candidates++;
      tokensProcessed += length;
      const slice = tokens.slice(start, start + length), key = JSON.stringify(slice);
      const group = groups.get(key) ?? { tokens: slice, ids: new Set<string>(), occurrences: 0 };
      group.ids.add(unit.unitId); group.occurrences++; groups.set(key, group);
    }
  }
  const patterns: SequencePattern[] = [...groups].filter(([, group]) => group.ids.size >= 2).map(([key, group]) => ({ key, label: readable(group.tokens, true), length: group.tokens.length, support: group.ids.size, occurrences: group.occurrences, unitIds: [...group.ids] })).sort((a, b) => b.support - a.support || b.length - a.length || a.key.localeCompare(b.key));
  return { patterns, complete, candidates };
}
/** Input has already been filtered as whole units. */
export function analyzeObservedSequences(units: readonly ObservedSequence[]): ObservedSequenceAnalysis {
  const distinct = [...new Map(units.map(unit => [unit.unitId, unit])).values()];
  const eligible = distinct.filter(unit => unit.eligibleForOutcome).length;
  const patterns = contiguousPatterns(distinct);
  return { version: OBSERVED_SEQUENCE_ANALYSIS_VERSION, total: distinct.length, eligible, incomplete: distinct.length - eligible, exactVariants: variants(distinct, exactToken, false), categorizedVariants: variants(distinct, categoryToken, true), lengthBands: lengthBands(distinct), patterns: patterns.patterns, patternsComplete: patterns.complete, patternCandidates: patterns.candidates };
}
export function observedDurationMs(unit: ObservedSequence): number | undefined {
  const start = unit.start.elapsedMs, end = unit.end?.elapsedMs;
  return unit.coverage === 'complete' && start !== undefined && end !== undefined && end >= start ? end - start : undefined;
}
