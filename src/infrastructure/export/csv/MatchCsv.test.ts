import { describe, expect, it } from 'vitest';
import type { ScoutEvent } from '../../../domain/scout/events/ScoutEvent';
import { CSV_COLUMNS, CsvMatchExporter } from './MatchCsv';
import { TxtMatchExporter } from '../txt/MatchTxt';

const events: ScoutEvent[] = [
  {
    id: 'event_1',
    matchId: 'match_1',
    rallyId: 'rally_1',
    sequence: 2,
    teamId: 'team_a',
    playerId: 'player_8',
    skill: 'attack',
    outcome: 'point',
    evaluation: 'excellent',
    setNumber: 1,
    scoreBefore: { teamA: 10, teamB: 9 },
    timestamp: 1000,
    rawCode: ' 08A# ',
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'tactical',
    metadata: { originZone: 4, targetZone: 1 },
  },
  {
    id: 'event_2',
    matchId: 'match_1',
    rallyId: 'rally_2',
    sequence: 4,
    teamId: 'team_b',
    skill: 'serve',
    outcome: 'ace',
    evaluation: 'excellent',
    setNumber: 1,
    scoreBefore: { teamA: 10, teamB: 10 },
    timestamp: 2000,
    rawCode: '12S#',
    codeProfileId: 'default_compact_v1',
    codeProfileVersion: '1.0.0',
    complexityProfileId: 'basic',
  },
];

describe('derived match exports', () => {
  it('exports the specified CSV columns and one row per canonical event', () => {
    const lines = new CsvMatchExporter().export(events).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(CSV_COLUMNS.join(','));
    expect(lines[1]).toContain(
      'event_1,match_1,rally_1,2,1,10,9,team_a,player_8,attack,point,excellent,4,1,1000,08A#',
    );
  });

  it('exports only the normalized raw-code sequence in TXT', () => {
    expect(new TxtMatchExporter().export(events)).toBe('08A#\n12S#');
  });
});
