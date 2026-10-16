import { describe, expect, it } from 'vitest';
import { calculateBasketballShotValue, classifyBasketballShotZone, getTargetHoopPosition } from './BasketballGeometry';

describe('BasketballGeometry', () => {
  it('identifica corretamente arremessos de 3 pontos na zona morta (corner)', () => {
    // Canto esquerdo superior: X = 0.05 * 28 = 1.4m, Y = 0.04 * 15 = 0.6m (dentro dos 0.9m da linha lateral)
    const cornerLeftTop = { x: 0.05, y: 0.04 };
    expect(calculateBasketballShotValue(cornerLeftTop)).toBe(3);
    expect(classifyBasketballShotZone(cornerLeftTop)).toBe('corner_3');

    // Canto direito inferior: X = 0.95 * 28 = 26.6m, Y = 0.96 * 15 = 14.4m (dentro dos 0.9m da linha lateral)
    const cornerRightBottom = { x: 0.95, y: 0.96 };
    expect(calculateBasketballShotValue(cornerRightBottom)).toBe(3);
    expect(classifyBasketballShotZone(cornerRightBottom)).toBe('corner_3');
  });

  it('identifica arremessos no aro (< 2m)', () => {
    // Aro esquerdo está em (1.575, 7.5). x=0.06 -> X=1.68m, y=0.5 -> Y=7.5m
    const rimShot = { x: 0.06, y: 0.5 };
    expect(calculateBasketballShotValue(rimShot)).toBe(2);
    expect(classifyBasketballShotZone(rimShot)).toBe('rim');
  });

  it('identifica arremessos no garrafão e meia distância', () => {
    // Garrafão esquerdo: X = 0.15 * 28 = 4.2m, Y = 0.5 * 15 = 7.5m (distância ao aro ~ 2.6m)
    const paintShot = { x: 0.15, y: 0.5 };
    expect(calculateBasketballShotValue(paintShot)).toBe(2);
    expect(classifyBasketballShotZone(paintShot)).toBe('paint');

    // Meia distância: X = 0.22 * 28 = 6.16m, Y = 0.3 * 15 = 4.5m (distância ~ 5.48m < 6.75m e fora do garrafão)
    const midRangeShot = { x: 0.22, y: 0.3 };
    expect(calculateBasketballShotValue(midRangeShot)).toBe(2);
    expect(classifyBasketballShotZone(midRangeShot)).toBe('mid_range');
  });

  it('identifica arremessos de 3 pontos no perímetro (arco)', () => {
    // Cabeça do garrafão além dos 6.75m: X = 0.35 * 28 = 9.8m, Y = 0.5 * 15 = 7.5m (distância = 8.225m)
    const topOfKey3 = { x: 0.35, y: 0.5 };
    expect(calculateBasketballShotValue(topOfKey3)).toBe(3);
    expect(classifyBasketballShotZone(topOfKey3)).toBe('arc_3');
  });

  it('calcula o alvo correto da cesta', () => {
    const leftShot = { x: 0.2, y: 0.5 };
    expect(getTargetHoopPosition(leftShot)).toEqual({ x: 1.575 / 28, y: 7.5 / 15 });

    const rightShot = { x: 0.8, y: 0.5 };
    expect(getTargetHoopPosition(rightShot)).toEqual({ x: 26.425 / 28, y: 7.5 / 15 });
  });
});
