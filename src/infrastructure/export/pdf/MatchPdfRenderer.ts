import type { ReportDraft } from '../../../application/reporting/ReportDraft';
import { drawReportPages } from './ReportLayout';
import type { MatchReportModel } from '../../../application/reporting/MatchReportModel';
import type { ReportChartConfiguration } from '../../../domain/reporting/ReportChartConfiguration';
import type { DerivedAnalyticsReport } from '../../../application/reporting/DerivedAnalyticsReport';

export class MatchPdfRenderer {
  render(
    report: MatchReportModel,
    selectedCharts?: readonly ReportChartConfiguration[],
    derivedAnalytics?: DerivedAnalyticsReport,
    draft?: ReportDraft,
  ): string {
    const derivedPage = derivedAnalytics
      ? [
          'ANALYTICS DERIVADO (OPT-IN)',
          `Metodo ${derivedAnalytics.methodVersion} | Esporte ${derivedAnalytics.sport}`,
          `Amostra ${derivedAnalytics.sample.n} ${derivedAnalytics.sample.unit} | Filtros ${JSON.stringify(derivedAnalytics.filters)}`,
          `Zonas ${derivedAnalytics.coordinateSystem.zoneSystemId} v${derivedAnalytics.coordinateSystem.zoneSystemVersion} | Resolucao ${derivedAnalytics.coordinateSystem.resolution}x${derivedAnalytics.coordinateSystem.resolution}`,
          `Suavizacao ${derivedAnalytics.smoothing.method}`,
          ...derivedAnalytics.teams.flatMap((team) => [
            `Equipe ${team.teamId} | Rallies ${team.rallies.total} (${team.rallies.complete} completos, ${team.rallies.incomplete} incompletos)`,
            ...team.transitions.map(
              (item) =>
                `Transicao ${item.from}->${item.to} | n=${item.count} | p=${item.probability ?? '-'} | delta=${item.deltaPointProbability ?? '-'}`,
            ),
            ...Object.values(team.spatial).flatMap((spatial) =>
              spatial.regions.map(
                (item) =>
                  `Espacial ${item.skill}/${item.spatialRole} ${item.regionId ?? `${item.originRegionId}->${item.targetRegionId}`} | n=${item.n} ${item.sampleUnit} | baseline=${item.baselinePointProbability ?? '-'} | delta=${item.deltaVsBaseline ?? '-'}`,
              ),
            ),
          ]),
        ]
      : undefined;

    const includeSummary = draft ? draft.sections.includes('summary') : true;
    return drawReportPages(
      [
        ...(includeSummary ? [['SCOUT TRAINER - RELATORIO POS-JOGO']] : []),
        ...(derivedPage ? [derivedPage] : []),
      ],
      report,
      draft,
      selectedCharts ?? [],
    );
  }
}
