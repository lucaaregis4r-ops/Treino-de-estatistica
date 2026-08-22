import type { RallyPhase } from '../../scout/events/ScoutEvent';

export interface PhaseClassificationContext {
  readonly eventTeamId: string;
  readonly servingTeamId?: string;
  readonly receivingTeamId?: string;
  readonly hasPreviousAttack?: boolean;
}

export class PhaseClassifier {
  classify(context: PhaseClassificationContext): RallyPhase {
    if (context.hasPreviousAttack) return 'transition';
    if (context.eventTeamId === context.receivingTeamId) return 'sideout';
    if (context.eventTeamId === context.servingTeamId) return 'breakpoint';
    return 'transition';
  }
}
