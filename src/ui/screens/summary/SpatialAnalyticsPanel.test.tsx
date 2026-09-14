import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { SpatialSample } from '../../../domain/scout/spatial/SpatialProjection';
import { SpatialAnalyticsPanel } from './SpatialAnalyticsPanel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const sample: SpatialSample = {
  eventId: 's1',
  teamId: 'a',
  skill: 'serve',
  setNumber: 1,
  evaluation: '#',
  source: 'spatial',
  origin: { surface: 'serviceZone', x: 0.7, y: 0.8 },
  target: { surface: 'court', x: 0.8, y: 0.2 },
};
function report(samples: readonly SpatialSample[]) {
  return {
    spatial: { samples, density: [], trajectories: [], matrix: [] },
  } as unknown as MatchReportModel;
}

describe('spatial points analytics', () => {
  it('combines athlete, set and P, retaining filters between maps and allowing zero qualities', () => {
    const a: SpatialSample = {...sample, eventId:'a', playerId:'p1', setterPosition:2, origin:{surface:'court',x:.1,y:.2}};
    const b: SpatialSample = {...a,eventId:'b',playerId:'p2',setNumber:2,setterPosition:3};
    const {container}=render(<SpatialAnalyticsPanel report={report([a,b])} teamId="a"/>);
    fireEvent.change(screen.getByLabelText('Atleta'),{target:{value:'p2'}});
    fireEvent.change(screen.getByLabelText('Set'),{target:{value:'2'}});
    fireEvent.change(screen.getByLabelText('P do levantador'),{target:{value:'3'}});
    expect(container.querySelectorAll('.spatial-point')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button',{name:'Trajetórias'}));
    expect(container.querySelectorAll('.spatial-play-line')).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('#'));
    expect(container.querySelectorAll('.spatial-play-line')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button',{name:'Limpar filtros'}));
    expect(container.querySelectorAll('.spatial-play-line')).toHaveLength(2);
  });
  it('filters by action, multiple evaluations and switches origin/destination coordinates', () => {
    const attack = { ...sample, skill: 'attack' as const, origin: { surface: 'court' as const, x: 0.273, y: 0.681 }, target: { surface: 'court' as const, x: 0.812, y: 0.224 } };
    const other = { ...attack, eventId: 's2', evaluation: '+' };
    const { container } = render(
      <SpatialAnalyticsPanel
        report={report([attack, other, sample])}
        teamId="a"
      />,
    );
    expect(screen.getByText('2 ações no recorte')).toBeInTheDocument();
    expect(container.querySelector('.spatial-point')).toHaveAttribute('cx', '54.6');
    expect(container.querySelector('.spatial-point')).toHaveAttribute('cy', '68.10000000000001');
    fireEvent.click(screen.getByLabelText('+'));
    expect(screen.getByText('1 ações no recorte')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Destino'));
    expect(container.querySelector('.spatial-point')).toHaveAttribute('cx', '162.4');
    expect(container.querySelector('.spatial-point')).toHaveAttribute('cy', '22.400000000000002');
  });

  it('shows an empty state when no points match', () => {
    render(<SpatialAnalyticsPanel report={report([sample])} teamId="a" />);
    fireEvent.click(screen.getByLabelText('#'));
    expect(screen.getByText('Nenhuma ação corresponde aos filtros selecionados.')).toBeInTheDocument();
  });

  it('saves the selected filters and chart configuration as a named analysis', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SpatialAnalyticsPanel
        report={report([sample])}
        teamId="a"
        matchId="match_1"
        onSaveAnalysisConfiguration={onSave}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Ex.: Ataques da Equipe A'), {
      target: { value: 'Saque no destino' },
    });
    fireEvent.click(screen.getByLabelText('Destino'));
    fireEvent.click(screen.getByRole('button', { name: 'Mapa de calor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar análise' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        matchId: 'match_1',
        name: 'Saque no destino',
        filters: expect.objectContaining({ coordinate: 'target' }),
        chart: expect.objectContaining({ viewMode: 'heatmap' }),
      }),
    );
  });
});
