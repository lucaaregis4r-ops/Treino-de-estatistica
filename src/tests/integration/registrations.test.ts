import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import {
  ScoutTrainerDatabase,
  STORE_NAMES,
} from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEntityRepository } from '../../infrastructure/persistence/repositories/IndexedDbEntityRepository';
import type {
  AthleteRegistration,
  TeamRegistration,
} from '../../domain/match/entities/Registration';

it('upgrades version 5 preserving historical records and persists reusable registrations across reload', async () => {
  const name = `registrations-${crypto.randomUUID()}`;
  const historicalMatch = { id: 'old-match', name: 'Equipe antiga x Visitante' };
  const historicalPlayer = {
    id: 'old-player',
    teamId: 'old-team',
    name: 'Nome original',
    number: 7,
  };
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 5);
    request.onupgradeneeded = () => {
      for (const store of Object.values(STORE_NAMES)) {
        if (store === 'athleteRegistrations' || store === 'teamRegistrations') continue;
        const keyPath =
          store.endsWith('Profiles') || store === 'settings'
            ? 'key'
            : store === 'analyticsSnapshots'
              ? 'matchId'
              : 'id';
        request.result.createObjectStore(store, { keyPath });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['matches', 'players'], 'readwrite');
      tx.objectStore('matches').put(historicalMatch);
      tx.objectStore('players').put(historicalPlayer);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
  const database = new ScoutTrainerDatabase(name);
  try {
    const athletes = new IndexedDbEntityRepository<AthleteRegistration>(
      database,
      'athleteRegistrations',
    );
    const teams = new IndexedDbEntityRepository<TeamRegistration>(database, 'teamRegistrations');
    const athlete: AthleteRegistration = {
      id: 'athlete-1',
      name: 'Ana',
      number: 7,
      active: true,
      createdAt: 1,
      updatedAt: 1,
    };
    expect((await athletes.save(athlete)).ok).toBe(true);
    expect(
      (
        await teams.save({
          id: 'team-1',
          name: 'Equipe',
          athleteIds: [athlete.id],
          createdAt: 1,
          updatedAt: 1,
        })
      ).ok,
    ).toBe(true);
    expect(
      (await athletes.save({ ...athlete, name: 'Ana editada', active: false, updatedAt: 2 })).ok,
    ).toBe(true);
    await database.close();
    expect(await athletes.list()).toMatchObject({
      ok: true,
      value: [{ name: 'Ana editada', active: false }],
    });
    expect(await teams.findById('team-1')).toMatchObject({
      ok: true,
      value: { athleteIds: ['athlete-1'] },
    });
    expect(await new IndexedDbEntityRepository(database, 'matches').findById('old-match')).toEqual({
      ok: true,
      value: historicalMatch,
    });
    expect(await new IndexedDbEntityRepository(database, 'players').findById('old-player')).toEqual(
      { ok: true, value: historicalPlayer },
    );
  } finally {
    await database.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
});
