import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { ScoutEvent } from '../../../domain/scout/events/ScoutEvent';
import { VolleyballReading } from './VolleyballReading';

afterEach(cleanup);

function action(id: string, setNumber: number, skill: ScoutEvent['skill'], outcome: string): ScoutEvent {
  return {
    id, matchId: 'match', rallyId: id, sequence: Number(id.split('-').at(-1)),
    teamId: 'home', playerId: 'athlete', skill, outcome, setNumber,
    scoreBefore: { teamA: 0, teamB: 0 }, timestamp: 0, rawCode: id,
    codeProfileId: 'code', codeProfileVersion: '1', complexityProfileId: 'basic',
  };
}

function workspace(): MatchWorkspace {
  const actions = [action('attack-1', 1, 'attack', 'point'), action('serve-2', 2, 'serve', 'ace')];
  return {
    teams: [{ id: 'home', name: 'Olympico' }, { id: 'away', name: 'Adversário' }],
    players: [{ id: 'athlete', teamId: 'home', number: 8, name: 'Ana' }],
    timeline: actions.map((event) => ({ sourceEventId: event.id, event })),
    report: { sideout: [], breakpoint: [], rotations: [] },
    tacticalRally: { contacts: [], rallies: [] },
    state: {
      currentSet: 2, score: { teamA: 1, teamB: 0 },
      sets: [
        { setNumber: 1, score: { teamA: 25, teamB: 20 } },
        { setNumber: 2, score: { teamA: 1, teamB: 0 } },
      ],
    },
  } as unknown as MatchWorkspace;
}

describe('VolleyballReading', () => {
  it('shows recent actions and applies set and team filters to the visible reading', () => {
    render(<VolleyballReading workspace={workspace()} />);
    expect(screen.getByLabelText('Ações recentes observadas')).toHaveTextContent('Ataque');
    expect(screen.getByText('Contribuições positivas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Set 2/ }));
    expect(screen.getByLabelText('Estatísticas de Olympico')).toHaveTextContent('1 ace');
    expect(screen.getByLabelText('Ações recentes observadas')).toHaveTextContent('Saque');
    expect(screen.getByLabelText('Ações recentes observadas')).not.toHaveTextContent('Ataque');
    fireEvent.click(screen.getByRole('button', { name: 'Adversário' }));
    expect(screen.getByLabelText('Estatísticas de Adversário')).toHaveTextContent('Sem atletas cadastrados');
    expect(screen.getByLabelText('Ações recentes observadas')).toHaveTextContent('Ainda não há ações observadas');
  });
});
