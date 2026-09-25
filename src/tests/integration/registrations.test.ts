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
    request.onerror = () => reject(new Error(request.error?.message ?? 'Could not open test database.'));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['matches', 'players'], 'readwrite');
      tx.objectStore('matches').put(historicalMatch);
      tx.objectStore('players').put(historicalPlayer);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(new Error(tx.error?.message ?? 'Could not seed test database.'));
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
      sport: 'volleyball',
      number: 7,
      active: true,
      createdAt: 1,
      updatedAt: 1,
    };
    const unavailableDatabase = {
      open: (): Promise<IDBDatabase> => Promise.reject(new Error('IndexedDB indisponível')),
    } as ScoutTrainerDatabase;
    const unavailableAthletes = new IndexedDbEntityRepository<AthleteRegistration>(
      unavailableDatabase,
      'athleteRegistrations',
    );
    expect(await unavailableAthletes.saveMany([athlete])).toMatchObject({ ok: false });
    expect((await athletes.saveMany([athlete])).ok).toBe(true);
    expect(
      (
        await teams.save({
          id: 'team-1',
          name: 'Equipe',
          sport: 'volleyball',
          athleteIds: [athlete.id],
          roster: [{ athleteId: athlete.id, number: 7, position: 'setter' }],
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
      value: {
        sport: 'volleyball',
        athleteIds: ['athlete-1'],
        roster: [{ athleteId: 'athlete-1', number: 7, position: 'setter' }],
      },
    });
    expect(
      (
        await athletes.saveMany([
          { ...athlete, name: 'Ana retry', updatedAt: 3 },
          {
            id: 'athlete-2',
            name: "Bia D'Ávila",
            sport: 'football',
            active: true,
            createdAt: 3,
            updatedAt: 3,
          },
        ])
      ).ok,
    ).toBe(true);
    const retried = await athletes.list();
    expect(retried.ok).toBe(true);
    if (retried.ok) {
      expect(retried.value).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: 'athlete-1', name: 'Ana retry', sport: 'volleyball' }),
        expect.objectContaining({ id: 'athlete-2', name: "Bia D'Ávila", sport: 'football' }),
      ]));
    }
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
      request.onerror = () => reject(new Error(request.error?.message ?? 'Could not delete test database.'));
    });
  }
});
