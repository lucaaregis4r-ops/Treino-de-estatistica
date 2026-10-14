import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { volleyballSectorAt } from './volleyballCourtGeometry';
import { VolleyballCourtOverlay } from './VolleyballCourtZones';

describe('six-zone volleyball court', () => {
  it('mirrors team perspectives and identifies all twelve displayed sectors', () => {
    const left = [[5, 4], [6, 3], [1, 2]];
    const right = [[2, 1], [3, 6], [4, 5]];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const sector = volleyballSectorAt({ x: (col + .5) / 4, y: (row + .5) / 3 });
        expect(sector?.id).toBe((col < 2 ? left : right)[row][col % 2]);
        expect(sector?.side).toBe(col < 2 ? 'left' : 'right');
      }
    }
    expect(volleyballSectorAt({ x: -.1, y: .5 })).toBeUndefined();
  });
  it('uses twelve sector labels and separate official attack lines', () => {
    const { container } = render(<VolleyballCourtOverlay activeZone="left-4" />);
    expect(container.querySelectorAll('text')).toHaveLength(12);
    expect(container.querySelectorAll('.is-active')).toHaveLength(1);
    expect(container.querySelectorAll('.volleyball-attack-line')).toHaveLength(2);
  });
});
