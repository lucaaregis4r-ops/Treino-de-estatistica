import { describe, expect, it } from 'vitest';
import { buildFutsalAnalytics } from '../../../domain/futsal/FutsalAnalytics';
import { projectFutsalScout, type FutsalFact, type FutsalFactRegisteredEvent } from '../../../domain/futsal/FutsalScout';
import { exportFutsalAnalyticsCsv, renderFutsalAnalyticsPdf } from './FutsalReportExporters';

const base = { period: 1 as const, observation: 'observed' as const };
function event(id: string, sequence: number, fact: FutsalFact): FutsalFactRegisteredEvent { return { type: 'futsal_fact_registered', id: `e-${id}`, matchId: 'm', sequence, timestamp: sequence, fact }; }

describe('futsal report exporters', () => {
  it('exports the modality, descriptive coverage, and observed denominators to CSV and PDF', () => {
    const shot1: FutsalFact = { ...base, id: 's1', elapsedMs: 1200, kind: 'shot', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a' };
    const shot2: FutsalFact = { ...base, id: 's2', elapsedMs: 1800, kind: 'shot', shootingTeamId: 'a', outcome: 'saved' };
    const tag: FutsalFact = { ...base, id: 't1', elapsedMs: 1900, kind: 'tactical_annotation', scope: 'event', targetFactId: 's2', organization: 'transition' };
    const projection = projectFutsalScout([event('s1', 1, shot1), event('s2', 2, shot2), event('t1', 3, tag)]);
    const report = buildFutsalAnalytics(projection, ['a', 'b']);
    const csv = exportFutsalAnalyticsCsv(report, { a: 'Casa', b: 'Visitante' });
    expect(csv).toContain('futsal');
    expect(csv).toContain('posses_com_finalizacao');
    expect(csv).toContain('1;2;0;0.5');
    expect(csv).not.toMatch(/\b(xG|xGA|xT)\b/i);
    const pdf = renderFutsalAnalyticsPdf('Jogo', report, { a: 'Casa', b: 'Visitante' });
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('Modalidade: Futsal');
    expect(pdf).toContain('Contexto tatico anotado');
    expect(pdf).not.toMatch(/\b(xG|xGA|xT)\b/i);
  });
});
