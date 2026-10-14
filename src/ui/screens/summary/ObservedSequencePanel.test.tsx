import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ObservedSequence } from '../../../domain/analytics/observed-sequence/ObservedSequence';
import { SEQUENCE_CONTEXT_MODEL_CRITERIA, SEQUENCE_CONTEXT_MODEL_VERSION } from '../../../domain/analytics/observed-sequence/SequenceContextModel';
import { ObservedSequencePanel } from './ObservedSequencePanel';

function unit(id: string, count: number, teamId: string): ObservedSequence {
  return { unitId: id, sport: 'futsal', matchId: 'm', context: { kind: 'period', number: 1 }, teamId, participantTeamIds: [teamId], start: { sourceId: `${id}:0`, reason: 'observed_control', elapsedMs: 0 }, end: { sourceId: `${id}:end`, reason: 'goal', elapsedMs: 20_000 }, outcome: 'goal', coverage: 'complete', censorReasons: [], eligibleForOutcome: true, steps: Array.from({ length: count }, (_, index) => ({ sourceId: `${id}:${index}`, order: index, kind: index === count - 1 ? 'shot' : 'control', role: index === count - 1 ? 'action' : 'control', teamId, elapsedMs: index * 1000 })) };
}

describe('ObservedSequencePanel', () => {
  it('filters whole possessions and exposes every step of a 20-action sequence', () => {
    const { container } = render(<ObservedSequencePanel projection={{ units: [unit('a-long', 20, 'a'), unit('b-short', 1, 'b')], unassigned: [] }} teams={[{ id: 'a', name: 'Equipe A' }, { id: 'b', name: 'Equipe B' }]} sportHint="futsal" />);
    expect(screen.getByText('2 unidades')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filtrar trajetórias por equipe'), { target: { value: 'a' } });
    fireEvent.change(screen.getByLabelText('Filtrar trajetórias por ação'), { target: { value: 'shot' } });
    expect(screen.getByText('1 unidade')).toBeTruthy();
    expect(container.querySelectorAll('.observed-unit')).toHaveLength(1);
    fireEvent.click(container.querySelector('.observed-unit summary')!);
    expect(container.querySelectorAll('.observed-unit ol li')).toHaveLength(20);
    expect(screen.getByText(/20 fatos/)).toBeTruthy();
  });

  it('labels validated context outcomes, support and match-clustered intervals clearly', () => {
    const metric = { brier: .3, logLoss: .4, calibrationError: .05, n: 100 };
    render(<ObservedSequencePanel
      projection={{ units: [unit('model-unit', 2, 'a')], unassigned: [] }} teams={[{ id: 'a', name: 'Equipe A' }]}
      contextModel={{
        version: SEQUENCE_CONTEXT_MODEL_VERSION, sport: 'futsal', status: 'available', matchCount: 6, unitCount: 120, eligibleUnitCount: 100,
        metrics: { globalBaseline: metric, teamBaseline: metric, firstOrder: metric, variableContext: metric },
        states: [{ contextLength: 2, context: ['pass:own', 'shot:own'], support: 30, matchSupport: 5, probabilities: { goal_for: { probability: .7, low: .6, high: .8 } }, evidenceUnitIds: ['unit-1'] }],
        criteria: SEQUENCE_CONTEXT_MODEL_CRITERIA,
      }}
    />);

    expect(screen.getByText('passe (equipe de referência) → finalização (equipe de referência)')).toBeTruthy();
    expect(screen.getByText('gol a favor')).toBeTruthy();
    expect(screen.getByText('30 / 5')).toBeTruthy();
    expect(screen.getByText('70.0% [60.0–80.0%]')).toBeTruthy();
  });

  it('reports why the model is unavailable without removing descriptive sequences', () => {
    const { container } = render(<ObservedSequencePanel
      projection={{ units: [unit('one', 1, 'a')], unassigned: [] }} teams={[{ id: 'a', name: 'Equipe A' }]}
      contextModel={{ version: SEQUENCE_CONTEXT_MODEL_VERSION, sport: 'futsal', status: 'unavailable', reason: 'too_few_matches', matchCount: 2, unitCount: 12, eligibleUnitCount: 12, criteria: SEQUENCE_CONTEXT_MODEL_CRITERIA }}
    />);

    expect(screen.getByText(/há menos de 5 partidas com unidades elegíveis/)).toBeTruthy();
    expect(container.querySelector('.observed-counts strong')).toHaveTextContent('1 unidade');
  });
});
