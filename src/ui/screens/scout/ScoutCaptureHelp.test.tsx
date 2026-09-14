import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import { ScoutCaptureHelp } from './ScoutCaptureHelp';

afterEach(cleanup);

describe('ScoutCaptureHelp', () => {
  it.each([
    ['08S#', 'Saque', 'Ace', 'Tipo do saque'],
    ['08R#', 'Recepção', 'Perfeita', 'Zona do contato'],
    ['08E+', 'Levantamento', 'Jogável', 'Chamada'],
    ['08A#', 'Ataque', 'Ponto', 'Bloqueadores'],
    ['08B#', 'Bloqueio', 'Ponto', 'Bloqueadores'],
    ['08D+', 'Defesa', 'Positiva', 'Zona da defesa'],
    ['08F+', 'Bola de graça', 'Controlada', 'Destino'],
  ])('explains and complements %s', (rawCode, skill, evaluation, complement) => {
    render(
      <ScoutCaptureHelp
        enabled
        rawCode={rawCode}
        profile={defaultCompactV1}
        onToggle={() => undefined}
      />,
    );

    expect(screen.getByText(skill, { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(evaluation))).toBeInTheDocument();
    expect(screen.getByText(complement, { selector: 'strong' })).toBeInTheDocument();
  });

  it('marks tactical complements already typed in the continuous code', () => {
    const { rerender } = render(
      <ScoutCaptureHelp
        enabled={false}
        rawCode="08S#"
        profile={defaultCompactV1}
        onToggle={() => undefined}
      />,
    );
    expect(screen.queryByText('Tipo do saque')).not.toBeInTheDocument();

    rerender(
      <ScoutCaptureHelp
        enabled
        rawCode="08S#YQ"
        profile={defaultCompactV1}
        onToggle={() => undefined}
      />,
    );
    const type = screen.getByText('Tipo do saque').closest('li');
    expect(type).toHaveClass('captured');
    expect(type).toHaveTextContent('Informado');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar ajuda' }));
  });

  it('explains automatic attack origin, the three directions, combinations, and stuffed blocks', () => {
    render(
      <ScoutCaptureHelp
        enabled
        rawCode="08A/"
        profile={defaultCompactV1}
        onToggle={() => undefined}
      />,
    );

    expect(screen.getByText('Abafado pelo bloqueio')).toBeInTheDocument();
    expect(screen.getByText(/origem é preenchida pela posição/i)).toBeInTheDocument();
    expect(screen.getByText(/DG paragonal/)).toBeInTheDocument();
    expect(screen.getByText(/CINV Inversão/)).toBeInTheDocument();
  });
});
