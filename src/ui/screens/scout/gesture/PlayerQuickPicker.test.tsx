import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultLineup } from '../../../../domain/match/lineup/SetLineup';
import { PlayerQuickPicker } from './PlayerQuickPicker';

afterEach(cleanup);

const players = Array.from({ length: 8 }, (_, index) => ({
  id: `p${index + 1}`,
  teamId: 'a',
  number: index + 1,
  name: `Atleta ${index + 1}`,
}));
const lineup = createDefaultLineup('a', 1, players)!;
const props = {
  lineup,
  rosterIds: players.map((player) => player.id),
  liberoIds: ['p7'],
  playerLabels: Object.fromEntries(players.map((player) => [player.id, `#${player.number}`])),
  playerTitles: Object.fromEntries(players.map((player) => [player.id, player.name])),
  suggestion: { highlighted: ['p1'], others: ['p2', 'p3', 'p4', 'p5', 'p6'] },
};

describe('PlayerQuickPicker', () => {
  it('keeps one libero button when the roster has two, without losing the second athlete', () => {
    const select = vi.fn();
    const { getByRole, getAllByRole } = render(
      <PlayerQuickPicker
        {...props}
        liberoIds={['p7', 'p8']}
        suggestion={{ ...props.suggestion, automatic: 'p8' }}
        onSelect={select}
      />,
    );
    expect(getAllByRole('button', { name: /Líbero ·/ })).toHaveLength(1);
    expect(getByRole('button', { name: 'Líbero · Atleta 8' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.change(getByRole('combobox'), { target: { value: 'p7' } });
    expect(select).toHaveBeenLastCalledWith('p7');
    expect(getByRole('button', { name: 'Líbero · Atleta 7' })).toBeInTheDocument();
  });

  it('keeps rotation order when the suggested action changes and updates actual positions', () => {
    const { getByRole, rerender } = render(<PlayerQuickPicker {...props} />);
    const positions = () =>
      within(getByRole('group', { name: 'Rede' }))
        .getAllByRole('button')
        .map((button) => button.textContent);
    expect(positions()).toEqual(['P4#4', 'P3#3', 'P2#2']);
    rerender(
      <PlayerQuickPicker
        {...props}
        suggestion={{ highlighted: ['p6'], others: ['p1', 'p2', 'p3', 'p4', 'p5'] }}
      />,
    );
    expect(positions()).toEqual(['P4#4', 'P3#3', 'P2#2']);
    rerender(
      <PlayerQuickPicker
        {...props}
        lineup={{
          ...lineup,
          positions: {
            1: lineup.positions[2],
            2: lineup.positions[3],
            3: lineup.positions[4],
            4: lineup.positions[5],
            5: lineup.positions[6],
            6: lineup.positions[1],
          },
        }}
      />,
    );
    expect(positions()).toEqual(['P4#5', 'P3#4', 'P2#3']);
    expect(getByRole('button', { name: 'P1 · Atleta 2' })).toHaveAttribute('title', 'Atleta 2');
  });

  it('selects a dedicated libero, a reserve and unidentified without substituting or restoring a suggestion', () => {
    const select = vi.fn();
    const { getByRole, rerender } = render(<PlayerQuickPicker {...props} onSelect={select} />);
    fireEvent.click(getByRole('button', { name: 'Líbero · Atleta 7' }));
    expect(select).toHaveBeenLastCalledWith('p7');
    fireEvent.click(getByRole('button', { name: 'Atleta 8', hidden: true }));
    expect(select).toHaveBeenLastCalledWith('p8');
    fireEvent.click(getByRole('button', { name: 'Sem atleta identificado' }));
    expect(select).toHaveBeenLastCalledWith();
    rerender(
      <PlayerQuickPicker
        {...props}
        suggestion={{ ...props.suggestion, automatic: 'p1' }}
        playerSelection="unidentified"
      />,
    );
    expect(getByRole('button', { name: 'Sem atleta identificado' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(getByRole('button', { name: 'P1 · Atleta 1' })).toHaveAttribute('aria-pressed', 'false');
  });
});
