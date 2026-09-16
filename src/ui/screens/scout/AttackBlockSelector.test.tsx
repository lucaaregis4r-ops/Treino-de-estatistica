import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AttackBlockSelector } from './AttackBlockSelector';

it('starts with no block and only asks for blockers after a block is selected', () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <AttackBlockSelector
      value="none"
      blockerIds={[]}
      blockers={[
        { id: 'middle', label: '#3 Central', position: 3 },
        { id: 'outside', label: '#4 Ponta', position: 4 },
      ]}
      onChange={onChange}
      onBlockersChange={vi.fn()}
    />,
  );

  expect(screen.getByRole('radio', { name: 'Sem bloqueio' })).toBeChecked();
  expect(screen.queryByRole('group', { name: 'Bloqueadores' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Ponto de bloqueio' }));
  expect(onChange).toHaveBeenCalledWith('point');
  rerender(
    <AttackBlockSelector
      value="point"
      blockerIds={[]}
      blockers={[{ id: 'middle', label: '#3 Central', position: 3 }]}
      onChange={onChange}
      onBlockersChange={vi.fn()}
    />,
  );
  expect(screen.getByRole('group', { name: 'Bloqueadores' })).toBeInTheDocument();
});
