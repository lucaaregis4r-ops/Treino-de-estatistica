import { describe, expect, it } from 'vitest';
import { createCanonicalFootballEvent } from './FootballRecorder';
import { mergeFootballCorrection, projectControl, readFootballOutcome, type FootballObservation } from './FootballObservation';
import { pressureAnalytics } from './FootballPressureAnalytics';
import { pressureEpisodes } from './FootballPressureEpisode';
import { analyzeMarkov } from './FootballMarkovAnalyzer';
import { estimateXg, estimateXt, attributeChances } from './FootballModels';
import { compareMarkov } from './FootballReferenceMarkov';
import { dangerousPossessions, selectFootballEvents } from './FootballAnalytics';
import type { CanonicalFootballEvent } from './StatsBombContract';

function event(index: number, elapsedMs = index * 1000, observation: FootballObservation = {}): CanonicalFootballEvent {
  return createCanonicalFootballEvent({ id: String(index), matchId: 'm', index, period: 1, elapsedMs, action: 'pass', outcome: 'complete', location: [20, 40], endLocation: [50, 40], team: { id: 1, name: 'A' }, observation: { teamId: 'A', before: { kind: 'controlled', teamId: 'A' }, after: { kind: 'controlled', teamId: 'A' }, attacksTo: 'x120', ...observation } });
}
function shot(index: number, observation: FootballObservation = {}): CanonicalFootballEvent {
  return createCanonicalFootballEvent({ id: String(index), matchId: 'm', index, period: 1, elapsedMs: index * 1000, action: 'shot', outcome: 'goal', location: [100, 40], team: { id: 1, name: 'A' }, observation: { teamId: 'A', before: { kind: 'controlled', teamId: 'A' }, after: { kind: 'dead_ball' }, attacksTo: 'x120', ...observation } });
}
describe('redesign contracts and denominators', () => {
  it('reads recorder goals and string provider outcomes without extension', () => {
    expect(dangerousPossessions([shot(1)], 'had_goal')).toHaveLength(1);
    const imported = { ...shot(1), scout_trainer: undefined, shot: { outcome: 'Goal' } } as unknown as CanonicalFootballEvent;
    expect(selectFootballEvents([imported], { outcome: 'Goal' })).toHaveLength(1);
  });
  it('preserves extension metadata and millisecond timestamp when replacing action', () => {
    const previous = { ...event(1, 1234), related_events: ['imported'], scout_trainer: { ...event(1).scout_trainer, shot_context: { provenance: 'operator_observed' as const, note: 'preservar' } } };
    const changed = createCanonicalFootballEvent({ id: '1', matchId: 'm', index: 1, period: 1, elapsedMs: 1234, action: 'dribble', outcome: 'lost', team: { id: 1, name: 'A' }, location: [20, 40] });
    const merged = mergeFootballCorrection(previous, changed);
    expect(merged.pass).toBeUndefined(); expect(readFootballOutcome(merged)).toBe('lost');
    expect(merged.related_events).toEqual(['imported']); expect(merged.timestamp).toBe('00:00:01.234');
    expect(merged.scout_trainer.shot_context?.note).toBe('preservar');
  });
  it('counts A=30s B=10s separately from 20s contested; legacy has no time', () => {
    const events = [event(1, 0, { coverage: 'continuous' }), event(2, 30000, { coverage: 'continuous', after: { kind: 'contested' } }), event(3, 50000, { coverage: 'continuous', before: { kind: 'contested' }, after: { kind: 'controlled', teamId: 'B' } }), event(4, 60000, { coverage: 'continuous', before: { kind: 'controlled', teamId: 'B' }, after: { kind: 'dead_ball' } })];
    const result = projectControl(events);
    expect(result.controlledMs).toEqual({ A: 30000, B: 10000 }); expect(result.excludedMs).toBe(20000);
    expect(result.controlledMs.A / Object.values(result.controlledMs).reduce((a,b) => a+b,0)).toBe(.75);
    expect(projectControl([event(1), event(2)]).controlledMs).toEqual({});
  });
  it('creates a new same-team segment on restart and separates periods', () => {
    const result = projectControl([event(1), event(2, 2000, { after: { kind: 'dead_ball' } }), event(3, 3000, { restart: true }), { ...event(4), period: 2 }]);
    expect(result.segments).toHaveLength(3); expect(result.segments[0].complete).toBe(true);
  });
  it('projects marks without turning them into actions across A-contested-A and A-contested-B', () => {
    const control = (teamId: string, playerId?: string) => ({ kind: 'controlled' as const, teamId, ...(playerId ? { playerId } : {}) });
    const mark = (index: number, elapsedMs: number, before: FootballObservation['before'], after: FootballObservation['after'], position?: readonly [number, number]) => ({
      ...event(index, elapsedMs, { before, after, coverage: 'continuous', precision: position ? 'point' : undefined, ...(position ? { position } : {}), context: { validity: 'observed', outcome: 'continuing' } }),
      type: { id: 1000, name: 'Observação de controle' },
    });
    const stayed = projectControl([mark(1, 0, { kind: 'unknown' }, control('A', 'a9'), [20, 40]), mark(2, 1_000, control('A'), { kind: 'contested' }), mark(3, 2_000, { kind: 'contested' }, control('A'), [30, 40])]);
    expect(stayed.segments).toHaveLength(1);
    expect(stayed.segments[0]).toMatchObject({ teamId: 'A', events: [], marks: [{ carrierId: 'a9' }, {}, { position: [30, 40] }], completeness: { spatial: 'observed', contextual: 'observed' } });
    const changed = projectControl([mark(1, 0, { kind: 'unknown' }, control('A')), mark(2, 1_000, control('A'), { kind: 'contested' }), mark(3, 2_000, { kind: 'contested' }, control('B'))]);
    expect(changed.segments.map(segment => [segment.teamId, segment.complete, segment.events.length, segment.marks.length, segment.completeness.temporal])).toEqual([['A', true, 0, 2, 'partial'], ['B', false, 0, 1, 'partial']]);
  });
  it('keeps a rebound and loss in the observed possession without fabricating a recovery', () => {
    const rebound = createCanonicalFootballEvent({ id: 'shot-1', matchId: 'm', index: 1, period: 1, elapsedMs: 0, action: 'shot', outcome: 'saved', location: [100, 40], team: { id: 1, name: 'A' }, observation: { before: { kind: 'controlled', teamId: 'A' }, after: { kind: 'contested' }, context: { validity: 'observed', outcome: 'shot' } } });
    const secondShot = createCanonicalFootballEvent({ id: 'shot-2', matchId: 'm', index: 2, period: 1, elapsedMs: 1000, action: 'shot', outcome: 'off_target', location: [100, 40], team: { id: 1, name: 'A' }, observation: { before: { kind: 'contested' }, after: { kind: 'controlled', teamId: 'A' }, context: { validity: 'partial', outcome: 'shot' } } });
    const loss = createCanonicalFootballEvent({ id: 'loss-1', matchId: 'm', index: 3, period: 1, elapsedMs: 2000, action: 'loss', outcome: 'observed', team: { id: 1, name: 'A' }, observation: { before: { kind: 'controlled', teamId: 'A' }, after: { kind: 'controlled', teamId: 'B' }, context: { validity: 'observed', outcome: 'lost' } } });
    const result = projectControl([rebound, secondShot, loss]);
    expect(result.segments[0].events.map(event => event.id)).toEqual(['shot-1', 'shot-2', 'loss-1']);
    expect(result.segments).toHaveLength(2);
    expect(result.segments[1].events).toEqual([]);
  });
  it('uses 6/10 pressure incidence and 10/15 coverage with one shared episode', () => {
    const events = Array.from({ length: 15 }, (_, i) => event(i+1, i*1000, { pressure: { kind: i<6 ? 'collective' : i<10 ? 'none' : 'unknown', provenance: 'operator_observed', ...(i<3 ? { episodeId: 'one', pressedTeamId: 'A' } : {}) } }));
    const result = pressureAnalytics(events);
    expect(result.known).toHaveLength(10); expect(result.pressed).toHaveLength(6); expect(result.episodes.size).toBe(1);
    expect(result.zones.find(z => z.total)?.known).toBe(10); expect(result.zones.find(z => z.total)?.pressed).toBe(6);
    expect(pressureEpisodes(events).episodes[0].events).toHaveLength(3);
  });
  it('keeps unknown pressure outcome censored and explicit superation known', () => {
    const pressure = { kind: 'collective' as const, provenance: 'operator_observed' as const, episodeId: 'one', pressedTeamId: 'A' };
    expect(pressureEpisodes([event(1,0,{pressure})]).episodes[0].outcome).toBe('censored');
    expect(pressureEpisodes([event(1,0,{pressure}),event(2,1,{pressure, pressureBeaten:'yes'})]).episodes[0].outcome).toBe('beaten');
  });
  it('counts distinct complete tactical possessions 2/4 versus 1/4, not repeated visits', () => {
    let index = 0;
    const events = ['3+1','3+2'].flatMap((structure, group) => Array.from({length:4},(_, i) => {
      const tactical = { provenance: 'operator_observed' as const, build_structure: structure as '3+1'|'3+2' };
      const start = event(++index, index*1000, { restart: true, tactical });
      const middle = event(++index, index*1000, { tactical });
      return [start,middle,i < (group === 0 ? 2 : 1) ? shot(++index,{ tactical }) : event(++index,index*1000,{ tactical, after:{kind:'dead_ball'} })];
    }).flat());
    const paths = analyzeMarkov(events);
    expect(paths.cohorts.slice(0,2).map(c => [c.numerator,c.denominator])).toEqual([[2,4],[1,4]]);
    expect(analyzeMarkov([event(1),event(2),event(3)], new Set(['1','3'])).transitions).toHaveLength(0);
  });
  it('never produces NaN for empty/negative reference counts', () => {
    const ref = { state:'s',outcomes:{a:0},eligible:0,source:'test',coverage:'complete' };
    for (const alpha of [0,-1,NaN]) { const result = compareMarkov(ref,ref,alpha); expect(result.compatible).toBe(false); expect(Object.values(result.reference).every(Number.isFinite)).toBe(true); }
  });
  it('xG is deterministic and orientation-gated, preserving imported zero', () => {
    expect(estimateXg(shot(1))).toEqual(estimateXg(shot(1)));
    expect(estimateXg(shot(1,{attacksTo:undefined})).eligible).toBe(false);
    expect(estimateXg({...shot(1),shot:{statsbomb_xg:0}})).toMatchObject({value:0,source:'StatsBomb',eligible:true});
  });
  it('xT retains negative gains and excludes incomplete passes', () => {
    const grid = { id:'test',version:'test',width:3,height:1,values:[.02,.08,.03],counts:[1,1,1] };
    // Test grid is never used in production.
    const first = {...event(1),location:[10,40] as const,pass:{end_location:[60,40] as const}};
    expect(estimateXt(first,grid).value).toBeCloseTo(.06);
    expect(estimateXt({...first,location:[60,40],pass:{end_location:[100,40]}},grid).value).toBeCloseTo(-.05);
    expect(estimateXt({...first,pass:{outcome:{id:9,name:'Incomplete'},end_location:[60,40]}},grid).eligible).toBe(false);
  });
  it('does not attribute a rebound twice', () => {
    const saved = {...shot(2), shot:{outcome:{id:100,name:'Saved'}},scout_trainer:{...shot(2).scout_trainer,observation:{...event(2).scout_trainer.observation}}};
    const result = attributeChances([event(1),saved,shot(3)]);
    expect(result[0].creatorId).toBe('1');expect(result[1].creatorId).toBeUndefined();
  });
});
