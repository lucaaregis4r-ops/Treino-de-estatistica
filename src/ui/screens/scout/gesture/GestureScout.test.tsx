import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GestureScout } from './GestureScout';

afterEach(cleanup);

describe('GestureScout', () => {
  it('accepts both quality symbols for free ball', () => {
    const onOutcome = vi.fn();
    const { getByRole } = render(<GestureScout phase="free_ball" skill="free_ball"
      suggestion={{ highlighted: [], others: [] }} onAttackOutcome={onOutcome} />);
    fireEvent.keyDown(getByRole('application'), { key: '#' });
    fireEvent.keyDown(getByRole('application'), { key: '=' });
    expect(onOutcome).toHaveBeenNthCalledWith(1, '#');
    expect(onOutcome).toHaveBeenNthCalledWith(2, '=');
  });

  it('exposes compact player, attack outcome, quick actions and undo controls', () => {
    const onPlayerSelected = vi.fn();
    const onOutcome = vi.fn();
    const onQuickAction = vi.fn();
    const onUndo = vi.fn();
    const { getByRole, getByText } = render(
      <GestureScout
        phase="ataque"
        skill="attack"
        suggestion={{ highlighted: ['p4'], others: ['p1'] }}
        onPlayerSelected={onPlayerSelected}
        onAttackOutcome={onOutcome}
        onQuickAction={onQuickAction}
        onUndo={onUndo}
      />,
    );
    fireEvent.click(getByRole('button', { name: /Qualidade #/ }));
    const freeBall = getByText('Bola de graça');
    fireEvent.click(freeBall);
    expect(freeBall).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(freeBall);
    expect(freeBall).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(getByRole('button', { name: '↶ Desfazer' }));
    expect(onOutcome).toHaveBeenCalledWith('#');
    expect(onQuickAction).toHaveBeenCalledTimes(2);
    expect(onQuickAction).toHaveBeenCalledWith('free_ball');
    expect(onUndo).toHaveBeenCalled();
  });

  it('highlights a selected secondary quick action', () => {
    const { getByRole, getByText } = render(
      <GestureScout
        phase="dig"
        skill="dig"
        suggestion={{ highlighted: [], others: [] }}
      />,
    );

    fireEvent.click(getByText('Outras ações'));
    const netTouch = getByRole('button', { name: 'Toque na rede' });
    fireEvent.click(netTouch);

    expect(netTouch).toHaveAttribute('aria-pressed', 'true');
    expect(getByText('Outras ações')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
    expect(getByText('Toque na rede — Equipe não identificada · Ponto: adversário')).toBeInTheDocument();
  });

  it('allows clearing the selected attack outcome', () => {
    const onOutcome = vi.fn();
    let outcome: '#' | '=' | undefined;
    const props = {
      phase: 'ataque' as const,
      skill: 'attack' as const,
      suggestion: { highlighted: [], others: [] },
    };
    const { getByRole, rerender } = render(
      <GestureScout
        {...props}
        outcome={outcome}
        onAttackOutcome={onOutcome}
      />,
    );

    const point = getByRole('button', { name: /Qualidade #/ });
    fireEvent.click(point);
    outcome = '#';
    rerender(<GestureScout {...props} outcome={outcome} onAttackOutcome={onOutcome} />);
    fireEvent.click(getByRole('button', { name: /Qualidade #/ }));
    outcome = undefined;
    rerender(<GestureScout {...props} outcome={outcome} onAttackOutcome={onOutcome} />);

    expect(getByRole('button', { name: /Qualidade #/ })).toHaveAttribute('aria-pressed', 'false');
    expect(onOutcome).toHaveBeenNthCalledWith(1, '#');
    expect(onOutcome).toHaveBeenNthCalledWith(2, undefined);
  });

  it('emits one neutral attack trajectory and qualifies it separately', () => {
    const onTrajectory = vi.fn();
    const onOutcome = vi.fn();
    const { getByRole } = render(
      <GestureScout
        phase="ataque"
        skill="attack"
        suggestion={{ highlighted: ['p4'], others: [] }}
        onTrajectory={onTrajectory}
        onAttackOutcome={onOutcome}
      />,
    );
    const frame = getByRole('application');
    const court = frame.querySelector('.spatial-v2-surface') as HTMLDivElement;
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 400, height: 320, right: 400, bottom: 320, x: 0, y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(court, 'getBoundingClientRect').mockReturnValue({
      left: 40, top: 32, width: 320, height: 256, right: 360, bottom: 288, x: 40, y: 32,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(frame, { pointerId: 1, clientX: 80, clientY: 64 });
    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 320, clientY: 256 });
    expect(onTrajectory).toHaveBeenCalledTimes(1);
    fireEvent.click(getByRole('button', { name: /Qualidade #/ }));
    expect(onOutcome).toHaveBeenCalledWith('#');
  });

  it('keeps attack outcomes available while waiting for defense', () => {
    const { getByRole } = render(
      <GestureScout
        phase="defesa"
        skill="dig"
        attackOutcomeAvailable
        suggestion={{ highlighted: ['p5'], others: [] }}
      />,
    );
    expect(getByRole('button', { name: /Qualidade #/ })).toBeInTheDocument();
    expect(getByRole('button', { name: /Qualidade =/ })).toBeInTheDocument();
  });

  it('offers ace and serve-error outcomes for a gestural serve', () => {
    const onOutcome = vi.fn();
    const { getByLabelText, getByRole } = render(
      <GestureScout
        phase="serve"
        skill="serve"
        suggestion={{ highlighted: ['p1'], others: [] }}
        onAttackOutcome={onOutcome}
      />,
    );

    fireEvent.click(getByRole('button', { name: /Qualidade #/ }));
    fireEvent.click(getByRole('button', { name: /Qualidade =/ }));

    expect(getByLabelText('Resultado da ação')).toBeInTheDocument();
    expect(onOutcome).toHaveBeenNthCalledWith(1, '#');
    expect(onOutcome).toHaveBeenNthCalledWith(2, '=');
  });

  it('shows human action language and keeps secondary actions collapsed', () => {
    const { getByRole, getByText } = render(
      <GestureScout
        phase="dig"
        skill="dig"
        teamName="Equipe A"
        suggestion={{ highlighted: [], others: ['p5'] }}
      />,
    );
    expect(getByText('DEFESA — Equipe A')).toBeInTheDocument();
    expect(getByText('Trace a trajetória da bola')).toBeInTheDocument();
    expect(getByRole('group', { name: 'Ações rápidas' }).querySelector('details')).not.toHaveAttribute('open');
    expect(getByRole('button', { name: 'Bola de graça' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Registrar · Enter' })).toBeInTheDocument();
  });
});
