import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { CreateMatchUseCase } from '../../application/use-cases/create-match/CreateMatchUseCase';
import { ScoutTrainerService } from '../../application/ScoutTrainerService';
import { OpenMatchUseCase } from '../../application/use-cases/open-match/OpenMatchUseCase';
import { RegisterAndPersistScoutEventUseCase } from '../../application/use-cases/register-scout-event/RegisterAndPersistScoutEventUseCase';
import type { MatchMetadata } from '../../domain/match/entities/MatchMetadata';
import type { MatchEvent } from '../../domain/match/events/MatchEvent';
import { ProfileResolver } from '../../profiles/ProfileResolver';
import { basicProfile } from '../../profiles/complexity/profiles';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';
import {
  DATABASE_VERSION,
  ScoutTrainerDatabase,
  STORE_NAMES,
} from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { JsonMatchImporter } from '../../infrastructure/export/json/MatchJson';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbPlayerRepository } from '../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { IndexedDbProfileRepository } from '../../infrastructure/persistence/repositories/IndexedDbProfileRepository';
import { IndexedDbTeamRepository } from '../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { IndexedDbTrainingSessionRepository } from '../../infrastructure/persistence/repositories/IndexedDbTrainingSessionRepository';
import { IndexedDbMatchBackupRepository } from '../../infrastructure/persistence/backup/IndexedDbMatchBackupRepository';
import { IndexedDbAnalyticsSnapshotRepository } from '../../infrastructure/persistence/repositories/IndexedDbAnalyticsSnapshotRepository';
import type { MatchAnalyticsSnapshot } from '../../domain/analytics/MatchAnalyticsSnapshot';

const databases: ScoutTrainerDatabase[] = [];
const databaseNames: string[] = [];

function createDatabase(): ScoutTrainerDatabase {
  const name = `scout-trainer-test-${crypto.randomUUID()}`;
  const database = new ScoutTrainerDatabase(name);
  databaseNames.push(name);
  databases.push(database);
  return database;
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error(`Could not delete database ${name}.`));
    request.onblocked = () => reject(new Error(`Database ${name} deletion was blocked.`));
  });
}

function createLegacyV1Database(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore(STORE_NAMES.matches, { keyPath: 'id' });
      const events = database.createObjectStore(STORE_NAMES.events, { keyPath: 'id' });
      events.createIndex('matchId', 'matchId');
      events.createIndex('matchSequence', ['matchId', 'sequence'], { unique: true });
      database.createObjectStore(STORE_NAMES.teams, { keyPath: 'id' });
      const players = database.createObjectStore(STORE_NAMES.players, { keyPath: 'id' });
      players.createIndex('teamId', 'teamId');
      for (const storeName of [
        STORE_NAMES.codeProfiles,
        STORE_NAMES.complexityProfiles,
        STORE_NAMES.competitionProfiles,
        STORE_NAMES.trainingProfiles,
      ])
        database.createObjectStore(storeName, { keyPath: 'key' });
      database.createObjectStore(STORE_NAMES.trainingSessions, { keyPath: 'id' });
      database.createObjectStore(STORE_NAMES.trainingAttempts, { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error ?? new Error('Could not create legacy database.'));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(STORE_NAMES.matches, 'readwrite');
      transaction.objectStore(STORE_NAMES.matches).put(metadata);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Could not seed legacy database.'));
    };
  });
}

function createLegacyV2TacticalDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore(STORE_NAMES.matches, { keyPath: 'id' });
      const events = database.createObjectStore(STORE_NAMES.events, { keyPath: 'id' });
      events.createIndex('matchId', 'matchId');
      events.createIndex('matchSequence', ['matchId', 'sequence'], { unique: true });
      database.createObjectStore(STORE_NAMES.teams, { keyPath: 'id' });
      const players = database.createObjectStore(STORE_NAMES.players, { keyPath: 'id' });
      players.createIndex('teamId', 'teamId');
      for (const storeName of [
        STORE_NAMES.codeProfiles,
        STORE_NAMES.complexityProfiles,
        STORE_NAMES.competitionProfiles,
        STORE_NAMES.trainingProfiles,
      ])
        database.createObjectStore(storeName, { keyPath: 'key' });
      const sessions = database.createObjectStore(STORE_NAMES.trainingSessions, { keyPath: 'id' });
      sessions.createIndex('status', 'status');
      database.createObjectStore(STORE_NAMES.trainingAttempts, { keyPath: 'id' });
      database.createObjectStore(STORE_NAMES.settings, { keyPath: 'key' });
    };
    request.onerror = () => reject(request.error ?? new Error('Could not create V2 database.'));
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(
        [STORE_NAMES.events, STORE_NAMES.matches],
        'readwrite',
      );
      transaction.objectStore(STORE_NAMES.matches).put(metadata);
      transaction.objectStore(STORE_NAMES.events).put({
        id: 'legacy_scout',
        matchId: 'match_1',
        sequence: 1,
        event: {
          type: 'scout_registered',
          event: {
            id: 'legacy_scout',
            matchId: 'match_1',
            rallyId: 'rally_1',
            sequence: 1,
            teamId: 'team_a',
            skill: 'attack',
            evaluation: 'excellent',
            setNumber: 1,
            scoreBefore: { teamA: 0, teamB: 0 },
            timestamp: 1,
            rawCode: '01A#',
            codeProfileId: 'default_compact_v1',
            codeProfileVersion: '1.0.0',
            complexityProfileId: 'tactical',
            metadata: {
              skillType: 'power',
              originZone: 4,
              targetZone: 1,
              direction: 'diagonal',
              attackCombination: 'x1',
            },
          },
        },
      });
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not seed V2.'));
    };
  });
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
  await Promise.all(databaseNames.splice(0).map(deleteDatabase));
});

const metadata: MatchMetadata = {
  id: 'match_1',
  name: 'Persistence test',
  teamAId: 'team_a',
  teamBId: 'team_b',
  createdAt: 100,
  status: 'in_progress',
  initialServingTeamId: 'team_a',
  codeProfileId: 'default_compact_v1',
  codeProfileVersion: '1.0.0',
  complexityProfileId: 'basic',
};

const persistedEvents: readonly MatchEvent[] = [
  {
    type: 'rally_started',
    id: 'event_1',
    matchId: 'match_1',
    rallyId: 'rally_1',
    sequence: 1,
    timestamp: 1,
  },
  {
    type: 'score_changed',
    id: 'event_2',
    matchId: 'match_1',
    setNumber: 1,
    score: { teamA: 1, teamB: 0 },
    sequence: 2,
    timestamp: 2,
  },
  {
    type: 'rally_ended',
    id: 'event_3',
    matchId: 'match_1',
    rallyId: 'rally_1',
    winningTeamId: 'team_a',
    sequence: 3,
    timestamp: 3,
  },
];

describe('IndexedDB repositories', () => {
  it('migrates a version 1 database to the current version without losing data', async () => {
    const name = `scout-trainer-legacy-${crypto.randomUUID()}`;
    databaseNames.push(name);
    await createLegacyV1Database(name);
    const database = new ScoutTrainerDatabase(name);
    databases.push(database);
    const connection = await database.open();
    const stored = await new IndexedDbMatchRepository(database).findById(metadata.id);

    expect(connection.version).toBe(DATABASE_VERSION);
    expect(connection.objectStoreNames.contains(STORE_NAMES.settings)).toBe(true);
    expect(connection.objectStoreNames.contains(STORE_NAMES.freeLogSessions)).toBe(true);
    expect(
      connection
        .transaction(STORE_NAMES.trainingSessions)
        .objectStore(STORE_NAMES.trainingSessions)
        .indexNames.contains('status'),
    ).toBe(true);
    expect(stored.ok && stored.value).toEqual(metadata);
  });

  it('opens V1 tactical events and migrates them to V2 in the same application', async () => {
    const name = `scout-trainer-tactical-v2-${crypto.randomUUID()}`;
    databaseNames.push(name);
    await createLegacyV2TacticalDatabase(name);
    const database = new ScoutTrainerDatabase(name);
    databases.push(database);

    const connection = await database.open();
    const stored = await new IndexedDbEventRepository(database).listByMatch('match_1');
    const opened = await new OpenMatchUseCase(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
    ).execute('match_1');

    expect(connection.version).toBe(DATABASE_VERSION);
    expect(opened.ok).toBe(true);
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(stored.value[0]).toMatchObject({
      type: 'scout_registered',
      event: {
        metadata: {
          originZone: 4,
          schemaVersion: '2.0.0',
          tactical: {
            attack: {
              attackType: 'power',
              combination: 'x1',
              trajectory: {
                origin: { zoneId: '4' },
                target: { zoneId: '1' },
                direction: 'diagonal',
              },
            },
          },
        },
      },
    });
  });

  it('creates, closes, reopens, and reconstructs a match', async () => {
    const firstDatabase = createDatabase();
    const matches = new IndexedDbMatchRepository(firstDatabase);
    const events = new IndexedDbEventRepository(firstDatabase);

    expect((await new CreateMatchUseCase(matches).execute(metadata)).ok).toBe(true);
    for (const event of persistedEvents) {
      expect((await events.append(event)).ok).toBe(true);
    }
    await firstDatabase.close();

    const reopenedDatabase = new ScoutTrainerDatabase(firstDatabase.name);
    databases.push(reopenedDatabase);
    const reopened = await new OpenMatchUseCase(
      new IndexedDbMatchRepository(reopenedDatabase),
      new IndexedDbEventRepository(reopenedDatabase),
    ).execute(metadata.id);

    expect(reopened.ok).toBe(true);
    if (reopened.ok) {
      expect(reopened.value.score).toEqual({ teamA: 1, teamB: 0 });
      expect(reopened.value.currentRally).toMatchObject({
        status: 'ended',
        winningTeamId: 'team_a',
      });
      expect(reopened.value.processedEventIds).toHaveLength(3);
    }
  });

  it('persists a confirmed scout immediately', async () => {
    const database = createDatabase();
    const events = new IndexedDbEventRepository(database);
    const profiles = new ProfileResolver(createDefaultProfileRegistry()).resolve({
      code: { id: 'default_compact_v1', version: '1.0.0' },
      complexity: { id: 'basic', version: '1.0.0' },
    });
    if (!profiles.ok) throw profiles.error;

    const result = await new RegisterAndPersistScoutEventUseCase(events).execute({
      rawCode: '08A#',
      profiles: profiles.value,
      context: {
        matchId: metadata.id,
        rallyId: 'rally_1',
        teamId: 'team_a',
        setNumber: 1,
        scoreBefore: { teamA: 0, teamB: 0 },
        sequence: 1,
        roster: [{ id: 'team_a_08', teamId: 'team_a', number: 8 }],
      },
    });

    expect(result.ok).toBe(true);
    const stored = await events.listByMatch(metadata.id);
    expect(stored.ok && stored.value).toHaveLength(1);
    expect(stored.ok && stored.value[0]).toMatchObject({
      type: 'scout_registered',
      event: { rawCode: '08A#', outcome: 'point' },
    });
  });

  it('persists teams, players, profiles, and training sessions in their own stores', async () => {
    const database = createDatabase();
    const teams = new IndexedDbTeamRepository(database);
    const players = new IndexedDbPlayerRepository(database);
    const profiles = new IndexedDbProfileRepository(database);
    const trainingSessions = new IndexedDbTrainingSessionRepository(database);

    expect((await teams.save({ id: 'team_a', name: 'Team A' })).ok).toBe(true);
    expect(
      (await players.save({ id: 'player_8', teamId: 'team_a', number: 8, name: 'Player 8' })).ok,
    ).toBe(true);
    expect((await profiles.save(basicProfile)).ok).toBe(true);
    expect(
      (
        await trainingSessions.save({
          id: 'training_1',
          profileId: 'training_basic_v1',
          profileVersion: '1.0.0',
          complexityProfileId: 'basic',
          startedAt: 100,
          currentExerciseStartedAt: 100,
          currentExerciseIndex: 0,
          status: 'active',
          exercises: [],
          attempts: [],
        })
      ).ok,
    ).toBe(true);

    const teamPlayers = await players.listByTeam('team_a');
    const storedProfile = await profiles.find('complexity', 'basic', '1.0.0');
    const session = await trainingSessions.findById('training_1');

    expect(teamPlayers.ok && teamPlayers.value.map((player) => player.number)).toEqual([8]);
    expect(storedProfile.ok && storedProfile.value).toEqual(basicProfile);
    expect(session.ok && session.value?.profileId).toBe('training_basic_v1');
  });

  it('rejects duplicate event sequences for the same match', async () => {
    const events = new IndexedDbEventRepository(createDatabase());
    expect((await events.append(persistedEvents[0])).ok).toBe(true);

    const duplicate = await events.append({
      type: 'serving_team_changed',
      id: 'different_id',
      matchId: metadata.id,
      servingTeamId: 'team_b',
      sequence: 1,
      timestamp: 2,
    });

    expect(duplicate.ok).toBe(false);
    expect(!duplicate.ok && duplicate.error.code).toBe('duplicate_event_sequence');
  });

  it('supports the complete operational MVP across reload, correction, undo, redo, score, and JSON', async () => {
    const database = createDatabase();
    let nextId = 1;
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
      { createId: () => `generated_${nextId++}`, now: () => nextId * 100 },
    );
    const created = await service.createMatch({
      teamAName: 'Olympico',
      teamBName: 'Minas',
      teamAPlayers: [8],
      teamBPlayers: [12],
      complexityProfileId: 'operational',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const matchId = created.value.state.metadata.id;
    const teamAId = created.value.teams[0].id;

    const invalid = await service.registerScout(matchId, teamAId, '01X?');
    expect(invalid.ok).toBe(false);
    const unchanged = await service.loadMatch(matchId);
    expect(unchanged.ok && unchanged.value.events).toHaveLength(0);

    const registered = await service.registerScout(matchId, teamAId, '08A#');
    expect(registered.ok && registered.value.timeline[0]?.event.outcome).toBe('point');
    if (!registered.ok) return;
    const sourceId = registered.value.timeline[0]?.sourceEventId;
    if (!sourceId) throw new Error('Registered scout source id is missing.');

    const corrected = await service.correctScout(matchId, sourceId, '08A+');
    expect(corrected.ok && corrected.value.timeline[0]?.event.rawCode).toBe('08A+');
    const undone = await service.undo(matchId);
    expect(undone.ok && undone.value.timeline[0]?.event.rawCode).toBe('08A#');

    await database.close();
    const reopenedDatabase = new ScoutTrainerDatabase(database.name);
    databases.push(reopenedDatabase);
    const reopenedService = new ScoutTrainerService(
      new IndexedDbMatchRepository(reopenedDatabase),
      new IndexedDbEventRepository(reopenedDatabase),
      new IndexedDbTeamRepository(reopenedDatabase),
      new IndexedDbPlayerRepository(reopenedDatabase),
      createDefaultProfileRegistry(),
      { createId: () => `reopened_${nextId++}`, now: () => nextId * 100 },
    );
    const reloaded = await reopenedService.loadMatch(matchId);
    expect(reloaded.ok && reloaded.value.timeline[0]?.event.rawCode).toBe('08A#');

    const redone = await reopenedService.redo(matchId);
    expect(redone.ok && redone.value.timeline[0]?.event.rawCode).toBe('08A+');
    const scored = await reopenedService.awardPoint(matchId, teamAId);
    expect(scored.ok && scored.value.state.score.teamA).toBe(1);
    if (!scored.ok) return;
    expect(scored.value.events.some((event) => event.type === 'match_correction')).toBe(true);
    const sequences = scored.value.events.map((event) =>
      event.type === 'scout_registered' ? event.event.sequence : event.sequence,
    );
    expect(new Set(sequences).size).toBe(sequences.length);

    const correctionUndone = await reopenedService.undo(matchId);
    expect(correctionUndone.ok && correctionUndone.value.state.score.teamA).toBe(0);
    const correctionRedone = await reopenedService.redo(matchId);
    expect(correctionRedone.ok && correctionRedone.value.state.score.teamA).toBe(1);
    if (!correctionRedone.ok) return;

    const exported = await reopenedService.exportJson(matchId);
    expect(exported.ok).toBe(true);
    if (exported.ok) {
      const imported = new JsonMatchImporter().import(exported.value);
      expect(imported.ok).toBe(true);
      if (imported.ok) expect(imported.value.events).toEqual(correctionRedone.value.events);
    }
  });

  it('registers visual and hybrid input as one canonical event through the shared pipeline', async () => {
    const database = createDatabase();
    let nextId = 1;
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
      { createId: () => `visual_${nextId++}`, now: () => nextId * 100 },
    );
    const created = await service.createMatch({
      teamAName: 'Olympico',
      teamBName: 'Minas',
      teamAPlayers: [8],
      teamBPlayers: [12],
      complexityProfileId: 'tactical',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const matchId = created.value.state.metadata.id;
    const teamId = created.value.teams[0].id;

    const visual = await service.registerVisualScout(matchId, {
      teamId,
      playerNumber: 8,
      skill: 'attack',
      evaluation: 'excellent',
      target: { zoneId: '1' },
    });
    expect(visual.ok).toBe(true);
    if (!visual.ok) return;
    expect(visual.value.timeline).toHaveLength(1);
    expect(visual.value.timeline[0]?.event).toMatchObject({
      inputMode: 'visual',
      playerId: visual.value.players.find((player) => player.number === 8)?.id,
      metadata: { tactical: { attack: { trajectory: { target: { zoneId: '1' } } } } },
    });
    expect(visual.value.timeline[0]?.event.rawCode.startsWith('[VISUAL]')).toBe(true);

    const hybrid = await service.registerHybridScout(matchId, teamId, '08A+', {
      teamId,
      playerNumber: 8,
      skill: 'attack',
      evaluation: 'positive',
      target: { zoneId: '5' },
    });
    expect(hybrid.ok).toBe(true);
    if (!hybrid.ok) return;
    expect(hybrid.value.timeline).toHaveLength(2);
    expect(hybrid.value.timeline[1]?.event).toMatchObject({
      inputMode: 'hybrid',
      rawCode: '08A+',
      metadata: { tactical: { attack: { trajectory: { target: { zoneId: '5' } } } } },
    });

    const conflict = await service.registerHybridScout(matchId, teamId, '08A+', {
      teamId,
      playerNumber: 8,
      skill: 'serve',
      evaluation: 'positive',
    });
    expect(conflict.ok).toBe(false);
    const unchanged = await service.loadMatch(matchId);
    expect(unchanged.ok && unchanged.value.timeline).toHaveLength(2);

    const invalidVisual = await service.registerVisualScout(matchId, {
      teamId: '',
      playerNumber: 8,
      skill: 'serve',
      evaluation: 'positive',
    });
    expect(invalidVisual.ok).toBe(false);

    const invalidAthlete = await service.registerVisualScout(matchId, {
      teamId,
      playerNumber: 99,
      skill: 'serve',
      evaluation: 'positive',
    });
    expect(invalidAthlete.ok).toBe(false);
    const stillUnchanged = await service.loadMatch(matchId);
    expect(stillUnchanged.ok && stillUnchanged.value.timeline).toHaveLength(2);
  });

  it('validates and atomically restores a complete JSON backup', async () => {
    const sourceDatabase = createDatabase();
    let nextId = 1;
    const dependencies = {
      createId: () => `backup_${nextId++}`,
      now: () => nextId * 100,
    };
    const sourceService = new ScoutTrainerService(
      new IndexedDbMatchRepository(sourceDatabase),
      new IndexedDbEventRepository(sourceDatabase),
      new IndexedDbTeamRepository(sourceDatabase),
      new IndexedDbPlayerRepository(sourceDatabase),
      createDefaultProfileRegistry(),
      dependencies,
    );
    const created = await sourceService.createMatch({
      teamAName: 'Origem A',
      teamBName: 'Origem B',
      teamAPlayers: [8],
      teamBPlayers: [12],
      complexityProfileId: 'basic',
    });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const registered = await sourceService.registerScout(
      matchId,
      created.value.teams[0].id,
      '08A#',
    );
    if (!registered.ok) throw registered.error;
    const exported = await sourceService.exportJson(matchId);
    if (!exported.ok) throw exported.error;

    const targetDatabase = createDatabase();
    const targetService = new ScoutTrainerService(
      new IndexedDbMatchRepository(targetDatabase),
      new IndexedDbEventRepository(targetDatabase),
      new IndexedDbTeamRepository(targetDatabase),
      new IndexedDbPlayerRepository(targetDatabase),
      createDefaultProfileRegistry(),
      dependencies,
    ).enableBackupRestore(new IndexedDbMatchBackupRepository(targetDatabase));
    const restored = await targetService.importJson(exported.value);

    expect(restored.ok).toBe(true);
    expect(restored.ok && restored.value.timeline[0]?.event.rawCode).toBe('08A#');
    const reopened = await targetService.loadMatch(matchId);
    expect(reopened.ok && reopened.value.events).toEqual(registered.value.events);
  });

  it('automates score, serve, rotation, roster context, correction, undo, substitution, and replay', async () => {
    const database = createDatabase();
    let nextId = 1;
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
      { createId: () => `auto_${nextId++}`, now: () => nextId * 10 },
    );
    const created = await service.createMatch({
      teamAName: 'A',
      teamBName: 'B',
      teamAPlayers: [{ number: 1, name: 'Líbero A', libero: true }, 2, 3, 4, 5, 6],
      teamBPlayers: [7, 8, 9, 10, 11, 12, 13],
      complexityProfileId: 'basic',
    });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const [teamA, teamB] = created.value.teams;
    const libero = created.value.players.find(
      (player) => player.teamId === teamA.id && player.number === 1,
    );
    expect(created.value.state.metadata.liberoPlayerIds).toEqual([libero?.id]);
    expect(libero).not.toHaveProperty('role');
    const originalA = created.value.currentLineups.find((lineup) => lineup.teamId === teamA.id);
    const originalB = created.value.currentLineups.find((lineup) => lineup.teamId === teamB.id);

    const aWonServing = await service.registerScout(matchId, teamA.id, '01A#');
    expect(aWonServing.ok && aWonServing.value.state.score).toEqual({ teamA: 1, teamB: 0 });
    expect(aWonServing.ok && aWonServing.value.state.servingTeamId).toBe(teamA.id);
    expect(
      aWonServing.ok &&
        aWonServing.value.currentLineups.find((lineup) => lineup.teamId === teamA.id)?.positions,
    ).toEqual(originalA?.positions);

    const bWonReceiving = await service.registerScout(matchId, teamB.id, '10A#');
    if (!bWonReceiving.ok) throw bWonReceiving.error;
    expect(bWonReceiving.value.state.score).toEqual({ teamA: 1, teamB: 1 });
    expect(bWonReceiving.value.state.servingTeamId).toBe(teamB.id);
    const rotatedB = bWonReceiving.value.currentLineups.find(
      (lineup) => lineup.teamId === teamB.id,
    );
    expect(rotatedB?.positions[1]).toBe(originalB?.positions[2]);
    expect(bWonReceiving.value.timeline.at(-1)?.event.lineupContext).toMatchObject({
      tacticalRole: 'opposite',
      rotationPosition: 4,
    });

    const bWonServing = await service.registerScout(matchId, teamB.id, '10A#');
    if (!bWonServing.ok) throw bWonServing.error;
    expect(bWonServing.value.state.score).toEqual({ teamA: 1, teamB: 2 });
    expect(
      bWonServing.value.currentLineups.find((lineup) => lineup.teamId === teamB.id)?.positions,
    ).toEqual(rotatedB?.positions);

    const beforeInvalid = bWonServing.value.events.length;
    const invalid = await service.registerScout(matchId, teamB.id, '99A#');
    expect(invalid.ok).toBe(false);
    const afterInvalid = await service.loadMatch(matchId);
    expect(afterInvalid.ok && afterInvalid.value.events).toHaveLength(beforeInvalid);

    const lastScout = bWonServing.value.timeline.at(-1);
    if (!lastScout) throw new Error('Missing terminal scout.');
    const corrected = await service.correctScout(matchId, lastScout.sourceEventId, '10A+');
    expect(corrected.ok && corrected.value.state.score).toEqual({ teamA: 1, teamB: 1 });
    const undone = await service.undo(matchId);
    expect(undone.ok && undone.value.state.score).toEqual({ teamA: 1, teamB: 2 });

    if (!undone.ok) throw undone.error;
    const lineup = undone.value.currentLineups.find((candidate) => candidate.teamId === teamB.id);
    const bench = undone.value.players.find(
      (player) => player.teamId === teamB.id && player.number === 13,
    );
    const slot = lineup?.slots[lineup.positions[1]];
    if (!lineup || !bench || !slot) throw new Error('Missing lineup substitution data.');
    const substituted = await service.substitute(matchId, teamB.id, slot.slotId, bench.id);
    expect(
      substituted.ok &&
        substituted.value.currentLineups.find((candidate) => candidate.teamId === teamB.id)?.slots[
          slot.slotId
        ],
    ).toMatchObject({
      playerId: bench.id,
      tacticalRole: slot.tacticalRole,
    });

    await database.close();
    const reopenedDatabase = new ScoutTrainerDatabase(database.name);
    databases.push(reopenedDatabase);
    const reopenedService = new ScoutTrainerService(
      new IndexedDbMatchRepository(reopenedDatabase),
      new IndexedDbEventRepository(reopenedDatabase),
      new IndexedDbTeamRepository(reopenedDatabase),
      new IndexedDbPlayerRepository(reopenedDatabase),
      createDefaultProfileRegistry(),
    );
    const replayed = await reopenedService.loadMatch(matchId);
    expect(replayed.ok && replayed.value.state.score).toEqual({ teamA: 1, teamB: 2 });
    expect(replayed.ok && replayed.value.state.servingTeamId).toBe(teamB.id);
  });

  it('finishes a set from configured rules and requires explicit next-set confirmation', async () => {
    const database = createDatabase();
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
    );
    const created = await service.createMatch({
      teamAName: 'A',
      teamBName: 'B',
      teamAPlayers: [1, 2, 3, 4, 5, 6],
      teamBPlayers: [7, 8, 9, 10, 11, 12],
      complexityProfileId: 'basic',
      scoringRules: { regularSetTarget: 2, decidingSetTarget: 2, minimumLead: 2, setsToWin: 2 },
    });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const teamAId = created.value.teams[0].id;
    await service.registerScout(matchId, teamAId, '01A#');
    const finished = await service.registerScout(matchId, teamAId, '01A#');

    expect(finished.ok && finished.value.state.score).toEqual({ teamA: 2, teamB: 0 });
    expect(finished.ok && finished.value.state.sets[0]).toMatchObject({
      completed: true,
      winnerTeamId: teamAId,
    });
    const blocked = await service.registerScout(matchId, teamAId, '01A#');
    expect(blocked.ok).toBe(false);
    const nextSet = await service.startNextSet(matchId, { servingTeamId: teamAId });
    expect(nextSet.ok && nextSet.value.state).toMatchObject({
      currentSet: 2,
      score: { teamA: 0, teamB: 0 },
      servingTeamId: teamAId,
    });
    expect(nextSet.ok && nextSet.value.currentLineups).toHaveLength(2);
  });

  it('derives a 5x1 inversion from generic substitutions and captures the active setter', async () => {
    const database = createDatabase();
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
    );
    const lineup = [
      { position: 1 as const, tacticalRole: 'setter' as const, playerNumber: 1 },
      { position: 2 as const, tacticalRole: 'outside_1' as const, playerNumber: 3 },
      { position: 3 as const, tacticalRole: 'middle_1' as const, playerNumber: 4 },
      { position: 4 as const, tacticalRole: 'opposite' as const, playerNumber: 2 },
      { position: 5 as const, tacticalRole: 'outside_2' as const, playerNumber: 5 },
      { position: 6 as const, tacticalRole: 'middle_2' as const, playerNumber: 6 },
    ];
    const created = await service.createMatch({
      teamAName: 'A',
      teamBName: 'B',
      teamAPlayers: [
        { number: 1, registeredRole: 'setter' },
        { number: 2, registeredRole: 'opposite' },
        3,
        4,
        5,
        6,
        { number: 7, registeredRole: 'opposite' },
        { number: 8, registeredRole: 'setter' },
      ],
      teamBPlayers: [11, 12, 13, 14, 15, 16],
      teamALineup: lineup,
      complexityProfileId: 'basic',
    });
    if (!created.ok) throw created.error;
    const teamAId = created.value.teams[0].id;
    const current = created.value.currentLineups.find((item) => item.teamId === teamAId);
    const setterSlot =
      current && Object.values(current.slots).find((slot) => slot.tacticalRole === 'setter');
    const oppositeSlot =
      current && Object.values(current.slots).find((slot) => slot.tacticalRole === 'opposite');
    const attacker = created.value.players.find(
      (player) => player.teamId === teamAId && player.number === 7,
    );
    const secondSetter = created.value.players.find(
      (player) => player.teamId === teamAId && player.number === 8,
    );
    if (!setterSlot || !oppositeSlot || !attacker || !secondSetter)
      throw new Error('Missing inversion setup.');

    const first = await service.substitute(
      created.value.state.metadata.id,
      teamAId,
      setterSlot.slotId,
      attacker.id,
    );
    if (!first.ok) throw first.error;
    const inverted = await service.substitute(
      created.value.state.metadata.id,
      teamAId,
      oppositeSlot.slotId,
      secondSetter.id,
    );
    if (!inverted.ok) throw inverted.error;

    expect(inverted.value.state.tacticalStateByTeamId[teamAId]).toMatchObject({
      activeSetterPlayerId: secondSetter.id,
      activeSetterPosition: 4,
      formationState: 'five_one_inversion',
    });
    expect(inverted.value.state.derivedSubstitutionGroups).toHaveLength(1);
    const substitutionEvents = inverted.value.events.filter(
      (event) => event.type === 'substitution_made',
    );
    expect(substitutionEvents[0]).toMatchObject({
      playerOutRole: 'setter',
      playerInRole: 'opposite',
      score: { teamA: 0, teamB: 0 },
    });

    const undone = await service.undo(created.value.state.metadata.id);
    expect(undone.ok && undone.value.state.tacticalStateByTeamId[teamAId].formationState).toBe(
      'unknown',
    );
    const redone = await service.redo(created.value.state.metadata.id);
    expect(redone.ok && redone.value.state.tacticalStateByTeamId[teamAId].formationState).toBe(
      'five_one_inversion',
    );

    const registered = await service.registerScout(
      created.value.state.metadata.id,
      teamAId,
      '08E+',
    );
    expect(registered.ok && registered.value.timeline.at(-1)?.event).toMatchObject({
      setterPlayerId: secondSetter.id,
      setterPosition: 4,
      formationState: 'five_one_inversion',
    });
  });

  it('enriches a partial tactical event through auditable correction and replay', async () => {
    const database = createDatabase();
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
    );
    const created = await service.createMatch({
      teamAName: 'A',
      teamBName: 'B',
      teamAPlayers: [1, 2, 3, 4, 5, 6],
      teamBPlayers: [7, 8, 9, 10, 11, 12],
      complexityProfileId: 'tactical',
    });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const registered = await service.registerScout(matchId, created.value.teams[0].id, '01A#');
    if (!registered.ok) throw registered.error;
    const source = registered.value.timeline[0];
    expect(source?.event.completeness?.status).toBe('partial');
    if (!source) throw new Error('Partial event was not projected.');

    const enriched = await service.correctScout(matchId, source.sourceEventId, '01A#', {
      captureDraft: {
        skillType: 'power',
        origin: { zoneId: '4', x: 1 / 6, y: 1 / 6 },
        target: { zoneId: '1', x: 5 / 6, y: 1 / 2 },
        direction: 'diagonal',
      },
    });
    expect(enriched.ok && enriched.value.timeline[0]?.event.completeness).toEqual({
      status: 'complete',
      missingRecommendedFields: [],
    });
    expect(enriched.ok && enriched.value.timeline[0]?.event.metadata).toMatchObject({
      schemaVersion: '2.0.0',
      tactical: {
        attack: {
          attackType: 'power',
          trajectory: {
            origin: { zoneId: '4', x: 1 / 6 },
            target: { zoneId: '2', y: 1 / 2 },
            direction: 'diagonal',
          },
        },
      },
    });
    expect(enriched.ok && enriched.value.timeline[0]?.event.metadata).not.toHaveProperty(
      'captureDraft',
    );
    expect(enriched.ok && enriched.value.timeline[0]?.corrected).toBe(true);
    expect(enriched.ok && enriched.value.report.attack[0]).toMatchObject({
      volume: 1,
      points: 1,
      efficiency: { value: 1, numerator: 1, denominator: 1 },
    });
    expect(enriched.ok && enriched.value.report.tactical.attackDirections[0]).toMatchObject({
      originZone: '4',
      targetZone: '2',
      direction: 'diagonal',
      setterPosition: 1,
    });
    if (!enriched.ok) throw enriched.error;
    const reportedAttack = enriched.value.report.attack.find((row) => row.volume === 1);
    if (!reportedAttack) throw new Error('Reported attack was not found.');
    const pdf = await service.exportPdf(matchId);
    const bundle = await service.exportBundle(matchId);
    expect(pdf.ok && pdf.value).not.toContain('BOX SCORE');
    expect(bundle.ok && Object.keys(bundle.value.files).sort()).toEqual([
      'estatisticas.csv',
      'eventos.csv',
      'partida.json',
      'relatorio.pdf',
      'scout.txt',
    ]);
    if (!pdf.ok) throw pdf.error;
    if (!bundle.ok) throw bundle.error;
    expect(bundle.value.files['relatorio.pdf']).toBe(pdf.value);
    const reportDraft = { title: 'Relatorio revisado', subtitle: '', author: 'Analista', notes: 'Ajustar cobertura.', sections: ['summary'] as const };
    const editedPdf = await service.exportPdf(matchId, { reportDraft });
    const editedBundle = await service.exportBundle(matchId, { reportDraft });
    if (!editedPdf.ok) throw editedPdf.error;
    if (!editedBundle.ok) throw editedBundle.error;
    expect(editedPdf.value).toContain('Ajustar cobertura.');
    expect(editedBundle.value.files['relatorio.pdf']).toBe(editedPdf.value);
    expect(bundle.value.files['estatisticas.csv']).toContain(
      `attack,${reportedAttack.teamId},${reportedAttack.playerId},,efficiency,1,1,1`,
    );

    const undone = await service.undo(matchId);
    expect(undone.ok && undone.value.timeline[0]?.event.completeness?.status).toBe('partial');
    const redone = await service.redo(matchId);
    expect(redone.ok && redone.value.timeline[0]?.event.completeness?.status).toBe('complete');
    if (!redone.ok) throw redone.error;

    await database.close();
    const reopenedDatabase = new ScoutTrainerDatabase(database.name);
    databases.push(reopenedDatabase);
    const reopenedService = new ScoutTrainerService(
      new IndexedDbMatchRepository(reopenedDatabase),
      new IndexedDbEventRepository(reopenedDatabase),
      new IndexedDbTeamRepository(reopenedDatabase),
      new IndexedDbPlayerRepository(reopenedDatabase),
      createDefaultProfileRegistry(),
    );
    const replayed = await reopenedService.loadMatch(matchId);
    expect(replayed.ok && replayed.value.timeline[0]?.event.completeness?.status).toBe('complete');
    expect(replayed.ok && replayed.value.report).toEqual(redone.value.report);
  });

  it('persists normalized coordinates and derived zones on the initial typed registration', async () => {
    const database = createDatabase();
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
    );
    const created = await service.createMatch({
      teamAName: 'A',
      teamBName: 'B',
      teamAPlayers: [1, 2, 3, 4, 5, 6],
      teamBPlayers: [7, 8, 9, 10, 11, 12],
      complexityProfileId: 'tactical',
    });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const teamAId = created.value.teams[0].id;

    const registered = await service.registerScout(matchId, teamAId, '01A#', {
      captureDraft: {
        origin: { x: 0.5, y: 0.2 },
        target: { x: 0.8, y: 0.78 },
        direction: 'diagonal',
        captureMethod: 'drawn',
      },
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) throw registered.error;
    const event = registered.value.timeline.at(-1)?.event;
    expect(event?.metadata?.tactical?.attack?.trajectory).toMatchObject({
      origin: { x: 0.5, y: 0.2, zoneId: '3' },
      target: { x: 0.8, y: 0.78, zoneId: '1' },
      direction: 'diagonal',
      captureMethod: 'drawn',
    });
    expect(event?.metadata).not.toHaveProperty('captureDraft');
    expect(event?.completeness?.status).toBe('complete');
  });

  it('roundtrips precise V2 spatial capture and corrections without rewriting legacy metadata', async () => {
    const database = createDatabase();
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
    );
    const created = await service.createMatch({
      teamAName: 'A',
      teamBName: 'B',
      teamAPlayers: [1, 2, 3, 4, 5, 6],
      teamBPlayers: [7, 8, 9, 10, 11, 12],
      complexityProfileId: 'basic',
    });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const teamId = created.value.teams[0].id;
    const spatial = {
      origin: { surface: 'serviceZone', x: 0.123456789012345, y: 0.987654321098765 },
      destination: { surface: 'court', x: 0.876543210987654, y: 0.012345678901234 },
    } as const;
    const invalid = await service.registerScout(matchId, teamId, '01S+', {
      spatial: { ...spatial, origin: { ...spatial.origin, x: Infinity } },
    });
    expect(invalid.ok).toBe(false);
    const registered = await service.registerScout(matchId, teamId, '01S+', {
      spatial,
      skillType: 'float',
      targetZone: 1,
    });
    if (!registered.ok) throw registered.error;
    const source = registered.value.timeline.at(-1)!;
    expect(source.event.metadata?.spatial).toEqual(spatial);
    const corrected = await service.correctScout(matchId, source.sourceEventId, '01S+', {
      rotation: 2,
    });
    if (!corrected.ok) throw corrected.error;
    expect(corrected.value.timeline.at(-1)?.event.metadata).toMatchObject({
      spatial,
      skillType: 'float',
      targetZone: 1,
      rotation: 2,
    });
    const replacement = { ...spatial, origin: { ...spatial.origin, x: 0.333333333333333 } };
    const moved = await service.correctScout(matchId, source.sourceEventId, '01S+', {
      spatial: replacement,
    });
    if (!moved.ok) throw moved.error;
    expect(moved.value.timeline.at(-1)?.event.metadata).toMatchObject({
      spatial: replacement,
      skillType: 'float',
      rotation: 2,
    });
    const legacy = await service.registerScout(matchId, teamId, '02A+', { attackTempo: 'fast' });
    if (!legacy.ok) throw legacy.error;
    expect(legacy.value.timeline.at(-1)?.event.metadata?.spatial).toBeUndefined();
    await database.close();
    const reopened = new ScoutTrainerDatabase(database.name);
    databases.push(reopened);
    const history = await new IndexedDbEventRepository(reopened).listByMatch(matchId);
    if (!history.ok) throw history.error;
    const original = history.value.find(
      (event) => event.type === 'scout_registered' && event.event.id === source.sourceEventId,
    );
    expect(original?.type === 'scout_registered' && original.event.metadata?.spatial).toEqual(
      spatial,
    );
    const corrections = history.value.filter((event) => event.type === 'scout_corrected');
    expect(corrections.at(-1)?.replacementEvent.metadata).toMatchObject({
      spatial: replacement,
      skillType: 'float',
      rotation: 2,
    });
    const replayService = new ScoutTrainerService(
      new IndexedDbMatchRepository(reopened),
      new IndexedDbEventRepository(reopened),
      new IndexedDbTeamRepository(reopened),
      new IndexedDbPlayerRepository(reopened),
      createDefaultProfileRegistry(),
    );
    const replayed = await replayService.loadMatch(matchId);
    if (!replayed.ok) throw replayed.error;
    expect(replayed.value.timeline.map((item) => item.event.metadata)).toEqual(
      legacy.value.timeline.map((item) => item.event.metadata),
    );
  });

  it('produces identical contextual rally projections live and after replay', async () => {
    const database = createDatabase();
    const service = new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
    );
    const created = await service.createMatch({
      teamAName: 'A',
      teamBName: 'B',
      teamAPlayers: [1, 2, 3, 4, 5, 6],
      teamBPlayers: [7, 8, 9, 10, 11, 12],
      initialServingTeam: 'teamA',
      complexityProfileId: 'basic',
    });
    if (!created.ok) throw created.error;
    const [teamA, teamB] = created.value.teams;
    const matchId = created.value.state.metadata.id;

    await service.registerScout(matchId, teamA.id, '01S+');
    await service.registerScout(matchId, teamB.id, '07R#');
    await service.registerScout(matchId, teamB.id, '07E+');
    const live = await service.registerScout(matchId, teamB.id, '07A+');
    if (!live.ok) throw live.error;

    expect(live.value.tacticalRally.contacts.at(-1)).toMatchObject({
      phase: 'sideout',
      receptionForAttack: { grade: 'A' },
      expectedNextAction: { skill: 'block', teamId: teamA.id },
    });
    expect(live.value.tacticalRally.rotationByTeamId).toEqual({
      [teamA.id]: 1,
      [teamB.id]: 1,
    });

    await database.close();
    const reopenedDatabase = new ScoutTrainerDatabase(database.name);
    databases.push(reopenedDatabase);
    const replayService = new ScoutTrainerService(
      new IndexedDbMatchRepository(reopenedDatabase),
      new IndexedDbEventRepository(reopenedDatabase),
      new IndexedDbTeamRepository(reopenedDatabase),
      new IndexedDbPlayerRepository(reopenedDatabase),
      createDefaultProfileRegistry(),
    );
    const replayed = await replayService.loadMatch(matchId);

    expect(replayed.ok && replayed.value.tacticalRally).toEqual(live.value.tacticalRally);
  });

  it('migrates to version 5 and persists and rebuilds analytics snapshots', async () => {
    const database = createDatabase();
    const connection = await database.open();

    expect(connection.version).toBe(DATABASE_VERSION);
    expect(connection.objectStoreNames.contains(STORE_NAMES.analyticsSnapshots)).toBe(true);

    const repository = new IndexedDbAnalyticsSnapshotRepository(database);
    const snapshot: MatchAnalyticsSnapshot = {
      matchId: 'm1',
      schemaVersion: 1,
      eventCount: 10,
      lastSequence: 10,
      generatedAt: 1,
      teamSummary: [
        {
          teamId: 't1',
          attackEfficiencyNumerator: 5,
          attackEfficiencyDenominator: 10,
          serveEfficiencyNumerator: 2,
          serveEfficiencyDenominator: 10,
          receptionPositiveNumerator: 8,
          receptionPositiveDenominator: 10,
          receptionExcellentNumerator: 4,
          receptionExcellentDenominator: 10,
          sideoutNumerator: 6,
          sideoutDenominator: 10,
          breakpointNumerator: 3,
          breakpointDenominator: 10,
          blocks: 2,
          aces: 1,
          errors: 0,
        },
      ],
      playerSummary: [],
    };

    const saved = await repository.save(snapshot);
    expect(saved.ok).toBe(true);

    const found = await repository.findById('m1');
    expect(found.ok && found.value).toEqual(snapshot);

    const deleted = await repository.deleteByMatchId('m1');
    expect(deleted.ok).toBe(true);

    const afterDelete = await repository.findById('m1');
    expect(afterDelete.ok && afterDelete.value).toBeNull();
  });
});
