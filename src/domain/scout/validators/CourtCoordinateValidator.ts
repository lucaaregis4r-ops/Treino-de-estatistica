import type { CanonicalScoutEventCandidate } from '../mapper/CanonicalScoutEventCandidate';
import { toTacticalMetadata } from '../tactical/TacticalMetadataAdapter';
import { isNormalizedCourtCoordinate } from '../tactical/CourtGeometry';
import type { CourtLocation } from '../tactical/TacticalMetadata';
import { type ValidationIssue, type ValidationResult, validationResult } from './validation';

function locations(candidate: CanonicalScoutEventCandidate): readonly CourtLocation[] {
  if (!candidate.metadata) return [];
  const tactical = toTacticalMetadata(candidate.metadata, candidate.skill);
  return [
    tactical.trajectory?.origin,
    tactical.trajectory?.target,
    tactical.serve?.trajectory?.origin,
    tactical.serve?.trajectory?.target,
    tactical.reception?.contactLocation,
    tactical.set?.targetLocation,
    tactical.attack?.trajectory?.origin,
    tactical.attack?.trajectory?.target,
    tactical.attack?.blockTouchLocation,
    tactical.block?.touchLocation,
  ].filter((location): location is CourtLocation => location !== undefined);
}

export class CourtCoordinateValidator {
  validate(candidate: CanonicalScoutEventCandidate): ValidationResult {
    const issues: ValidationIssue[] = [];
    const spatial = candidate.metadata?.spatial;
    if (spatial !== undefined) {
      for (const endpoint of ['origin', 'destination'] as const) {
        const point = spatial?.[endpoint];
        const path = `metadata.spatial.${endpoint}`;
        if (!point || typeof point !== 'object') {
          issues.push({
            code: 'missing_spatial_point',
            message: 'Both spatial points are required.',
            path,
          });
          continue;
        }
        if (point.surface !== 'court' && point.surface !== 'serviceZone' && point.surface !== 'outZone') {
          issues.push({
            code: 'invalid_spatial_surface',
            message: 'Unknown spatial surface.',
            path: `${path}.surface`,
          });
        }
        for (const axis of ['x', 'y'] as const) {
          if (!Number.isFinite(point[axis]) || point[axis] < 0 || point[axis] > 1) {
            issues.push({
              code: 'invalid_spatial_coordinate',
              message: 'Spatial coordinates must be finite numbers between 0 and 1.',
              path: `${path}.${axis}`,
            });
          }
        }
      }
    }
    locations(candidate).forEach((location, index) => {
      (['x', 'y'] as const).forEach((axis) => {
        if (!isNormalizedCourtCoordinate(location[axis])) {
          issues.push({
            code: 'invalid_court_coordinate',
            message: `Court coordinate ${axis} must be between 0 and 1.`,
            path: `metadata.courtLocations.${index}.${axis}`,
          });
        }
      });
    });
    return validationResult(issues);
  }
}
