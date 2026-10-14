import { describe, expect, it } from 'vitest';
import { projectFutsalScout, validateFutsalFact, validateFutsalFactReferences, type FutsalFact, type FutsalFactHistoryEvent, type FutsalFactRegisteredEvent } from './FutsalScout';

const base = { period: 1 as const, elapsedMs: 1000, observation: 'observed' as const };
function registered(id: string, sequence: number, fact: FutsalFact): FutsalFactRegisteredEvent {
  return { type: 'futsal_fact_registered', id, matchId: 'm1', sequence, timestamp: sequence, fact };
}

describe('projectFutsalScout', () => {
  it('transfers control on a single-point tackle and restores it on undo', () => {
    const control: FutsalFact = { ...base, id: 'control', kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' };
    const tackle: FutsalFact = { ...base, id: 'tackle', elapsedMs: 2000, kind: 'tackle', winningTeamId: 'b', losingTeamId: 'a', position: { x: .4, y: .5 } };
    const events = [registered('control-e', 1, control), registered('tackle-e', 2, tackle)];
    expect(projectFutsalScout(events).control).toMatchObject({ kind: 'control', controlledTeamId: 'b' });
    expect(projectFutsalScout([...events, { type: 'futsal_fact_undone', id: 'undo', matchId: 'm1', sequence: 3, timestamp: 3, targetHistoryEventId: 'tackle-e' }]).control).toMatchObject({ kind: 'control', controlledTeamId: 'a' });
    expect(validateFutsalFact(tackle, new Set(['a', 'b']), new Map())).toBeUndefined();
    expect(validateFutsalFact({ ...tackle, winningTeamId: 'a' }, new Set(['a', 'b']), new Map())).toContain('equipes distintas');
  });

  it('accepts observed shot origin and destination and rejects destination alone', () => {
    const shot: FutsalFact = { ...base, id: 'shot', kind: 'shot', shootingTeamId: 'a', outcome: 'saved', position: { x: .2, y: .5 }, destination: { x: .9, y: .5 } };
    expect(validateFutsalFact(shot, new Set(['a', 'b']), new Map())).toBeUndefined();
    expect(validateFutsalFact({ ...shot, position: undefined }, new Set(['a', 'b']), new Map())).toContain('exige origem');
  });
  it('counts a confirmed goal once and restores it when its correction is undone', () => {
    const goal = { ...base, id: 'goal1', kind: 'shot' as const, shootingTeamId: 'a', outcome: 'goal' as const, beneficiaryTeamId: 'b' };
    const events: FutsalFactHistoryEvent[] = [
      registered('registration1', 1, goal),
      { type: 'futsal_fact_corrected', id: 'correction1', matchId: 'm1', sequence: 2, timestamp: 2, targetFactId: 'goal1', replacementFact: { ...goal, outcome: 'saved', beneficiaryTeamId: undefined } },
      { type: 'futsal_fact_undone', id: 'undo1', matchId: 'm1', sequence: 3, timestamp: 3, targetHistoryEventId: 'correction1' },
    ];
    expect(projectFutsalScout(events).score).toEqual({ b: 1 });
    expect(projectFutsalScout([...events, { type: 'futsal_fact_undone', id: 'undo2', matchId: 'm1', sequence: 4, timestamp: 4, targetHistoryEventId: 'registration1' }]).score).toEqual({});
  });

  it('rebuilds accumulated fouls by period after correction and undo', () => {
    const facts = Array.from({ length: 6 }, (_, index) => registered(`foul${index}`, index + 1, {
      ...base, id: `fact${index}`, kind: 'foul' as const, offendingTeamId: 'a', accumulated: true,
    }));
    expect(projectFutsalScout(facts).accumulatedFouls).toEqual({ '1:a': 6 });
    const corrected = [...facts, { type: 'futsal_fact_corrected' as const, id: 'correction', matchId: 'm1', sequence: 7, timestamp: 7, targetFactId: 'fact5', replacementFact: { ...facts[5].fact, accumulated: false } }];
    expect(projectFutsalScout(corrected).accumulatedFouls).toEqual({ '1:a': 5 });
    expect(projectFutsalScout([...corrected, { type: 'futsal_fact_undone', id: 'undo', matchId: 'm1', sequence: 8, timestamp: 8, targetHistoryEventId: 'foul4' }]).accumulatedFouls).toEqual({ '1:a': 4 });
  });

  it('keeps control through multiple shots, including a rebound', () => {
    const facts: FutsalFactHistoryEvent[] = [
      registered('control', 1, { ...base, id: 'control-fact', kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' }),
      registered('shot1', 2, { ...base, id: 'shot-fact1', kind: 'shot', shootingTeamId: 'a', outcome: 'saved' }),
      registered('shot2', 3, { ...base, id: 'shot-fact2', kind: 'shot', shootingTeamId: 'a', outcome: 'pending' }),
    ];
    const projection = projectFutsalScout(facts);
    expect(projection.facts.filter(({ fact }) => fact.kind === 'shot')).toHaveLength(2);
    expect(projection.control).toMatchObject({ kind: 'control', state: 'team', controlledTeamId: 'a' });
  });

  it('closes control after a confirmed goal until another team is observed', () => {
    const control: FutsalFact = { ...base, id: 'control', kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' };
    const goal: FutsalFact = { ...base, id: 'goal', elapsedMs: 2000, kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a' };
    const events = [registered('control-e', 1, control), registered('goal-e', 2, goal)];
    expect(projectFutsalScout(events).control).toMatchObject({ kind: 'control', state: 'dead_ball' });
    const saved = { ...goal, outcome: 'saved' as const, beneficiaryTeamId: undefined };
    expect(projectFutsalScout([...events, { type: 'futsal_fact_corrected', id: 'correction', matchId: 'm1', sequence: 3, timestamp: 3, targetFactId: 'goal', replacementFact: saved }]).control).toMatchObject({ kind: 'control', state: 'team', controlledTeamId: 'a' });
  });

  it('projects known and partial rolling substitutions and observed flying goalkeeper independently', () => {
    const starters: FutsalFact = { ...base, id: 'lineup', kind: 'composition', teamId: 'a', playerIds: ['a1', 'a2', 'a3', 'a4', 'a5'], certainty: 'complete' };
    const outgoing: FutsalFact = { ...base, id: 'sub1', kind: 'substitution', teamId: 'a', playerOutId: 'a2', playerInId: 'a6', certainty: 'complete' };
    const partial: FutsalFact = { ...base, id: 'sub2', kind: 'substitution', teamId: 'a', playerInId: 'a7', certainty: 'partial', observation: 'partial' };
    const flying: FutsalFact = { ...base, id: 'gk', kind: 'tactical_context', teamId: 'a', numericalSituation: 'own_flying_goalkeeper', active: true };
    const events = [registered('lineup-e', 1, starters), registered('sub1-e', 2, outgoing), registered('sub2-e', 3, partial), registered('gk-e', 4, flying)];
    const projection = projectFutsalScout(events);
    expect(projection.compositions.a).toEqual({ playerIds: ['a7'], certainty: 'partial', shortHanded: false });
    expect(projection.flyingGoalkeeperTeams).toEqual(['a']);
    const undone = projectFutsalScout([...events, { type: 'futsal_fact_undone', id: 'undo', matchId: 'm1', sequence: 5, timestamp: 5, targetHistoryEventId: 'sub2-e' }]);
    expect(undone.compositions.a).toEqual({ playerIds: ['a1', 'a3', 'a4', 'a5', 'a6'], certainty: 'complete', shortHanded: false });
  });

  it('keeps a corrected composition at its original match sequence when replaying substitutions', () => {
    const initial: FutsalFact = { ...base, id: 'lineup', kind: 'composition', teamId: 'a', playerIds: ['a1', 'a2', 'a3', 'a4', 'a5'], certainty: 'complete' };
    const substitution: FutsalFact = { ...base, id: 'sub', kind: 'substitution', teamId: 'a', playerOutId: 'a2', playerInId: 'a6', certainty: 'complete' };
    const events: FutsalFactHistoryEvent[] = [registered('lineup-event', 1, initial), registered('sub-event', 2, substitution), { type: 'futsal_fact_corrected', id: 'correction', matchId: 'm1', sequence: 3, timestamp: 3, targetFactId: 'lineup', replacementFact: { ...initial, playerIds: ['a1', 'a2', 'a3', 'a4', 'a7'] } }];
    expect(projectFutsalScout(events).compositions.a.playerIds).toEqual(['a1', 'a3', 'a4', 'a7', 'a6']);
  });

  it('keeps tactical review optional, linkable to an event or ordered interval, and removable by undo', () => {
    const control: FutsalFact = { ...base, id: 'control', kind: 'control', state: 'team', controlledTeamId: 'a', coverage: 'continuous' };
    const shot: FutsalFact = { ...base, id: 'shot', elapsedMs: 2000, kind: 'shot', shootingTeamId: 'a', outcome: 'saved' };
    const annotation: FutsalFact = { ...base, id: 'tag', elapsedMs: 3000, kind: 'tactical_annotation', scope: 'interval', startFactId: 'control', endFactId: 'shot', organization: 'transition', defensiveContext: 'block_low' };
    const facts = [registered('control-event', 1, control), registered('shot-event', 2, shot)];
    const projected = projectFutsalScout([...facts, registered('tag-event', 3, annotation)]);
    expect(validateFutsalFactReferences(annotation, projected.facts)).toBeUndefined();
    expect(projected.facts.find(item => item.fact.id === 'tag')?.fact).toMatchObject({ scope: 'interval', organization: 'transition' });
    const undone = projectFutsalScout([...facts, registered('tag-event', 3, annotation), { type: 'futsal_fact_undone', id: 'remove-tag', matchId: 'm1', sequence: 4, timestamp: 4, targetHistoryEventId: 'tag-event' }]);
    expect(undone.facts.some(item => item.fact.kind === 'tactical_annotation')).toBe(false);
    const removed = [...facts, registered('tag-event', 3, annotation), { type: 'futsal_fact_corrected' as const, id: 'remove-context', matchId: 'm1', sequence: 4, timestamp: 4, targetFactId: 'tag', replacementFact: { ...annotation, removed: true as const } }];
    expect(projectFutsalScout(removed).facts.some(item => item.fact.kind === 'tactical_annotation')).toBe(false);
    expect(projectFutsalScout([...removed, { type: 'futsal_fact_undone', id: 'undo-remove', matchId: 'm1', sequence: 5, timestamp: 5, targetHistoryEventId: 'remove-context' }]).facts.some(item => item.fact.kind === 'tactical_annotation')).toBe(true);
    const reversed: FutsalFact = { ...annotation, startFactId: 'shot', endFactId: 'control' };
    expect(validateFutsalFactReferences(reversed, facts.map(event => ({ fact: event.fact, sourceEventId: event.id, sequence: event.sequence })))).toContain('ordem correta');
  });
});
