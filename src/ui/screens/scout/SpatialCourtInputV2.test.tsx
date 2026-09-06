import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpatialCourtInputV2 } from './SpatialCourtInputV2';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SpatialCourtInputV2', () => {
  it('captures origin then destination and draws the exact trajectory', () => {
    const onConfirm = vi.fn();
    render(<SpatialCourtInputV2 isEnabled onConfirm={onConfirm} />);
    const surface = screen.getByRole('button', { name: 'Quadra espacial clicável' });
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: 400,
      height: 200,
      right: 410,
      bottom: 220,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    });

    fireEvent.click(surface, { clientX: 110, clientY: 70 });
    expect(screen.getByRole('status')).toHaveTextContent('Marque o destino');
    expect(screen.getByLabelText('Origem')).toHaveStyle({ left: '25%', top: '25%' });

    fireEvent.click(surface, { clientX: 310, clientY: 170 });
    expect(screen.getByRole('status')).toHaveTextContent('Trajetória registrada');
    expect(screen.getByLabelText('Destino')).toHaveStyle({ left: '75%', top: '75%' });
    const line = surface.querySelector('line');
    expect(line).toHaveAttribute('x1', '25%');
    expect(line).toHaveAttribute('y1', '25%');
    expect(line).toHaveAttribute('x2', '75%');
    expect(line).toHaveAttribute('y2', '75%');

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenLastCalledWith({
      origin: { surface: 'court', x: 0.25, y: 0.25 },
      destination: { surface: 'court', x: 0.75, y: 0.75 },
    });
    fireEvent.click(surface, { clientX: 210, clientY: 120 });
    expect(onConfirm).toHaveBeenLastCalledWith({
      origin: { surface: 'court', x: 0.25, y: 0.25 },
      destination: { surface: 'court', x: 0.5, y: 0.5 },
    });
  });
});
