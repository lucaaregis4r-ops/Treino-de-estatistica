import { describe, expect, it } from 'vitest';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import { defaultCompactV1 } from '../../../profiles/code/default-compact/defaultCompactV1';
import { basicProfile } from '../../../profiles/complexity/profiles';
import { scoutInputMode } from '../../../domain/scout/events/ScoutEvent';
import { JsonMatchExporter, JsonMatchImporter } from './MatchJson';

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
      expect(imported.value.schemaVersion).toBe('1.0.0');
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
});
