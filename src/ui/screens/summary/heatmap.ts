export function heatDensity(
  points: readonly { x: number; y: number }[],
  width: number,
  height: number,
  radius: number,
) {
  const values = new Float32Array(width * height),
    r = radius * height;
  for (const p of points) {
    const cx = p.x * width,
      cy = p.y * height;
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(height, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(width, Math.ceil(cx + r)); x++) {
        const d = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r);
        if (d < 1) values[y * width + x] += (1 - d) ** 2;
      }
  }
  return values;
}
