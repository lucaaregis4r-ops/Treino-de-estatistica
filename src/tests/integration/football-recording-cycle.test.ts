import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { ScoutTrainerService, type RegisterFootballEventInput } from '../../application/ScoutTrainerService';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbTeamRepository } from '../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { IndexedDbPlayerRepository } from '../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';
import { IndexedDbMatchBackupRepository } from '../../infrastructure/persistence/backup/IndexedDbMatchBackupRepository';
import { projectControl } from '../../domain/football/FootballObservation';
import { footballAssistedCandidateKey, footballAssistedSourceRevision, resolveFootballAssistedRecording, upsertFootballAssistedConfirmation, type FootballAssistedRecording } from '../../domain/football/FootballAssistedRecording';
import { JsonMatchImporter } from '../../infrastructure/export/json/MatchJson';

const databases: ScoutTrainerDatabase[] = [];

function setup() {
  const database = new ScoutTrainerDatabase(`football-cycle-${crypto.randomUUID()}`);
  databases.push(database);
  let now = 1_000_000;
  let id = 0;
  const create = () => new ScoutTrainerService(
    new IndexedDbMatchRepository(database), new IndexedDbEventRepository(database),
    new IndexedDbTeamRepository(database), new IndexedDbPlayerRepository(database),
    createDefaultProfileRegistry(), { createId: () => `id-${++id}`, now: () => now },
  );
  return { database, create, service: create(), advance: (ms: number) => { now += ms; } };
}

afterEach(async () => { for (const database of databases.splice(0)) await database.close(); });

it('persists the required football sequence, clock, correction and goal-safe undo', async () => {
  const { service, create, database, advance } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'Azul', teamBName: 'Verde', teamAPlayers: [9], teamBPlayers: [4], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const [a, b] = created.value.teams;
  const playerA = created.value.players.find((player) => player.teamId === a.id)!;
  const point = (x: number, y: number) => ({ x, y });
  const register = async (input: RegisterFootballEventInput) => {
    const result = await service.registerFootballEvent(matchId, input);
    if (!result.ok) throw result.error;
    return result.value;
  };

  await service.setFootballClock(matchId, { kind: 'start' }); advance(65_000);
  await register({ teamId: a.id, possessionTeamId: a.id, action: 'ball_recovery', outcome: 'observed', location: point(.2, .3) });
  await register({ teamId: a.id, possessionTeamId: a.id, playerId: playerA.id, action: 'pass', outcome: 'complete', location: point(.2, .3), endLocation: point(.4, .4) });
  await register({ teamId: a.id, action: 'carry', outcome: 'observed', location: point(.4, .4), endLocation: point(.6, .5) });
  await register({ teamId: a.id, action: 'pass', outcome: 'incomplete', location: point(.6, .5), endLocation: point(.7, .2) });
  await register({ teamId: b.id, action: 'ball_recovery', outcome: 'observed', location: point(.7, .2) });
  let workspace = await register({ teamId: b.id, action: 'shot', outcome: 'off_target', location: point(.85, .4) });
  expect(workspace.football?.events).toHaveLength(6);
  expect(workspace.football?.events.map((event) => event.type.name)).toEqual(['Ball Recovery', 'Pass', 'Carry', 'Pass', 'Ball Recovery', 'Shot']);
  expect(workspace.football?.events[0].player).toBeUndefined();
  expect(workspace.football?.events[0].possession).toBe(1);
  expect(workspace.football?.events[1].possession).toBe(1);
  expect(workspace.football?.events[3].pass?.outcome?.name).toBe('Incomplete');
  expect(workspace.football?.events[5].location).toEqual([102, 32]);

  workspace = await register({ teamId: a.id, action: 'shot', outcome: 'goal', location: point(.9, .5) });
  expect(workspace.football?.score).toEqual({ teamA: 1, teamB: 0 });
  const undone = await service.undoFootballEvent(matchId); if (!undone.ok) throw undone.error;
  expect(undone.value.football?.score).toEqual({ teamA: 0, teamB: 0 });
  expect(undone.value.football?.events).toHaveLength(6);
  const manual = await service.adjustFootballScore(matchId, a.id, 1); if (!manual.ok) throw manual.error;
  expect(manual.value.football?.score).toEqual({ teamA: 1, teamB: 0 });
  expect(manual.value.events.some((event) => event.type === 'score_adjustment' && event.reason === 'football_manual:operator')).toBe(true);
  const manualReverted = await service.adjustFootballScore(matchId, a.id, -1); if (!manualReverted.ok) throw manualReverted.error;

  const target = undone.value.football!.events[3];
  const corrected = await service.correctFootballEvent(matchId, target.id, { teamId: a.id, action: 'pass', outcome: 'complete', location: point(.6, .5), endLocation: point(.75, .25) });
  if (!corrected.ok) throw corrected.error;
  expect(corrected.value.football?.events[3].pass?.outcome).toBeUndefined();
  expect(corrected.value.football?.events[3].pass?.end_location).toEqual([90, 20]);

  const paused = await service.setFootballClock(matchId, { kind: 'pause' }); if (!paused.ok) throw paused.error;
  expect(paused.value.football?.clock.elapsedMs).toBe(65_000);
  await database.close();
  const reopened = await create().loadMatch(matchId); if (!reopened.ok) throw reopened.error;
  expect(reopened.value.football?.events).toEqual(corrected.value.football?.events);
  expect(reopened.value.football?.clock).toEqual(paused.value.football?.clock);
  expect(reopened.value.football?.score).toEqual({ teamA: 0, teamB: 0 });

  const sourceService = create();
  const backup = await sourceService.exportJson(matchId); if (!backup.ok) throw backup.error;
  const parsed = JSON.parse(backup.value) as { schemaVersion: string; modality: string; compatibility: { footballEventContract: string } };
  expect(parsed).toMatchObject({ schemaVersion: '1.2.0', modality: 'football', compatibility: { footballEventContract: 'statsbomb-open-data-4.0.0-subset' } });
  const interchange = await sourceService.exportFootballOpenData(matchId); if (!interchange.ok) throw interchange.error;
  const provider = JSON.parse(interchange.value) as { openDataVersion: string; modality: string; events: Array<Record<string, unknown>>; manifest: { limitations: string[] } };
  expect(provider).toMatchObject({ openDataVersion: '4.0.0', modality: 'football' });
  expect(provider.events).toHaveLength(reopened.value.football?.events.length ?? 0);
  expect(provider.events.some((event) => 'scout_trainer' in event || 'statsbomb_xg' in event)).toBe(false);
  const targetDatabase = new ScoutTrainerDatabase(`football-restore-${crypto.randomUUID()}`); databases.push(targetDatabase);
  const restoredService = new ScoutTrainerService(new IndexedDbMatchRepository(targetDatabase), new IndexedDbEventRepository(targetDatabase), new IndexedDbTeamRepository(targetDatabase), new IndexedDbPlayerRepository(targetDatabase), createDefaultProfileRegistry()).enableBackupRestore(new IndexedDbMatchBackupRepository(targetDatabase));
  const restored = await restoredService.importJson(backup.value); if (!restored.ok) throw restored.error;
  expect(restored.value.football?.events).toEqual(reopened.value.football?.events);
  expect(restored.value.football?.events[0].location).toEqual([24, 24]);
  expect(restored.value.football?.clock).toEqual(reopened.value.football?.clock);
});

it('persists assisted facts without duplicating a confirmation and flags it only while a source revision is undone', async () => {
  const { service, create, database } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const [a] = created.value.teams;
  const register = async (endX: number) => {
    const saved = await service.registerFootballEvent(matchId, { teamId: a.id, action: 'pass', outcome: 'complete', location: { x: .2, y: .4 }, endLocation: { x: endX, y: .4 } });
    if (!saved.ok) throw saved.error;
    return saved.value;
  };
  await register(.5);
  const afterTarget = await register(.7);
  const [source, target] = afterTarget.football!.events;
  const key = footballAssistedCandidateKey({ kind: 'supporting_detail', targetObservationId: 'observation-1', sourceEventIds: [source.id] });
  const base: FootballAssistedRecording = {
    schema_version: '1.0.0',
    observations: [{ id: 'observation-1', matchId, period: target.period, targetEventId: target.id, possession: target.possession, controlledTeamId: a.id, observedAt: target.timestamp, provenance: 'operator_observed' }],
    details: [{ id: 'detail-1', observationId: 'observation-1', type: 'support', targetId: source.id, value: 'unknown', teamId: a.id, targetObservedAt: source.timestamp, filledAt: target.timestamp, provenance: 'review_observed' }],
    pressures: [],
    candidates: [{ key, kind: 'supporting_detail', targetObservationId: 'observation-1', sourceRevisions: [{ eventId: source.id, revision: footballAssistedSourceRevision(source) }], reasons: ['observed source'], ruleVersion: 't03.1', state: 'pending' }],
    confirmations: [],
  };
  const recording = upsertFootballAssistedConfirmation(base, { id: 'confirmation-1', candidateKey: key, actions: [{ kind: 'detail', detailId: 'detail-1' }], describedActions: [{ id: 'review-pass', kind: 'pass' }, { id: 'review-receipt', kind: 'receipt' }], segmentEventIds: [source.id, target.id], observedAt: source.timestamp, filledAt: target.timestamp, spatialPrecision: 'not_observed', temporalPrecision: 'interval', provenance: 'review_confirmed' });
  const saved = await service.saveFootballAssistedRecording(matchId, target.id, { recording });
  if (!saved.ok) throw saved.error;
  expect(saved.value.events.filter(event => event.type === 'football_event_corrected')).toHaveLength(1);
  const retried = await service.saveFootballAssistedRecording(matchId, target.id, { recording });
  if (!retried.ok) throw retried.error;
  expect(retried.value.events.filter(event => event.type === 'football_event_corrected')).toHaveLength(1);

  const correctedSource = await service.correctFootballEvent(matchId, source.id, { teamId: a.id, action: 'pass', outcome: 'complete', location: { x: .2, y: .4 }, endLocation: { x: .8, y: .4 } });
  if (!correctedSource.ok) throw correctedSource.error;
  const changedTarget = correctedSource.value.football!.events.find(event => event.id === target.id)!;
  expect(resolveFootballAssistedRecording(changedTarget.scout_trainer.assisted_recording, correctedSource.value.football!.events).confirmations[0]).toMatchObject({ reviewRequired: true, eligible: false });
  const undone = await service.undoFootballEvent(matchId); if (!undone.ok) throw undone.error;
  const restoredTarget = undone.value.football!.events.find(event => event.id === target.id)!;
  expect(resolveFootballAssistedRecording(restoredTarget.scout_trainer.assisted_recording, undone.value.football!.events).confirmations[0]).toMatchObject({ reviewRequired: false, eligible: true });

  const backup = await create().exportJson(matchId); if (!backup.ok) throw backup.error;
  expect(new JsonMatchImporter().import(backup.value).ok).toBe(true);
  await database.close();
  const reopened = await create().loadMatch(matchId); if (!reopened.ok) throw reopened.error;
  const reopenedTarget = reopened.value.football!.events.find(event => event.id === target.id)!;
  expect(reopenedTarget.scout_trainer.assisted_recording).toEqual(restoredTarget.scout_trainer.assisted_recording);
  expect(reopenedTarget.scout_trainer.assisted_recording?.confirmations[0].describedActions).toHaveLength(2);
  expect(JSON.parse(backup.value).events.some((event: { replacementEvent?: { scout_trainer?: { assisted_recording?: unknown } } }) => event.replacementEvent?.scout_trainer?.assisted_recording)).toBe(true);
});

it('keeps optional details on their observed targets and undoes only their annotation', async () => {
  const { service, create, database } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [{ number: 9, name: 'Ana' }], teamBPlayers: [{ number: 4, name: 'Bia' }], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const [a, b] = created.value.teams;
  const bia = created.value.players.find(player => player.teamId === b.id)!;
  const observe = async (before: import('../../domain/football/FootballObservation').BallControl, after: import('../../domain/football/FootballObservation').BallControl, x: number) => {
    const saved = await service.observeFootballControl(matchId, { before, after, position: [x, 40], precision: 'point', coverage: 'continuous' });
    if (!saved.ok) throw saved.error;
    return saved.value;
  };
  await observe({ kind: 'unknown' }, { kind: 'controlled', teamId: a.id }, 20);
  await observe({ kind: 'controlled', teamId: a.id }, { kind: 'contested' }, 45);
  await observe({ kind: 'contested' }, { kind: 'controlled', teamId: b.id }, 70);
  const workspace = await observe({ kind: 'controlled', teamId: b.id }, { kind: 'controlled', teamId: b.id }, 78);
  const [aPoint, , recovery, bPoint] = workspace.football!.events;
  const recording: FootballAssistedRecording = {
    schema_version: '1.0.0',
    observations: [{ id: 'observation-b-point', matchId, period: bPoint.period, targetEventId: bPoint.id, possession: bPoint.possession, controlledTeamId: b.id, observedAt: bPoint.timestamp, position: bPoint.location, positionPrecision: 'point', provenance: 'operator_observed' }],
    details: [
      { id: 'exit', observationId: 'observation-b-point', type: 'build_exit', targetId: bPoint.id, value: 'transition', teamId: b.id, targetObservedAt: bPoint.timestamp, filledAt: '2026-09-22T00:00:00.000Z', provenance: 'operator_observed' },
      { id: 'structure', observationId: 'observation-b-point', type: 'build_structure', targetId: bPoint.id, value: 'not_observed', teamId: b.id, targetObservedAt: bPoint.timestamp, filledAt: '2026-09-22T00:00:00.000Z', provenance: 'operator_observed' },
      { id: 'turnover', observationId: 'observation-b-point', type: 'turnover_kind', targetId: recovery.id, value: 'interception', teamId: b.id, targetObservedAt: recovery.timestamp, filledAt: '2026-09-22T00:00:00.000Z', provenance: 'operator_observed' },
      { id: 'player', observationId: 'observation-b-point', type: 'observed_player', targetId: bPoint.id, value: bia.id, teamId: b.id, targetObservedAt: bPoint.timestamp, filledAt: '2026-09-22T00:00:00.000Z', provenance: 'operator_observed' },
    ],
    pressures: [{ id: 'pressure', observationId: 'observation-b-point', ballTeamId: b.id, height: 'not_applicable', form: 'none', pointEventId: bPoint.id, pointAgeMs: 0, position: bPoint.location, positionState: 'linked_point', provenance: 'operator_observed' }],
    candidates: [], confirmations: [],
  };
  const saved = await service.saveFootballAssistedRecording(matchId, bPoint.id, { recording });
  if (!saved.ok) throw saved.error;
  const annotated = saved.value.football!.events.find(event => event.id === bPoint.id)!;
  expect(annotated.scout_trainer.assisted_recording?.details).toEqual(recording.details);
  expect(annotated.scout_trainer.assisted_recording?.pressures[0]).toMatchObject({ form: 'none', height: 'not_applicable' });
  const undone = await service.undoFootballEvent(matchId); if (!undone.ok) throw undone.error;
  expect(undone.value.football?.events.map(event => event.id)).toEqual([aPoint.id, workspace.football!.events[1].id, recovery.id, bPoint.id]);
  expect(undone.value.football?.events.find(event => event.id === bPoint.id)?.scout_trainer.assisted_recording).toBeUndefined();
  await database.close();
  const reopened = await create().loadMatch(matchId); if (!reopened.ok) throw reopened.error;
  expect(reopened.value.football?.events).toEqual(undone.value.football?.events);
});

it('keeps repeated fixed-pressure snapshots distinct and clears only incompatible fields on correction', async () => {
  const { service, create, database } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const [a, b] = created.value.teams;
  const marked = await service.observeFootballControl(matchId, { after: { kind: 'controlled', teamId: a.id }, position: [24, 40], precision: 'point', coverage: 'continuous' });
  if (!marked.ok) throw marked.error;
  const point = marked.value.football!.events[0];
  const observation = { id: 'pressure-observation', matchId, period: point.period, targetEventId: point.id, controlledTeamId: a.id, observedAt: point.timestamp, position: point.location, positionPrecision: 'point' as const, provenance: 'operator_observed' as const };
  const recording: FootballAssistedRecording = {
    schema_version: '1.0.0', observations: [observation], details: [], candidates: [], confirmations: [],
    pressures: [
      { id: 'pressure-high', observationId: observation.id, kind: 'fixed_snapshot', observedAt: point.timestamp, pressingTeamId: b.id, ballTeamId: a.id, height: 'high', form: 'present_unspecified', pointEventId: point.id, pointAgeMs: 0, position: point.location, positionState: 'linked_point', pressingOrientation: 'x0', provenance: 'operator_observed' },
      { id: 'pressure-low', observationId: observation.id, kind: 'fixed_snapshot', observedAt: '00:00:04.000', pressingTeamId: b.id, ballTeamId: a.id, height: 'low', form: 'present_unspecified', positionState: 'not_observed', pressingOrientation: 'x0', provenance: 'operator_observed' },
    ],
  };
  const saved = await service.saveFootballAssistedRecording(matchId, point.id, { recording });
  if (!saved.ok) throw saved.error;
  const corrected: FootballAssistedRecording = {
    ...recording,
    pressures: [recording.pressures[0], { id: 'pressure-low', observationId: observation.id, kind: 'fixed_snapshot', observedAt: '00:00:04.000', ballTeamId: a.id, height: 'not_applicable', form: 'none', positionState: 'not_observed', provenance: 'operator_observed' }],
  };
  const correctedSaved = await service.saveFootballAssistedRecording(matchId, point.id, { recording: corrected });
  if (!correctedSaved.ok) throw correctedSaved.error;
  const snapshots = correctedSaved.value.football!.events[0].scout_trainer.assisted_recording!.pressures;
  expect(snapshots).toHaveLength(2);
  expect(snapshots[0]).toMatchObject({ id: 'pressure-high', height: 'high', pressingTeamId: b.id, pointEventId: point.id });
  expect(snapshots[1]).toMatchObject({ id: 'pressure-low', height: 'not_applicable', form: 'none' });
  expect(snapshots[1]).not.toHaveProperty('pressingTeamId');
  expect(snapshots[1]).not.toHaveProperty('position');
  const undone = await service.undoFootballEvent(matchId); if (!undone.ok) throw undone.error;
  expect(undone.value.football!.events[0].scout_trainer.assisted_recording!.pressures[1]).toMatchObject({ height: 'low', pressingTeamId: b.id });
  await database.close();
  const reopened = await create().loadMatch(matchId); if (!reopened.ok) throw reopened.error;
  expect(reopened.value.football!.events[0].scout_trainer.assisted_recording!.pressures).toEqual(undone.value.football!.events[0].scout_trainer.assisted_recording!.pressures);
});

it('rejects incomplete trajectory without persisting or changing score and clock', async () => {
  const { service } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const before = created.value;
  const failed = await service.registerFootballEvent(before.state.metadata.id, { teamId: before.teams[0].id, action: 'pass', outcome: 'incomplete', location: { x: .2, y: .2 } });
  expect(failed.ok).toBe(false);
  const after = await service.loadMatch(before.state.metadata.id); if (!after.ok) throw after.error;
  expect(after.value.football?.events).toEqual([]);
  expect(after.value.football?.score).toEqual(before.football?.score);
  expect(after.value.football?.clock).toEqual(before.football?.clock);
});

it('uses the gesture capture time, rather than request time, for a possession mark', async () => {
  const { service, advance } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const started = await service.setFootballClock(matchId, { kind: 'start' }); if (!started.ok) throw started.error;
  advance(8_000); // request reaches the service later than the field gesture.
  const saved = await service.observeFootballControl(matchId, { after: { kind: 'controlled', teamId: created.value.teams[0].id }, position: [30, 40], precision: 'point', coverage: 'continuous', capturedElapsedMs: 2_500 });
  if (!saved.ok) throw saved.error;
  expect(saved.value.football?.events[0].timestamp).toBe('00:00:02.500');
  expect(saved.value.football?.events[0].scout_trainer.observation).not.toHaveProperty('capturedElapsedMs');
});

it('stores twenty varied events exactly once with stable sequence and no fabricated athlete', async () => {
  const { service } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [9], teamBPlayers: [4], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const actions: RegisterFootballEventInput[] = Array.from({ length: 20 }, (_, index) => {
    const teamId = created.value.teams[index % 2].id;
    if (index % 5 === 0) return { teamId, action: 'pass', outcome: index % 10 === 0 ? 'complete' : 'incomplete', location: { x: .1, y: .2 }, endLocation: { x: .4, y: .5 } };
    if (index % 5 === 1) return { teamId, action: 'carry', outcome: 'observed', location: { x: .3, y: .4 }, endLocation: { x: .6, y: .5 } };
    if (index % 5 === 2) return { teamId, action: 'ball_recovery', outcome: 'observed', location: { x: .5, y: .5 } };
    if (index % 5 === 3) return { teamId, action: 'shot', outcome: 'off_target', location: { x: .8, y: .4 } };
    return { teamId, action: 'foul', outcome: 'observed' };
  });
  let workspace = created.value;
  for (const input of actions) {
    const registered = await service.registerFootballEvent(matchId, input); if (!registered.ok) throw registered.error;
    workspace = registered.value;
  }
  expect(workspace.football?.events).toHaveLength(20);
  expect(new Set(workspace.football?.events.map((event) => event.id)).size).toBe(20);
  expect(workspace.football?.events.map((event) => event.index)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
  expect(workspace.football?.events.every((event) => event.player === undefined)).toBe(true);
});

it('persists, corrects and undoes versioned possession marks without exporting them as passes', async () => {
  const { service, create, database, advance } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const [a, b] = created.value.teams;
  const started = await service.setFootballClock(matchId, { kind: 'start' }); if (!started.ok) throw started.error;
  const mark = async (observation: Parameters<typeof service.observeFootballControl>[1]) => {
    const result = await service.observeFootballControl(matchId, observation);
    if (!result.ok) throw result.error;
    return result.value;
  };
  const protocol = { name: 'scout_trainer.possession' as const, version: '1.0.0' as const, mode: 'control_mark' as const };
  let workspace = await mark({ protocol, after: { kind: 'controlled', teamId: a.id }, position: [20, 40], precision: 'point', coverage: 'continuous', context: { validity: 'observed', outcome: 'recovered' } });
  const firstMark = workspace.football!.events[0];
  advance(1_000);
  await mark({ protocol, before: { kind: 'controlled', teamId: a.id }, after: { kind: 'contested' }, coverage: 'continuous', context: { validity: 'partial', outcome: 'continuing' } });
  advance(1_000);
  workspace = await mark({ protocol, before: { kind: 'contested' }, after: { kind: 'controlled', teamId: b.id }, position: [90, 40], precision: 'zone', coverage: 'continuous', context: { validity: 'observed', outcome: 'recovered' } });
  expect(workspace.football?.events.every((event) => event.type.id === 1000)).toBe(true);
  const beforeCorrection = workspace.football!.events;
  const corrected = await service.correctFootballObservation(matchId, firstMark.id, { protocol, after: { kind: 'controlled', teamId: b.id }, position: [70, 30], precision: 'point', coverage: 'continuous', context: { validity: 'observed', outcome: 'recovered' } });
  if (!corrected.ok) throw corrected.error;
  expect(corrected.value.football?.events[0].location).toEqual([70, 30]);
  const undone = await service.undoFootballEvent(matchId); if (!undone.ok) throw undone.error;
  expect(undone.value.football?.events).toEqual(beforeCorrection);
  await database.close();
  const reopened = await create().loadMatch(matchId); if (!reopened.ok) throw reopened.error;
  expect(reopened.value.football?.events).toEqual(beforeCorrection);
  const backup = await create().exportJson(matchId); if (!backup.ok) throw backup.error;
  const pure = await create().exportFootballOpenData(matchId); if (!pure.ok) throw pure.error;
  expect((JSON.parse(backup.value) as { events: unknown[] }).events).toHaveLength(6);
  const pureData = JSON.parse(pure.value) as { events: unknown[]; manifest: { omitted: Array<{ reason: string }> } };
  expect(pureData.events).toEqual([]);
  expect(pureData.manifest.omitted).toHaveLength(3);
  expect(pureData.manifest.omitted.every(({ reason }) => reason === 'local control observation; preserved in full backup')).toBe(true);
});

it('keeps a pending shot honest, completes its own result later, and does not retroactively stop current control', async () => {
  const { service, create, database } = setup();
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const matchId = created.value.state.metadata.id;
  const [a, b] = created.value.teams;
  const initial = await service.observeFootballControl(matchId, { after: { kind: 'controlled', teamId: a.id }, coverage: 'continuous' });
  if (!initial.ok) throw initial.error;
  const pending = await service.registerFootballEvent(matchId, {
    teamId: a.id, possessionTeamId: a.id, action: 'shot', outcome: 'pending',
    observation: { before: { kind: 'controlled', teamId: a.id }, after: { kind: 'controlled', teamId: a.id }, teamId: a.id, outcomeKnownAtCapture: false, context: { validity: 'partial', outcome: 'shot' } },
  });
  if (!pending.ok) throw pending.error;
  expect(pending.value.football?.events.at(-1)).toMatchObject({ type: { id: 16 }, shot: {} });
  expect(pending.value.football?.events.at(-1)?.location).toBeUndefined();
  expect(pending.value.football?.score).toEqual({ teamA: 0, teamB: 0 });

  const switched = await service.observeFootballControl(matchId, { before: { kind: 'controlled', teamId: a.id }, after: { kind: 'controlled', teamId: b.id }, coverage: 'continuous' });
  if (!switched.ok) throw switched.error;
  const pendingShot = switched.value.football!.events.find((event) => event.type.id === 16)!;
  const completed = await service.correctFootballEvent(matchId, pendingShot.id, {
    teamId: a.id, action: 'shot', outcome: 'goal', possessionTeamId: a.id,
    observation: { before: { kind: 'controlled', teamId: a.id }, after: { kind: 'controlled', teamId: a.id }, teamId: a.id, outcomeKnownAtCapture: false, context: { validity: 'partial', outcome: 'goal' } },
  });
  if (!completed.ok) throw completed.error;
  expect(completed.value.football?.score).toEqual({ teamA: 1, teamB: 0 });
  expect(projectControl(completed.value.football?.events ?? []).ballControl).toEqual({ kind: 'controlled', teamId: b.id });

  const undone = await service.undoFootballEvent(matchId); if (!undone.ok) throw undone.error;
  expect(undone.value.football?.score).toEqual({ teamA: 0, teamB: 0 });
  expect(projectControl(undone.value.football?.events ?? []).ballControl).toEqual({ kind: 'controlled', teamId: b.id });
  const backup = await service.exportJson(matchId); if (!backup.ok) throw backup.error;
  const exported = JSON.parse(backup.value) as { events: Array<{ readonly type: string; readonly event?: { readonly type: { readonly id: number }; readonly shot?: Record<string, unknown>; readonly scout_trainer?: { readonly observation?: { readonly outcomeKnownAtCapture?: boolean } } } }> };
  const exportedShot = exported.events.find((event) => event.type === 'football_event_registered' && event.event?.type.id === 16)?.event;
  expect(exportedShot?.shot).toEqual({});
  expect(exportedShot?.scout_trainer?.observation?.outcomeKnownAtCapture).toBe(false);
  await database.close();
  const reopened = await create().loadMatch(matchId); if (!reopened.ok) throw reopened.error;
  expect(reopened.value.football?.events).toEqual(undone.value.football?.events);
});
