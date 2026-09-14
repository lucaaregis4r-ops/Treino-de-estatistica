import type { ResolvedProfileContext } from '../../profiles/ProfileResolver';
import type { SpatialMetadata } from '../../domain/scout/spatial/SpatialMetadata';
import type { ScoutEvent } from '../../domain/scout/events/ScoutEvent';
import type { ScoutValidationContext } from '../../domain/scout/validators/ScoutValidationContext';
import type { VisualScoutDraft } from '../../domain/scout/mapper/VisualScoutDraft';
import { VisualScoutMapper } from '../../domain/scout/mapper/VisualScoutMapper';
import {
  GestureRallyEngine,
  type GestureAction,
  type GestureRallyState,
  type GestureTransition,
  INITIAL_GESTURE_RALLY_STATE,
} from '../../domain/rally/gesture/GestureRallyEngine';
import { ValidateAndCreateScoutEventUseCase } from '../use-cases/register-scout-event/ValidateAndCreateScoutEventUseCase';
import { failure, type Result } from '../../core/result/Result';
import type { ValidationError } from '../../core/errors/ValidationError';

export interface GestureScoutRegistration {
  readonly draft: VisualScoutDraft;
  readonly profiles: ResolvedProfileContext;
  readonly context: ScoutValidationContext;
}

export interface GestureScoutRegistrationResult {
  readonly event: ScoutEvent;
  readonly transition: GestureTransition;
}

/** Coordinates gesture input with the existing visual-to-canonical boundary. */
export class GestureScoutController {
  private state: GestureRallyState = INITIAL_GESTURE_RALLY_STATE;

  constructor(
    private readonly engine = new GestureRallyEngine(),
    private readonly mapper = new VisualScoutMapper(),
    private readonly validateAndCreate = new ValidateAndCreateScoutEventUseCase(),
  ) {}

  get currentState(): GestureRallyState {
    return this.state;
  }

  advance(action: GestureAction): GestureTransition {
    const transition = this.engine.transition(this.state, action);
    this.state = transition.state;
    return transition;
  }

  register(
    registration: GestureScoutRegistration,
    action: GestureAction,
  ): Result<GestureScoutRegistrationResult, ValidationError> {
    const candidate = this.mapper.map(registration.draft, registration.profiles.codeProfile);
    const created = this.validateAndCreate.execute({
      candidate,
      inputMode: 'visual',
      profiles: registration.profiles,
      context: registration.context,
    });
    if (!created.ok) return failure(created.error);
    const transition = this.advance(action);
    return {
      ok: true,
      value: { event: created.value.event, transition },
    };
  }

  static trajectoryDraft(
    base: Omit<VisualScoutDraft, 'spatial'>,
    spatial: SpatialMetadata,
  ): VisualScoutDraft {
    return { ...base, spatial };
  }
}
