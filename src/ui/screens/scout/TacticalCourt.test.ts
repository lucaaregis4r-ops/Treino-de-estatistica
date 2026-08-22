import { describe, expect, it } from 'vitest';
import { normalizedCourtPoint } from './courtGeometry';

describe('normalizedCourtPoint', () => {
  it('normalizes and clamps pointer coordinates inside the court', () => {
    const rectangle = { left: 100, top: 50, width: 300, height: 200 };
    expect(normalizedCourtPoint(250, 100, rectangle)).toEqual({ x: 0.5, y: 0.25 });
    expect(normalizedCourtPoint(0, 400, rectangle)).toEqual({ x: 0, y: 1 });
  });
});
