import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { ScoutEvent } from '../../../domain/scout/events/ScoutEvent';
import { receptionGrade } from '../../../domain/statistics/queries/scoutEventQueries';

type ReadingSource = Pick<MatchWorkspace, 'teams' | 'players' | 'timeline' | 'report' | 'tacticalRally' | 'state'>;

export interface ReadingRate {
  readonly numerator: number;
  readonly denominator: number;
  readonly value: number | null;
}

export interface AthleteReading {
  readonly id: string;
  readonly name: string;
  readonly number: number;
  readonly attackAttempts: number;
  readonly attackPoints: number;
  readonly attackErrors: number;
  readonly attackBlocked: number;
  readonly serveAttempts: number;
  readonly aces: number;
  readonly serveErrors: number;
  readonly receptionAttempts: number;
  readonly receptionPositive: number;
  readonly receptionErrors: number;
  readonly blockPoints: number;
  readonly pointContributions: number;
  readonly improvementCount: number;
}

export interface RotationReading {
  readonly rotation: number;
  readonly sideout: ReadingRate;
  readonly breakpoint: ReadingRate;
  readonly attack: ReadingRate;
  readonly attacks: number;
}

export interface TeamReading {
  readonly id: string;
  readonly name: string;
  readonly athleteCount: number;
  readonly actions: number;
  readonly identifiedActions: number;
  readonly attack: { readonly attempts: number; readonly points: number; readonly errors: number; readonly blocked: number; readonly efficiency: ReadingRate };
  readonly serve: { readonly attempts: number; readonly aces: number; readonly errors: number };
  readonly reception: { readonly attempts: number; readonly positive: number; readonly excellent: number; readonly errors: number; readonly positiveRate: ReadingRate };
  readonly block: { readonly actions: number; readonly points: number };
  readonly sideout: ReadingRate;
  readonly breakpoint: ReadingRate;
  readonly athletes: readonly AthleteReading[];
  readonly rotations: readonly RotationReading[];
}

export interface VolleyballReadingModel {
  readonly teams: readonly TeamReading[];
  readonly events: readonly ScoutEvent[];
  readonly setNumber: number | null;
}

function rate(numerator: number, denominator: number): ReadingRate {
  return { numerator, denominator, value: denominator ? numerator / denominator : null };
}

function count(events: readonly ScoutEvent[], outcome: string) {
  return events.filter((event) => event.outcome === outcome).length;
}

function bySkill(events: readonly ScoutEvent[], skill: ScoutEvent['skill']) {
  return events.filter((event) => event.skill === skill);
}

function athleteReading(player: ReadingSource['players'][number], events: readonly ScoutEvent[]): AthleteReading {
  const playerEvents = events.filter((event) => event.playerId === player.id);
  const attacks = bySkill(playerEvents, 'attack');
  const serves = bySkill(playerEvents, 'serve');
  const receptions = bySkill(playerEvents, 'reception');
  const blocks = bySkill(playerEvents, 'block');
  const attackPoints = count(attacks, 'point');
  const aces = count(serves, 'ace');
  const blockPoints = count(blocks, 'point');
  const attackErrors = count(attacks, 'error');
  const attackBlocked = count(attacks, 'blocked');
  const serveErrors = count(serves, 'error');
  const receptionErrors = receptions.filter((event) => receptionGrade(event) === 'ERROR').length;
  return {
    id: player.id, name: player.name ?? `Atleta ${player.number}`, number: player.number,
    attackAttempts: attacks.length, attackPoints, attackErrors, attackBlocked,
    serveAttempts: serves.length, aces, serveErrors,
    receptionAttempts: receptions.length,
    receptionPositive: receptions.filter((event) => ['A', 'B'].includes(receptionGrade(event) ?? '')).length,
    receptionErrors,
    blockPoints,
    pointContributions: attackPoints + aces + blockPoints,
    improvementCount: attackErrors + attackBlocked + serveErrors + receptionErrors,
  };
}

export function buildVolleyballReading(source: ReadingSource, setNumber: number | null): VolleyballReadingModel {
  const events = source.timeline.map((entry) => entry.event)
    .filter((event) => setNumber === null || event.setNumber === setNumber);
  const contacts = new Map(source.tacticalRally.contacts.map((contact) => [contact.sourceEventId, contact]));
  const sourceIds = new Map(source.timeline.map((entry) => [entry.event.id, entry.sourceEventId]));

  const teams = source.teams.map((team): TeamReading => {
    const teamEvents = events.filter((event) => event.teamId === team.id);
    const attacks = bySkill(teamEvents, 'attack');
    const serves = bySkill(teamEvents, 'serve');
    const receptions = bySkill(teamEvents, 'reception');
    const blocks = bySkill(teamEvents, 'block');
    const attackPoints = count(attacks, 'point');
    const attackErrors = count(attacks, 'error');
    const attackBlocked = count(attacks, 'blocked');
    const positive = receptions.filter((event) => ['A', 'B'].includes(receptionGrade(event) ?? '')).length;
    const excellent = receptions.filter((event) => receptionGrade(event) === 'A').length;
    const rateRow = (kind: 'sideout' | 'breakpoint'): ReadingRate => {
      const row = source.report[kind].find((candidate) => candidate.teamId === team.id &&
        candidate.setNumber === (setNumber ?? undefined) && !candidate.playerId && !candidate.rotation);
      return row?.rate ?? rate(0, 0);
    };
    const rotations = [1, 2, 3, 4, 5, 6].map((rotation): RotationReading => {
      if (setNumber === null) {
        const row = source.report.rotations.find((candidate) => candidate.teamId === team.id && candidate.rotation === rotation);
        if (row) return { rotation, sideout: row.sideout, breakpoint: row.breakpoint, attack: row.attackEfficiency, attacks: row.attackEfficiency.denominator };
      }
      const scoped = teamEvents.filter((event) => contacts.get(sourceIds.get(event.id) ?? event.id)?.rotation === rotation);
      const scopedAttacks = bySkill(scoped, 'attack');
      const rallyIds = new Set(scoped.map((event) => event.rallyId));
      const rallies = source.tacticalRally.rallies.filter((rally) => rallyIds.has(rally.rallyId) && rally.winnerTeamId && rally.servingTeamId);
      const sideouts = rallies.filter((rally) => rally.servingTeamId !== team.id);
      const breakpoints = rallies.filter((rally) => rally.servingTeamId === team.id);
      return {
        rotation,
        sideout: rate(sideouts.filter((rally) => rally.winnerTeamId === team.id).length, sideouts.length),
        breakpoint: rate(breakpoints.filter((rally) => rally.winnerTeamId === team.id).length, breakpoints.length),
        attack: rate(count(scopedAttacks, 'point') - count(scopedAttacks, 'error') - count(scopedAttacks, 'blocked'), scopedAttacks.length),
        attacks: scopedAttacks.length,
      };
    });
    return {
      id: team.id, name: team.name,
      athleteCount: source.players.filter((player) => player.teamId === team.id).length,
      actions: teamEvents.length,
      identifiedActions: teamEvents.filter((event) => event.playerId).length,
      attack: { attempts: attacks.length, points: attackPoints, errors: attackErrors, blocked: attackBlocked,
        efficiency: rate(attackPoints - attackErrors - attackBlocked, attacks.length) },
      serve: { attempts: serves.length, aces: count(serves, 'ace'), errors: count(serves, 'error') },
      reception: { attempts: receptions.length, positive, excellent,
        errors: receptions.filter((event) => receptionGrade(event) === 'ERROR').length,
        positiveRate: rate(positive, receptions.length) },
      block: { actions: blocks.length, points: count(blocks, 'point') },
      sideout: rateRow('sideout'), breakpoint: rateRow('breakpoint'),
      athletes: source.players.filter((player) => player.teamId === team.id)
        .map((player) => athleteReading(player, teamEvents)),
      rotations,
    };
  });

  return { teams, events, setNumber };
}
