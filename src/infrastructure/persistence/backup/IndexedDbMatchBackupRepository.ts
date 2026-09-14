import type { MatchBackupRepository } from '../../../application/ports/backup/MatchBackupRepository';
import { RepositoryError } from '../../../core/errors/RepositoryError';
import { failure, type Result, success } from '../../../core/result/Result';
import {
  matchEventId,
  matchEventMatchId,
  matchEventSequence,
} from '../../../domain/match/events/MatchEvent';
import type { MatchExport } from '../../export/json/MatchJson';
import { STORE_NAMES, type ScoutTrainerDatabase } from '../indexeddb/ScoutTrainerDatabase';
import { requestResult, transactionDone } from '../indexeddb/idbRequests';

export class IndexedDbMatchBackupRepository implements MatchBackupRepository {
  constructor(private readonly database: ScoutTrainerDatabase) {}

  async restore(backup: MatchExport): Promise<Result<void, RepositoryError>> {
    try {
      const database = await this.database.open();
      const storeNames = [
        STORE_NAMES.matches,
        STORE_NAMES.events,
        STORE_NAMES.teams,
        STORE_NAMES.players,
        STORE_NAMES.codeProfiles,
        STORE_NAMES.complexityProfiles,
        STORE_NAMES.competitionProfiles,
        STORE_NAMES.analysisConfigurations,
        STORE_NAMES.reportChartConfigurations,
      ];
      const transaction = database.transaction(storeNames, 'readwrite');
      const events = transaction.objectStore(STORE_NAMES.events);
      const oldEventKeys = await requestResult(
        events.index('matchId').getAllKeys(IDBKeyRange.only(backup.match.id)),
        'find events replaced by backup',
      );
      oldEventKeys.forEach((key) => events.delete(key));

      const configurations = transaction.objectStore(STORE_NAMES.analysisConfigurations);
      const oldConfigurationKeys = await requestResult(
        configurations.index('matchId').getAllKeys(IDBKeyRange.only(backup.match.id)),
        'find analysis configurations replaced by backup',
      );
      oldConfigurationKeys.forEach((key) => configurations.delete(key));

      const reportCharts = transaction.objectStore(STORE_NAMES.reportChartConfigurations);
      const oldReportChartKeys = await requestResult(
        reportCharts.index('matchId').getAllKeys(IDBKeyRange.only(backup.match.id)),
        'find report chart configurations replaced by backup',
      );
      oldReportChartKeys.forEach((key) => reportCharts.delete(key));

      const players = transaction.objectStore(STORE_NAMES.players);
      for (const teamId of [backup.match.teamAId, backup.match.teamBId]) {
        const oldPlayerKeys = await requestResult(
          players.index('teamId').getAllKeys(IDBKeyRange.only(teamId)),
          'find players replaced by backup',
        );
        oldPlayerKeys.forEach((key) => players.delete(key));
      }

      transaction.objectStore(STORE_NAMES.matches).put(backup.match);
      backup.teams.forEach((team) => transaction.objectStore(STORE_NAMES.teams).put(team));
      backup.players.forEach((player) => players.put(player));
      transaction.objectStore(STORE_NAMES.codeProfiles).put({
        key: `${backup.profiles.code.id}@${backup.profiles.code.version}`,
        profile: backup.profiles.code,
      });
      transaction.objectStore(STORE_NAMES.complexityProfiles).put({
        key: `${backup.profiles.complexity.id}@${backup.profiles.complexity.version}`,
        profile: backup.profiles.complexity,
      });
      if (backup.profiles.competition) {
        transaction.objectStore(STORE_NAMES.competitionProfiles).put({
          key: `${backup.profiles.competition.id}@${backup.profiles.competition.version}`,
          profile: backup.profiles.competition,
        });
      }
      backup.events.forEach((event) =>
        events.put({
          id: matchEventId(event),
          matchId: matchEventMatchId(event),
          sequence: matchEventSequence(event),
          event,
        }),
      );
      backup.analysisConfigurations?.forEach((configuration) => configurations.put(configuration));
      backup.reportChartConfigurations?.forEach((configuration) => reportCharts.put(configuration));
      await transactionDone(transaction, 'restore match backup');
      return success(undefined);
    } catch (error) {
      return failure(
        error instanceof RepositoryError
          ? error
          : new RepositoryError(
              'database_operation_failed',
              'Could not restore match backup.',
              error,
            ),
      );
    }
  }
}
