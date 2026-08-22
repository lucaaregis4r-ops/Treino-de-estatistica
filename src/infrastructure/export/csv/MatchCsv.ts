import type { ScoutEvent } from '../../../domain/scout/events/ScoutEvent';
import { tacticalValue } from '../../../domain/scout/tactical/TacticalMetadataAdapter';

export const CSV_COLUMNS = Object.freeze([
  'event_id',
  'match_id',
  'rally_id',
  'sequence',
  'set',
  'score_home',
  'score_away',
  'team',
  'player',
  'skill',
  'outcome',
  'evaluation',
  'origin_zone',
  'target_zone',
  'timestamp',
  'raw_code',
] as const);

function escapeCsv(value: string | number | undefined): string {
  const serialized = value === undefined ? '' : String(value);
  return /[",\r\n]/.test(serialized) ? `"${serialized.replaceAll('"', '""')}"` : serialized;
}

export class CsvMatchExporter {
  export(events: readonly ScoutEvent[]): string {
    const rows = events.map((event) =>
      [
        event.id,
        event.matchId,
        event.rallyId,
        event.sequence,
        event.setNumber,
        event.scoreBefore.teamA,
        event.scoreBefore.teamB,
        event.teamId,
        event.playerId,
        event.skill,
        event.outcome,
        event.evaluation,
        tacticalValue.originZone(event.metadata, event.skill),
        tacticalValue.targetZone(event.metadata, event.skill),
        event.timestamp,
        event.rawCode.trim(),
      ]
        .map(escapeCsv)
        .join(','),
    );
    return [CSV_COLUMNS.join(','), ...rows].join('\r\n');
  }
}
