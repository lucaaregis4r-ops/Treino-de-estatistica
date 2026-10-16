import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

afterEach(cleanup);

describe('App', () => {
  it('shows the sport choices and opens their match area', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Escolha a modalidade' })).toBeInTheDocument();
    for (const sport of ['Vôlei', 'Futebol', 'Futsal', 'Basquete']) {
      expect(screen.getByRole('button', { name: `${sport}: abrir partidas e manual` })).toBeEnabled();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Vôlei: abrir partidas e manual' }));
    expect(await screen.findByRole('heading', { name: 'Partidas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova partida' })).toBeInTheDocument();
  });

  it('opens the reusable team area by default and exposes the match filters', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Vôlei: abrir partidas e manual' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Equipes e atletas' }));
    expect(await screen.findByRole('heading', { name: 'Equipes e atletas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cadastrar equipe' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Partidas · Vôlei' }));
    expect(await screen.findByRole('heading', { name: 'Partidas' })).toBeInTheDocument();
    expect(screen.getByText('Partidas de vôlei neste dispositivo.')).toBeInTheDocument();
  });

  it('asks before leaving an unsaved new-match draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Vôlei: abrir partidas e manual' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nova partida' }));
    fireEvent.change(screen.getByLabelText('Nome da equipe', { selector: '#team-name-A' }), {
      target: { value: 'Rascunho A' },
    });
    await waitFor(() => expect(screen.getByDisplayValue('Rascunho A')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Modalidades' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Nova partida' })).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Modalidades' }));
    expect(await screen.findByRole('heading', { name: 'Escolha a modalidade' })).toBeInTheDocument();
    confirm.mockRestore();
  });
});
