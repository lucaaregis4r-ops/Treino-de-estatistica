import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScoutTrainerService } from '../../application/ScoutTrainerService';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbPlayerRepository } from '../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { IndexedDbTeamRepository } from '../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';
import { App } from './App';

const databases: ScoutTrainerDatabase[] = [];

function createService() {
  const database = new ScoutTrainerDatabase(`sport-navigation-${crypto.randomUUID()}`);
  databases.push(database);
  return new ScoutTrainerService(
    new IndexedDbMatchRepository(database),
    new IndexedDbEventRepository(database),
    new IndexedDbTeamRepository(database),
    new IndexedDbPlayerRepository(database),
    createDefaultProfileRegistry(),
  );
}

afterEach(async () => {
  cleanup();
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

describe('sport-first navigation', () => {
  it('shows the sport picker, scopes matches, and opens the selected manual and setup', async () => {
    const service = createService();
    for (const [sport, teamAName] of [
      ['football', 'Futebol A'],
      ['volleyball', 'Vôlei A'],
    ] as const) {
      const created = await service.createMatch({
        sport, teamAName, teamBName: 'Equipe B',
        teamAPlayers: sport === 'volleyball' ? [1, 2, 3, 4, 5, 6] : [],
        teamBPlayers: sport === 'volleyball' ? [7, 8, 9, 10, 11, 12] : [],
        complexityProfileId: 'basic',
      });
      if (!created.ok) throw created.error;
    }

    render(<App service={service} />);
    expect(await screen.findByRole('heading', { name: 'Escolha a modalidade' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Basquete: em breve' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Futebol: abrir partidas e manual' }));
    const matchList = await screen.findByRole('list', { name: 'Lista de partidas' });
    expect(within(matchList).getByRole('button', { name: 'Futebol A x Equipe B' })).toBeInTheDocument();
    expect(within(matchList).queryByRole('button', { name: 'Vôlei A x Equipe B' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Manual de Futebol' }));
    expect(await screen.findByRole('heading', { name: 'Manual de futebol' })).toBeInTheDocument();
    expect(screen.getByText('Progressão com bola')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Partidas' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nova partida' }));
    expect(screen.getByRole('heading', { name: 'Nova partida' })).toBeInTheDocument();
    expect(screen.getByText('Modalidade').parentElement).toHaveTextContent('futebol');
    expect(screen.queryByLabelText('Modalidade')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('heading', { name: 'Partidas' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Modalidades' }));
    expect(screen.getByRole('heading', { name: 'Escolha a modalidade' })).toBeInTheDocument();
  });

  it('opens a single registration tab for futsal with advanced controls initially collapsed', async () => {
    const service = createService();
    render(<App service={service} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Futsal: abrir partidas e manual' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nova partida' }));
    expect(screen.getByText('Modalidade').parentElement).toHaveTextContent('futsal');
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }));

    expect(await screen.findByRole('button', { name: 'Registro' }, { timeout: 20_000 })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: 'Scout Essencial' })).not.toBeInTheDocument();
    const advanced = screen.getByText('Controles avançados da modalidade').closest('details');
    expect(advanced).not.toHaveAttribute('open');
    expect(screen.getByLabelText('Scout Essencial')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '← Partidas' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidas' })).toBeInTheDocument());
    expect(screen.getByText('Partidas de futsal neste dispositivo.')).toBeInTheDocument();
  });
});
