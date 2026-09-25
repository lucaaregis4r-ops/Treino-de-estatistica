import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

afterEach(cleanup);

describe('App', () => {
  it('shows the main actions on the home screen', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Seu espaço de scout' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nova partida' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Equipes e atletas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajuda' })).toBeInTheDocument();
  });

  it('opens the reusable team area by default and exposes the match filters', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Equipes e atletas' }));
    expect(await screen.findByRole('heading', { name: 'Equipes e atletas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cadastrar equipe' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));
    expect(await screen.findByRole('heading', { name: 'Partidas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Modalidade')).toBeInTheDocument();
  });

  it('asks before leaving an unsaved new-match draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Nova partida' }));
    fireEvent.change(screen.getByLabelText('Nome da equipe', { selector: '#team-name-A' }), {
      target: { value: 'Rascunho A' },
    });
    await waitFor(() => expect(screen.getByDisplayValue('Rascunho A')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Nova partida' })).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Início' }));
    expect(await screen.findByRole('heading', { name: 'Seu espaço de scout' })).toBeInTheDocument();
  });
});
