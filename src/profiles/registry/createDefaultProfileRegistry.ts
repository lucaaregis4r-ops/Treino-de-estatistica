import { defaultCompactV1 } from '../code/default-compact/defaultCompactV1';
import { dataVolleyBasicV1 } from '../code/data-volley/dataVolleyBasicV1';
import { complexityProfiles } from '../complexity/profiles';
import { cbvSuperligaReference2025_26 } from '../competition/cbv/superliga-reference-2025-26/profile';
import { ProfileRegistry } from '../ProfileRegistry';
import { defaultTrainingProfiles } from '../training/defaultTrainingProfiles';

export function createDefaultProfileRegistry(): ProfileRegistry {
  const registry = new ProfileRegistry();
  const result = registry.registerMany([
    dataVolleyBasicV1,
    defaultCompactV1,
    ...complexityProfiles,
    cbvSuperligaReference2025_26,
    ...defaultTrainingProfiles,
  ]);

  if (!result.ok) {
    throw result.error;
  }

  return registry;
}
