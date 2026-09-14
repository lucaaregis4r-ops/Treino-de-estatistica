import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ScoutModeSelector } from './ScoutModeSelector';

afterEach(cleanup);

describe('ScoutModeSelector', () => {
  it('apresenta o Gestual como um único modo ativo', () => {
    const onChange = vi.fn();
    const { getAllByRole, getByRole } = render(
      <ScoutModeSelector mode="gesture" onChange={onChange} />,
    );

    const selected = getAllByRole('button').filter(
      (button) => button.getAttribute('aria-pressed') === 'true',
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Gestual');

    fireEvent.click(getByRole('button', { name: 'Digitado' }));
    expect(onChange).toHaveBeenCalledWith('typed');
  });
});
