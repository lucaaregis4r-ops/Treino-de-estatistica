import type { MatchMetadata } from '../../match/entities/MatchMetadata';
import type { MatchEvent } from '../../match/events/MatchEvent';
import {
  projectEffectiveMatchEvents,
  projectScoutTimeline,
  type ProjectedScoutEvent,
} from '../../match/events/ScoutTimeline';
import {
  ROTATION_POSITIONS,
  type CourtRotationPosition,
  type SetLineup,
} from '../../match/lineup/SetLineup';
import { reduceMatch } from '../../match/reducers/MatchReducer';
import { createInitialMatchState } from '../../match/state/MatchState';
import type { Skill } from '../../scout/entities/Skill';
import type { ExpectedNextAction, ExpectedActionReason } from './ExpectedNextAction';
import { RallyPhaseResolver } from './RallyPhaseResolver';
import { ReceptionContextResolver } from './ReceptionContextResolver';
import type {
  TacticalContactContext,
  TacticalRallyProjection,
  TacticalRallySummary,
} from './TacticalRallyProjection';

function opponent(teamId: string, metadata: MatchMetadata): string | undefined {
  if (teamId === metadata.teamAId) return metadata.teamBId;
  if (teamId === metadata.teamBId) return metadata.teamAId;
  return undefined;
}

function setterPosition(lineup: SetLineup | undefined): CourtRotationPosition | undefined {
  if (!lineup) return undefined;
  const setter = Object.values(lineup.slots).find((slot) => slot.tacticalRole === 'setter');
  return setter
    ? ROTATION_POSITIONS.find((position) => lineup.positions[position] === setter.slotId)
    : undefined;
}

function rotations(lineups: readonly SetLineup[]): Readonly<Record<string, CourtRotationPosition>> {
  return Object.freeze(
    Object.fromEntries(
      lineups.flatMap((lineup) => {
        const position = setterPosition(lineup);
        return position ? [[lineup.teamId, position] as const] : [];
      }),
    ),
  );
}

function expectedAfter(
  contact: ProjectedScoutEvent,
  metadata: MatchMetadata,
): ExpectedNextAction | undefined {
  const sameTeam = contact.event.teamId;
  const otherTeam = opponent(sameTeam, metadata);
  const mapping: Partial<
    Record<Skill, readonly [Skill, string | undefined, ExpectedActionReason]>
  > = {
    serve: ['reception', otherTeam, 'serve_received'],
    reception: ['set', sameTeam, 'reception_completed'],
    set: ['attack', sameTeam, 'set_completed'],
    attack: ['block', otherTeam, 'attack_defense'],
    block: ['dig', otherTeam, 'block_defense'],
    dig: ['set', sameTeam, 'defense_completed'],
    free_ball: ['reception', otherTeam, 'free_ball_sent'],
  };
  const next = mapping[contact.event.skill];
  return next
    ? {
        skill: next[0],
        ...(next[1] ? { teamId: next[1] } : {}),
        reason: next[2],
        derivedFromEventId: contact.sourceEventId,
      }
    : undefined;
}

export class RallyContextResolver {
  constructor(
    private readonly phaseResolver = new RallyPhaseResolver(),
    private readonly receptionResolver = new ReceptionContextResolver(),
  ) {}

  project(metadata: MatchMetadata, events: readonly MatchEvent[]): TacticalRallyProjection {
    const effective = projectEffectiveMatchEvents(events);
    const historyBySource = new Map(
      projectScoutTimeline(events).map((contact) => [contact.sourceEventId, contact]),
    );
    let state = createInitialMatchState(metadata);
    let rallyContacts: ProjectedScoutEvent[] = [];
    const contacts: TacticalContactContext[] = [];
    const rallies = new Map<string, TacticalRallySummary>();
    let expected: ExpectedNextAction | undefined;

    for (const event of effective) {
      if (event.type === 'rally_started') {
        rallyContacts = [];
        state = reduceMatch(state, event);
        expected = {
          skill: 'serve',
          ...(state.servingTeamId ? { teamId: state.servingTeamId } : {}),
          reason: 'rally_start',
        };
        rallies.set(event.rallyId, {
          rallyId: event.rallyId,
          ...(state.servingTeamId ? { servingTeamId: state.servingTeamId } : {}),
          transitionTeamIds: Object.freeze([]),
        });
        continue;
      }

      if (event.type === 'scout_registered') {
        const effectiveContact = historyBySource.get(event.event.id);
        const projected: ProjectedScoutEvent = {
          sourceEventId: event.event.id,
          historyEventId: effectiveContact?.historyEventId ?? event.event.id,
          originalSequence: event.event.sequence,
          event: event.event,
          corrected: false,
        };
        const tactical = state.tacticalStateByTeamId[projected.event.teamId];
        const rotation =
          projected.event.setterPosition ??
          tactical?.activeSetterPosition ??
          setterPosition(state.lineups.find((lineup) => lineup.teamId === projected.event.teamId));
        const setterPlayerId = projected.event.setterPlayerId ?? tactical?.activeSetterPlayerId;
        const formationState = projected.event.formationState ?? tactical?.formationState;
        const receptionForAttack = this.receptionResolver.resolveForAttack(
          projected,
          rallyContacts,
        );
        const receivingTeamId = state.servingTeamId
          ? opponent(state.servingTeamId, metadata)
          : undefined;
        expected = expectedAfter(projected, metadata);
        const contactContext = Object.freeze({
          sourceEventId: projected.sourceEventId,
          historyEventId: projected.historyEventId,
          rallyId: projected.event.rallyId,
          teamId: projected.event.teamId,
          skill: projected.event.skill,
          phase: this.phaseResolver.resolve({
            contact: projected,
            previousContacts: rallyContacts,
            servingTeamId: state.servingTeamId,
            receivingTeamId,
          }),
          ...(state.servingTeamId ? { servingTeamId: state.servingTeamId } : {}),
          ...(rotation ? { rotation } : {}),
          ...(setterPlayerId ? { setterPlayerId } : {}),
          ...(rotation ? { setterPosition: rotation } : {}),
          ...(formationState ? { formationState } : {}),
          ...(receptionForAttack ? { receptionForAttack } : {}),
          ...(expected ? { expectedNextAction: expected } : {}),
        });
        contacts.push(contactContext);
        if (contactContext.phase === 'transition') {
          const summary = rallies.get(contactContext.rallyId);
          if (summary && !summary.transitionTeamIds.includes(contactContext.teamId))
            rallies.set(contactContext.rallyId, {
              ...summary,
              transitionTeamIds: Object.freeze([
                ...summary.transitionTeamIds,
                contactContext.teamId,
              ]),
            });
        }
        rallyContacts = [...rallyContacts, projected];
      }

      state = reduceMatch(state, event);
      if (
        event.type === 'rally_result' ||
        event.type === 'rally_ended' ||
        event.type === 'match_correction' ||
        event.type === 'fault'
      ) {
        expected = undefined;
        const rallyId =
          event.type === 'match_correction' ? event.correction.rallyId : event.rallyId;
        const last = contacts.at(-1);
        if (last?.rallyId === rallyId && last.expectedNextAction) {
          const terminalContext = { ...last } as {
            -readonly [Key in keyof TacticalContactContext]: TacticalContactContext[Key];
          };
          delete terminalContext.expectedNextAction;
          contacts[contacts.length - 1] = Object.freeze(terminalContext);
        }
        const winnerTeamId =
          event.type === 'rally_result'
            ? event.winnerTeamId
            : event.type === 'match_correction'
              ? event.correction.teamId
              : event.type === 'fault'
                ? event.pointFor
                : event.winningTeamId;
        const summary = rallies.get(rallyId);
        if (summary && winnerTeamId) rallies.set(rallyId, { ...summary, winnerTeamId });
      }
    }

    return Object.freeze({
      contacts: Object.freeze(contacts),
      rallies: Object.freeze([...rallies.values()]),
      ...(state.currentRally.rallyId ? { currentRallyId: state.currentRally.rallyId } : {}),
      ...(state.servingTeamId ? { servingTeamId: state.servingTeamId } : {}),
      rotationByTeamId: rotations(state.lineups),
      ...(expected ? { expectedNextAction: expected } : {}),
    });
  }
}
