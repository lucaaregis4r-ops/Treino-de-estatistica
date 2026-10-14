import type { FutsalFact, FutsalScoutProjection } from './FutsalScout';

export interface FutsalAnalyticsTeam {
  readonly teamId: string;
  readonly score: number;
  readonly shots: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly shotsWithPosition: number;
  readonly shotsWithoutPosition: number;
  readonly classifiedPossessions: number;
  readonly classifiedPossessionsWithShot: number;
  readonly shotsInClassifiedPossessions: number;
  readonly shotsPerClassifiedPossession: number | null;
  readonly shotsByOutcome: Readonly<Record<string, number>>;
}
export interface FutsalPeriodTeamCount { readonly period: 1 | 2; readonly teamId: string; readonly fouls: number; readonly accumulatedFouls: number; readonly substitutions: number }
export interface FutsalPeriodScore { readonly period: 1 | 2; readonly teamId: string; readonly goals: number }
export interface FutsalPeriodShots { readonly period: 1 | 2; readonly teamId: string; readonly shots: number }
export interface FutsalControlTime { readonly period: 1 | 2; readonly state: string; readonly teamId?: string; readonly observedMs: number }
export interface FutsalShotPoint { readonly factId: string; readonly teamId: string; readonly period: 1 | 2; readonly x: number; readonly y: number; readonly outcome: string }
export interface FutsalContextCoverage { readonly dimension: string; readonly category: string; readonly shots: number; readonly goals: number; readonly eligibleShots: number; readonly coverage: number | null }
export interface FutsalAnalytics {
  readonly teams: readonly FutsalAnalyticsTeam[];
  readonly periodCounts: readonly FutsalPeriodTeamCount[];
  readonly periodScores: readonly FutsalPeriodScore[];
  readonly periodShots: readonly FutsalPeriodShots[];
  readonly restarts: Readonly<Record<string, number>>;
  readonly controlTime: readonly FutsalControlTime[];
  readonly shotPoints: readonly FutsalShotPoint[];
  readonly contextCoverage: readonly FutsalContextCoverage[];
  readonly compositions: readonly { readonly teamId: string; readonly playerIds: readonly string[]; readonly certainty: string; readonly period: 1 | 2 }[];
  readonly flyingGoalkeeperIntervals: readonly { readonly teamId: string; readonly period: 1 | 2; readonly durationMs?: number }[];
}

/** Descriptive futsal selectors. Possessions are counted only for observed control episodes with an observed closing marker. */
export function buildFutsalAnalytics(projection: FutsalScoutProjection, teamIds: readonly string[]): FutsalAnalytics {
  const facts = projection.facts;
  const byId = new Map(facts.map(item => [item.fact.id, item]));
  const shots = facts.filter((item) => item.fact.kind === 'shot');
  const summaries = teamIds.map((teamId) => {
    const teamShots = shots.filter(({ fact }) => fact.kind === 'shot' && fact.shootingTeamId === teamId);
    const goalsFor = shots.filter(({ fact }) => fact.kind === 'shot' && fact.outcome === 'goal' && fact.beneficiaryTeamId === teamId).length;
    const goalsAgainst = shots.filter(({ fact }) => fact.kind === 'shot' && fact.outcome === 'goal' && fact.beneficiaryTeamId !== teamId).length;
    const episodes: { period: 1 | 2; teamId: string; start: number; end: number }[] = [];
    let open: { period: 1 | 2; teamId: string; start: number } | undefined;
    for (const item of facts) {
      const fact = item.fact;
      // Essential actions are isolated observations. They interrupt any inferred interval.
      if (fact.essentialCode) { open = undefined; continue; }
      if (fact.kind !== 'control' && fact.kind !== 'tackle' && !(fact.kind === 'shot' && fact.outcome === 'goal')) continue;
      const state = fact.kind === 'tackle' ? 'team' : fact.kind === 'shot' ? 'dead_ball' : fact.state;
      const controlledTeamId = fact.kind === 'tackle' ? fact.winningTeamId : fact.kind === 'control' ? fact.controlledTeamId : undefined;
      const coverage = fact.kind === 'control' ? fact.coverage : 'continuous';
      if (open && (open.period !== fact.period || state !== 'team' || controlledTeamId !== open.teamId)) {
        episodes.push({ ...open, end: item.sequence }); open = undefined;
      }
      if (!open && state === 'team' && coverage === 'continuous' && fact.observation !== 'not_observed' && controlledTeamId === teamId) open = { period: fact.period, teamId, start: item.sequence };
    }
    const teamEpisodes = episodes.filter(episode => episode.teamId === teamId);
    const shotsInClassifiedPossessions = teamEpisodes.reduce((total, episode) => total + facts.filter(item => item.sequence > episode.start && item.sequence <= episode.end && item.fact.kind === 'shot' && item.fact.period === episode.period && item.fact.shootingTeamId === teamId).length, 0);
    return {
      teamId, score: projection.score[teamId] ?? 0, shots: teamShots.length, goalsFor,
      goalsAgainst,
      shotsWithPosition: teamShots.filter(({ fact }) => fact.kind === 'shot' && !!fact.position).length,
      shotsWithoutPosition: teamShots.filter(({ fact }) => fact.kind === 'shot' && !fact.position).length,
      classifiedPossessions: teamEpisodes.length,
      classifiedPossessionsWithShot: teamEpisodes.filter(episode => facts.some(item => item.sequence > episode.start && item.sequence <= episode.end && item.fact.kind === 'shot' && item.fact.period === episode.period && item.fact.shootingTeamId === teamId)).length,
      shotsInClassifiedPossessions,
      shotsPerClassifiedPossession: teamEpisodes.length ? shotsInClassifiedPossessions / teamEpisodes.length : null,
      shotsByOutcome: Object.fromEntries(['goal', 'saved', 'blocked', 'off_target', 'post', 'pending'].map(outcome => [outcome, teamShots.filter(({ fact }) => fact.kind === 'shot' && fact.outcome === outcome).length])),
    } satisfies FutsalAnalyticsTeam;
  });

  const countRows = new Map<string, { period: 1 | 2; teamId: string; fouls: number; accumulatedFouls: number; substitutions: number }>();
  const periodScores = new Map<string, FutsalPeriodScore>();
  const periodShots = new Map<string, FutsalPeriodShots>();
  const countFor = (period: 1 | 2, teamId: string) => {
    const key = `${period}:${teamId}`;
    let row = countRows.get(key);
    if (!row) { row = { period, teamId, fouls: 0, accumulatedFouls: 0, substitutions: 0 }; countRows.set(key, row); }
    return row;
  };
  const restarts: Record<string, number> = {};
  const compositions: { teamId: string; playerIds: readonly string[]; certainty: string; period: 1 | 2 }[] = [];
  for (const { fact } of facts) {
    if (fact.kind === 'shot') {
      const key = `${fact.period}:${fact.shootingTeamId}`;
      const row = periodShots.get(key);
      periodShots.set(key, { period: fact.period, teamId: fact.shootingTeamId, shots: (row?.shots ?? 0) + 1 });
    }
    if (fact.kind === 'shot' && fact.outcome === 'goal' && fact.beneficiaryTeamId) {
      const key = `${fact.period}:${fact.beneficiaryTeamId}`;
      const row = periodScores.get(key);
      periodScores.set(key, { period: fact.period, teamId: fact.beneficiaryTeamId, goals: (row?.goals ?? 0) + 1 });
    }
    if (fact.kind === 'score_adjustment') {
      const key = `${fact.period}:${fact.beneficiaryTeamId}`;
      const row = periodScores.get(key);
      periodScores.set(key, { period: fact.period, teamId: fact.beneficiaryTeamId, goals: (row?.goals ?? 0) + fact.delta });
    }
    if (fact.kind === 'foul') { const row = countFor(fact.period, fact.offendingTeamId); row.fouls++; if (fact.accumulated) row.accumulatedFouls++; }
    if (fact.kind === 'substitution') countFor(fact.period, fact.teamId).substitutions++;
    if (fact.kind === 'restart') restarts[fact.restart] = (restarts[fact.restart] ?? 0) + 1;
    if (fact.kind === 'composition') compositions.push({ teamId: fact.teamId, playerIds: fact.playerIds, certainty: fact.certainty, period: fact.period });
  }

  const controlTime = new Map<string, FutsalControlTime>();
  const controls = facts.filter(item => item.fact.essentialCode || item.fact.kind === 'control' || item.fact.kind === 'tackle' || item.fact.kind === 'shot' && item.fact.outcome === 'goal');
  for (let index = 0; index < controls.length - 1; index++) {
    const current = controls[index], next = controls[index + 1];
    if (current.fact.essentialCode || next.fact.essentialCode) continue;
    if (current.fact.kind !== 'control' && current.fact.kind !== 'tackle' && current.fact.kind !== 'shot') continue;
    if (current.fact.period !== next.fact.period || current.fact.kind === 'control' && current.fact.coverage !== 'continuous' || next.fact.elapsedMs < current.fact.elapsedMs) continue;
    const state = current.fact.kind === 'tackle' ? 'team' : current.fact.kind === 'shot' ? 'dead_ball' : current.fact.state;
    const teamId = current.fact.kind === 'tackle' ? current.fact.winningTeamId : current.fact.kind === 'control' && state === 'team' ? current.fact.controlledTeamId : undefined;
    const key = `${current.fact.period}:${state}:${teamId ?? ''}`;
    const previous = controlTime.get(key);
    controlTime.set(key, { period: current.fact.period, state, ...(teamId ? { teamId } : {}), observedMs: (previous?.observedMs ?? 0) + next.fact.elapsedMs - current.fact.elapsedMs });
  }

  const annotations = facts.filter(item => item.fact.kind === 'tactical_annotation');
  const dimensions: readonly (keyof Pick<Extract<FutsalFact, { kind: 'tactical_annotation' }>, 'organization' | 'restartOrigin' | 'numericalSituation' | 'defensiveContext' | 'attackingStructure'>)[] = ['organization', 'restartOrigin', 'numericalSituation', 'defensiveContext', 'attackingStructure'];
  const contextCoverage: FutsalContextCoverage[] = [];
  for (const dimension of dimensions) {
    const categorized = new Map<string, Set<string>>();
    const goalsByCategory = new Map<string, Set<string>>();
    for (const shot of shots) {
      const related = annotations.filter(item => {
        if (item.fact.kind !== 'tactical_annotation') return false;
        if (item.fact.scope === 'event') return item.fact.targetFactId === shot.fact.id;
        const start = byId.get(item.fact.startFactId ?? '')?.sequence;
        const end = byId.get(item.fact.endFactId ?? '')?.sequence;
        return start !== undefined && end !== undefined && shot.sequence >= start && shot.sequence <= end;
      });
      const values = new Set(related.flatMap(item => item.fact.kind === 'tactical_annotation' && item.fact[dimension] ? [String(item.fact[dimension])] : []));
      for (const value of values) {
        if (!categorized.has(value)) categorized.set(value, new Set());
        categorized.get(value)!.add(shot.fact.id);
        if (shot.fact.kind === 'shot' && shot.fact.outcome === 'goal') { if (!goalsByCategory.has(value)) goalsByCategory.set(value, new Set()); goalsByCategory.get(value)!.add(shot.fact.id); }
      }
    }
    for (const [category, ids] of categorized) contextCoverage.push({ dimension, category, shots: ids.size, goals: goalsByCategory.get(category)?.size ?? 0, eligibleShots: shots.length, coverage: shots.length ? [...new Set([...categorized.values()].flatMap(set => [...set]))].length / shots.length : null });
  }

  const shotPoints = shots.flatMap(({ fact }) => fact.kind === 'shot' && fact.position ? [{ factId: fact.id, teamId: fact.shootingTeamId, period: fact.period, x: fact.position.x, y: fact.position.y, outcome: fact.outcome }] : []);
  const keeperState = new Map<string, { period: 1 | 2; startMs: number }>();
  const flyingGoalkeeperIntervals: { teamId: string; period: 1 | 2; durationMs?: number }[] = [];
  for (const { fact } of facts) {
    if (fact.kind !== 'tactical_context' || fact.numericalSituation !== 'own_flying_goalkeeper') continue;
    const key = `${fact.period}:${fact.teamId}`;
    if (fact.active) keeperState.set(key, { period: fact.period, startMs: fact.elapsedMs });
    else {
      const start = keeperState.get(key);
      if (start && fact.elapsedMs >= start.startMs) flyingGoalkeeperIntervals.push({ teamId: fact.teamId, period: fact.period, durationMs: fact.elapsedMs - start.startMs });
      keeperState.delete(key);
    }
  }
  for (const [key, start] of keeperState) flyingGoalkeeperIntervals.push({ teamId: key.slice(key.indexOf(':') + 1), period: start.period });

  return { teams: summaries, periodCounts: [...countRows.values()], periodScores: [...periodScores.values()], periodShots: [...periodShots.values()], restarts, controlTime: [...controlTime.values()], shotPoints, contextCoverage, compositions, flyingGoalkeeperIntervals };
}
