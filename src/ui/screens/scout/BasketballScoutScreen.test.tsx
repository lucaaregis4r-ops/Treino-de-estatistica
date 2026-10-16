import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { BasketballFactDraft } from '../../../domain/basketball/BasketballScout';
import { BasketballScoutScreen } from './BasketballScoutScreen';

afterEach(() => {
  cleanup();
});

function createMockWorkspace(): MatchWorkspace {
  return {
    state: {
      metadata: { id: 'm1', sport: 'basketball', date: new Date().toISOString() },
      status: 'in_progress',
      score: { teamA: 0, teamB: 0 },
      currentSet: 1,
      sets: [],
    },
    teams: [
      { id: 't1', name: 'Franca Basquete' },
      { id: 't2', name: 'Flamengo' },
    ],
    players: [
      { id: 'p1', teamId: 't1', name: 'Lucas Dias', number: 7, active: true },
      { id: 'p2', teamId: 't1', name: 'Georginho', number: 32, active: true },
    ],
    timeline: [],
    report: null,
    tacticalRally: null,
    basketball: {
      facts: [],
      score: { t1: 18, t2: 15 },
      undoTargetHistoryEventId: undefined,
    },
  } as unknown as MatchWorkspace;
}

describe('BasketballScoutScreen', () => {
  it('renderiza os elementos principais de registro (placar, relógio, gatilhos, quadra e desfechos)', () => {
    const ws = createMockWorkspace();
    render(
      <BasketballScoutScreen
        workspace={ws}
        busy={false}
        onRegister={vi.fn().mockResolvedValue(undefined)}
        onCorrect={vi.fn().mockResolvedValue(undefined)}
        onUndo={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Placar e equipe
    expect(screen.getAllByText('Franca Basquete').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Flamengo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('18')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();

    // Gatilhos táticos da coluna esquerda
    expect(screen.getByText('P&R')).toBeDefined();
    expect(screen.getByText('Infiltração')).toBeDefined();
    expect(screen.getByText('1v1 Iso')).toBeDefined();
    expect(screen.getByText('Poste')).toBeDefined();

    // Ritmo da posse
    expect(screen.getByText('⚡ Transição')).toBeDefined();
    expect(screen.getByText('🛡️ Posicionado')).toBeDefined();

    // Atletas e botões de desfecho
    expect(screen.getByText('Lucas Dias')).toBeDefined();
    expect(screen.getByText('CESTA')).toBeDefined();
    expect(screen.getByText('ERRO')).toBeDefined();
    expect(screen.getByText('TOCO')).toBeDefined();
    expect(screen.getByText('FALTA')).toBeDefined();
  });

  it('permite alternar ritmo e selecionar gatilho tático antes de registrar cesta', () => {
    const ws = createMockWorkspace();
    const onRegister = vi.fn<(period: number, draft: BasketballFactDraft) => Promise<void>>().mockResolvedValue(undefined);

    render(
      <BasketballScoutScreen
        workspace={ws}
        busy={false}
        onRegister={onRegister}
        onCorrect={vi.fn().mockResolvedValue(undefined)}
        onUndo={vi.fn().mockResolvedValue(undefined)}
      />
    );

    // Alternar para transição
    const transitionBtn = screen.getByText('⚡ Transição');
    fireEvent.click(transitionBtn);

    // Selecionar P&R
    const prBtn = screen.getByText('P&R');
    fireEvent.click(prBtn);

    // Selecionar atleta #7 (Lucas Dias)
    const player7 = screen.getByText('Lucas Dias');
    fireEvent.click(player7);

    // Clicar em CESTA
    const cestaBtn = screen.getByText('CESTA');
    fireEvent.click(cestaBtn);

    expect(onRegister).toHaveBeenCalledTimes(1);
    const [, draft] = onRegister.mock.calls[0];
    expect(draft).toMatchObject({
      kind: 'shot',
      outcome: 'made',
      rhythm: 'transition',
      tactic: 'pick_roll',
      playerId: 'p1',
    });
  });

  it('permite registrar ações rápidas do HUD inferior (rebote defensivo e perda de posse)', () => {
    const ws = createMockWorkspace();
    const onRegister = vi.fn<(period: number, draft: BasketballFactDraft) => Promise<void>>().mockResolvedValue(undefined);

    render(
      <BasketballScoutScreen
        workspace={ws}
        busy={false}
        onRegister={onRegister}
        onCorrect={vi.fn().mockResolvedValue(undefined)}
        onUndo={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const rebDefBtn = screen.getByText('🛡️ Reb Def');
    fireEvent.click(rebDefBtn);

    expect(onRegister).toHaveBeenCalledTimes(1);
    expect(onRegister.mock.calls[0][1]).toMatchObject({
      kind: 'rebound',
      side: 'defensive',
    });
  });
});
