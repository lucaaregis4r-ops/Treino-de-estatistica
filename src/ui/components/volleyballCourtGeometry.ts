/** Scout sectors, in each team's perspective. The dashed sector boundary is not
 * the official 3 m attack line. Coordinates match CourtGeometry's full court. */
export const VOLLEYBALL_ZONE_ORDER = [4, 3, 2, 5, 6, 1] as const;
export const VOLLEYBALL_ZONES = [
  { id: 4, lateral: 1 / 6, depth: 1 / 4, name: 'Entrada de rede' },
  { id: 3, lateral: 1 / 2, depth: 1 / 4, name: 'Centro da rede' },
  { id: 2, lateral: 5 / 6, depth: 1 / 4, name: 'Saída de rede' },
  { id: 5, lateral: 1 / 6, depth: 3 / 4, name: 'Fundo esquerdo' },
  { id: 6, lateral: 1 / 2, depth: 3 / 4, name: 'Fundo central' },
  { id: 1, lateral: 5 / 6, depth: 3 / 4, name: 'Fundo direito · saque' },
] as const;

export const VOLLEYBALL_COURT_SECTORS = (['left', 'right'] as const).flatMap((side) =>
  VOLLEYBALL_ZONES.map((zone) => ({
    ...zone, side, key: `${side}-${zone.id}`,
    x: side === 'left' ? (1 - zone.depth) / 2 : .5 + zone.depth / 2,
    y: side === 'left' ? zone.lateral : 1 - zone.lateral,
  })),
);

export function volleyballSectorAt(point: { x: number; y: number }) {
  if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return undefined;
  const side = point.x < .5 ? 'left' : 'right';
  return VOLLEYBALL_COURT_SECTORS.find((sector) => sector.side === side &&
    Math.abs(point.x - sector.x) <= .125 + Number.EPSILON && Math.abs(point.y - sector.y) <= 1 / 6 + Number.EPSILON);
}

