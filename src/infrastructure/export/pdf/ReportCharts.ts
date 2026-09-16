import {
  buildReportChartModel,
  type ReportChartModel,
} from '../../../application/reporting/ReportChartModel';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { ReportChartConfiguration } from '../../../domain/reporting/ReportChartConfiguration';
import { PdfDocument, PDF_COLORS } from './PdfDocument';

// Same series palette as the analysis charts, with a white print surface.
const COLORS = [
  '0.55 0.67 0.12',
  '0.12 0.64 0.59',
  '0.88 0.53 0.18',
  '0.60 0.42 0.85',
  '0.89 0.36 0.31',
  '0.30 0.55 0.85',
];
const labelValue = (value: number, percent: boolean) =>
  percent ? `${(value * 100).toFixed(1)}%` : String(value);

function drawPlot(pdf: PdfDocument, model: ReportChartModel) {
  const x = 77,
    width = 474,
    top = pdf.y - 30,
    height = Math.max(160, Math.min(285, pdf.y - 285 - model.series.length * 22)),
    bottom = top - height;
  const numbers = model.series.flatMap((series) =>
    series.values.filter((value): value is number => value !== null && Number.isFinite(value)),
  );
  if (!numbers.length || !model.categories.length) {
    pdf.rect(36, pdf.y - 180, 523, 180, PDF_COLORS.pale);
    pdf.lines(
      'Sem amostra suficiente para este gráfico no recorte selecionado.',
      60,
      pdf.y - 70,
      475,
      13,
      true,
    );
    pdf.y -= 205;
    return;
  }
  const min = model.percent && Math.min(...numbers) < 0 ? -1 : 0;
  const max = model.percent
    ? 1
    : Math.max(
        1,
        ...model.categories.map((_, i) =>
          model.kind === 'stacked'
            ? model.series.reduce((total, series) => total + (series.values[i] ?? 0), 0)
            : Math.max(...model.series.map((series) => series.values[i] ?? 0)),
        ),
      );
  const y = (value: number) => bottom + ((value - min) / (max - min)) * height;
  for (let i = 0; i <= 4; i++) {
    const value = min + ((max - min) * i) / 4;
    const axisY = y(value);
    pdf.polyline(
      [
        [x, axisY],
        [x + width, axisY],
      ],
      '0.83 0.87 0.84',
      0.5,
    );
    pdf.text(
      model.percent ? `${Math.round(value * 100)}%` : value.toFixed(value % 1 ? 1 : 0),
      38,
      axisY - 3,
      8,
      false,
      PDF_COLORS.muted,
    );
  }
  pdf.polyline(
    [
      [x, bottom],
      [x, top],
    ],
    PDF_COLORS.muted,
    0.7,
  );
  pdf.polyline(
    [
      [x, y(0)],
      [x + width, y(0)],
    ],
    PDF_COLORS.muted,
    0.8,
  );
  if (model.kind === 'line') {
    model.series.forEach((series, index) => {
      let segment: [number, number][] = [];
      const flush = () => {
        pdf.polyline(segment, COLORS[index % COLORS.length], 2);
        segment = [];
      };
      series.values.forEach((value, i) => {
        if (value === null) {
          flush();
          return;
        }
        const point: [number, number] = [
          x + (i * width) / Math.max(1, model.categories.length - 1),
          y(value),
        ];
        segment.push(point);
        if (series.values.length === 1)
          pdf.rect(point[0] - 2, point[1] - 2, 4, 4, COLORS[index % COLORS.length]);
      });
      flush();
    });
    const indexes = [
      ...new Set([0, Math.floor((model.categories.length - 1) / 2), model.categories.length - 1]),
    ];
    indexes.forEach((i) =>
      pdf.text(
        model.categories[i],
        Math.min(x + (i * width) / Math.max(1, model.categories.length - 1), 525),
        bottom - 20,
        8,
      ),
    );
    pdf.text('Sequência do jogo', x + 170, bottom - 40, 9, false, PDF_COLORS.muted);
  } else {
    const slot = width / model.categories.length;
    model.categories.forEach((category, i) => {
      let stacked = 0;
      const barWidth = model.kind === 'stacked' ? slot * 0.55 : (slot * 0.76) / model.series.length;
      model.series.forEach((series, j) => {
        const value = series.values[i];
        if (value === null || value === undefined) return;
        const start = model.kind === 'stacked' ? stacked : 0;
        const end = start + value;
        const left =
          x + i * slot + slot * 0.12 + (model.kind === 'stacked' ? slot * 0.1 : j * barWidth);
        pdf.rect(
          left,
          Math.min(y(start), y(end)),
          Math.max(1, barWidth - 2),
          Math.abs(y(end) - y(start)),
          COLORS[j % COLORS.length],
        );
        if (model.kind === 'stacked') stacked = end;
        if (model.series.length <= 2 && model.kind !== 'stacked')
          pdf.text(
            labelValue(value, model.percent),
            left,
            value >= 0 ? y(end) + 6 : y(end) - 11,
            7,
            true,
          );
      });
      pdf.lines(category, x + i * slot + 3, bottom - 18, slot - 6, 8);
      if (model.kind === 'stacked')
        pdf.text(String(stacked), x + i * slot + slot * 0.4, y(stacked) + 7, 9, true);
    });
  }
  pdf.y = bottom - 95;
  model.series.forEach((series, index) => {
    pdf.rect(43, pdf.y - 1, 10, 10, COLORS[index % COLORS.length]);
    pdf.y -= pdf.lines(series.label, 62, pdf.y, 480, 9) + 7;
  });
  pdf.y -= 6;
  pdf.paragraph(
    model.percent
      ? model.kind === 'line'
        ? 'Escala em percentual. Estimativa baseada no placar; as linhas representam as equipes.'
        : 'Escala em percentual. Zero fica na linha de base; métricas sem amostra não são estimadas.'
      : 'Altura das barras: volume de ataques. Cores: atacantes do recorte selecionado.',
    8,
  );
}

export function drawSelectedReportChart(
  pdf: PdfDocument,
  report: MatchReportModel,
  chart: ReportChartConfiguration,
) {
  const model = buildReportChartModel(report, chart);
  const categoryChunks =
    model.kind === 'line'
      ? [model.categories]
      : Array.from({ length: Math.max(1, Math.ceil(model.categories.length / 6)) }, (_, i) =>
          model.categories.slice(i * 6, i * 6 + 6),
        );
  const seriesChunks = Array.from(
    { length: Math.max(1, Math.ceil(model.series.length / 6)) },
    (_, i) => model.series.slice(i * 6, i * 6 + 6),
  );
  let part = 0;
  const parts = categoryChunks.length * seriesChunks.length;
  categoryChunks.forEach((categories, categoryIndex) => {
    seriesChunks.forEach((series) => {
      pdf.page(chart.title || 'Gráfico selecionado', part > 0);
      pdf.paragraph(model.scope, 11);
      if (parts > 1)
        pdf.paragraph(
          `Gráfico em partes: ${++part}/${parts}. Categorias e séries mantidas na seleção.`,
          8,
        );
      pdf.paragraph(
        `Amostra atual da partida: ${report.eventCount} ações / ${report.coverage?.identifiedActions ?? report.eventCount} com atleta identificado.`,
        8,
      );
      drawPlot(pdf, {
        ...model,
        categories,
        series: series.map((item) => ({
          ...item,
          values:
            model.kind === 'line'
              ? item.values
              : item.values.slice(categoryIndex * 6, categoryIndex * 6 + 6),
        })),
      });
    });
  });
}
