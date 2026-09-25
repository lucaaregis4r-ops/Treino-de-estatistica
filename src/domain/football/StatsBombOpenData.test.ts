import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { importStatsBombEvents, exportStatsBombPure, exportScoutTrainerFull, exportCanonicalStatsBomb } from './StatsBombOpenData';
import { createCanonicalFootballEvent } from './FootballRecorder';
import { compareMarkov } from './FootballReferenceMarkov';

const fixture = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'test/fixtures/statsbomb-15946-sample.json'), 'utf8'));
describe('StatsBomb F5 adapters', () => {
  it('round trips raw official fields and unknown values', () => {
    const imported = importStatsBombEvents(fixture, '15946');
    expect(imported.find((event) => event.type.id === 10)?.raw.position).toEqual(fixture[4].position);
    expect(imported.find((event) => event.type.id === 16)?.raw.shot).toEqual(fixture[5].shot);
    expect((exportScoutTrainerFull(imported).events[5].raw.shot as Record<string, unknown>).statsbomb_xg).toBe(.07699243);
  });
  it('exports pure events with an explicit compatibility manifest', () => {
    const exported = exportStatsBombPure(importStatsBombEvents(fixture, '15946'));
    expect(exported.events).toHaveLength(6);
    expect(exported.manifest.omitted).toEqual([]);
  });
  it('keeps partial events exportable only as full backup', () => {
    const partial = importStatsBombEvents([{ id: 'partial', index: 1, period: 1, timestamp: '00:00:00.000', minute: 0, second: 0, type: { id: 30, name: 'Pass' } }], 'x');
    expect(exportStatsBombPure(partial).events).toHaveLength(1);
    expect(exportScoutTrainerFull(partial).events[0].raw.player).toBeUndefined();
  });
  it('combines only equivalent Markov states and exposes alpha', () => {
    const result = compareMarkov({ state: 'generic', outcomes: { shot: 8, end: 2 }, eligible: 10, source: 'public', coverage: 'complete' }, { state: 'generic', outcomes: { shot: 1, end: 1 }, eligible: 2, coverage: 'complete' }, 10);
    expect(result.alpha).toBe(10); expect(result.combined?.shot).toBeCloseTo((1 + 8) / 12);
    expect(compareMarkov({ state: '3+1', outcomes: { shot: 8 }, eligible: 8, source: 'public', coverage: 'unknown' }, { state: '3+1', outcomes: { shot: 1 }, eligible: 1, coverage: 'local' }, 10).combined).toBeUndefined();
  });
  it('exports only the documented local subset without inventing absent coordinates', () => {
    const event = createCanonicalFootballEvent({ id: 'local-1', matchId: 'm', index: 1, period: 1, elapsedMs: 5000, action: 'foul', outcome: 'observed', team: { id: 1, name: 'A' } });
    const exported = exportCanonicalStatsBomb([event]);
    expect(exported.events[0].location).toBeUndefined();
    expect(exported.events[0].scout_trainer).toBeUndefined();
    expect(exported.manifest.contract).toContain('4.0.0');
    expect(exported.manifest.limitations).toContain('no xG, tracking or inferred success is generated');
  });
});
