import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../scout/events/ScoutEvent';
import { createCanonicalFootballEvent, projectFootball } from '../../football/FootballRecorder';
import type { FootballObservation } from '../../football/FootballObservation';
import type { CanonicalFootballEvent, FootballAction } from '../../football/StatsBombContract';
import type { MatchEvent } from '../../match/events/MatchEvent';
import type { FutsalFact, FutsalFactDraft } from '../../futsal/FutsalScout';
import { countObservedUnits, selectObservedSequences } from './ObservedSequence';
import { projectVolleyballObservedSequences } from './VolleyballObservedSequences';
import { projectFootballObservedSequences } from './FootballObservedSequences';
import { projectFutsalObservedSequences } from './FutsalObservedSequences';

function contact(rallyId: string, sequence: number, teamId = sequence % 2 ? 'a' : 'b', outcome = 'continuation', setNumber = 1): ScoutEvent {
  return { id: `${rallyId}-${sequence}`, matchId: 'm', rallyId, sequence, teamId, skill: sequence === 1 ? 'serve' : sequence % 3 === 0 ? 'attack' : 'reception', outcome, setNumber, scoreBefore: { teamA: 0, teamB: 0 }, timestamp: sequence * 1000, rawCode: `${rallyId}-${sequence}`, codeProfileId: 'default_compact_v1', codeProfileVersion: '1.0.0', complexityProfileId: 'tactical' };
}
function football(id: string, index: number, teamId: string, before: FootballObservation['before'], after: FootballObservation['after'], action: FootballAction = 'ball_recovery', outcome: 'observed' | 'saved' | 'goal' = 'observed', period: 1 | 2 = 1, extra: Partial<FootballObservation> = {}): CanonicalFootballEvent {
  const team = teamId === 'a' ? { id: 1, name: 'A' } : { id: 2, name: 'B' };
  return createCanonicalFootballEvent({ id, matchId: 'm', index, period, elapsedMs: index * 1000, action, outcome, team, location: [60, 40], observation: { teamId, before, after, coverage: 'continuous', ...extra } });
}
function controlMark(id: string, index: number, before: FootballObservation['before'], after: FootballObservation['after'], period: 1 | 2 = 1, coverage: 'continuous' | 'suspended' = 'continuous') {
  const event = football(id, index, after?.kind === 'controlled' ? after.teamId : 'a', before, after, 'ball_recovery', 'observed', period, { coverage });
  return { ...event, type: { id: 1000, name: 'Observação de controle' } };
}
const team = (teamId: string) => ({ kind: 'controlled' as const, teamId });
const base = { period: 1 as const, observation: 'observed' as const };
type FactInput<T> = T extends FutsalFactDraft ? Omit<T, 'observation'> & Partial<Pick<T, 'observation'>> & { period?: 1 | 2; elapsedMs?: number } : never;
function fact(id: string, sequence: number, input: FactInput<FutsalFactDraft>): MatchEvent {
  return { type: 'futsal_fact_registered', id: `e-${id}`, matchId: 'm', sequence, timestamp: sequence, fact: { ...base, ...input, id, elapsedMs: input.elapsedMs ?? sequence * 1000 } as FutsalFact };
}
function clock(id: string, sequence: number, command: 'start' | 'pause' | 'adjust' | 'advance_period', elapsedMs: number, period: 1 | 2 = 1): MatchEvent {
  return { type: 'futsal_clock_changed', id, matchId: 'm', sequence, timestamp: sequence, command, period, elapsedMs, periodDurationMs: 1_200_000, status: command === 'start' ? 'running' : 'paused', referenceTimestamp: sequence };
}

describe('observed complete sequences', () => {
  it('keeps rallies of 1, 8 and 20 contacts, two divergent endings and repeated loops intact', () => {
    const events = [
      contact('one', 1, 'a', 'point'),
      ...Array.from({ length: 8 }, (_, index) => contact('eight', index + 2, index % 2 ? 'b' : 'a', index === 7 ? 'point' : 'continuation')),
      ...Array.from({ length: 20 }, (_, index) => contact('twenty', index + 10, index % 2 ? 'b' : 'a', index === 19 ? 'point' : 'continuation')),
      contact('diverge-a', 30, 'a'), contact('diverge-a', 31, 'a', 'point'),
      contact('diverge-b', 30, 'a'), contact('diverge-b', 31, 'b', 'point'),
    ];
    const result = projectVolleyballObservedSequences('m', events);
    expect(result.units.map(unit => unit.steps.length)).toEqual([1, 8, 20, 2, 2]);
    expect(result.units.every(unit => unit.eligibleForOutcome)).toBe(true);
    expect(result.units[2].steps.map(step => step.sourceId)).toEqual(Array.from({ length: 20 }, (_, index) => `twenty-${index + 10}`));
    expect(result.units[2].steps.filter(step => step.kind === 'attack').length).toBeGreaterThan(1);
    expect(result.units.slice(-2).map(unit => unit.outcome)).toEqual(['point:a', 'point:b']);
    expect(countObservedUnits(result.units)).toBe(5);
    const focused = selectObservedSequences(result.units, { teamId: 'b', actionKind: 'attack' });
    expect(focused.find(unit => unit.unitId.includes('twenty'))?.steps).toHaveLength(20);
  });

  it('censors a rally without a terminal and rejects conflicting winners and invalid order', () => {
    const open = projectVolleyballObservedSequences('m', [contact('open', 1)]).units[0];
    expect(open).toMatchObject({ coverage: 'censored', censorReasons: ['missing_terminal'], eligibleForOutcome: false });
    const duplicate = projectVolleyballObservedSequences('m', [contact('duplicate', 1), { ...contact('duplicate', 2), sequence: 1 }]).units[0];
    expect(duplicate).toMatchObject({ coverage: 'conflict', censorReasons: ['invalid_order'] });
    const history: MatchEvent[] = [
      { type: 'scout_registered', event: contact('conflict', 1) },
      { type: 'rally_result', id: 'terminal-a', matchId: 'm', sequence: 2, timestamp: 2, rallyId: 'conflict', winnerTeamId: 'a', previousServingTeamId: 'a' },
    ];
    const tactical = { contacts: [], rallies: [{ rallyId: 'conflict', winnerTeamId: 'b', transitionTeamIds: [] }], rotationByTeamId: {} };
    expect(projectVolleyballObservedSequences('m', history, tactical).units[0]).toMatchObject({ coverage: 'conflict', censorReasons: ['conflicting_terminal'] });
  });

  it('rebuilds volleyball units when a contact is corrected into another rally and undone', () => {
    const first = contact('r1', 1);
    const second = contact('r1', 2);
    const baseline: MatchEvent[] = [{ type: 'scout_registered', event: first }, { type: 'scout_registered', event: second }];
    const original = projectVolleyballObservedSequences('m', baseline);
    const correction: MatchEvent = { type: 'scout_corrected', id: 'correction', matchId: 'm', sequence: 3, timestamp: 3, targetEventId: second.id, previousRawCode: second.rawCode, newRawCode: second.rawCode, replacementEvent: { ...second, rallyId: 'r2' } };
    const changed = projectVolleyballObservedSequences('m', [...baseline, correction]);
    expect(original.units.map(unit => unit.steps.length)).toEqual([2]);
    expect(changed.units.map(unit => unit.steps.length)).toEqual([1, 1]);
    expect(changed.units[1].steps[0].effectiveHistoryId).toBe('correction');
    const undo: MatchEvent = { type: 'scout_undone', id: 'undo', matchId: 'm', sequence: 4, timestamp: 4, targetHistoryEventId: 'correction' };
    expect(projectVolleyballObservedSequences('m', [...baseline, correction, undo]).units.map(unit => unit.unitId)).toEqual(original.units.map(unit => unit.unitId));
  });

  it('keeps two football shots and a rebound in one observed possession, then starts B on an explicit transfer', () => {
    const events = [
      controlMark('a-control', 1, { kind: 'unknown' }, team('a')),
      football('saved', 2, 'a', team('a'), team('a'), 'shot', 'saved'),
      football('rebound-shot', 3, 'a', team('a'), team('a'), 'shot', 'saved'),
      controlMark('b-control', 4, team('a'), team('b')),
    ];
    const projection = projectFootballObservedSequences('m', events);
    expect(projection.units).toHaveLength(2);
    expect(projection.units[0]).toMatchObject({ teamId: 'a', coverage: 'complete', outcome: 'turnover', eligibleForOutcome: true });
    expect(projection.units[0].steps.map(step => step.sourceId)).toEqual(['a-control', 'saved', 'rebound-shot']);
    expect(projection.units[1]).toMatchObject({ teamId: 'b', coverage: 'censored', censorReasons: ['missing_end'] });
  });

  it('splits football gaps, restart and period boundaries without joining fragments', () => {
    const events = [
      controlMark('a1', 1, { kind: 'unknown' }, team('a')),
      controlMark('gap', 2, team('a'), { kind: 'unknown' }, 1, 'suspended'),
      controlMark('a2', 3, { kind: 'unknown' }, team('a')),
      football('restart', 4, 'a', { kind: 'dead_ball' }, team('a'), 'ball_recovery', 'observed', 1, { restart: true }),
      controlMark('b-period2', 5, { kind: 'unknown' }, team('b'), 2),
    ];
    const projection = projectFootballObservedSequences('m', events);
    expect(projection.units.map(unit => unit.steps.map(step => step.sourceId))).toEqual([['a1', 'gap'], ['a2'], ['restart'], ['b-period2']]);
    expect(projection.units.map(unit => unit.censorReasons)).toEqual([['suspended'], [], ['period_boundary'], ['missing_end']]);
    expect(new Set(projection.units.map(unit => unit.unitId)).size).toBe(4);
  });

  it('keeps legacy football backup actions as censored provider possessions', () => {
    const legacy = Array.from({ length: 9 }, (_, index) => createCanonicalFootballEvent({
      id: `legacy-${index}`, matchId: 'm', index: index + 1, period: 1, elapsedMs: index * 1000,
      action: 'pass', outcome: 'complete', team: { id: 1, name: 'A' }, possession: 1,
      possessionTeam: { id: 1, name: 'A' }, location: [20, 40], endLocation: [30, 40],
    }));
    const next = createCanonicalFootballEvent({ id: 'legacy-b', matchId: 'm', index: 10, period: 1, elapsedMs: 10_000, action: 'ball_recovery', outcome: 'observed', team: { id: 2, name: 'B' }, possession: 2, possessionTeam: { id: 2, name: 'B' }, location: [50, 40] });
    const withoutExtension = [...legacy, next].map(event => ({ ...event, scout_trainer: undefined })) as unknown as CanonicalFootballEvent[];
    const projection = projectFootballObservedSequences('m', JSON.parse(JSON.stringify(withoutExtension)) as CanonicalFootballEvent[], [], new Map([['A', 'a'], ['B', 'b']]));
    expect(projection.units.map(unit => [unit.teamId, unit.steps.length, unit.coverage])).toEqual([['a', 9, 'censored'], ['b', 1, 'censored']]);
    expect(projection.units[0].steps.map(step => step.sourceId)).toEqual(legacy.map(event => event.id));
    expect(projection.units[0].censorReasons).toContain('missing_start');
  });

  it('projects futsal goal, save, substitution and clock T without inventing passes', () => {
    const events: MatchEvent[] = [
      fact('a-control', 1, { kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' }),
      clock('start', 2, 'start', 1000),
      fact('saved', 3, { kind: 'shot', shootingTeamId: 'a', outcome: 'saved', position: { x: .4, y: .5 }, destination: { x: .9, y: .5 } }),
      fact('sub', 4, { kind: 'substitution', teamId: 'a', certainty: 'partial' }),
      clock('pause', 5, 'pause', 3000),
      fact('goal', 6, { kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a' }),
      fact('b-control', 7, { kind: 'control', state: 'team', controlledTeamId: 'b', coverage: 'continuous' }),
    ];
    const projection = projectFutsalObservedSequences('m', events);
    expect(projection.units[0]).toMatchObject({ teamId: 'a', coverage: 'complete', outcome: 'goal', eligibleForOutcome: true });
    expect(projection.units[0].steps.map(step => step.kind)).toEqual(['control', 'clock:start', 'shot', 'substitution', 'clock:pause', 'shot']);
    expect(projection.units[0].steps[2]).toMatchObject({ position: { x: .4, y: .5 }, destination: { x: .9, y: .5 } });
    expect(projection.units[1]).toMatchObject({ teamId: 'b', coverage: 'censored', censorReasons: ['missing_end'] });
    expect(projection.units[0].steps.filter(step => step.kind === 'shot')).toHaveLength(2);
  });

  it('handles futsal A→B, suspension, restart and the next period as separate units', () => {
    const events: MatchEvent[] = [
      fact('a', 1, { kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' }),
      fact('b', 2, { kind: 'control', state: 'team', controlledTeamId: 'b', coverage: 'continuous' }),
      fact('gap', 3, { kind: 'control', state: 'unknown', coverage: 'suspended' }),
      fact('restart', 4, { kind: 'restart', teamId: 'a', restart: 'kick_in' }),
      clock('advance', 5, 'advance_period', 0, 2),
      fact('a-next', 6, { kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous', period: 2 }),
    ];
    const projection = projectFutsalObservedSequences('m', events);
    expect(projection.units.map(unit => unit.teamId)).toEqual(['a', 'b', 'a']);
    expect(projection.units[0]).toMatchObject({ outcome: 'turnover', coverage: 'complete' });
    expect(projection.units[1]).toMatchObject({ outcome: 'suspended', censorReasons: ['suspended'] });
    expect(projection.units[2]).toMatchObject({ context: { number: 2 }, censorReasons: ['missing_end'] });
    expect(projection.unassigned.map(step => step.kind)).toContain('restart');
  });

  it('censors futsal missing start, period boundary and conflicting time without an adjustment', () => {
    const orphan = projectFutsalObservedSequences('m', [fact('orphan', 1, { kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a' })]).units[0];
    expect(orphan).toMatchObject({ outcome: 'goal', coverage: 'censored', censorReasons: ['missing_start'], eligibleForOutcome: false });
    const period = projectFutsalObservedSequences('m', [
      fact('a', 1, { kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' }),
      clock('advance', 2, 'advance_period', 0, 2),
      fact('b', 3, { kind: 'control', state: 'team', controlledTeamId: 'b', coverage: 'continuous', period: 2 }),
    ]);
    expect(period.units[0]).toMatchObject({ teamId: 'a', coverage: 'censored', censorReasons: ['period_boundary'] });
    expect(period.units[1].context).toEqual({ kind: 'period', number: 2 });
    const conflict = projectFutsalObservedSequences('m', [
      fact('control', 1, { kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous', elapsedMs: 5000 }),
      fact('shot', 2, { kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a', elapsedMs: 1000 }),
    ]).units[0];
    expect(conflict).toMatchObject({ coverage: 'conflict', censorReasons: ['invalid_order'], eligibleForOutcome: false });
    const adjusted = projectFutsalObservedSequences('m', [
      fact('control', 1, { kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous', elapsedMs: 5000 }),
      clock('adjust', 2, 'adjust', 1000),
      fact('shot', 3, { kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a', elapsedMs: 1500 }),
    ]).units[0];
    expect(adjusted).toMatchObject({ coverage: 'complete', outcome: 'goal' });
  });

  it('keeps both perspectives distinct when a tackle is the first observed fact', () => {
    const projection = projectFutsalObservedSequences('m', [
      fact('first-tackle', 1, { kind: 'tackle', losingTeamId: 'a', winningTeamId: 'b' }),
    ]);
    expect(projection.units.map(unit => unit.teamId)).toEqual(['a', 'b']);
    expect(new Set(projection.units.map(unit => unit.unitId)).size).toBe(2);
    expect(projection.units[0]).toMatchObject({ outcome: 'turnover', censorReasons: ['missing_start'], eligibleForOutcome: false });
    expect(projection.units[1]).toMatchObject({ censorReasons: ['missing_end'] });
  });

  it('rebuilds futsal boundary and evidence IDs after correction and undo', () => {
    const a = fact('a', 1, { kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' });
    const b = fact('b', 2, { kind: 'control', state: 'team', controlledTeamId: 'b', coverage: 'continuous' });
    const baseline = projectFutsalObservedSequences('m', [a, b]);
    const correction: MatchEvent = { type: 'futsal_fact_corrected', id: 'correction', matchId: 'm', sequence: 3, timestamp: 3, targetFactId: 'b', replacementFact: { ...base, id: 'b', elapsedMs: 2000, kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' } };
    const changed = projectFutsalObservedSequences('m', [a, b, correction]);
    expect(baseline.units).toHaveLength(2);
    expect(changed.units).toHaveLength(1);
    expect(changed.units[0].steps.map(step => step.sourceId)).toEqual(['a', 'b']);
    expect(changed.units[0].steps[1].effectiveHistoryId).toBe('correction');
    const undo: MatchEvent = { type: 'futsal_fact_undone', id: 'undo', matchId: 'm', sequence: 4, timestamp: 4, targetHistoryEventId: 'correction' };
    expect(projectFutsalObservedSequences('m', [a, b, correction, undo]).units.map(unit => unit.unitId)).toEqual(baseline.units.map(unit => unit.unitId));
  });

  it('reprojects football corrections and undo from the same backup history without persisting unit IDs', () => {
    const a = controlMark('a', 1, { kind: 'unknown' }, team('a'));
    const b = controlMark('b', 2, team('a'), team('b'));
    const history: MatchEvent[] = [
      { type: 'football_event_registered', id: 'e-a', matchId: 'm', sequence: 1, timestamp: 1, event: a },
      { type: 'football_event_registered', id: 'e-b', matchId: 'm', sequence: 2, timestamp: 2, event: b },
    ];
    const projected = (events: readonly MatchEvent[]) => {
      const canonical = projectFootball(events, 'a', 'b', 'A', 'B', 0).events;
      return projectFootballObservedSequences('m', canonical, events);
    };
    const baseline = projected(history);
    const correction: MatchEvent = { type: 'football_event_corrected', id: 'correction', matchId: 'm', sequence: 3, timestamp: 3, targetEventId: 'b', replacementEvent: { ...b, scout_trainer: { ...b.scout_trainer, observation: { before: team('a'), after: team('a'), coverage: 'continuous' } } } };
    expect(projected([...history, correction]).units).toHaveLength(1);
    const undo: MatchEvent = { type: 'football_event_undone', id: 'undo', matchId: 'm', sequence: 4, timestamp: 4, targetHistoryEventId: 'correction' };
    expect(projected([...history, correction, undo]).units.map(unit => unit.unitId)).toEqual(baseline.units.map(unit => unit.unitId));
    expect(projected(JSON.parse(JSON.stringify(history)) as MatchEvent[]).units.map(unit => unit.steps.map(step => step.sourceId))).toEqual(baseline.units.map(unit => unit.steps.map(step => step.sourceId)));
  });
});
