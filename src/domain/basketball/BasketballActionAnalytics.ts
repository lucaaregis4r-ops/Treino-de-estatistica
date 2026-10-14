import type { BasketballFact, BasketballTactic } from './BasketballScout';

export type BasketballActionState =
  | 'possession_start' | 'pass' | 'shot_missed' | 'shot_blocked' | 'shot_made_continue'
  | 'offensive_rebound' | 'defensive_rebound' | 'foul' | 'basket_1' | 'basket_2' | 'basket_3'
  | 'turnover' | 'opponent_rebound' | `tactic:${BasketballTactic}`;

export interface BasketballActionChain {
  readonly teamId: string;
  readonly period: number;
  readonly states: readonly BasketballActionState[];
  readonly factIds: readonly string[];
  readonly complete: boolean;
}

export interface BasketballMarkovTransition {
  readonly from: BasketballActionState;
  readonly to: BasketballActionState;
  readonly count: number;
  readonly denominator: number;
  readonly probability: number;
}

export interface BasketballMarkovModel {
  readonly teamId: string;
  readonly chains: readonly BasketballActionChain[];
  readonly completeChains: number;
  readonly transitions: readonly BasketballMarkovTransition[];
  readonly states: readonly BasketballActionState[];
}

const terminalStates = new Set<BasketballActionState>(['basket_1', 'basket_2', 'basket_3', 'turnover', 'opponent_rebound']);

function factStates(fact: BasketballFact): BasketballActionState[] {
  const tactic: BasketballActionState[] = 'tactic' in fact && fact.tactic ? [`tactic:${fact.tactic}`] : [];
  if (fact.kind === 'possession') return ['possession_start'];
  if (fact.kind === 'pass') return ['pass'];
  if (fact.kind === 'tactic') return tactic;
  if (fact.kind === 'foul') return ['foul'];
  if (fact.kind === 'turnover') return [...tactic, 'turnover'];
  if (fact.kind === 'rebound') return [fact.side === 'offensive' ? 'offensive_rebound' : 'defensive_rebound'];
  if (fact.outcome === 'missed') return [...tactic, 'shot_missed'];
  if (fact.outcome === 'blocked') return [...tactic, 'shot_blocked'];
  return [...tactic, fact.possessionEnds === false ? 'shot_made_continue' : `basket_${fact.value}` as BasketballActionState];
}

/** Consecutive saved facts only. No pass, location, or terminal result is synthesized. */
export function buildBasketballActionChains(facts: readonly BasketballFact[]): BasketballActionChain[] {
  const chains: BasketballActionChain[] = [];
  let teamId: string | undefined;
  let period = 0;
  let states: BasketballActionState[] = [];
  let factIds: string[] = [];
  function flush(complete: boolean) {
    if (teamId && states.length) chains.push({ teamId, period, states: [...states], factIds: [...factIds], complete });
    teamId = undefined; states = []; factIds = [];
  }
  for (const fact of facts) {
    if (teamId && fact.period !== period) flush(false);
    if (teamId && fact.kind === 'rebound' && fact.side === 'defensive' && fact.teamId !== teamId) {
      states.push('opponent_rebound');
      factIds.push(fact.id);
      flush(true);
    } else if (teamId && fact.teamId !== teamId) flush(false);
    if (fact.kind === 'possession' && teamId) flush(false);
    if (!teamId) { teamId = fact.teamId; period = fact.period; }
    states.push(...factStates(fact));
    factIds.push(fact.id);
    if (states.length && terminalStates.has(states[states.length - 1])) flush(true);
  }
  flush(false);
  return chains;
}

export function analyzeBasketballMarkov(facts: readonly BasketballFact[], teamId: string): BasketballMarkovModel {
  const chains = buildBasketballActionChains(facts).filter(chain => chain.teamId === teamId);
  const counts = new Map<string, { from: BasketballActionState; to: BasketballActionState; count: number }>();
  const totals = new Map<BasketballActionState, number>();
  const states = new Set<BasketballActionState>();
  for (const chain of chains) {
    chain.states.forEach(state => states.add(state));
    for (let index = 0; index < chain.states.length - 1; index++) {
      const from = chain.states[index];
      const to = chain.states[index + 1];
      const key = `${from}->${to}`;
      const previous = counts.get(key);
      counts.set(key, { from, to, count: (previous?.count ?? 0) + 1 });
      totals.set(from, (totals.get(from) ?? 0) + 1);
    }
  }
  const transitions = [...counts.values()].map(item => ({ ...item, denominator: totals.get(item.from) ?? 0, probability: item.count / (totals.get(item.from) ?? 1) })).sort((a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  return { teamId, chains, completeChains: chains.filter(chain => chain.complete).length, transitions, states: [...states] };
}
