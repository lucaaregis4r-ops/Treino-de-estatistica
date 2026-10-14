import { describe, expect, it } from 'vitest';
import { buildRallyPathModel, selectRallyPathFocus, type RallyPathContact, type RallyPathRally } from './RallyPathAnalyzer';
import { compareRallyPathRegions } from './SpatialPathComparison';
import { contactQuality, pressureFromResponse } from '../../scout/entities/ContactQuality';

function rally(id: string, winner = 'b', zone?: string, receiving: 'reception' | 'dig' = 'reception'): RallyPathRally {
  const contacts: RallyPathContact[] = [
    { teamId: 'a', skill: receiving === 'reception' ? 'serve' : 'attack', quality: 'neutral' },
    { teamId: 'b', skill: receiving, quality: 'negative' },
    { teamId: 'b', skill: 'set', quality: 'positive' },
  ].map((item, i) => ({ ...item, skill: item.skill as RallyPathContact['skill'],
    sourceEventId: `${id}-${i}`, sequence: i + 1, setNumber: 1,
    state: { key: JSON.stringify([item.teamId, item.skill, item.quality]), ...item, skill: item.skill as RallyPathContact['skill'] },
    spatial: { coordinateSystemVersion: 'six-v1', ...(i && zone ? { originRegionId: zone, targetRegionId: '3' } : {}) },
  }));
  return { rallyId: id, setNumber: 1, contacts, status: 'eligible', terminal: {
    winnerTeamId: winner, state: { key: `terminal:${winner}`, teamId: winner, skill: 'terminal', terminal: true },
  } };
}

describe('Exchange and spatial Markov model', () => {
  it.each(['reception', 'dig'] as const)('merges the %s pair and starts the next transition after the response', receiving => {
    const raw = rally('r1', 'b', '5', receiving);
    const snapshot = JSON.stringify(raw);
    const model = buildRallyPathModel([raw], 'a');
    const sender = model.eligibleRallies[0].contacts[0];
    expect(sender.quality).toBe('positive');
    expect(sender.qualitySource).toBe('response');
    expect(sender.responsePressure?.sourceEventId).toBe('r1-1');
    expect(model.transitions).toHaveLength(2);
    expect(model.transitions[0].from.exchange?.skill).toBe(receiving === 'reception' ? 'serve' : 'attack');
    expect(model.transitions[0].to.skill).toBe('set');
    const fromSender = selectRallyPathFocus(model, { teamId: 'a', skill: raw.contacts[0].skill, quality: 'positive' });
    const fromReceiver = selectRallyPathFocus(model, { teamId: 'b', skill: receiving });
    expect(fromSender.occurrences[0].path).toEqual(fromReceiver.occurrences[0].path);
    expect(fromSender.inputDistribution[0].to.skill).toBe('set');
    expect(JSON.stringify(raw)).toBe(snapshot);
  });

  it('keeps explicitly graded senders auditable without duplicating them in the exchange state', () => {
    const raw = rally('r1');
    const changed = { ...raw, contacts: raw.contacts.map((c, i) => i === 0 ? { ...c, quality: 'negative' } : c) };
    const model = buildRallyPathModel([changed], 'a');
    expect(model.eligibleRallies[0].contacts[0]).toMatchObject({ quality: 'negative', qualitySource: 'recorded', responsePressure: { quality: 'positive' } });
    expect(model.transitions[0].from.key).toBe(buildRallyPathModel([raw], 'a').transitions[0].from.key);
  });

  it('does not invent responses, join teammates, cross sets, or use incomplete rallies', () => {
    const base = rally('r1');
    for (const changed of [
      { ...base, contacts: [base.contacts[0], base.contacts[2]] },
      { ...base, contacts: base.contacts.map(c => ({ ...c, teamId: 'a' })) },
      { ...base, contacts: base.contacts.map((c, i) => ({ ...c, setNumber: i + 1 })) },
    ]) {
      expect(buildRallyPathModel([changed], 'a').states.some(s => s.exchange)).toBe(false);
    }
    expect(buildRallyPathModel([{ ...base, terminal: undefined, status: 'incomplete' }], 'a').transitions).toHaveLength(0);
  });

  it('includes zones at every step and separates their absorption values', () => {
    const model = buildRallyPathModel([rally('win', 'b', '5'), rally('loss', 'a', '1')], 'b');
    const sets = model.states.filter(state => state.skill === 'set');
    expect(sets).toHaveLength(2);
    expect(model.values[sets.find(s => s.originRegionId === '5')!.key]).toBeCloseTo(1);
    expect(model.values[sets.find(s => s.originRegionId === '1')!.key]).toBeCloseTo(0);
    const comparison = compareRallyPathRegions(model, { teamId: 'b', skill: 'reception', spatialRole: 'origin' });
    expect(comparison.find(r => r.regionId === '5')).toMatchObject({ occurrences: 1, rallies: 1, gradedCount: 1, positiveRate: 0, observedPointRate: 1, potential: 1, availableForHeadline: false });
    expect(comparison.find(r => r.regionId === '1')?.potential).toBe(0);
  });

  it('retains unlocated contacts without fabricating a zone', () => {
    const model = buildRallyPathModel([rally('missing')], 'b');
    expect(selectRallyPathFocus(model, { teamId: 'b', skill: 'reception' }).occurrenceCount).toBe(1);
    expect(compareRallyPathRegions(model, { teamId: 'b', skill: 'reception' })).toEqual([]);
  });

  it('counts repeated same-state exchanges as separate steps, but each rally once per region', () => {
    const base = rally('repeat', 'b', '5');
    const contacts = [base.contacts[0], base.contacts[1], base.contacts[0], base.contacts[1]].map((c,i) => ({ ...c, sourceEventId: `repeat-${i}`, sequence: i + 1 }));
    const model = buildRallyPathModel([{ ...base, contacts }], 'b');
    expect(model.transitions.some(t => t.from.key === t.to.key && t.count === 1)).toBe(true);
    expect(compareRallyPathRegions(model, { teamId: 'b', skill: 'reception' })[0]).toMatchObject({ occurrences: 2, rallies: 1, observedPointRate: 1 });
  });

  it('can reproduce the contact-only audit and documents the four-grade pressure mapping', () => {
    const model = buildRallyPathModel([rally('r1')], 'a', undefined, { unit: 'contact', spatial: 'none' });
    expect(model.transitions).toHaveLength(3);
    expect(model.states.some(s => s.exchange)).toBe(false);
    expect(['#', '+', '-', '='].map(pressureFromResponse)).toEqual(['negative', 'neutral', 'positive', 'excellent']);
    expect(contactQuality('neutral')).toBeUndefined();
  });
});
