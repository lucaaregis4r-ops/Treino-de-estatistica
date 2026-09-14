import { describe, expect, it } from 'vitest';
import { framePointToSpatialPoint } from './CourtGeometry';

const spatialFrame = {
  frame: { left: 0, top: 0, width: 400, height: 300 },
  court: { left: 100, top: 50, width: 200, height: 200 },
  serviceZone: { left: 50, top: 50, width: 40, height: 200 },
};

describe('framePointToSpatialPoint', () => {
  it('maps points inside the court to the existing court coordinates', () => {
    expect(framePointToSpatialPoint(200, 150, spatialFrame)).toEqual({
      surface: 'court',
      x: 0.5,
      y: 0.5,
    });
  });

  it('maps points in the service strip to serviceZone coordinates', () => {
    expect(framePointToSpatialPoint(70, 150, spatialFrame)).toEqual({
      surface: 'serviceZone',
      x: 0.5,
      y: 0.5,
    });
  });

  it('maps points outside the court to normalized outZone frame coordinates', () => {
    expect(framePointToSpatialPoint(380, 270, spatialFrame)).toEqual({
      surface: 'outZone',
      x: 0.95,
      y: 0.9,
    });
  });
});
