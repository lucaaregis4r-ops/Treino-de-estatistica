import { ScoutTrainerService } from '../../application/ScoutTrainerService';
import type {
  AthleteRegistration,
  TeamRegistration,
} from '../../domain/match/entities/Registration';
import { IndexedDbEntityRepository } from '../../infrastructure/persistence/repositories/IndexedDbEntityRepository';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbPlayerRepository } from '../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { IndexedDbTeamRepository } from '../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';
import { TrainingService } from '../../application/TrainingService';
import { IndexedDbTrainingSessionRepository } from '../../infrastructure/persistence/repositories/IndexedDbTrainingSessionRepository';
import { IndexedDbProfileRepository } from '../../infrastructure/persistence/repositories/IndexedDbProfileRepository';
import { ProfileEditorService } from '../../application/profile-editor/ProfileEditorService';
import { IndexedDbMatchBackupRepository } from '../../infrastructure/persistence/backup/IndexedDbMatchBackupRepository';
import { FreeLogService } from '../../application/FreeLogService';
import { IndexedDbFreeLogSessionRepository } from '../../infrastructure/persistence/repositories/IndexedDbFreeLogSessionRepository';
import { BrowserDirectoryExporter } from '../../infrastructure/export/filesystem/BrowserDirectoryExporter';
import { IndexedDbAnalyticsSnapshotRepository } from '../../infrastructure/persistence/repositories/IndexedDbAnalyticsSnapshotRepository';
import { HistoricalAnalyticsService } from '../../application/analytics/HistoricalAnalyticsService';
import { IndexedDbAnalysisConfigurationRepository } from '../../infrastructure/persistence/repositories/IndexedDbAnalysisConfigurationRepository';
import { IndexedDbReportChartConfigurationRepository } from '../../infrastructure/persistence/repositories/IndexedDbReportChartConfigurationRepository';

const database = new ScoutTrainerDatabase();
const profiles = createDefaultProfileRegistry();
export const browserAnalysisConfigurationRepository = new IndexedDbAnalysisConfigurationRepository(
  database,
);
export const browserAnalyticsSnapshotRepository = new IndexedDbAnalyticsSnapshotRepository(
  database,
);
export const browserReportChartConfigurationRepository = new IndexedDbReportChartConfigurationRepository(
  database,
);

export const browserAthleteRegistrations = new IndexedDbEntityRepository<AthleteRegistration>(
  database,
  'athleteRegistrations',
);
export const browserTeamRegistrations = new IndexedDbEntityRepository<TeamRegistration>(
  database,
  'teamRegistrations',
);

export const browserScoutTrainerService = new ScoutTrainerService(
  new IndexedDbMatchRepository(database),
  new IndexedDbEventRepository(database),
  new IndexedDbTeamRepository(database),
  new IndexedDbPlayerRepository(database),
  profiles,
  undefined,
  browserAnalysisConfigurationRepository,
  browserAnalyticsSnapshotRepository,
  browserReportChartConfigurationRepository,
).enableBackupRestore(new IndexedDbMatchBackupRepository(database));

export const browserTrainingService = new TrainingService(
  new IndexedDbTrainingSessionRepository(database),
  profiles,
);

export const browserProfileEditorService = new ProfileEditorService(
  new IndexedDbProfileRepository(database),
  profiles,
);

export const browserFreeLogService = new FreeLogService(
  new IndexedDbFreeLogSessionRepository(database),
);

export const browserDirectoryExporter = new BrowserDirectoryExporter();

export const browserHistoricalAnalyticsService = new HistoricalAnalyticsService(
  browserAnalyticsSnapshotRepository,
);
