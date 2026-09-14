import { RepositoryError } from '../../../core/errors/RepositoryError';
import { isSkill } from '../../../domain/scout/entities/Skill';
import type { ScoutEvent } from '../../../domain/scout/events/ScoutEvent';
import { normalizeTacticalMetadata } from '../../../domain/scout/tactical/TacticalMetadataAdapter';

export const DATABASE_VERSION = 8;

export const STORE_NAMES = {
  athleteRegistrations: 'athleteRegistrations',
  teamRegistrations: 'teamRegistrations',
  matches: 'matches',
  events: 'events',
  teams: 'teams',
  players: 'players',
  codeProfiles: 'codeProfiles',
  complexityProfiles: 'complexityProfiles',
  competitionProfiles: 'competitionProfiles',
  trainingProfiles: 'trainingProfiles',
  trainingSessions: 'trainingSessions',
  trainingAttempts: 'trainingAttempts',
  settings: 'settings',
  freeLogSessions: 'freeLogSessions',
  analyticsSnapshots: 'analyticsSnapshots',
  analysisConfigurations: 'analysisConfigurations',
  reportChartConfigurations: 'reportChartConfigurations',
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

function createStore(database: IDBDatabase, name: StoreName, keyPath: string): IDBObjectStore {
  return database.createObjectStore(name, { keyPath });
}

function migrateToVersion1(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(STORE_NAMES.matches))
    createStore(database, STORE_NAMES.matches, 'id');
  if (!database.objectStoreNames.contains(STORE_NAMES.events)) {
    const store = createStore(database, STORE_NAMES.events, 'id');
    store.createIndex('matchId', 'matchId');
    store.createIndex('matchSequence', ['matchId', 'sequence'], { unique: true });
  }
  if (!database.objectStoreNames.contains(STORE_NAMES.teams))
    createStore(database, STORE_NAMES.teams, 'id');
  if (!database.objectStoreNames.contains(STORE_NAMES.players)) {
    const store = createStore(database, STORE_NAMES.players, 'id');
    store.createIndex('teamId', 'teamId');
  }
  for (const name of [
    STORE_NAMES.codeProfiles,
    STORE_NAMES.complexityProfiles,
    STORE_NAMES.competitionProfiles,
    STORE_NAMES.trainingProfiles,
  ]) {
    if (!database.objectStoreNames.contains(name)) createStore(database, name, 'key');
  }
  if (!database.objectStoreNames.contains(STORE_NAMES.trainingSessions))
    createStore(database, STORE_NAMES.trainingSessions, 'id');
  if (!database.objectStoreNames.contains(STORE_NAMES.trainingAttempts))
    createStore(database, STORE_NAMES.trainingAttempts, 'id');
  if (!database.objectStoreNames.contains(STORE_NAMES.freeLogSessions))
    createStore(database, STORE_NAMES.freeLogSessions, 'id');
}

function migrateToVersion2(database: IDBDatabase, transaction: IDBTransaction): void {
  if (!database.objectStoreNames.contains(STORE_NAMES.settings))
    createStore(database, STORE_NAMES.settings, 'key');
  const sessions = transaction.objectStore(STORE_NAMES.trainingSessions);
  if (!sessions.indexNames.contains('status')) sessions.createIndex('status', 'status');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function migrateScoutEvent(value: unknown): unknown {
  if (!isRecord(value) || !isSkill(String(value.skill)) || !isRecord(value.metadata)) return value;
  const event = value as unknown as ScoutEvent;
  return { ...event, metadata: normalizeTacticalMetadata(event.metadata, event.skill) };
}

function migrateStoredMatchEvent(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.event)) return value;
  const matchEvent = value.event;
  if (matchEvent.type === 'scout_registered') {
    return { ...value, event: { ...matchEvent, event: migrateScoutEvent(matchEvent.event) } };
  }
  if (matchEvent.type === 'scout_corrected') {
    return {
      ...value,
      event: { ...matchEvent, replacementEvent: migrateScoutEvent(matchEvent.replacementEvent) },
    };
  }
  return value;
}

function migrateToVersion3(transaction: IDBTransaction): void {
  const request = transaction.objectStore(STORE_NAMES.events).openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.update(migrateStoredMatchEvent(cursor.value));
    cursor.continue();
  };
}

function migrateToVersion5(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(STORE_NAMES.analyticsSnapshots)) {
    createStore(database, STORE_NAMES.analyticsSnapshots, 'matchId');
  }
}

function migrateToVersion7(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(STORE_NAMES.analysisConfigurations)) {
    const store = createStore(database, STORE_NAMES.analysisConfigurations, 'id');
    store.createIndex('matchId', 'matchId');
  }
}

function migrateToVersion8(database: IDBDatabase): void {
  if (!database.objectStoreNames.contains(STORE_NAMES.reportChartConfigurations)) {
    const store = createStore(database, STORE_NAMES.reportChartConfigurations, 'id');
    store.createIndex('matchId', 'matchId');
  }
}

export class ScoutTrainerDatabase {
  private databasePromise?: Promise<IDBDatabase>;

  constructor(readonly name = 'scout-trainer') {}

  open(): Promise<IDBDatabase> {
    this.databasePromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, DATABASE_VERSION);

      request.onupgradeneeded = (event) => {
        const database = request.result;
        migrateToVersion1(database);
        if (request.transaction) migrateToVersion2(database, request.transaction);
        if (event.oldVersion < 3 && request.transaction) migrateToVersion3(request.transaction);
        if (event.oldVersion < 5) migrateToVersion5(database);
        if (event.oldVersion < 6) {
          createStore(database, STORE_NAMES.athleteRegistrations, 'id');
          createStore(database, STORE_NAMES.teamRegistrations, 'id');
        }
        if (event.oldVersion < 7) migrateToVersion7(database);
        if (event.oldVersion < 8) migrateToVersion8(database);
      };

      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () =>
        reject(
          new RepositoryError(
            'database_open_failed',
            `Could not open IndexedDB database ${this.name}.`,
            request.error,
          ),
        );
      request.onblocked = () =>
        reject(
          new RepositoryError(
            'database_open_failed',
            `Opening IndexedDB database ${this.name} was blocked.`,
          ),
        );
    });

    return this.databasePromise;
  }

  async close(): Promise<void> {
    if (!this.databasePromise) return;
    const database = await this.databasePromise;
    database.close();
    this.databasePromise = undefined;
  }
}
