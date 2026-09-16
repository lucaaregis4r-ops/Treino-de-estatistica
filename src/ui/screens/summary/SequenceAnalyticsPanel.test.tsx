import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultTacticalInput } from '../../../profiles/code/default-compact/defaultTacticalInput';
import type { SequenceAnalytics } from '../../../application/analytics/SequenceAnalyticsService';
import {
  MarkovAnalyzer,
  type RallyPathContact,
  type RallyPathRally,
} from '../../../domain/analytics/markov';
import type { PathStateDescriptor } from '../../../domain/analytics/markov/RallyPathAnalyzer';
import { SequenceAnalyticsPanel } from './SequenceAnalyticsPanel';

afterEach(cleanup);

function state(teamId: string, skill: RallyPathContact['skill'] | 'terminal', quality?: string, terminal = false): PathStateDescriptor {
  return {
    key: JSON.stringify([teamId, skill, quality ?? null]),
    teamId,
    skill,
    ...(quality === undefined ? {} : { quality }),
    ...(terminal ? { terminal: true } : {}),
  };
}

function rally(rallyId: string, quality: string, winnerTeamId: string, withCoordinates = true): RallyPathRally {
  const attack: RallyPathContact = {
    sourceEventId: `${rallyId}-attack`,
    teamId: 'a',
    skill: 'attack',
    quality,
    state: state('a', 'attack', quality),
    setNumber: 1,
    sequence: 1,
    playerId: 'player-a',
    spatial: {
      coordinateSystemVersion: defaultTacticalInput.zoneSystem.version,
      ...(withCoordinates ? { origin: { surface: 'court', x: 1 / 6, y: 1 / 4 }, target: { surface: 'court', x: 5 / 6, y: 3 / 4 }, originRegionId: '1', targetRegionId: '2' } : {}),
    },
  };
  const dig: RallyPathContact = {
    sourceEventId: `${rallyId}-dig`,
    teamId: 'b',
    skill: 'dig',
    quality: '+',
    state: state('b', 'dig', '+'),
    setNumber: 1,
    sequence: 2,
    spatial: { coordinateSystemVersion: defaultTacticalInput.zoneSystem.version },
  };
  return {
    rallyId,
    setNumber: 1,
    contacts: [attack, dig],
    terminal: { state: state(winnerTeamId, 'terminal', undefined, true), winnerTeamId, cause: 'rally_result' },
    status: 'eligible',
  };
}

function fixture(): SequenceAnalytics {
  const pathRallies = [
    ...Array.from({ length: 6 }, (_, index) => rally(`plus-${index}`, '+', 'a')),
    ...Array.from({ length: 6 }, (_, index) => rally(`minus-${index}`, '-', 'b', index !== 0)),
  ];
  return {
    pathRallies,
    zoneSystem: defaultTacticalInput.zoneSystem,
    teams: [{
      teamId: 'a',
      sequences: [],
      markov: new MarkovAnalyzer().analyze([], 'a'),
      patterns: { 2: [], 3: [] },
      spatial: {},
      pathRallies,
    }],
  };
}

describe('SequenceAnalyticsPanel', () => {
  it('renders the rally-path explorer with separate estimated and observed readings', () => {
    render(<SequenceAnalyticsPanel analytics={fixture()} teams={[{ id: 'a', name: 'Equipe A' }, { id: 'b', name: 'Equipe B' }]} teamId="a" />);

    expect(screen.getByText('Caminhos do rally', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Potencial do rally')).toBeInTheDocument();
    expect(screen.getByText('Rallies vencidos nos registros')).toBeInTheDocument();
    expect(screen.getByText('Detalhe: 50% · 12 ocorrências')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Fluxo observado dos caminhos do rally' })).toBeInTheDocument();
  });

  it('preserves intermediate contacts and supports the two-contact horizon', () => {
    render(<SequenceAnalyticsPanel analytics={fixture()} teams={[{ id: 'a', name: 'Equipe A' }, { id: 'b', name: 'Equipe B' }]} teamId="a" />);

    expect(screen.getByText('Onde começa este caminho?')).toBeInTheDocument();
    expect(screen.getByText('Comparação por qualidade')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2 contatos' }));
    expect(screen.getAllByText(/Defesa/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Zona 1' }));
    expect(screen.getByText('11 de 11 ações iniciais têm origem registrada')).toBeInTheDocument();
  });

  it('shows coverage limits and evidence details without inventing coordinates', () => {
    render(<SequenceAnalyticsPanel analytics={fixture()} teams={[{ id: 'a', name: 'Equipe A' }, { id: 'b', name: 'Equipe B' }]} teamId="a" players={[{ id: 'player-a', teamId: 'a', number: 7, name: 'Atacante' }]} />);

    expect(screen.getByText(/sem posição continuam no foco geral/)).toBeInTheDocument();
    expect(screen.getByText('Dados completos e como calculamos')).toBeInTheDocument();
    expect(screen.getByText(/Rallies correspondentes/)).toBeInTheDocument();
  });
});
