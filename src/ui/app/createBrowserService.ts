import { ScoutTrainerService } from '../../application/ScoutTrainerService';
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

const database = new ScoutTrainerDatabase();
const profiles = createDefaultProfileRegistry();

export const browserScoutTrainerService = new ScoutTrainerService(
  new IndexedDbMatchRepository(database),
  new IndexedDbEventRepository(database),
  new IndexedDbTeamRepository(database),
  new IndexedDbPlayerRepository(database),
  profiles,
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

export const browserAnalyticsSnapshotRepository = new IndexedDbAnalyticsSnapshotRepository(database);

export const browserHistoricalAnalyticsService = new HistoricalAnalyticsService(
  browserAnalyticsSnapshotRepository,
);
