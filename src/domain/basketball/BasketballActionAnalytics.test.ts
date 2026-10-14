import { describe, expect, it } from 'vitest';
import { analyzeBasketballMarkov, buildBasketballActionChains } from './BasketballActionAnalytics';
import type { BasketballFact } from './BasketballScout';

const fact = (id: string, period: number, teamId: string, detail: { kind: string; [key: string]: unknown }): BasketballFact => ({ id, period, teamId, timestamp: Number(id.replace(/\D/g, '')) || 1, ...detail } as BasketballFact);

describe('cadeias de ações do basquete', () => {
  it('liga somente ações consecutivas da mesma posse, incluindo etiqueta tática e desfecho', () => {
    const facts = [
      fact('a1', 1, 'a', { kind: 'possession' }),
      fact('a2', 1, 'a', { kind: 'pass' }),
      fact('a3', 1, 'a', { kind: 'shot', value: 2, outcome: 'made', tactic: 'pick_roll' }),
      fact('b1', 1, 'b', { kind: 'possession' }),
      fact('b2', 1, 'b', { kind: 'turnover', cause: 'bad_pass' }),
    ];
    const chains = buildBasketballActionChains(facts);
    expect(chains.map(chain => chain.states)).toEqual([
      ['possession_start', 'pass', 'tactic:pick_roll', 'basket_2'],
      ['possession_start', 'turnover'],
    ]);
    const model = analyzeBasketballMarkov(facts, 'a');
    expect(model.completeChains).toBe(1);
    expect(model.transitions.find(item => item.from === 'pass' && item.to === 'tactic:pick_roll')).toMatchObject({ count: 1, denominator: 1, probability: 1 });
  });

  it('fecha arremesso errado só com rebote defensivo observado; correção muda a cadeia', () => {
    const start = fact('a1', 1, 'a', { kind: 'possession' });
    const miss = fact('a2', 1, 'a', { kind: 'shot', value: 3, outcome: 'missed' });
    const incomplete = buildBasketballActionChains([start, miss]);
    expect(incomplete[0]).toMatchObject({ complete: false, states: ['possession_start', 'shot_missed'] });
    expect(analyzeBasketballMarkov([start, miss], 'a').transitions.some(item => item.to === 'opponent_rebound')).toBe(false);
    const rebound = fact('b1', 1, 'b', { kind: 'rebound', side: 'defensive' });
    expect(buildBasketballActionChains([start, miss, rebound])[0]).toMatchObject({ complete: true, states: ['possession_start', 'shot_missed', 'opponent_rebound'] });
    const corrected = fact('a2', 1, 'a', { kind: 'shot', value: 3, outcome: 'made' });
    expect(buildBasketballActionChains([start, corrected, rebound])[0].states).toEqual(['possession_start', 'basket_3']);
  });

  it('não liga períodos nem equipes com troca desconhecida', () => {
    const facts = [
      fact('a1', 1, 'a', { kind: 'pass' }),
      fact('b1', 1, 'b', { kind: 'pass' }),
      fact('b2', 2, 'b', { kind: 'pass' }),
    ];
    const chains = buildBasketballActionChains(facts);
    expect(chains).toHaveLength(3);
    expect(chains.every(chain => !chain.complete)).toBe(true);
    expect(analyzeBasketballMarkov(facts, 'a').transitions).toEqual([]);
  });
});
