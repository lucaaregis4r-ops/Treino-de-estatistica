import { describe, expect, it } from 'vitest';
import type { CanonicalFootballEvent } from './StatsBombContract';
import { analyzeMarkov } from './FootballMarkovAnalyzer';
import { createCanonicalFootballEvent } from './FootballRecorder';
import { withFootballOrientation } from './FootballOrientation';
import type { MatchMetadata } from '../match/entities/MatchMetadata';

function mark(index: number, x: number, extra: Partial<CanonicalFootballEvent['scout_trainer']['observation']> = {}): CanonicalFootballEvent {
  return { id: `m${index}`, index, period: 1, timestamp: `00:00:0${index}.000`, minute: 0, second: index, type: { id: 1000, name: 'Observação de controle' }, location: [x, 40], scout_trainer: { schema_version: '1.1.0', modality: 'football', match_id: 'match', capture_sequence: index, position_observed: true, observation: { before: { kind: 'controlled', teamId: 'a' }, after: { kind: 'controlled', teamId: 'a' }, coverage: 'continuous', attacksTo: 'x120', position: [x, 40], ...extra } } };
}
describe('quick recording analytics', () => {
  it('counts observed ball positions as zone states with row probabilities', () => {
    const result = analyzeMarkov([mark(1, 10), mark(2, 50), mark(3, 55), mark(4, 110)]);
    expect(result.transitions.map(t => [t.from, t.to])).toEqual([['Construção', 'Progressão'], ['Progressão', 'Progressão'], ['Progressão', 'Área']]);
    expect(result.matrix.find(c => c.from === 'Progressão' && c.to === 'Área')?.probability).toBe(.5);
  });
  it('does not bridge filters, suspended coverage, unknown control or a period change', () => {
    expect(analyzeMarkov([mark(1, 10), mark(2, 50), mark(3, 110)], new Set(['m1', 'm3'])).transitions).toHaveLength(0);
    expect(analyzeMarkov([mark(1, 10), mark(2, 50, { coverage: 'suspended' }), mark(3, 110)]).transitions).toHaveLength(0);
    expect(analyzeMarkov([mark(1, 10), mark(2, 50, { after: { kind: 'unknown' } }), mark(3, 110)]).transitions).toHaveLength(0);
    expect(analyzeMarkov([mark(1, 10), { ...mark(2, 50), period: 2 }]).transitions).toHaveLength(0);
  });
  it('ignores non-spatial pressure updates between two observed points', () => {
    const pressure = { ...mark(2, 50), location: undefined };
    const observation = { ...pressure.scout_trainer.observation }; delete observation.position;
    const result = analyzeMarkov([mark(1, 10), { ...pressure, scout_trainer: { ...pressure.scout_trainer, observation } }, mark(3, 50)]);
    expect(result.transitions).toHaveLength(1);
  });
  it('offers action transitions without inventing passes from control marks', () => {
    const pass = createCanonicalFootballEvent({ id: 'p', index: 1, period: 1, elapsedMs: 1000, matchId: 'match', action: 'pass', outcome: 'complete', location: [20, 40], endLocation: [50, 40], team: { id: 1, name: 'A' }, observation: mark(1, 20).scout_trainer.observation });
    const shot = createCanonicalFootballEvent({ id: 's', index: 3, period: 1, elapsedMs: 3000, matchId: 'match', action: 'shot', outcome: 'saved', location: [100, 40], team: { id: 1, name: 'A' }, observation: mark(3, 100).scout_trainer.observation });
    const result = analyzeMarkov([pass, mark(2, 70), shot], undefined, 'actions');
    expect(result.transitions.map(t => [t.from, t.to])).toEqual([['Passe', 'Finalização']]);
    expect(analyzeMarkov([mark(1, 10), mark(2, 50)], undefined, 'actions').transitions).toHaveLength(0);
  });
  it('uses the team control to orient legacy marks without teamId', () => {
    const metadata = { teamAId: 'a', teamBId: 'b', footballOrientation: [{ period: 1, teamAAttacksTo: 'x0', teamBAttacksTo: 'x120' }] } as unknown as MatchMetadata;
    const oriented = withFootballOrientation([mark(1, 110), mark(2, 70)], metadata);
    expect(analyzeMarkov(oriented).transitions[0]).toMatchObject({ from: 'Construção', to: 'Progressão' });
  });
});
