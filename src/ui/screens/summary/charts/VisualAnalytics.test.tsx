import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MatchReportModel } from '../../../../application/reporting/MatchReportModel';
import { RotationPerformanceChart } from './RotationPerformanceChart';
import { SetterDistributionChart } from './SetterDistributionChart';

vi.mock('recharts', () => {
  const component = ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>;
  return {
    Bar: component,
    BarChart: component,
    CartesianGrid: component,
    Legend: component,
    ResponsiveContainer: component,
    Tooltip: component,
    XAxis: component,
    YAxis: component,
  };
});

const metric = (numerator: number, denominator: number) => ({
  value: denominator ? numerator / denominator : null,
  numerator,
  denominator,
});

const report = {
  players: [
    { id: 'setter', teamId: 'a', number: 1, name: 'Lia' },
    { id: 'attack-1', teamId: 'a', number: 2, name: 'Bia' },
    { id: 'attack-2', teamId: 'a', number: 3, name: 'Eva' },
  ],
  rotations: [
    {
      teamId: 'a',
      rotation: 1,
      sideout: metric(4, 5),
      breakpoint: metric(2, 5),
      attackEfficiency: metric(3, 5),
      receptionPositive: metric(4, 5),
      aces: 1,
      errors: 0,
    },
    {
      teamId: 'a',
      rotation: 2,
      sideout: metric(1, 5),
      breakpoint: metric(1, 5),
      attackEfficiency: metric(1, 5),
      receptionPositive: metric(2, 5),
      aces: 0,
      errors: 1,
    },
  ],
  tactical: {
    attackDirections: [
      {
        teamId: 'a',
        setNumber: 1,
        playerId: 'attack-1',
        setterPlayerId: 'setter',
        setterPosition: 1,
        phase: 'sideout',
        receptionGrade: 'A',
        volume: 3,
        points: 2,
        errors: 0,
        blocked: 0,
        efficiency: metric(2, 3),
      },
      {
        teamId: 'a',
        setNumber: 2,
        playerId: 'attack-2',
        setterPlayerId: 'setter',
        setterPosition: 2,
        phase: 'transition',
        receptionGrade: 'B',
        volume: 2,
        points: 1,
        errors: 0,
        blocked: 0,
        efficiency: metric(1, 2),
      },
    ],
  },
} as unknown as MatchReportModel;

describe('visual analytics', () => {
  it('resume a melhor e a pior rotação e mantém os dados auditáveis', () => {
    render(<RotationPerformanceChart report={report} teamId="a" />);
    expect(screen.getByText(/Melhor sideout: P1/)).toBeInTheDocument();
    expect(screen.getByText(/Menor sideout: P2/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Dados auditáveis/ })).toBeInTheDocument();
  });

  it('filtra a distribuição por set e atualiza a concentração textual', () => {
    render(<SetterDistributionChart report={report} teamId="a" />);
    expect(screen.getByText(/Bia, 3 de 5 ataques/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Set'), { target: { value: '2' } });
    expect(screen.getByText(/Eva, 2 de 2 ataques/)).toBeInTheDocument();
  });
});
