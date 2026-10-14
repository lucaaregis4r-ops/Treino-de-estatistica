import type { ObservedSequence, ObservedSport } from './ObservedSequence';

export const SEQUENCE_CONTEXT_MODEL_VERSION = 'variable-prefix-outcome-v1';
export const SEQUENCE_CONTEXT_MODEL_CRITERIA = Object.freeze({ minMatches: 5, minUnits: 100, minStateSupport: 20, minStateMatches: 3, maxContextStates: 250_000, maxCalibrationError: 0.1 });

export type SequenceModelUnavailableReason = 'no_eligible_units' | 'too_few_matches' | 'too_few_units' | 'unsupported_contexts' | 'not_better_than_baselines' | 'not_calibrated' | 'resource_limit';
export interface SequenceModelMetric { readonly brier: number; readonly logLoss: number; readonly calibrationError: number; readonly n: number }
export interface SequenceModelPrediction { readonly unitId: string; readonly heldOutMatchId: string; readonly trainingMatchCount: number; readonly contextLength: number; readonly support: number; readonly outcome: string; readonly probabilities: Readonly<Record<string, number>> }
export interface SequenceContextState { readonly contextLength: number; readonly context: readonly string[]; readonly support: number; readonly matchSupport: number; readonly probabilities: Readonly<Record<string, { readonly probability: number; readonly low: number; readonly high: number }>>; readonly evidenceUnitIds: readonly string[] }
export interface SequenceContextModelResult {
  readonly version: typeof SEQUENCE_CONTEXT_MODEL_VERSION;
  readonly sport: ObservedSport;
  readonly status: 'available' | 'unavailable';
  readonly reason?: SequenceModelUnavailableReason;
  readonly matchCount: number;
  readonly unitCount: number;
  readonly eligibleUnitCount: number;
  readonly metrics?: { readonly globalBaseline: SequenceModelMetric; readonly teamBaseline: SequenceModelMetric; readonly firstOrder: SequenceModelMetric; readonly variableContext: SequenceModelMetric };
  readonly predictions?: readonly SequenceModelPrediction[];
  readonly states?: readonly SequenceContextState[];
  readonly contextLengthUsage?: Readonly<Record<string, number>>;
  readonly criteria: typeof SEQUENCE_CONTEXT_MODEL_CRITERIA;
}

interface Sample { readonly unit: ObservedSequence; readonly matchId: string; readonly teamId: string; readonly tokens: readonly string[]; readonly outcome: string }
interface Distribution { readonly counts: ReadonlyMap<string, number>; readonly support: number; readonly evidence: readonly string[]; readonly observations: readonly { readonly unitId: string; readonly matchId: string; readonly outcome: string }[] }
type ContextMap = Map<string, { tokens: readonly string[]; outcomes: Map<string, Map<string, string>> }>;

function actionCategory(kind: string, sport: ObservedSport): string {
  const value = kind.toLocaleLowerCase();
  if (sport === 'volleyball') {
    if (['serve', 'reception', 'set', 'attack', 'block', 'dig', 'free_ball', 'fault'].includes(value)) return value;
    if (value.includes('defen')) return 'dig';
    return 'other';
  }
  if (value.includes('shot') || value.includes('finaliz')) return 'shot';
  if (value.includes('pass')) return 'pass';
  if (value.includes('carry') || value.includes('condu')) return 'carry';
  if (value.includes('tackle') || value.includes('desarme') || value.includes('duel')) return 'tackle';
  if (value.includes('foul') || value.includes('falta')) return 'foul';
  if (value.includes('restart') || value.includes('kick')) return 'restart';
  if (value.includes('recovery') || value.includes('recover')) return 'recovery';
  if (value.includes('control')) return 'control';
  if (value.includes('pressure')) return 'pressure';
  if (value.startsWith('clock:')) return 'clock';
  return 'other';
}

function sampleFor(unit: ObservedSequence): Sample | undefined {
  if (!unit.eligibleForOutcome || !unit.outcome) return undefined;
  let perspective = unit.teamId;
  let outcome = unit.outcome;
  if (unit.sport === 'volleyball') {
    perspective = unit.steps[0]?.teamId;
    const winner = unit.outcome.startsWith('point:') ? unit.outcome.slice('point:'.length) : undefined;
    if (!perspective || !winner || !unit.participantTeamIds.includes(winner)) return undefined;
    outcome = winner === perspective ? 'point_won' : 'point_lost';
  } else if (!perspective) return undefined;
  if (outcome === 'goal' && unit.end?.teamId) outcome = unit.end.teamId === perspective ? 'goal_for' : 'goal_against';
  if (outcome === 'point') return undefined;
  const lastStep = unit.steps.at(-1);
  const terminalActionId = ['turnover', 'restart', 'foul'].includes(outcome) ? unit.end?.sourceId
    : unit.sport === 'volleyball' && lastStep?.kind.toLocaleLowerCase() === 'fault' ? lastStep.sourceId : undefined;
  const tokens = unit.steps.filter(step => step.role !== 'context' && step.sourceId !== terminalActionId).map(step => {
    const side = step.teamId === perspective ? 'own' : step.teamId ? 'opponent' : 'unspecified';
    return `${actionCategory(step.kind, unit.sport)}:${side}`;
  });
  return tokens.length ? { unit, matchId: unit.matchId, teamId: perspective, tokens, outcome } : undefined;
}

function distribution(samples: readonly Sample[]): Distribution {
  const counts = new Map<string, number>();
  const evidence = new Set<string>();
  const observations = new Map<string, { unitId: string; matchId: string; outcome: string }>();
  for (const sample of samples) { counts.set(sample.outcome, (counts.get(sample.outcome) ?? 0) + 1); evidence.add(sample.unit.unitId); observations.set(sample.unit.unitId, { unitId: sample.unit.unitId, matchId: sample.matchId, outcome: sample.outcome }); }
  return { counts, support: evidence.size, evidence: [...evidence], observations: [...observations.values()] };
}

function contextKey(tokens: readonly string[]): string { return JSON.stringify(tokens); }

function outcomeLabels(sport: ObservedSport): readonly string[] {
  if (sport === 'volleyball') return ['point_lost', 'point_won'];
  const labels = ['contested', 'dead_ball', 'goal', 'goal_against', 'goal_for', 'period_boundary', 'restart', 'suspended', 'turnover', 'unknown_control'];
  return sport === 'football' ? [...labels, 'provider_possession_boundary'] : [...labels, 'foul'];
}

function buildContextMap(samples: readonly Sample[], maxStates: number): ContextMap | undefined {
  const contexts: ContextMap = new Map();
  for (const sample of samples) {
    const seen = new Set<string>();
    for (let length = 1; length <= sample.tokens.length; length++) {
      const suffix = sample.tokens.slice(-length), key = contextKey(suffix);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!contexts.has(key) && contexts.size >= maxStates) return undefined;
      const context = contexts.get(key) ?? { tokens: suffix, outcomes: new Map<string, Map<string, string>>() };
      const ids = context.outcomes.get(sample.outcome) ?? new Map<string, string>();
      ids.set(sample.unit.unitId, sample.matchId);
      context.outcomes.set(sample.outcome, ids);
      contexts.set(key, context);
    }
  }
  return contexts;
}

function contextDistribution(context: { readonly tokens: readonly string[]; readonly outcomes: ReadonlyMap<string, ReadonlyMap<string, string>> }): Distribution {
  const counts = new Map<string, number>(); const evidence = new Set<string>();
  const observations: { unitId: string; matchId: string; outcome: string }[] = [];
  for (const [outcome, ids] of context.outcomes) { counts.set(outcome, ids.size); for (const [id, matchId] of ids) { evidence.add(id); observations.push({ unitId: id, matchId, outcome }); } }
  return { counts, support: evidence.size, evidence: [...evidence], observations };
}

function matchSupport(source: Distribution): number { return new Set(source.observations.map(row => row.matchId)).size; }

function probabilities(source: Distribution, labels: readonly string[], alpha = 1): Record<string, number> {
  const denominator = source.support + alpha * labels.length;
  return Object.fromEntries(labels.map(label => [label, ((source.counts.get(label) ?? 0) + alpha) / denominator]));
}

function clusteredPrediction(source: Distribution, labels: readonly string[], key: string) {
  const observed = probabilities(source, labels);
  const clusters = new Map<string, { total: number; counts: Map<string, number> }>();
  for (const row of source.observations) {
    const cluster = clusters.get(row.matchId) ?? { total: 0, counts: new Map<string, number>() };
    cluster.total++;
    cluster.counts.set(row.outcome, (cluster.counts.get(row.outcome) ?? 0) + 1);
    clusters.set(row.matchId, cluster);
  }
  const matchIds = [...clusters.keys()];
  if (matchIds.length < SEQUENCE_CONTEXT_MODEL_CRITERIA.minStateMatches)
    return Object.fromEntries(labels.map(label => [label, { probability: observed[label], low: 0, high: 1 }]));
  let seed = 2166136261;
  for (const character of key) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  const draws = Object.fromEntries(labels.map(label => [label, [] as number[]])) as Record<string, number[]>;
  const sampleCount = 1000;
  for (let iteration = 0; iteration < sampleCount; iteration++) {
    const counts = new Map<string, number>(); let total = 0;
    for (let draw = 0; draw < matchIds.length; draw++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const cluster = clusters.get(matchIds[seed % matchIds.length]);
      if (!cluster) continue;
      total += cluster.total;
      for (const [outcome, count] of cluster.counts) counts.set(outcome, (counts.get(outcome) ?? 0) + count);
    }
    for (const label of labels) draws[label].push(((counts.get(label) ?? 0) + 1) / (Math.max(1, total) + labels.length));
  }
  return Object.fromEntries(labels.map(label => {
    const values = draws[label].sort((a, b) => a - b);
    return [label, { probability: observed[label], low: values[Math.floor(sampleCount * 0.025)], high: values[Math.floor(sampleCount * 0.975)] }];
  }));
}

function score(rows: readonly { readonly sample: Sample; readonly probabilities: Readonly<Record<string, number>> }[], labels: readonly string[]): SequenceModelMetric {
  if (!rows.length) return { brier: 1, logLoss: Number.POSITIVE_INFINITY, calibrationError: 1, n: 0 };
  let brier = 0, logLoss = 0;
  const bins = Array.from({ length: 10 }, () => ({ n: 0, confidence: 0, correct: 0 }));
  for (const row of rows) {
    let sampleBrier = 0;
    for (const label of labels) { const p = row.probabilities[label] ?? 0; sampleBrier += (p - Number(row.sample.outcome === label)) ** 2; }
    brier += sampleBrier;
    logLoss -= Math.log(Math.max(1e-12, row.probabilities[row.sample.outcome] ?? 0));
    const best = labels.reduce((current, label) => (row.probabilities[label] ?? 0) > (row.probabilities[current] ?? 0) ? label : current, labels[0]);
    const confidence = row.probabilities[best] ?? 0;
    const bin = bins[Math.min(9, Math.floor(confidence * 10))];
    bin.n++; bin.confidence += confidence; bin.correct += Number(best === row.sample.outcome);
  }
  const ece = bins.reduce((sum, bin) => sum + (bin.n / rows.length) * Math.abs(bin.confidence / Math.max(1, bin.n) - bin.correct / Math.max(1, bin.n)), 0);
  return { brier: brier / rows.length, logLoss: logLoss / rows.length, calibrationError: ece, n: rows.length };
}

function predictWithBackoff(sample: Sample, contexts: ContextMap, global: Distribution, labels: readonly string[]) {
  for (let length = sample.tokens.length; length >= 1; length--) {
    const context = contexts.get(contextKey(sample.tokens.slice(-length)));
    if (!context) continue;
    const source = contextDistribution(context);
    if (source.support >= SEQUENCE_CONTEXT_MODEL_CRITERIA.minStateSupport && matchSupport(source) >= SEQUENCE_CONTEXT_MODEL_CRITERIA.minStateMatches)
      return { source, length, probabilities: probabilities(source, labels) };
  }
  return { source: global, length: 0, probabilities: probabilities(global, labels) };
}

function unavailable(sport: ObservedSport, units: readonly ObservedSequence[], eligible: readonly Sample[], reason: SequenceModelUnavailableReason): SequenceContextModelResult {
  const matchesWithEligibleUnits = new Set(eligible.map(sample => sample.matchId));
  return { version: SEQUENCE_CONTEXT_MODEL_VERSION, sport, status: 'unavailable', reason, matchCount: matchesWithEligibleUnits.size || new Set(units.map(unit => unit.matchId)).size, unitCount: new Set(units.map(unit => unit.unitId)).size, eligibleUnitCount: new Set(eligible.map(sample => sample.unit.unitId)).size, criteria: SEQUENCE_CONTEXT_MODEL_CRITERIA };
}

/** Leave-one-match-out evaluation. Prefixes remain complete; only the fitted context may back off to a shorter suffix. */
export function analyzeSequenceContextModel(units: readonly ObservedSequence[]): SequenceContextModelResult {
  const sport = units[0]?.sport;
  if (!sport) return { version: SEQUENCE_CONTEXT_MODEL_VERSION, sport: 'volleyball', status: 'unavailable', reason: 'no_eligible_units', matchCount: 0, unitCount: 0, eligibleUnitCount: 0, criteria: SEQUENCE_CONTEXT_MODEL_CRITERIA };
  if (units.some(unit => unit.sport !== sport)) return unavailable(sport, units, [], 'unsupported_contexts');
  const eligible = [...new Map(units.flatMap(unit => { const sample = sampleFor(unit); return sample ? [[sample.unit.unitId, sample] as const] : []; })).values()];
  const matchCount = new Set(eligible.map(sample => sample.matchId)).size;
  if (!eligible.length) return unavailable(sport, units, eligible, 'no_eligible_units');
  if (matchCount < SEQUENCE_CONTEXT_MODEL_CRITERIA.minMatches) return unavailable(sport, units, eligible, 'too_few_matches');
  if (eligible.length < SEQUENCE_CONTEXT_MODEL_CRITERIA.minUnits) return unavailable(sport, units, eligible, 'too_few_units');
  const labels = outcomeLabels(sport);
  if (eligible.some(sample => !labels.includes(sample.outcome))) return unavailable(sport, units, eligible, 'unsupported_contexts');

  const globalRows: { sample: Sample; probabilities: Readonly<Record<string, number>> }[] = [];
  const teamRows: typeof globalRows = [];
  const firstRows: typeof globalRows = [];
  const variableRows: typeof globalRows = [];
  const predictions: SequenceModelPrediction[] = [];
  const usage: Record<string, number> = {};
  for (const heldOutMatchId of [...new Set(eligible.map(sample => sample.matchId))]) {
    const train = eligible.filter(sample => sample.matchId !== heldOutMatchId);
    const validation = eligible.filter(sample => sample.matchId === heldOutMatchId);
    const trainingMatchCount = new Set(train.map(sample => sample.matchId)).size;
    const global = distribution(train);
    const teamGroups = new Map<string, Sample[]>();
    for (const sample of train) { const group = teamGroups.get(sample.teamId) ?? []; group.push(sample); teamGroups.set(sample.teamId, group); }
    const teamDistributions = new Map([...teamGroups].map(([teamId, samples]) => [teamId, distribution(samples)]));
    const contexts = buildContextMap(train, SEQUENCE_CONTEXT_MODEL_CRITERIA.maxContextStates);
    if (!contexts) return unavailable(sport, units, eligible, 'resource_limit');
    const firstOrder = new Map<string, Distribution>();
    const firstGroups = new Map<string, Sample[]>();
    for (const sample of train) { const key = sample.tokens.at(-1)!; const group = firstGroups.get(key) ?? []; group.push(sample); firstGroups.set(key, group); }
    for (const [key, values] of firstGroups) firstOrder.set(key, distribution(values));
    for (const sample of validation) {
      const globalProbs = probabilities(global, labels);
      const teamSource = teamDistributions.get(sample.teamId) ?? global;
      const teamProbs = probabilities(teamSource, labels);
      const first = firstOrder.get(sample.tokens.at(-1)!) ?? global;
      const firstSource = first.support >= SEQUENCE_CONTEXT_MODEL_CRITERIA.minStateSupport && matchSupport(first) >= SEQUENCE_CONTEXT_MODEL_CRITERIA.minStateMatches ? first : global;
      const firstProbs = probabilities(firstSource, labels);
      const variable = predictWithBackoff(sample, contexts, global, labels);
      globalRows.push({ sample, probabilities: globalProbs });
      teamRows.push({ sample, probabilities: teamProbs });
      firstRows.push({ sample, probabilities: firstProbs });
      variableRows.push({ sample, probabilities: variable.probabilities });
      usage[String(variable.length)] = (usage[String(variable.length)] ?? 0) + 1;
      predictions.push({ unitId: sample.unit.unitId, heldOutMatchId, trainingMatchCount, contextLength: variable.length, support: variable.source.support, outcome: sample.outcome, probabilities: variable.probabilities });
    }
  }
  const metrics = { globalBaseline: score(globalRows, labels), teamBaseline: score(teamRows, labels), firstOrder: score(firstRows, labels), variableContext: score(variableRows, labels) };
  if ((usage['0'] ?? 0) === variableRows.length)
    return { ...unavailable(sport, units, eligible, 'unsupported_contexts'), metrics, contextLengthUsage: usage };
  if (!(metrics.variableContext.brier < metrics.globalBaseline.brier && metrics.variableContext.brier < metrics.teamBaseline.brier && metrics.variableContext.brier < metrics.firstOrder.brier && metrics.variableContext.logLoss < metrics.globalBaseline.logLoss && metrics.variableContext.logLoss < metrics.teamBaseline.logLoss && metrics.variableContext.logLoss < metrics.firstOrder.logLoss))
    return { ...unavailable(sport, units, eligible, 'not_better_than_baselines'), metrics, contextLengthUsage: usage };
  if (metrics.variableContext.calibrationError > SEQUENCE_CONTEXT_MODEL_CRITERIA.maxCalibrationError)
    return { ...unavailable(sport, units, eligible, 'not_calibrated'), metrics, contextLengthUsage: usage };

  const fullContexts = buildContextMap(eligible, SEQUENCE_CONTEXT_MODEL_CRITERIA.maxContextStates);
  if (!fullContexts) return { ...unavailable(sport, units, eligible, 'resource_limit'), metrics };
  const supportedStates = [...fullContexts.values()].flatMap(context => {
    const source = contextDistribution(context);
    const matches = matchSupport(source);
    return source.support >= SEQUENCE_CONTEXT_MODEL_CRITERIA.minStateSupport && matches >= SEQUENCE_CONTEXT_MODEL_CRITERIA.minStateMatches
      ? [{ contextLength: context.tokens.length, context: context.tokens, source, matchSupport: matches }]
      : [];
  }).sort((a, b) => b.source.support - a.source.support || b.contextLength - a.contextLength).slice(0, 100);
  const states: SequenceContextState[] = supportedStates.map(({ contextLength, context, source, matchSupport: matches }) => ({
    contextLength, context, support: source.support, matchSupport: matches,
    probabilities: clusteredPrediction(source, labels, contextKey(context)), evidenceUnitIds: source.evidence.slice(0, 10),
  }));
  return { version: SEQUENCE_CONTEXT_MODEL_VERSION, sport, status: 'available', matchCount, unitCount: new Set(units.map(unit => unit.unitId)).size, eligibleUnitCount: eligible.length, metrics, predictions, states, contextLengthUsage: usage, criteria: SEQUENCE_CONTEXT_MODEL_CRITERIA };
}
