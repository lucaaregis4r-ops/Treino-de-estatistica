import { expect, it } from 'vitest';
import { heatDensity } from './heatmap';
it('accumulates radial density, clips boundaries and preserves positions across resolutions', () => {
  const points=[{x:0,y:0},{x:.5,y:.5},{x:1,y:1}];
  const one=heatDensity(points,200,100,.1);
  const two=heatDensity([...points,...points],200,100,.1);
  expect(one[50*200+100]).toBe(1);
  expect(two[50*200+100]).toBe(2);
  expect(one[0]).toBe(1);
  expect(one[99*200+199]).toBeGreaterThan(.9);
  expect(one[50*200+120]).toBe(0);
  expect(heatDensity(points,400,200,.1)[100*400+200]).toBe(one[50*200+100]);
});
