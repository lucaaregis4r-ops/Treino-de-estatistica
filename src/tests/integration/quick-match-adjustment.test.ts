import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { ScoutTrainerService } from '../../application/ScoutTrainerService';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbTeamRepository } from '../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { IndexedDbPlayerRepository } from '../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';
import { GestureExpectedActionResolver } from '../../domain/rally/gesture/GestureExpectedActionResolver';

const databases: ScoutTrainerDatabase[] = [];
function setup() {
  const database = new ScoutTrainerDatabase(`quick-adjust-${crypto.randomUUID()}`);
  databases.push(database);
  const create = () =>
    new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      createDefaultProfileRegistry(),
    );
  return { database, create, service: create() };
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.close();
});

it('persists rotation, server and score atomically without changing prior contacts or roster', async () => {
  const { service, database, create } = setup();
  const match = await service.createMatch({
    teamAName: 'A',
    teamBName: 'B',
    teamAPlayers: [1, 2, 3, 4, 5, 6, 13],
    teamBPlayers: [7, 8, 9, 10, 11, 12],
    complexityProfileId: 'basic',
  });
  if (!match.ok) throw match.error;
  const id = match.value.state.metadata.id;
  const [a, b] = match.value.teams;
  const previous = await service.registerScout(id, a.id, '01S+');
  if (!previous.ok) throw previous.error;
  const playerA = match.value.players.find((p) => p.number === 3)!;
  const playerB = match.value.players.find((p) => p.number === 8)!;
  const input = {
    servingTeamId: b.id,
    positionOneByTeam: { [a.id]: playerA.id, [b.id]: playerB.id },
    score: { teamA: 12, teamB: 9 },
    resumeFromServe: true,
  };
  const invalid = await service.adjustMatchContext(id, {
    ...input,
    positionOneByTeam: { ...input.positionOneByTeam, [b.id]: playerA.id },
  });
  expect(invalid.ok).toBe(false);
  const unchanged = await service.loadMatch(id);
  if (!unchanged.ok) throw unchanged.error;
  expect(unchanged.value.events).toEqual(previous.value.events);
  const adjusted = await service.adjustMatchContext(id, input);
  if (!adjusted.ok) throw adjusted.error;
  expect(adjusted.value.state.score).toEqual(input.score);
  expect(adjusted.value.state.servingTeamId).toBe(b.id);
  expect(adjusted.value.timeline).toEqual(previous.value.timeline);
  expect(adjusted.value.players).toEqual(previous.value.players);
  expect(adjusted.value.events.slice(0, previous.value.events.length)).toEqual(
    previous.value.events,
  );
  for (const lineup of adjusted.value.currentLineups) {
    expect(lineup.slots[lineup.positions[1]].playerId).toBe(input.positionOneByTeam[lineup.teamId]);
    expect(lineup.slots).toEqual(
      previous.value.currentLineups.find((item) => item.teamId === lineup.teamId)?.slots,
    );
  }
  expect(adjusted.value.state.currentRally.status).not.toBe('active');
  expect(adjusted.value.tacticalRally.expectedNextAction).toBeUndefined();
  const rejected = await service.adjustMatchContext(id, {
    ...input,
    score: { teamA: -1, teamB: 9 },
  });
  expect(rejected.ok).toBe(false);
  await database.close();
  const reopened = await create().loadMatch(id);
  if (!reopened.ok) throw reopened.error;
  expect(reopened.value.state).toEqual(adjusted.value.state);
});

it('registers free ball coordinates without rewriting the attack and prepares the opposite defense', async () => {
  const { service } = setup();
  const match = await service.createMatch({
    teamAName: 'A',
    teamBName: 'B',
    teamAPlayers: [1, 2, 3, 4, 5, 6],
    teamBPlayers: [7, 8, 9, 10, 11, 12],
    complexityProfileId: 'basic',
  });
  if (!match.ok) throw match.error;
  const id = match.value.state.metadata.id;
  const [a, b] = match.value.teams;
  const attack = await service.registerScout(id, a.id, '01A+');
  if (!attack.ok) throw attack.error;
  const spatial = {
    origin: { surface: 'court' as const, x: 0.8, y: 0.3 },
    destination: { surface: 'court' as const, x: 0.2, y: 0.7 },
  };
  const freeBall = await service.registerVisualScout(id, {
    teamId: b.id,
    skill: 'free_ball',
    evaluation: 'neutral',
    spatial,
  });
  if (!freeBall.ok) throw freeBall.error;
  expect(freeBall.value.timeline).toHaveLength(2);
  expect(freeBall.value.timeline[0]).toEqual(attack.value.timeline[0]);
  expect(freeBall.value.timeline[1].event.skill).toBe('free_ball');
  expect(freeBall.value.timeline[1].event.playerId).toBeUndefined();
  expect(freeBall.value.timeline[1].event.metadata?.spatial).toEqual(
    expect.objectContaining(spatial),
  );
  expect(
    new GestureExpectedActionResolver().resolve(freeBall.value.tacticalRally.expectedNextAction),
  ).toEqual({ skill: 'dig', teamId: a.id });
  const reopened = await service.loadMatch(id);
  if (!reopened.ok) throw reopened.error;
  expect(reopened.value.timeline).toEqual(freeBall.value.timeline);
});

it('registers infractions without spatial capture and undoes their terminal consequences', async () => {
  const { service } = setup();
  const match = await service.createMatch({
    teamAName: 'A',
    teamBName: 'B',
    teamAPlayers: [1, 2, 3, 4, 5, 6],
    teamBPlayers: [7, 8, 9, 10, 11, 12],
    complexityProfileId: 'basic',
  });
  if (!match.ok) throw match.error;
  const id = match.value.state.metadata.id;
  const [a, b] = match.value.teams;

  const fault = await service.registerFault(id, {
    teamId: a.id,
    faultType: 'net_touch',
  });
  if (!fault.ok) throw fault.error;
  expect(fault.value.events.find((event) => event.type === 'fault')).toMatchObject({
    faultType: 'net_touch',
    teamId: a.id,
    pointFor: b.id,
    terminal: true,
  });
  expect(fault.value.state).toMatchObject({
    score: { teamA: 0, teamB: 1 },
    servingTeamId: b.id,
    currentRally: { status: 'ended', winningTeamId: b.id },
  });

  const undone = await service.undo(id);
  if (!undone.ok) throw undone.error;
  expect(undone.value.state).toMatchObject({
    score: { teamA: 0, teamB: 0 },
    servingTeamId: a.id,
    currentRally: { status: 'idle' },
  });
});
