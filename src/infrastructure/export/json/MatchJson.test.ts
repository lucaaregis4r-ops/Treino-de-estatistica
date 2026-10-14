import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import { basicProfile } from '../../../profiles/complexity/profiles';
import { scoutInputMode } from '../../../domain/scout/events/ScoutEvent';
import { JsonMatchExporter, JsonMatchImporter } from './MatchJson';
import { createCanonicalFootballEvent } from '../../../domain/football/FootballRecorder';

const match: MatchMetadata = {
  id: 'match_1',
  name: 'A x B',
  teamAId: 'a',
  teamBId: 'b',
  createdAt: 1,
  status: 'in_progress',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};

describe('match JSON', () => {
  const exporter = new JsonMatchExporter();

  it('preserves a manual court side change in a backup', () => {
    const serialized = exporter.export({
      match,
      teams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
      players: [],
      profiles: { code: defaultCompactV1, complexity: basicProfile },
      events: [{
        type: 'court_orientation_changed', id: 'side_1', matchId: match.id,
        sequence: 1, timestamp: 1,
        courtOrientation: { leftTeamId: 'b', rightTeamId: 'a' },
      }],
    });
    const imported = new JsonMatchImporter().import(serialized);
    expect(imported.ok).toBe(true);
    if (imported.ok) expect(imported.value.events[0]).toMatchObject({
      type: 'court_orientation_changed',
      courtOrientation: { leftTeamId: 'b', rightTeamId: 'a' },
    });
  });

  it('exports and reimports an equivalent event stream', () => {
    const serialized = new JsonMatchExporter().export({
      match,
      teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      players: [],
      profiles: { code: defaultCompactV1, complexity: basicProfile },
      events: [
        {
          type: 'score_changed',
          id: 'event_1',
          matchId: 'match_1',
          sequence: 1,
          timestamp: 1,
          setNumber: 1,
          score: { teamA: 1, teamB: 0 },
        },
        {
          type: 'scout_registered',
          event: {
            id: 'scout_2',
            matchId: 'match_1',
            rallyId: 'rally_1',
            sequence: 2,
            teamId: 'a',
            skill: 'attack',
            outcome: 'point',
            evaluation: 'excellent',
            setNumber: 1,
            scoreBefore: { teamA: 1, teamB: 0 },
            timestamp: 2,
            rawCode: '01A#',
            codeProfileId: 'default_compact_v1',
            codeProfileVersion: '1.0.0',
            complexityProfileId: 'basic',
            metadata: {
              schemaVersion: '2.0.0',
              tactical: {
                attack: {
                  attackType: 'power',
                  trajectory: {
                    origin: { zoneId: 'left-front', x: 0.2, y: 0.3 },
                    target: { zoneId: 'deep-corner', x: 0.8, y: 0.9 },
                    direction: 'club-diagonal',
                    captureMethod: 'selected',
                  },
                  combination: 'club-x',
                  tempo: 'fast',
                  blockersCount: 2,
                },
              },
            },
            completeness: {
              status: 'partial',
              missingRecommendedFields: ['direction'],
            },
          },
        },
      ],
    });
    const imported = new JsonMatchImporter().import(serialized);

    expect(imported.ok).toBe(true);
    if (imported.ok) {
      expect(imported.value.schemaVersion).toBe('1.3.0');
      expect(imported.value.modality).toBe('unknown');
      expect(imported.value.events).toHaveLength(2);
      expect(imported.value.events[1]).toMatchObject({
        event: {
          metadata: {
            schemaVersion: '2.0.0',
            tactical: { attack: { combination: 'club-x', trajectory: { target: { x: 0.8 } } } },
          },
          completeness: { status: 'partial' },
        },
      });
      expect(imported.value.match).toEqual(match);
      const restored = imported.value.events[1];
      if (restored.type === 'scout_registered') {
        expect(restored.event.inputMode).toBeUndefined();
        expect(scoutInputMode(restored.event)).toBe('typed');
      }
    }
  });

  it('rejects invalid JSON and unsupported schemas', () => {
    const importer = new JsonMatchImporter();
    expect(importer.import('{').ok).toBe(false);
    expect(importer.import('{"schemaVersion":"2.0.0"}').ok).toBe(false);
  });

  it('rejects backups with broken internal references or duplicate sequences', () => {
    const serialized = exporter.export({
      match,
      teams: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      players: [],
      profiles: { code: defaultCompactV1, complexity: basicProfile },
      events: [
        {
          type: 'score_changed',
          id: 'event_1',
          matchId: 'match_1',
          sequence: 1,
          timestamp: 1,
          setNumber: 1,
          score: { teamA: 1, teamB: 0 },
        },
        {
          type: 'score_changed',
          id: 'event_2',
          matchId: 'match_1',
          sequence: 2,
          timestamp: 2,
          setNumber: 1,
          score: { teamA: 2, teamB: 0 },
        },
      ],
    });
    const wrongMatch = JSON.parse(serialized) as { events: Array<{ matchId: string }> };
    wrongMatch.events[0].matchId = 'another_match';
    const duplicateSequence = JSON.parse(serialized) as { events: Array<{ sequence: number }> };
    duplicateSequence.events[1].sequence = 1;

    expect(new JsonMatchImporter().import(JSON.stringify(wrongMatch)).ok).toBe(false);
    expect(new JsonMatchImporter().import(JSON.stringify(duplicateSequence)).ok).toBe(false);
  });

  it('preserva eventos de basquete e rejeita correções sem lance original', () => {
    const basketballMatch: MatchMetadata = { ...match, sport: 'basketball' };
    const fact = { id: 'basket-fact', period: 1, timestamp: 10, kind: 'shot' as const, teamId: 'a', value: 3 as const, outcome: 'made' as const, tactic: 'pick_roll' as const, position: { x: .8, y: .4 } };
    const events = [
      { type: 'basketball_fact_registered' as const, id: 'basket-event-1', matchId: match.id, sequence: 1, timestamp: 10, fact },
      { type: 'basketball_fact_corrected' as const, id: 'basket-event-2', matchId: match.id, sequence: 2, timestamp: 11, targetFactId: fact.id, replacementFact: { ...fact, outcome: 'missed' as const } },
      { type: 'basketball_fact_undone' as const, id: 'basket-event-3', matchId: match.id, sequence: 3, timestamp: 12, targetHistoryEventId: 'basket-event-2' },
    ];
    const serialized = exporter.export({ match: basketballMatch, teams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], players: [], profiles: { code: defaultCompactV1, complexity: basicProfile }, events });
    const imported = new JsonMatchImporter().import(serialized);
    expect(imported.ok).toBe(true);
    if (imported.ok) expect(imported.value.events).toEqual(events);
    const broken = JSON.parse(serialized) as { events: Array<Record<string, unknown>> };
    broken.events[1].targetFactId = 'missing';
    expect(new JsonMatchImporter().import(JSON.stringify(broken)).ok).toBe(false);
  });

  it('round-trips futsal facts and validates goal beneficiaries and history links', () => {
    const futsalMatch: MatchMetadata = { ...match, sport: 'futsal', futsalSettings: { ruleset: 'fifa-2025-26', periodDurationMs: 1_200_000 } };
    const goal = { id: 'fact_1', kind: 'shot' as const, period: 1 as const, elapsedMs: 25_000, observation: 'observed' as const, shootingTeamId: 'a', outcome: 'goal' as const, beneficiaryTeamId: 'b', position: { x: .2, y: .5 }, destination: { x: .9, y: .5 } };
    const events = [
      { type: 'futsal_fact_registered' as const, id: 'history_1', matchId: 'match_1', sequence: 1, timestamp: 1, fact: goal },
      { type: 'futsal_fact_corrected' as const, id: 'history_2', matchId: 'match_1', sequence: 2, timestamp: 2, targetFactId: 'fact_1', replacementFact: { ...goal, outcome: 'saved' as const, beneficiaryTeamId: undefined } },
      { type: 'futsal_fact_undone' as const, id: 'history_3', matchId: 'match_1', sequence: 3, timestamp: 3, targetHistoryEventId: 'history_2' },
      { type: 'futsal_fact_registered' as const, id: 'history_4', matchId: 'match_1', sequence: 4, timestamp: 4, fact: { id: 'fact_2', kind: 'tactical_annotation' as const, period: 1 as const, elapsedMs: 35_000, observation: 'observed' as const, scope: 'event' as const, targetFactId: 'fact_1', organization: 'transition' as const } },
      { type: 'futsal_fact_registered' as const, id: 'history_5', matchId: 'match_1', sequence: 5, timestamp: 5, fact: { id: 'fact_3', kind: 'composition' as const, period: 1 as const, elapsedMs: 30_000, observation: 'partial' as const, teamId: 'a', playerIds: [], certainty: 'partial' as const } },
      { type: 'futsal_fact_registered' as const, id: 'history_6', matchId: 'match_1', sequence: 6, timestamp: 6, fact: { id: 'fact_4', kind: 'substitution' as const, period: 1 as const, elapsedMs: 31_000, observation: 'partial' as const, teamId: 'a', certainty: 'partial' as const } },
      { type: 'futsal_fact_registered' as const, id: 'history_7', matchId: 'match_1', sequence: 7, timestamp: 7, fact: { id: 'fact_5', kind: 'tactical_context' as const, period: 1 as const, elapsedMs: 32_000, observation: 'observed' as const, teamId: 'a', numericalSituation: 'own_flying_goalkeeper' as const, active: true } },
      { type: 'futsal_fact_registered' as const, id: 'history_8', matchId: 'match_1', sequence: 8, timestamp: 8, fact: { id: 'fact_6', kind: 'tackle' as const, period: 1 as const, elapsedMs: 36_000, observation: 'observed' as const, winningTeamId: 'b', losingTeamId: 'a', position: { x: .4, y: .5 } } },
    ];
    const serialized = exporter.export({ match: futsalMatch, teams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], players: [], profiles: { code: defaultCompactV1, complexity: basicProfile }, events });
    const imported = new JsonMatchImporter().import(serialized);
    expect(imported.ok).toBe(true);
    if (imported.ok) expect(imported.value.events).toEqual(events);

    const broken = JSON.parse(serialized) as { events: Array<Record<string, unknown>> };
    broken.events[2].targetHistoryEventId = 'missing';
    expect(new JsonMatchImporter().import(JSON.stringify(broken)).ok).toBe(false);
    const brokenTacticalTarget = JSON.parse(serialized) as { events: Array<{ fact?: { targetFactId?: string } }> };
    brokenTacticalTarget.events[3].fact!.targetFactId = 'missing';
    expect(new JsonMatchImporter().import(JSON.stringify(brokenTacticalTarget)).ok).toBe(false);
    const brokenDestination = JSON.parse(serialized) as { events: Array<{ fact?: { destination?: { x: number; y: number } } }> };
    brokenDestination.events[0].fact!.destination!.x = 1.2;
    expect(new JsonMatchImporter().import(JSON.stringify(brokenDestination)).ok).toBe(false);
  });

  it('migrates a legacy 1.0.0 backup without changing its event stream', () => {
    const current = JSON.parse(exporter.export({ match, teams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], players: [], profiles: { code: defaultCompactV1, complexity: basicProfile }, events: [] })) as Record<string, unknown>;
    current.schemaVersion = '1.0.0'; delete current.modality; delete current.compatibility;
    const imported = new JsonMatchImporter().import(JSON.stringify(current));
    expect(imported.ok && imported.value).toMatchObject({ schemaVersion: '1.3.0', modality: 'unknown', events: [] });
  });

  it('keeps a versioned local control mark in the backup and accepts a 1.1 backup', () => {
    const footballMatch = { ...match, sport: 'football' as const };
    const mark = {
      id: 'mark-1', index: 1, period: 1 as const, timestamp: '00:00:05.000', minute: 0, second: 5,
      type: { id: 1000, name: 'Observação de controle' }, location: [24, 40] as const,
      scout_trainer: {
        schema_version: '1.1.0' as const, modality: 'football' as const, match_id: match.id, capture_sequence: 1, position_observed: true,
        observation: {
          protocol: { name: 'scout_trainer.possession' as const, version: '1.0.0' as const, mode: 'control_mark' as const },
          after: { kind: 'controlled' as const, teamId: 'a' }, position: [24, 40] as const, precision: 'point' as const,
          coverage: 'continuous' as const, context: { validity: 'observed' as const, outcome: 'recovered' as const },
        },
        assisted_recording: { schema_version: '1.0.0' as const, observations: [], details: [], pressures: [], candidates: [], confirmations: [] },
      },
    };
    const current = JSON.parse(exporter.export({ match: footballMatch, teams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], players: [], profiles: { code: defaultCompactV1, complexity: basicProfile }, events: [{ type: 'football_event_registered' as const, id: 'mark-1', matchId: match.id, sequence: 1, timestamp: 1, event: mark }] })) as Record<string, unknown>;
    expect(new JsonMatchImporter().import(JSON.stringify(current)).ok).toBe(true);
    const malformed = structuredClone(current) as { events: Array<{ event: { scout_trainer: { assisted_recording: { schema_version: string } } } }> };
    malformed.events[0].event.scout_trainer.assisted_recording.schema_version = '2.0.0';
    expect(new JsonMatchImporter().import(JSON.stringify(malformed)).ok).toBe(false);
    current.schemaVersion = '1.1.0';
    const legacy = new JsonMatchImporter().import(JSON.stringify(current));
    expect(legacy.ok && legacy.value).toMatchObject({ schemaVersion: '1.3.0', events: [{ event: { type: { id: 1000 }, scout_trainer: { observation: { position: [24, 40] } } } }] });
  });

  it('validates football event envelopes and rejects fabricated coordinates', () => {
    const footballMatch = { ...match, sport: 'football' as const };
    const canonical = createCanonicalFootballEvent({ id: 'football-1', matchId: match.id, index: 1, period: 1, elapsedMs: 15_000, action: 'ball_recovery', outcome: 'observed', team: { id: 1, name: 'A' } });
    const serialized = exporter.export({ match: footballMatch, teams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], players: [], profiles: { code: defaultCompactV1, complexity: basicProfile }, events: [{ type: 'football_event_registered', id: canonical.id, matchId: match.id, sequence: 1, timestamp: 100, event: canonical }] });
    const imported = new JsonMatchImporter().import(serialized);
    expect(imported.ok && imported.value.modality).toBe('football');
    expect(imported.ok && imported.value.compatibility.footballEventContract).toBe('statsbomb-open-data-4.0.0-subset');
    const invalid = JSON.parse(serialized) as { events: Array<{ event: { location?: number[] } }> };
    invalid.events[0].event.location = [60, 90];
    expect(new JsonMatchImporter().import(JSON.stringify(invalid)).ok).toBe(false);
  });
});
