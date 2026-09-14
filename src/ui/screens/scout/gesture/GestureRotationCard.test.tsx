import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GestureRotationCard } from './GestureRotationCard';

describe('GestureRotationCard', () => {
  it('keeps the volleyball position order in the compact court', () => {
    const workspace = {
      teams: [{ id: 'a', name: 'Equipe A' }, { id: 'b', name: 'Equipe B' }],
      currentLineups: [],
      players: [],
      state: { servingTeamId: 'a', tacticalStateByTeamId: {} },
    } as never;
    render(<GestureRotationCard workspace={workspace} teamId="a" />);
    expect(screen.getAllByText(/^P[1-6]$/).map((item) => item.textContent)).toEqual([
      'P4', 'P3', 'P2', 'P5', 'P6', 'P1',
    ]);
    expect(screen.getByText('SACANDO')).toBeInTheDocument();
  });
});
