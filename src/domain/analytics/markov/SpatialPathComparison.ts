import { contactQuality } from '../../scout/entities/ContactQuality';
import { selectRallyPathFocus, type RallyPathFocusFilters, type RallyPathModel } from './RallyPathAnalyzer';

/** Compare identical cohorts, changing only the selected spatial region. Repeated
 * actions count for contact quality; rally outcomes are deduplicated per region. */
export function compareRallyPathRegions(model: RallyPathModel, filters: RallyPathFocusFilters) {
  const base = selectRallyPathFocus(model, { ...filters, spatialRegionId: undefined });
  const region = (item: (typeof base.occurrences)[number]) => filters.spatialRole === 'target'
    ? item.contact.spatial.targetRegionId : item.contact.spatial.originRegionId;
  return [...new Set(base.occurrences.flatMap(item => region(item) ? [region(item)!] : []))].sort().map(regionId => {
    const focus = selectRallyPathFocus(model, { ...filters, spatialRegionId: regionId });
    const graded = focus.occurrences.flatMap(item => {
      const grade = contactQuality(item.contact.quality);
      return grade ? [grade] : [];
    });
    const positiveCount = graded.filter(grade => grade === '#' || grade === '+').length;
    return {
      regionId, occurrences: focus.occurrenceCount, rallies: focus.rallyIds.length,
      gradedCount: graded.length, positiveCount,
      positiveRate: graded.length ? positiveCount / graded.length : null,
      observedPointRate: focus.observedPointRate, potential: focus.potential,
      availableForHeadline: focus.availableForHeadline,
    };
  });
}
