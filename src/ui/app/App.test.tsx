import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('shows the main actions on the home screen', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Scout Trainer' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nova partida' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Iniciar treino' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Perfis' })).toBeInTheDocument();
  });
});
