import { useEffect, useRef } from 'react';
import { heatDensity } from './heatmap';
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
    const values = heatDensity(points, 600, 300, radius),
      pixels = ctx.createImageData(600, 300);
    for (let i = 0; i < values.length; i++) {
      const t = 1 - Math.exp(-values[i] * intensity);
      pixels.data[i * 4] = Math.round(50 + 205 * Math.min(1, 2 * t));
      pixels.data[i * 4 + 1] = Math.round(220 - 175 * Math.max(0, 2 * t - 1));
      pixels.data[i * 4 + 2] = Math.round(205 * (1 - Math.min(1, 2 * t)));
      pixels.data[i * 4 + 3] = Math.round(230 * t);
    }
    ctx.putImageData(pixels, 0, 0);
  }, [points, radius, intensity]);
  return (
    <canvas
      ref={ref}
      width={600}
      height={300}
      className="analysis-heat-layer"
      aria-label="Densidade de ações"
    />
  );
}
