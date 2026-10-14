import { describe, expect, it } from 'vitest';
import { basketballPossessions, projectBasketball, validateBasketballFact, type BasketballFact } from './BasketballScout';
import type { MatchEvent } from '../match/events/MatchEvent';
const base = { matchId: 'm', timestamp: 1 };
const made: BasketballFact = { id: 'f1', period: 1, timestamp: 1, kind: 'shot', teamId: 'a', value: 3, outcome: 'made', tactic: 'pick_roll', position: { x: .8, y: .5 } };
function registration(fact: BasketballFact): MatchEvent { return { ...base, id: `e-${fact.id}`, sequence: 1, type: 'basketball_fact_registered', fact }; }
describe('basquete', () => {
  it('soma apenas cestas convertidas e desfaz correção sem perder a posição original', () => {
    const corrected = { ...made, outcome: 'missed' as const };
    const events: MatchEvent[] = [registration(made), { ...base, id: 'e2', sequence: 2, type: 'basketball_fact_corrected', targetFactId: made.id, replacementFact: corrected }];
    expect(projectBasketball(events).score.a).toBeUndefined();
    const undone: MatchEvent = { ...base, id: 'e3', sequence: 3, type: 'basketball_fact_undone', targetHistoryEventId: 'e2' };
    const restored = projectBasketball([...events, undone]);
    expect(restored.score.a).toBe(3);
    expect(restored.facts[0]).toEqual(made);
  });
  it('registra perda de posse sem pontuar e rejeita atleta de outra equipe', () => {
    const turnover: BasketballFact = { id: 't', period: 2, timestamp: 2, kind: 'turnover', teamId: 'a', cause: 'bad_pass', tactic: 'low_post' };
    expect(projectBasketball([registration(turnover)]).score.a).toBeUndefined();
    expect(validateBasketballFact({ ...turnover, playerId: 'p' }, new Set(['a', 'b']), new Map([['p', 'b']]))).toBe('Atleta não pertence à equipe.');
  });
  it('mede posses pelos relógios, conserva rebote ofensivo e recalcula após correção', () => {
    const facts: BasketballFact[] = [
      { id: 'start', period: 1, timestamp: 1, kind: 'possession', teamId: 'a', gameSeconds: 600, shotSeconds: 24, pressure: 'full_court' },
      { id: 'miss', period: 1, timestamp: 2, kind: 'shot', teamId: 'a', value: 2, outcome: 'missed', gameSeconds: 595, shotSeconds: 19 },
      { id: 'oreb', period: 1, timestamp: 3, kind: 'rebound', teamId: 'a', side: 'offensive', gameSeconds: 593, shotSeconds: 14 },
      { id: 'basket', period: 1, timestamp: 4, kind: 'shot', teamId: 'a', value: 2, outcome: 'made', gameSeconds: 588, shotSeconds: 9, assistPlayerId: 'p' },
    ];
    const poss = basketballPossessions(facts, ['a', 'b']);
    expect(poss[0]).toMatchObject({ teamId: 'a', duration: 12, points: 2, pressure: 'full_court', complete: true });
    expect(poss[1]).toMatchObject({ teamId: 'b', complete: false });
    expect(basketballPossessions([{ ...facts[0] }, ...facts.slice(1, 3), { ...facts[3], outcome: 'missed' } as BasketballFact], ['a', 'b'])).toHaveLength(1);
    expect(basketballPossessions([facts[3]], ['a', 'b'])[0].duration).toBeUndefined();
    expect(validateBasketballFact(facts[3], new Set(['a', 'b']), new Map([['p', 'a']]))).toBeUndefined();
  });
});
