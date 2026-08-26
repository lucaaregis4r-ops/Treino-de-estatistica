import type { DerivedTacticalState, SubstitutionWindow } from './TacticalState';

export type TacticalPattern = 'five_one_inversion' | 'five_one_return';

export class TacticalPatternDetector {
  detect(
    window: SubstitutionWindow,
    tacticalState: DerivedTacticalState,
  ): TacticalPattern | undefined {
    if (window.entries.length !== 2) return undefined;
    const outgoing = new Set(window.entries.map((entry) => entry.playerOutRole));
    const incoming = new Set(window.entries.map((entry) => entry.playerInRole));
    const activeSetterChanged =
      window.activeSetterBeforeWindow !== tacticalState.activeSetterPlayerId;

    if (
      window.formationBeforeWindow === 'normal' &&
      outgoing.has('setter') &&
      outgoing.has('opposite') &&
      incoming.has('setter') &&
      (incoming.has('opposite') || incoming.has('outside')) &&
      activeSetterChanged
    ) {
      return 'five_one_inversion';
    }

    if (
      window.formationBeforeWindow === 'five_one_inversion' &&
      tacticalState.primarySetterPlayerId !== undefined &&
      tacticalState.activeSetterPlayerId === tacticalState.primarySetterPlayerId &&
      activeSetterChanged
    ) {
      return 'five_one_return';
    }
    return undefined;
  }
}
