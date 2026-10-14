import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { ScoutTrainerService } from '../../application/ScoutTrainerService';
import { IndexedDbMatchBackupRepository } from '../../infrastructure/persistence/backup/IndexedDbMatchBackupRepository';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbPlayerRepository } from '../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { IndexedDbTeamRepository } from '../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';
import { JsonMatchImporter } from '../../infrastructure/export/json/MatchJson';
import type { EssentialScoutDraft } from '../../domain/essential/EssentialScout';
import { buildFutsalAnalytics } from '../../domain/futsal/FutsalAnalytics';

const databases: ScoutTrainerDatabase[] = [];
let id = 0;
const now = () => 1_000_000;
function service(database: ScoutTrainerDatabase) {
  return new ScoutTrainerService(
    new IndexedDbMatchRepository(database), new IndexedDbEventRepository(database),
    new IndexedDbTeamRepository(database), new IndexedDbPlayerRepository(database),
    createDefaultProfileRegistry(), { createId: () => `essential-${++id}`, now },
  ).enableBackupRestore(new IndexedDbMatchBackupRepository(database));
}
function database() {
  const created = new ScoutTrainerDatabase(`essential-cycle-${crypto.randomUUID()}`);
  databases.push(created);
  return created;
}
afterEach(async () => { for (const item of databases.splice(0)) await item.close(); });

for (const sport of ['football', 'futsal'] as const) {
  it(`registra passe, progressão, falta e reinício sem duplicar o fato em ${sport}`, async () => {
    const source = service(database());
    const created = await source.createMatch({ sport, teamAName: 'A', teamBName: 'B', teamAPlayers: [9], teamBPlayers: [4], complexityProfileId: 'basic' });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const teamId = created.value.teams[0].id;
    const restarts = sport === 'football' ? ['throw_in', 'kick_in'] as const : ['kick_in', 'throw_in'] as const;
    const invalidRestart = await source.registerEssentialAction(matchId, { code: 'RE', teamId, restartType: restarts[1] });
    expect(invalidRestart.ok).toBe(false);
    const drafts: EssentialScoutDraft[] = [
      { code: 'P', teamId, shirtNumber: 77, passResult: 'complete', position: { x: .2, y: .3 }, destination: { x: .75, y: .4 }, qualifiers: ['pivot', 'line_break'] },
      { code: 'PF', teamId, shirtNumber: 9, passResult: 'complete', third: 'attacking', qualifiers: ['cross'] },
      { code: 'C', teamId, shirtNumber: 77, progressionType: 'dribble', progressionResult: 'lost', destination: { x: .8, y: .5 }, qualifiers: ['under_pressure'] },
      { code: 'FL', teamId, shirtNumber: 9, ...(sport === 'futsal' ? { foulAccumulated: true } : {}), foulCard: 'yellow', third: 'middle' },
      { code: 'RE', teamId, restartType: restarts[0], third: 'defensive' },
    ];
    let workspace = created.value;
    for (const draft of drafts) {
      const registered = await source.registerEssentialAction(matchId, draft);
      if (!registered.ok) throw registered.error;
      workspace = registered.value;
    }
    expect(workspace.essentialActions.map(action => action.code)).toEqual(['P', 'PF', 'C', 'FL', 'RE']);
    expect(workspace.essentialActions[0]).toMatchObject({ shirtNumber: 77, passResult: 'complete', position: { x: .2, y: .3 }, destination: { x: .75, y: .4 } });
    expect(workspace.essentialActions[2]).toMatchObject({ progressionType: 'dribble', progressionResult: 'lost', qualifiers: ['under_pressure'] });
    expect(workspace.essentialActions[2].position).toBeUndefined();
    expect(workspace.essentialActions[2].destination).toEqual({ x: .8, y: .5 });
    expect(workspace.essentialActions[3]).toMatchObject({ foulCard: 'yellow', third: 'middle' });
    expect(workspace.essentialActions[4]).toMatchObject({ restartType: restarts[0], third: 'defensive' });
    if (sport === 'futsal') {
      expect(workspace.futsalScout?.accumulatedFouls[`1:${teamId}`]).toBe(1);
      const analytics = buildFutsalAnalytics(workspace.futsalScout!, [teamId]);
      expect(analytics.periodCounts).toMatchObject([{ period: 1, teamId, fouls: 1, accumulatedFouls: 1 }]);
      const uncounted = await source.correctEssentialAction(matchId, workspace.essentialActions[3].id, { code: 'FL', teamId, foulAccumulated: false });
      if (!uncounted.ok) throw uncounted.error;
      expect(uncounted.value.futsalScout?.accumulatedFouls[`1:${teamId}`]).toBeUndefined();
      const recounted = await source.correctEssentialAction(matchId, workspace.essentialActions[3].id, drafts[3]);
      if (!recounted.ok) throw recounted.error;
      workspace = recounted.value;
      expect(workspace.futsalScout?.accumulatedFouls[`1:${teamId}`]).toBe(1);
    } else {
      const pure = await source.exportFootballOpenData(matchId);
      if (!pure.ok) throw pure.error;
      const parsed = JSON.parse(pure.value) as { events: { id: string }[]; manifest: { omitted: { id: string }[] } };
      expect(parsed.events.map(item => item.id)).toContain(workspace.essentialActions[0].id);
      expect(parsed.manifest.omitted.map(item => item.id)).toEqual(expect.arrayContaining([workspace.essentialActions[1].id, workspace.essentialActions[2].id, workspace.essentialActions[3].id, workspace.essentialActions[4].id]));
    }
    const corrected = await source.correctEssentialAction(matchId, workspace.essentialActions[0].id, { code: 'P', teamId, passResult: 'unknown', third: 'defensive' });
    if (!corrected.ok) throw corrected.error;
    expect(corrected.value.essentialActions[0].passResult).toBe('unknown');
    expect(corrected.value.essentialActions[0].position).toBeUndefined();
    expect(corrected.value.essentialActions[0].destination).toBeUndefined();
    expect(corrected.value.essentialActions[0].qualifiers).toBeUndefined();
    const backup = await source.exportJson(matchId);
    if (!backup.ok) throw backup.error;
    const tampered = JSON.parse(backup.value) as { events: Array<Record<string, unknown>> };
    const passRegistration = tampered.events.find(event => event.type === (sport === 'football' ? 'football_event_registered' : 'futsal_fact_registered') &&
      (sport === 'football' ? (event.event as { scout_trainer?: { essential_code?: string } }).scout_trainer?.essential_code === 'P' : (event.fact as { essentialCode?: string }).essentialCode === 'P'));
    if (!passRegistration) throw new Error('Essential pass registration is missing');
    if (sport === 'football') (passRegistration.event as { scout_trainer: { essential_pass_result: string } }).scout_trainer.essential_pass_result = 'fabricated';
    else (passRegistration.fact as { passResult: string }).passResult = 'fabricated';
    expect(new JsonMatchImporter().import(JSON.stringify(tampered)).ok).toBe(false);
    const imported = await service(database()).importJson(backup.value);
    if (!imported.ok) throw imported.error;
    expect(imported.value.essentialActions).toEqual(corrected.value.essentialActions);
    if (sport === 'futsal') expect(imported.value.futsalScout?.accumulatedFouls[`1:${teamId}`]).toBe(1);
  });

  it(`registers, corrects, deletes and restores sparse essential actions in ${sport}`, async () => {
    const source = service(database());
    const created = await source.createMatch({ sport, teamAName: 'A', teamBName: 'B', teamAPlayers: [9], teamBPlayers: [4], complexityProfileId: 'basic' });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const teamId = created.value.teams[0].id;
    const playerId = created.value.players[0].id;
    const mismatchedShirt = await source.registerEssentialAction(matchId, { code: 'RP', teamId, playerId, shirtNumber: 77 });
    expect(mismatchedShirt.ok).toBe(false);
    const control = sport === 'football'
      ? await source.observeFootballControl(matchId, { before: { kind: 'unknown' }, after: { kind: 'controlled', teamId }, coverage: 'continuous', context: { validity: 'observed' } })
      : await source.registerFutsalFact(matchId, { kind: 'control', state: 'team', controlledTeamId: teamId, coverage: 'continuous', observation: 'observed' });
    if (!control.ok) throw control.error;
    const drafts: EssentialScoutDraft[] = [
      { code: 'PF', teamId, playerId, shirtNumber: 9, destination: { x: .65, y: .4 }, qualifiers: ['through_ball', 'transition'] },
      { code: 'PP', teamId, position: { x: .25, y: .4 }, qualifiers: ['bad_pass', 'under_pressure'] },
      { code: 'RP', teamId, third: 'defensive', qualifiers: ['interception'] },
      { code: 'F', teamId, shirtNumber: 77, third: 'attacking', qualifiers: ['first_touch', 'under_pressure'], outcome: 'gol' },
    ];
    let workspace = control.value;
    for (const draft of drafts) {
      const result = await source.registerEssentialAction(matchId, draft);
      if (!result.ok) throw result.error;
      workspace = result.value;
    }
    expect(workspace.essentialActions.map(action => action.code)).toEqual(['PF', 'PP', 'RP', 'F']);
    expect(workspace.essentialActions[0].position).toBeUndefined();
    expect(workspace.essentialActions[0].destination).toEqual({ x: .65, y: .4 });
    expect(workspace.essentialActions[0].playerId).toBe(playerId);
    expect(workspace.essentialActions[0].shirtNumber).toBe(9);
    expect(workspace.essentialActions[0].qualifiers).toEqual(['through_ball', 'transition']);
    expect(workspace.essentialActions[2]).toMatchObject({ third: 'defensive', qualifiers: ['interception'] });
    expect(workspace.essentialActions[3]).toMatchObject({ shirtNumber: 77, third: 'attacking', qualifiers: ['first_touch', 'under_pressure'] });
    expect(workspace.essentialActions[3].position).toBeUndefined();
    expect(workspace.essentialActions[3].playerId).toBeUndefined();
    expect(sport === 'football' ? workspace.football?.score.teamA : workspace.futsalScout?.score[teamId]).toBe(1);
    expect(workspace.observedSequences.units.length).toBeGreaterThan(0);
    expect(workspace.observedSequences.units.every(unit => !unit.eligibleForOutcome)).toBe(true);
    if (sport === 'futsal') expect(buildFutsalAnalytics(workspace.futsalScout!, [teamId]).teams[0].classifiedPossessions).toBe(0);
    if (sport === 'football') {
      expect(workspace.football?.events.find(event => event.scout_trainer.essential_code === 'PP')?.type.name).toBe('Possession Loss');
      const pure = await source.exportFootballOpenData(matchId);
      if (!pure.ok) throw pure.error;
      const parsed = JSON.parse(pure.value) as { manifest: { omitted: { id: string }[] } };
      expect(parsed.manifest.omitted.map(item => item.id)).toContain(workspace.essentialActions[1].id);
      expect(parsed.manifest.omitted.map(item => item.id)).toContain(workspace.essentialActions[3].id);
      expect(workspace.football?.events.find(event => event.id === workspace.essentialActions[3].id)?.location).toBeUndefined();
    } else {
      expect(workspace.futsalScout?.facts.find(item => item.fact.id === workspace.essentialActions[3].id)?.fact.position).toBeUndefined();
    }

    const original = workspace.essentialActions[0];
    const corrected = await source.correctEssentialAction(matchId, original.id, { code: 'PF', teamId, position: { x: .2, y: .3 }, destination: { x: .7, y: .4 } });
    if (!corrected.ok) throw corrected.error;
    expect(corrected.value.essentialActions[0]).toMatchObject({ id: original.id, period: original.period, elapsedMs: original.elapsedMs, sequence: original.sequence, position: { x: .2, y: .3 }, destination: { x: .7, y: .4 } });
    expect(corrected.value.essentialActions[0].shirtNumber).toBeUndefined();
    expect(corrected.value.essentialActions[0].qualifiers).toBeUndefined();
    const correctedThird = await source.correctEssentialAction(matchId, original.id, { code: 'PF', teamId, third: 'middle', thirdAnchor: 'destination', qualifiers: ['pivot'] });
    if (!correctedThird.ok) throw correctedThird.error;
    expect(correctedThird.value.essentialActions[0]).toMatchObject({ third: 'middle', thirdAnchor: 'destination', qualifiers: ['pivot'] });
    expect(correctedThird.value.essentialActions[0].position).toBeUndefined();
    expect(correctedThird.value.essentialActions[0].destination).toBeUndefined();
    const sparseAgain = await source.correctEssentialAction(matchId, original.id, { code: 'PF', teamId });
    if (!sparseAgain.ok) throw sparseAgain.error;
    expect(sparseAgain.value.essentialActions[0].destination).toBeUndefined();
    expect(sparseAgain.value.essentialActions[0].third).toBeUndefined();
    expect(sparseAgain.value.essentialActions[0].thirdAnchor).toBeUndefined();
    expect(sparseAgain.value.essentialActions[0].qualifiers).toBeUndefined();
    const deleted = await source.deleteEssentialAction(matchId, original.id);
    if (!deleted.ok) throw deleted.error;
    expect(deleted.value.essentialActions.map(action => action.id)).not.toContain(original.id);
    expect(deleted.value.essentialActions).toHaveLength(3);
    const sourceRegistration = deleted.value.events.find(event => event.type === 'football_event_registered'
      ? event.event.id === original.id
      : event.type === 'futsal_fact_registered' && event.fact.id === original.id);
    expect(sourceRegistration).toBeDefined();
    expect(deleted.value.events.some(event => (event.type === 'football_event_undone' || event.type === 'futsal_fact_undone') && event.targetHistoryEventId === (sourceRegistration?.type === 'football_event_registered' || sourceRegistration?.type === 'futsal_fact_registered' ? sourceRegistration.id : undefined))).toBe(true);

    const backup = await source.exportJson(matchId);
    if (!backup.ok) throw backup.error;
    const mismatched = JSON.parse(backup.value) as { events: Array<Record<string, unknown>> };
    const goalRegistration = mismatched.events.find(event => event.type === (sport === 'football' ? 'football_event_registered' : 'futsal_fact_registered') &&
      (sport === 'football' ? (event.event as { scout_trainer?: { essential_code?: string } }).scout_trainer?.essential_code === 'F' : (event.fact as { essentialCode?: string }).essentialCode === 'F'));
    if (!goalRegistration) throw new Error('Essential goal registration is missing');
    if (sport === 'football') (goalRegistration.event as { scout_trainer: { essential_code: string } }).scout_trainer.essential_code = 'PF';
    else (goalRegistration.fact as { essentialCode: string }).essentialCode = 'PF';
    expect(new JsonMatchImporter().import(JSON.stringify(mismatched)).ok).toBe(false);
    const invalidQualifier = JSON.parse(backup.value) as { events: Array<Record<string, unknown>> };
    const invalidGoal = invalidQualifier.events.find(event => event.type === (sport === 'football' ? 'football_event_registered' : 'futsal_fact_registered') &&
      (sport === 'football' ? (event.event as { scout_trainer?: { essential_code?: string } }).scout_trainer?.essential_code === 'F' : (event.fact as { essentialCode?: string }).essentialCode === 'F'));
    if (!invalidGoal) throw new Error('Essential goal registration is missing');
    if (sport === 'football') (invalidGoal.event as { scout_trainer: { essential_qualifiers: string[] } }).scout_trainer.essential_qualifiers = ['through_ball'];
    else (invalidGoal.fact as { essentialQualifiers: string[] }).essentialQualifiers = ['through_ball'];
    expect(new JsonMatchImporter().import(JSON.stringify(invalidQualifier)).ok).toBe(false);
    const restored = await service(database()).importJson(backup.value);
    if (!restored.ok) throw restored.error;
    expect(restored.value.essentialActions).toEqual(deleted.value.essentialActions);
    expect(sport === 'football' ? restored.value.football?.score.teamA : restored.value.futsalScout?.score[teamId]).toBe(1);
  });
}
