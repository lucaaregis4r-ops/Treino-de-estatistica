import { describe, expect, it } from 'vitest';
import type { ObservedSequence } from './ObservedSequence';
import { selectObservedSequences } from './ObservedSequence';
import { analyzeObservedSequences, PATTERN_CANDIDATE_BUDGET } from './ObservedSequenceAnalysis';
import { exportObservedSequencesCsv, exportObservedSequencesJson, renderObservedSequencesPdf } from '../../../infrastructure/export/observed-sequence/ObservedSequenceExport';
import type { MatchEvent } from '../../match/events/MatchEvent';
import { projectFutsalObservedSequences } from './FutsalObservedSequences';

function unit(id: string, kinds: readonly string[], outcome = 'goal', eligible = true): ObservedSequence {
  return { unitId: id, sport: 'futsal', matchId: 'm', context: { kind: 'period', number: 1 }, teamId: 'a', participantTeamIds: ['a'], start: { sourceId: `${id}:0`, reason: 'observed_control', elapsedMs: 0 }, ...(eligible ? { end: { sourceId: `${id}:end`, reason: outcome, elapsedMs: 20_000 }, outcome } : {}), steps: kinds.map((kind, index) => ({ sourceId: `${id}:${index}`, effectiveHistoryId: `${id}:history:${index}`, order: index, kind, role: 'action', teamId: 'a', elapsedMs: index * 1000, position: { x: .2, y: .4 } })), coverage: eligible ? 'complete' : 'censored', censorReasons: eligible ? [] : ['missing_end'], eligibleForOutcome: eligible };
}

describe('S3 full observed trajectories', () => {
  it('separates 1 and 20 action variants and keeps all evidence in filters and exports', () => {
    const long = unit('long', Array.from({ length: 20 }, (_, index) => index === 19 ? 'shot' : 'pass'));
    const short = unit('short', ['shot']);
    const filtered = selectObservedSequences([long, short], { actionKind: 'shot' });
    const analysis = analyzeObservedSequences(filtered);
    expect(analysis.total).toBe(2);
    expect(analysis.exactVariants.map(row => row.length)).toEqual([20, 1]);
    expect(analysis.lengthBands.map(band => band.n)).toEqual([1, 0, 0, 0, 1]);
    expect(filtered[0].steps).toHaveLength(20);
    const csv = exportObservedSequencesCsv(filtered);
    expect(csv.split('passo;').length - 1).toBe(21);
    expect(csv).toContain('long:19');
    const exported = JSON.parse(exportObservedSequencesJson(filtered)) as { units: { steps: unknown[] }[] };
    expect(exported.units[0].steps).toHaveLength(20);
    expect(renderObservedSequencesPdf('Partida', filtered)).toContain('%PDF');
  });

  it('counts repeated contiguous occurrences once per unit and excludes censored outcomes', () => {
    const units = [unit('one', ['pass', 'shot', 'pass', 'shot']), unit('two', ['pass', 'shot']), unit('open', ['pass', 'shot'], 'goal', false)];
    const analysis = analyzeObservedSequences(units);
    const pattern = analysis.patterns.find(row => row.length === 2 && row.support === 3);
    expect(pattern).toMatchObject({ support: 3, occurrences: 4 });
    expect(analysis.total).toBe(3);
    expect(analysis.eligible).toBe(2);
    expect(analysis.incomplete).toBe(1);
    expect(analysis.lengthBands[1].outcomes).toEqual({ goal: 1 });
    expect(analysis.exactVariants.find(row => row.length === 2)).toMatchObject({ n: 2, eligible: 1, incomplete: 1 });
  });

  it('declares incomplete pattern computation when its budget is reached, preserving full variants', () => {
    const long = unit('long', Array.from({ length: 700 }, () => 'pass'));
    const analysis = analyzeObservedSequences([long, unit('other', Array.from({ length: 700 }, () => 'pass'))]);
    expect(analysis.patternsComplete).toBe(false);
    expect(analysis.patternCandidates).toBeLessThanOrEqual(PATTERN_CANDIDATE_BUDGET);
    expect(analysis.exactVariants[0].length).toBe(700);
  });

  it('recomputes variants and eligible outcomes after a correction and its undo', () => {
    const control: MatchEvent = { type: 'futsal_fact_registered', id: 'history-control', matchId: 'm', sequence: 1, timestamp: 1, fact: { id: 'control', kind: 'control', period: 1, elapsedMs: 1000, observation: 'observed', state: 'team', controlledTeamId: 'a', coverage: 'continuous' } };
    const shot: MatchEvent = { type: 'futsal_fact_registered', id: 'history-shot', matchId: 'm', sequence: 2, timestamp: 2, fact: { id: 'shot', kind: 'shot', period: 1, elapsedMs: 2000, observation: 'observed', shootingTeamId: 'a', outcome: 'goal', beneficiaryTeamId: 'a' } };
    const correction: MatchEvent = { type: 'futsal_fact_corrected', id: 'history-correction', matchId: 'm', sequence: 3, timestamp: 3, targetFactId: 'shot', replacementFact: { id: 'shot', kind: 'tackle', period: 1, elapsedMs: 2000, observation: 'observed', losingTeamId: 'a', winningTeamId: 'b' } };
    const undo: MatchEvent = { type: 'futsal_fact_undone', id: 'history-undo', matchId: 'm', sequence: 4, timestamp: 4, targetHistoryEventId: 'history-correction' };
    const baseline = analyzeObservedSequences(projectFutsalObservedSequences('m', [control, shot]).units);
    const changed = analyzeObservedSequences(projectFutsalObservedSequences('m', [control, shot, correction]).units);
    const restored = analyzeObservedSequences(projectFutsalObservedSequences('m', [control, shot, correction, undo]).units);
    expect(baseline.eligible).toBe(1);
    expect(changed.exactVariants.map(row => row.key)).not.toEqual(baseline.exactVariants.map(row => row.key));
    expect(changed.eligible).toBe(1);
    expect(restored.exactVariants).toEqual(baseline.exactVariants);
  });
});
