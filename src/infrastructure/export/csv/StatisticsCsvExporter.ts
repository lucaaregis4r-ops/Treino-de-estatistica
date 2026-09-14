import type {
  AdvancedAuditableMetric,
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
  const advanced = 'available' in value ? (value as AdvancedAuditableMetric) : undefined;
  return [
    section,
    teamId,
    playerId,
    rotation,
    metric,
    value.numerator,
    value.denominator,
    value.value ?? '',
    advanced ? String(advanced.available) : String(value.value !== null),
    advanced?.reasonUnavailable,
    advanced?.referenceSampleSize,
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
        'available',
        'reason_unavailable',
        'reference_sample_size',
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
    report.advanced.expectedSideout.forEach((row) => {
      rows.push(
        metricRow(
          'advanced_expected_sideout',
          row.teamId,
          row.playerId,
          undefined,
          'expected_sideout',
          row.rate,
        ),
      );
    });
    report.advanced.expectedBreakpoint.forEach((row) => {
      rows.push(
        metricRow(
          'advanced_expected_breakpoint',
          row.teamId,
          row.playerId,
          undefined,
          'expected_breakpoint',
          row.rate,
        ),
      );
    });
    report.advanced.attackEvenness.forEach((row) => {
      const dimension = row.rotation
        ? 'rotation'
        : row.setterPosition
          ? 'setter_position'
          : row.phase
            ? `phase_${row.phase}`
            : row.receptionGrade
              ? `reception_${row.receptionGrade}`
              : 'overall';
      rows.push(
        metricRow(
          'advanced_attack_evenness',
          row.teamId,
          undefined,
          row.rotation ?? row.setterPosition,
          `attack_evenness_${dimension}`,
          row.evenness,
        ),
      );
    });
    report.advanced.setterRepetition.forEach((row) => {
      rows.push(
        metricRow(
          'advanced_setter_repetition',
          row.teamId,
          row.attackerPlayerId,
          undefined,
          row.category,
          row.repeatRate,
        ),
      );
    });
    report.advanced.setterAttackConversion.forEach((row) => {
      rows.push(
        metricRow(
          'advanced_setter_conversion',
          row.teamId,
          row.attackerPlayerId,
          row.setterPosition,
          'kill_rate',
          row.killRate,
        ),
      );
      rows.push(
        metricRow(
          'advanced_setter_conversion',
          row.teamId,
          row.attackerPlayerId,
          row.setterPosition,
          'attack_efficiency',
          row.attackEfficiency,
        ),
      );
    });
    return `${rows.map((row) => row.map(csv).join(',')).join('\n')}\n`;
  }
}
