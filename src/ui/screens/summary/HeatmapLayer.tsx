import { useEffect, useRef } from 'react';
import { heatDensity } from './heatmap';

// Precomputed 256-entry lookup table for Slate Precision scientific thermal heatmap
// Stops:
// 0.00 -> Transparent
// 0.25 -> Cobalt [59, 130, 246, 0.4]
// 0.50 -> Turquoise / Cyan [6, 182, 212, 0.6]
// 0.75 -> Sport Amber [234, 179, 8, 0.8]
// 1.00 -> Intense Crimson [244, 63, 94, 0.95]
const LUT = (() => {
  const table = new Uint8ClampedArray(256 * 4);
  const stops = [
    { pos: 0.0, r: 11, g: 15, b: 25, a: 0 },
    { pos: 0.25, r: 59, g: 130, b: 246, a: 102 },
    { pos: 0.5, r: 6, g: 182, b: 212, a: 153 },
    { pos: 0.75, r: 234, g: 179, b: 8, a: 204 },
    { pos: 1.0, r: 244, g: 63, b: 94, a: 242 },
  ];

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let stopIdx = 0;
    while (stopIdx < stops.length - 1 && stops[stopIdx + 1].pos < t) {
      stopIdx++;
    }
    const s0 = stops[stopIdx];
    const s1 = stops[Math.min(stopIdx + 1, stops.length - 1)];
    const factor = s1.pos === s0.pos ? 0 : (t - s0.pos) / (s1.pos - s0.pos);

    const base = i * 4;
    table[base] = Math.round(s0.r + (s1.r - s0.r) * factor);
    table[base + 1] = Math.round(s0.g + (s1.g - s0.g) * factor);
    table[base + 2] = Math.round(s0.b + (s1.b - s0.b) * factor);
    table[base + 3] = Math.round(s0.a + (s1.a - s0.a) * factor);
  }
  return table;
})();

export function HeatmapLayer({
  points,
  radius,
  intensity,
}: {
  points: readonly { x: number; y: number }[];
  radius: number;
  intensity: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const width = 600;
    const height = 300;
    const values = heatDensity(points, width, height, radius);
    const pixels = ctx.createImageData(width, height);
    const data = pixels.data;

    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v <= 0) continue;
      const t = Math.min(1, 1 - Math.exp(-v * intensity));
      const lutIndex = Math.min(255, Math.floor(t * 255)) * 4;
      const px = i * 4;
      data[px] = LUT[lutIndex];
      data[px + 1] = LUT[lutIndex + 1];
      data[px + 2] = LUT[lutIndex + 2];
      data[px + 3] = LUT[lutIndex + 3];
    }
    ctx.putImageData(pixels, 0, 0);
  }, [points, radius, intensity]);

  return (
    <canvas
      ref={ref}
      width={600}
      height={300}
      className="analysis-heat-layer"
      aria-label="Densidade de ações com interpolação contínua"
    />
  );
}
