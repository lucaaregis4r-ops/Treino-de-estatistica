import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SpatialCourtSurface } from './SpatialCourtSurface';

describe('SpatialCourtSurface', () => {
  it('renders the shared court, trajectory and endpoint markers', () => {
    const { container, getByLabelText } = render(
      <SpatialCourtSurface origin={{ x: 0.2, y: 0.3 }} destination={{ x: 0.8, y: 0.7 }} />,
    );
    expect(container.querySelector('.spatial-v2-surface')).toBeInTheDocument();
    expect(container.querySelectorAll('.spatial-v2-attack-line')).toHaveLength(2);
    expect(container.querySelector('.spatial-v2-net')).toBeInTheDocument();
    expect(container.querySelector('.spatial-v2-trajectory')).toBeInTheDocument();
    expect(getByLabelText('Origem')).toBeInTheDocument();
    expect(getByLabelText('Destino')).toBeInTheDocument();
  });
});
