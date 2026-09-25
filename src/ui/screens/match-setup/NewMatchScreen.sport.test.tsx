import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewMatchScreen } from './NewMatchScreen';
import type { CreateMatchInput } from '../../../application/ScoutTrainerService';

afterEach(cleanup);

describe('NewMatchScreen sport separation', () => {
  it('shows no volleyball-only configuration for football and creates no fake roster', () => {
    const onCreate = vi.fn<(input: CreateMatchInput) => Promise<void>>(() => Promise.resolve());
    render(<NewMatchScreen busy={false} onCancel={() => undefined} onCreate={onCreate} codeProfiles={[]} />);
    fireEvent.change(screen.getByLabelText('Modalidade'), { target: { value: 'football' } });

    expect(screen.queryByText(/Líbero/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Quem começa sacando/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^P[1-6]$/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Atletas (camisa e nome)')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Equipe A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      sport: 'football', teamAPlayers: [], teamBPlayers: [],
    }));
    expect(onCreate.mock.calls[0][0]).not.toHaveProperty('initialServingTeam');
    expect(onCreate.mock.calls[0][0]).not.toHaveProperty('teamALineup');
  });

  it('keeps volleyball setup available without inventing a demonstration roster', () => {
    render(<NewMatchScreen busy={false} onCancel={() => undefined} onCreate={() => Promise.resolve()} codeProfiles={[]} />);
    expect(screen.getByText(/Quem começa sacando/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Líbero \(opcional\)$/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar atleta' })[0]);
    expect(screen.getByLabelText('Nome Equipe A 1')).toBeInTheDocument();
  });

  it('keeps a match-only shirt change in the create input instead of parsing a text roster', () => {
    const onCreate = vi.fn<(input: CreateMatchInput) => Promise<void>>(() => Promise.resolve());
    render(<NewMatchScreen busy={false} onCancel={() => undefined} onCreate={onCreate} codeProfiles={[]} />);
    fireEvent.change(screen.getByLabelText('Modalidade'), { target: { value: 'football' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar atleta' })[0]);
    fireEvent.change(screen.getByLabelText('Camisa Equipe A 1'), { target: { value: '23' } });
    fireEvent.change(screen.getByLabelText('Nome Equipe A 1'), { target: { value: 'Ana Souza' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }));
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      sport: 'football',
      teamAPlayers: [{ number: 23, name: 'Ana Souza' }],
      teamBPlayers: [],
    }));
  });

  it('keeps a permanent shirt optional but requires one to enroll a row in the match', () => {
    const onCreate = vi.fn<(input: CreateMatchInput) => Promise<void>>(() => Promise.resolve());
    render(<NewMatchScreen busy={false} onCancel={() => undefined} onCreate={onCreate} codeProfiles={[]} />);
    fireEvent.change(screen.getByLabelText('Modalidade'), { target: { value: 'football' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar atleta' })[0]);
    fireEvent.change(screen.getByLabelText('Nome Equipe A 1'), { target: { value: "Ana D'Ávila-Souza" } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByText('Informe a camisa para inscrever este atleta na partida.')).toBeInTheDocument();
  });

  it('adds a row on Enter without submitting the match, while composition keeps the draft unchanged', () => {
    const onCreate = vi.fn<(input: CreateMatchInput) => Promise<void>>(() => Promise.resolve());
    render(<NewMatchScreen busy={false} onCancel={() => undefined} onCreate={onCreate} codeProfiles={[]} />);
    fireEvent.change(screen.getByLabelText('Modalidade'), { target: { value: 'football' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar atleta' })[0]);
    const firstName = screen.getByLabelText('Nome Equipe A 1');

    fireEvent.keyDown(firstName, { key: 'Enter', isComposing: true });
    expect(screen.queryByLabelText('Nome Equipe A 2')).not.toBeInTheDocument();
    fireEvent.keyDown(firstName, { key: 'Enter' });

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome Equipe A 2')).toHaveFocus();
  });
});
