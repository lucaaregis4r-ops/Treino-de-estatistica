import { expect, it } from 'vitest';
import { SequenceAnalyticsService } from './SequenceAnalyticsService';
import { buildDerivedAnalyticsReport } from '../reporting/DerivedAnalyticsReport';
import { defaultTacticalInput } from '../../profiles/code/default-compact/defaultTacticalInput';
import type { ScoutEvent } from '../../domain/scout/events/ScoutEvent';

it('recomputes corrected locations and exports the exchange model without raw events', () => {
  const service = new SequenceAnalyticsService();
  const teams = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] as const;
  const tactical = { contacts: [], rotationByTeamId: {}, rallies: [{ rallyId: 'r', winnerTeamId: 'b', transitionTeamIds: [] }] };
  const serve: ScoutEvent = {
    id: 's', matchId: 'm', rallyId: 'r', sequence: 1, teamId: 'a', skill: 'serve', evaluation: 'neutral',
    setNumber: 1, scoreBefore: { teamA: 0, teamB: 0 }, timestamp: 1, rawCode: 'raw-serve',
    codeProfileId: 'test', codeProfileVersion: '1', complexityProfileId: 'basic',
  };
  const reception: ScoutEvent = { ...serve, id: 'r', sequence: 2, teamId: 'b', skill: 'reception', evaluation: 'negative',
    metadata: { spatial: { origin: { surface: 'court', x: .875, y: 1 / 6 }, destination: { surface: 'court', x: .625, y: .5 } } },
  };
  const first = service.build([serve,reception], teams, tactical, defaultTacticalInput.zoneSystem);
  const corrected = { ...reception, metadata: { spatial: { ...reception.metadata!.spatial!, origin: { surface: 'court' as const, x: .875, y: 5 / 6 } } } };
  const second = service.build([serve,corrected], teams, tactical, defaultTacticalInput.zoneSystem);
  expect(second).not.toBe(first);
  expect(first.pathRallies![0].contacts[1].spatial.originRegionId).toBe('1');
  expect(second.pathRallies![0].contacts[1].spatial.originRegionId).toBe('5');
  const report = buildDerivedAnalyticsReport(second, defaultTacticalInput.zoneSystem);
  expect(report.teams[0].exchangeModel.transitions).toHaveLength(1);
  expect(report.teams[0].exchangeModel.transitions[0].from.exchange?.skill).toBe('serve');
  expect(report.teams[0].exchangeModel.transitions[0].from.originRegionId).toBe('5');
  expect(JSON.stringify(report)).not.toContain('raw-serve');
  expect(serve.evaluation).toBe('neutral');
});
