import type { MatchReportModel } from './MatchReportModel';
import type { ReportChartConfiguration } from '../../domain/reporting/ReportChartConfiguration';

export interface ReportChartModel {
  readonly kind: 'bars' | 'stacked' | 'line';
  readonly percent: boolean;
  readonly categories: readonly string[];
  readonly series: readonly {
    readonly label: string;
    readonly values: readonly (number | null)[];
  }[];
  readonly scope: string;
}

export function buildReportChartModel(
  report: MatchReportModel,
  chart: ReportChartConfiguration,
): ReportChartModel {
  const { teamId, playerId, setterPosition } = chart.filters;
  const teamName = (id: string) => report.teams.find((team) => team.id === id)?.name ?? id;
  const playerName = (id: string) => {
    const player = report.players.find((item) => item.id === id);
    return player ? `#${player.number} ${player.name}` : id;
  };
  const scope = teamId ? teamName(teamId) : 'Todas as equipes';
  switch (chart.type) {
    case 'win_probability': {
      const points = report.winProbability?.points ?? [];
      return {
        kind: 'line',
        percent: true,
        scope: 'Evolução do placar · estimativa de vitória',
        categories: points.map((point) => String(point.sequence)),
        series: [
          {
            label: report.teams[0]?.name ?? 'Equipe A',
            values: points.map((point) => point.teamA),
          },
          {
            label: report.teams[1]?.name ?? 'Equipe B',
            values: points.map((point) => point.teamB),
          },
        ],
      };
    }
    case 'team_performance': {
      const metrics = [
        'attackEfficiency',
        'serveEfficiency',
        'receptionPositive',
        'sideout',
        'breakpoint',
      ] as const;
      return {
        kind: 'bars',
        percent: true,
        scope,
        categories: ['Ataque', 'Saque', 'Recepção +', 'Sideout', 'Breakpoint'],
        series: report.teamSummary
          .filter((row) => !teamId || row.teamId === teamId)
          .map((row) => ({
            label: teamName(row.teamId),
            values: metrics.map((key) => row[key].value),
          })),
      };
    }
    case 'rotation_performance': {
      const rows = report.rotations
        .filter((row) => !teamId || row.teamId === teamId)
        .sort((a, b) => a.teamId.localeCompare(b.teamId) || a.rotation - b.rotation);
      const metrics = [
        ['sideout', 'Sideout'],
        ['breakpoint', 'Breakpoint'],
        ['attackEfficiency', 'Ataque'],
        ['receptionPositive', 'Recepção +'],
      ] as const;
      return {
        kind: 'bars',
        percent: true,
        scope,
        categories: rows.map(
          (row) => `${teamId ? '' : `${teamName(row.teamId)} / `}P${row.rotation}`,
        ),
        series: metrics.map(([key, label]) => ({
          label,
          values: rows.map((row) => row[key].value),
        })),
      };
    }
    case 'setter_distribution': {
      const rows = report.setterDistribution.filter(
        (row) =>
          (!teamId || row.teamId === teamId) &&
          (!playerId || row.attackerPlayerId === playerId) &&
          (!setterPosition || row.setterPosition === setterPosition),
      );
      const positions = setterPosition ? [setterPosition] : [1, 2, 3, 4, 5, 6];
      const attackers = [...new Set(rows.map((row) => row.attackerPlayerId))];
      return {
        kind: 'stacked',
        percent: false,
        scope: `${scope}${playerId ? ` / ${playerName(playerId)}` : ''}${setterPosition ? ` / P${setterPosition}` : ''}`,
        categories: positions.map((position) => `P${position}`),
        series: attackers.map((id) => ({
          label: playerName(id),
          values: positions.map((position) =>
            rows
              .filter((row) => row.attackerPlayerId === id && row.setterPosition === position)
              .reduce((total, row) => total + row.volume, 0),
          ),
        })),
      };
    }
    case 'attack_evenness': {
      const rows = report.advanced.attackEvenness.filter(
        (row) =>
          (!teamId || row.teamId === teamId) &&
          row.setterPosition &&
          (!setterPosition || row.setterPosition === setterPosition) &&
          !row.rotation &&
          !row.phase &&
          !row.receptionGrade,
      );
      return {
        kind: 'bars',
        percent: true,
        scope: `${scope}${setterPosition ? ` / P${setterPosition}` : ''}`,
        categories: rows.map(
          (row) => `${teamId ? '' : `${teamName(row.teamId)} / `}P${row.setterPosition}`,
        ),
        series: [
          {
            label: 'Uniformidade',
            values: rows.map((row) => (row.evenness.available ? row.evenness.value : null)),
          },
        ],
      };
    }
    case 'setter_repetition': {
      const rows = report.advanced.setterRepetition.filter(
        (row) =>
          (!teamId || row.teamId === teamId) && (!playerId || row.attackerPlayerId === playerId),
      );
      const categories = [
        ['overall', 'Geral'],
        ['after_point', 'Após ponto'],
        ['after_error', 'Após erro'],
        ['after_blocked', 'Após bloqueio'],
      ] as const;
      const pairs = [
        ...new Map(
          rows.map((row) => [`${row.setterPlayerId}/${row.attackerPlayerId}`, row]),
        ).values(),
      ];
      return {
        kind: 'bars',
        percent: true,
        scope: `${scope}${playerId ? ` / ${playerName(playerId)}` : ''}`,
        categories: pairs.map(
          (row) => `${playerName(row.setterPlayerId)} → ${playerName(row.attackerPlayerId)}`,
        ),
        series: categories.map(([key, label]) => ({
          label,
          values: pairs.map(
            (pair) =>
              rows.find(
                (row) =>
                  row.setterPlayerId === pair.setterPlayerId &&
                  row.attackerPlayerId === pair.attackerPlayerId &&
                  row.category === key,
              )?.repeatRate.value ?? null,
          ),
        })),
      };
    }
  }
}
