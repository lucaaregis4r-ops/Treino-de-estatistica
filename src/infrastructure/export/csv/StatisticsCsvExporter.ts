import type {
  AuditableMetric,
  MatchReportModel,
} from '../../../application/reporting/MatchReportModel';

function csv(value: string | number | undefined): string {
  const text = value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function metricRow(
  section: string,
  teamId: string,
  playerId: string | undefined,
  rotation: number | undefined,
  metric: string,
  value: AuditableMetric,
): readonly (string | number | undefined)[] {
  return [
    section,
    teamId,
    playerId,
    rotation,
    metric,
    value.numerator,
    value.denominator,
    value.value ?? '',
  ];
}

export class StatisticsCsvExporter {
  export(report: MatchReportModel): string {
    const rows: (readonly (string | number | undefined)[])[] = [
      [
        'section',
        'team_id',
        'player_id',
        'rotation',
        'metric',
        'numerator',
        'denominator',
        'value',
      ],
    ];
    report.attack.forEach((row) => {
      rows.push(
        metricRow('attack', row.teamId, row.playerId, undefined, 'point_rate', row.pointRate),
      );
      rows.push(
        metricRow('attack', row.teamId, row.playerId, undefined, 'error_rate', row.errorRate),
      );
      rows.push(
        metricRow('attack', row.teamId, row.playerId, undefined, 'blocked_rate', row.blockedRate),
      );
      rows.push(
        metricRow('attack', row.teamId, row.playerId, undefined, 'efficiency', row.efficiency),
      );
    });
    report.serve.forEach((row) => {
      rows.push(metricRow('serve', row.teamId, row.playerId, undefined, 'ace_rate', row.aceRate));
      rows.push(
        metricRow('serve', row.teamId, row.playerId, undefined, 'error_rate', row.errorRate),
      );
      rows.push(
        metricRow('serve', row.teamId, row.playerId, undefined, 'efficiency', row.efficiency),
      );
    });
    report.reception.forEach((row) => {
      rows.push(
        metricRow('reception', row.teamId, row.playerId, undefined, 'positive', row.positiveRate),
      );
      rows.push(
        metricRow('reception', row.teamId, row.playerId, undefined, 'excellent', row.excellentRate),
      );
    });
    report.rotations.forEach((row) => {
      rows.push(metricRow('rotation', row.teamId, undefined, row.rotation, 'sideout', row.sideout));
      rows.push(
        metricRow('rotation', row.teamId, undefined, row.rotation, 'breakpoint', row.breakpoint),
      );
      rows.push(
        metricRow(
          'rotation',
          row.teamId,
          undefined,
          row.rotation,
          'attack_efficiency',
          row.attackEfficiency,
        ),
      );
      rows.push(
        metricRow(
          'rotation',
          row.teamId,
          undefined,
          row.rotation,
          'reception_positive',
          row.receptionPositive,
        ),
      );
    });
    report.tactical.attackBySetterPosition.forEach((row) => {
      rows.push(
        metricRow(
          'attack_setter_position',
          row.teamId,
          row.playerId,
          row.setterPosition,
          'efficiency',
          row.efficiency,
        ),
      );
    });
    report.tactical.directionsBySetterPosition.forEach((row) => {
      rows.push(
        metricRow(
          'direction_setter_position',
          row.teamId,
          row.playerId,
          row.setterPosition,
          `${row.direction}_share`,
          row.share,
        ),
      );
      rows.push(
        metricRow(
          'direction_setter_position',
          row.teamId,
          row.playerId,
          row.setterPosition,
          `${row.direction}_efficiency`,
          row.efficiency,
        ),
      );
    });
    return `${rows.map((row) => row.map(csv).join(',')).join('\n')}\n`;
  }
}
