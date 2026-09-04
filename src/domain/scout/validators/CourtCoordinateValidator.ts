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
