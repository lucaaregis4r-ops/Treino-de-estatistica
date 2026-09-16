// Preview of our own PdfDocument drawing commands; not a general PDF parser.
// Coordinates, text, wrapping and page breaks come from the exported PDF itself.
function xml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!,
  );
}

function color(value: string): string {
  return `rgb(${value
    .split(' ')
    .map((channel) => Math.round(Number(channel) * 255))
    .join(',')})`;
}

export function matchPdfPreviewPages(pdf: string): readonly string[] {
  return [...pdf.matchAll(/\nstream\n([\s\S]*?)\nendstream/g)].map(([, stream]) => {
    const elements: string[] = [];
    for (const command of stream.split('\n')) {
      const path = command.match(/^q ([\d.]+ [\d.]+ [\d.]+) RG ([\d.]+) w (.+) S Q$/);
      if (path) {
        const points = [...path[3].matchAll(/([\d.e+-]+) ([\d.e+-]+) [ml]/g)]
          .map(([, x, y]) => `${Number(x)},${842 - Number(y)}`)
          .join(' ');
        elements.push(
          `<polyline points="${points}" fill="none" stroke="${color(path[1])}" stroke-width="${path[2]}"/>`,
        );
        continue;
      }
      const rectangle = command.match(
        /^q ([\d.]+ [\d.]+ [\d.]+) rg ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+) re f Q$/,
      );
      if (rectangle) {
        const [, fill, x, y, width, height] = rectangle;
        elements.push(
          `<rect x="${x}" y="${842 - Number(y) - Number(height)}" width="${width}" height="${height}" fill="${color(fill)}"/>`,
        );
        continue;
      }
      const text = command.match(
        /^BT \/(F[12]) ([\d.]+) Tf ([\d.]+ [\d.]+ [\d.]+) rg ([\d.-]+) ([\d.-]+) Td \((.*)\) Tj ET$/,
      );
      if (text) {
        const [, font, size, fill, x, y, encoded] = text;
        const value = encoded.replace(/\\([0-7]{3}|[\\()])/g, (_, code: string) =>
          code.length === 3 ? String.fromCharCode(parseInt(code, 8)) : code,
        );
        elements.push(
          `<text x="${x}" y="${842 - Number(y)}" font-size="${size}" font-weight="${font === 'F2' ? '700' : '400'}" fill="${color(fill)}">${xml(value)}</text>`,
        );
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="595" height="842" viewBox="0 0 595 842"><rect width="595" height="842" fill="white"/><g font-family="Helvetica,Arial,sans-serif">${elements.join('')}</g></svg>`;
  });
}
