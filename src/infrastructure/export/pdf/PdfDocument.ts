// A4 layout in points. Streams stay ASCII so folder export can safely write strings.
export const PDF_COLORS = {
  ink: '0.063 0.090 0.082',
  surface: '0.094 0.129 0.118',
  muted: '0.36 0.43 0.39',
  accent: '0.847 0.953 0.416',
  blue: '0.514 0.714 0.922',
  purple: '0.827 0.651 0.835',
  pale: '0.95 0.96 0.94',
};

function escapePdf(value: string): string {
  return Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);
      if ('\\()'.includes(character)) return `\\${character}`;
      if (code >= 32 && code < 127) return character;
      if (code >= 160 && code <= 255) return `\\${code.toString(8).padStart(3, '0')}`;
      return (
        (
          { '–': '-', '—': '-', '→': '>', '‘': "'", '’': "'", '“': '"', '”': '"' } as Record<
            string,
            string
          >
        )[character] ?? ' '
      );
    })
    .join('');
}

function width(text: string, size: number): number {
  return (
    Array.from(text).reduce(
      (sum, char) => sum + (/[MW@%]/.test(char) ? 1 : /[ilI.,:;!|' ]/.test(char) ? 0.28 : 0.61),
      0,
    ) * size
  );
}

function wrap(text: string, available: number, size: number): string[] {
  return text.split('\n').flatMap((paragraph) => {
    const lines: string[] = [];
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (line && width(`${line} ${word}`, size) > available) {
        lines.push(line);
        line = '';
      }
      for (const character of `${line ? ' ' : ''}${word}`) {
        if (width(line + character, size) > available) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    lines.push(line);
    return lines;
  });
}

export class PdfDocument {
  private pages: string[][] = [];
  private commands: string[] = [];
  private title = '';
  y = 710;

  constructor(private readonly matchName: string) {}

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.commands.push(`q ${color} rg ${x} ${y} ${w} ${h} re f Q`);
  }

  polyline(points: readonly (readonly [number, number])[], color: string, thickness = 1) {
    if (!points.length) return;
    const path = points.map(([x, y], index) => `${x} ${y} ${index === 0 ? 'm' : 'l'}`).join(' ');
    this.commands.push(`q ${color} RG ${thickness} w ${path} S Q`);
  }

  text(value: string, x: number, y: number, size = 10, bold = false, color = PDF_COLORS.ink) {
    this.commands.push(
      `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg ${x} ${y} Td (${escapePdf(value)}) Tj ET`,
    );
  }

  lines(
    value: string,
    x: number,
    y: number,
    available: number,
    size = 10,
    bold = false,
    color = PDF_COLORS.ink,
  ): number {
    const lines = wrap(value, available, size);
    lines.forEach((line, index) => this.text(line, x, y - index * size * 1.4, size, bold, color));
    return lines.length * size * 1.4;
  }

  page(title: string, continued = false) {
    this.title = title;
    this.commands = [];
    this.pages.push(this.commands);
    const headerBottom = 760 - Math.max(0, wrap(title, 490, 15).length - 1) * 21;
    this.rect(0, headerBottom, 595, 842 - headerBottom, PDF_COLORS.ink);
    this.rect(36, 771, 3, 45, PDF_COLORS.accent);
    this.text('SCOUT TRAINER', 49, 804, 10, true, PDF_COLORS.accent);
    this.lines(title, 49, 781, 490, 15, true, '1 1 1');
    const matchHeight = this.lines(
      this.matchName + (continued ? ' / continuação' : ''),
      36,
      headerBottom - 20,
      523,
      8,
      false,
      PDF_COLORS.muted,
    );
    this.y = headerBottom - 38 - matchHeight;
  }

  ensure(height: number) {
    if (this.y - height < 58) this.page(this.title, true);
  }

  heading(text: string) {
    this.ensure(120);
    this.y -= 8;
    this.rect(36, this.y - 6, 3, 18, PDF_COLORS.accent);
    this.y -= this.lines(text, 47, this.y, 512, 10, true) + 13;
  }

  paragraph(text: string, size = 10) {
    for (const line of wrap(text, 523, size)) {
      this.ensure(size * 1.5);
      this.text(line, 36, this.y, size, false, PDF_COLORS.muted);
      this.y -= size * 1.5;
    }
    this.y -= 8;
  }

  table(
    headers: readonly string[],
    rows: readonly (readonly string[])[],
    weights?: readonly number[],
  ) {
    const proportions = headers.map((_, index) => weights?.[index] ?? (index === 0 ? 1.8 : 1));
    const sum = proportions.reduce((a, b) => a + b, 0);
    const widths = proportions.map((weight) => (weight / sum) * 523);
    const size = headers.length > 7 ? 8 : 9;
    const leading = size * 1.4;
    const headerLines = headers.map((cell, index) => wrap(cell, widths[index] - 14, size));
    const headerHeight = Math.max(...headerLines.map((lines) => lines.length)) * leading + 16;
    const drawRow = (cells: string[][], height: number, header: boolean, stripe: boolean) => {
      this.rect(
        36,
        this.y - height + 10,
        523,
        height,
        header ? PDF_COLORS.surface : stripe ? PDF_COLORS.pale : '1 1 1',
      );
      let x = 36;
      cells.forEach((lines, index) => {
        lines.forEach((line, i) =>
          this.text(
            line,
            x + 7,
            this.y - 3 - i * leading,
            size,
            header,
            header ? '1 1 1' : PDF_COLORS.ink,
          ),
        );
        x += widths[index];
      });
      this.y -= height;
    };
    this.ensure(headerHeight + 48);
    drawRow(headerLines, headerHeight, true, false);
    if (!rows.length) {
      this.y -= 7;
      this.paragraph('Sem dados registrados para esta seção.', 9);
    }
    rows.forEach((row, rowIndex) => {
      const cells = headers.map((_, index) => wrap(row[index] ?? '-', widths[index] - 14, size));
      const lineCount = Math.max(...cells.map((lines) => lines.length));
      let offset = 0;
      while (offset < lineCount) {
        const fullHeight = (lineCount - offset) * leading + 16;
        if (this.y - Math.min(fullHeight, 550) < 58) {
          this.page(this.title, true);
          drawRow(headerLines, headerHeight, true, false);
        }
        const count = Math.max(
          1,
          Math.min(lineCount - offset, Math.floor((this.y - 74) / leading)),
        );
        drawRow(
          cells.map((lines) => lines.slice(offset, offset + count)),
          count * leading + 16,
          false,
          rowIndex % 2 === 0,
        );
        offset += count;
      }
    });
    this.y -= 22;
  }

  build(): string {
    this.pages.forEach((commands, index) => {
      this.commands = commands;
      this.rect(36, 40, 523, 0.6, '0.80 0.84 0.81');
      this.text('SCOUT TRAINER / ANÁLISE DE DESEMPENHO', 36, 25, 7, true, PDF_COLORS.muted);
      this.text(`${index + 1} / ${this.pages.length}`, 521, 25, 8, false, PDF_COLORS.muted);
    });
    const fontId = this.pages.length * 2 + 3;
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Count ${this.pages.length} /Kids [${this.pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] >>`,
    ];
    this.pages.forEach((commands, index) => {
      const stream = commands.join('\n');
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontId + 1} 0 R >> >> /Contents ${4 + index * 2} 0 R >>`,
      );
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    });
    objects.push(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    );
    objects.push(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    );
    let document = '%PDF-1.4\n%ScoutTrainer\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(document.length);
      document += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = document.length;
    document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      document += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    return (
      document + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
    );
  }
}
