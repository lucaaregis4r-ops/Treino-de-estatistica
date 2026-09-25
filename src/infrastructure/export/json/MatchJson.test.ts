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
      expect(imported.value.schemaVersion).toBe('1.2.0');
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

  it('migrates a legacy 1.0.0 backup without changing its event stream', () => {
    const current = JSON.parse(exporter.export({ match, teams: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], players: [], profiles: { code: defaultCompactV1, complexity: basicProfile }, events: [] })) as Record<string, unknown>;
    current.schemaVersion = '1.0.0'; delete current.modality; delete current.compatibility;
    const imported = new JsonMatchImporter().import(JSON.stringify(current));
    expect(imported.ok && imported.value).toMatchObject({ schemaVersion: '1.2.0', modality: 'unknown', events: [] });
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
    expect(legacy.ok && legacy.value).toMatchObject({ schemaVersion: '1.2.0', events: [{ event: { type: { id: 1000 }, scout_trainer: { observation: { position: [24, 40] } } } }] });
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
