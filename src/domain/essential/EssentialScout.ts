import { timestampMs } from '../football/FootballObservation';
import { statsBombToNormalized, type CanonicalFootballEvent } from '../football/StatsBombContract';
import type { FutsalScoutProjection } from '../futsal/FutsalScout';

export type EssentialActionCode = 'F' | 'P' | 'PF' | 'C' | 'PP' | 'RP' | 'FL' | 'RE';
export type EssentialOutcome = 'gol' | 'defesa' | 'fora' | 'bloqueada' | 'trave';
export type EssentialPassResult = 'complete' | 'incomplete' | 'unknown';
export type EssentialProgressionType = 'carry' | 'dribble';
export type EssentialProgressionResult = 'retained' | 'lost' | 'unknown';
export type EssentialRestartType = 'throw_in' | 'kick_in' | 'corner' | 'goal_kick' | 'goal_clearance' | 'free_kick' | 'ten_meter_kick' | 'penalty' | 'kick_off' | 'other' | 'unknown';
export type EssentialFoulCard = 'yellow' | 'red';
export type EssentialThird = 'defensive' | 'middle' | 'attacking';
export type EssentialThirdAnchor = 'origin' | 'destination';
export type EssentialQualifier =
  | 'unmarked' | 'under_pressure' | 'first_touch' | 'transition' | 'set_piece'
  | 'through_ball' | 'cross' | 'pivot'
  | 'bad_pass' | 'tackled' | 'bad_control' | 'carry' | 'out_of_play'
  | 'tackle' | 'interception' | 'rebound' | 'opponent_error' | 'pressing' | 'goalkeeper_save'
  | 'long_pass' | 'line_break' | 'halfway_cross' | 'handball' | 'dangerous_play' | 'quick_restart';
export interface EssentialPosition { readonly x: number; readonly y: number }

export interface EssentialScoutDraft {
  readonly code: EssentialActionCode;
  readonly teamId: string;
  readonly playerId?: string;
  /** Observed shirt, including one absent from the registered roster. */
  readonly shirtNumber?: number;
  readonly position?: EssentialPosition;
  readonly destination?: EssentialPosition;
  /** Operator-declared relative third. No synthetic point is created for it. */
  readonly third?: EssentialThird;
  readonly thirdAnchor?: EssentialThirdAnchor;
  readonly qualifiers?: readonly EssentialQualifier[];
  readonly outcome?: EssentialOutcome;
  readonly passResult?: EssentialPassResult;
  readonly progressionType?: EssentialProgressionType;
  readonly progressionResult?: EssentialProgressionResult;
  readonly foulCard?: EssentialFoulCard;
  /** Whether a futsal foul counts toward the official accumulated-foul tally. */
  readonly foulAccumulated?: boolean;
  readonly restartType?: EssentialRestartType;
  readonly capturedElapsedMs?: number;
}

export interface EssentialScoutRecord extends Omit<EssentialScoutDraft, 'capturedElapsedMs'> {
  readonly id: string;
  readonly period: 1 | 2;
  readonly elapsedMs: number;
  readonly sequence: number;
}

export const ESSENTIAL_CODES: readonly EssentialActionCode[] = ['F', 'P', 'PF', 'C', 'PP', 'RP', 'FL', 'RE'];
export const ESSENTIAL_OUTCOMES: readonly EssentialOutcome[] = ['gol', 'defesa', 'fora', 'bloqueada', 'trave'];
export const ESSENTIAL_PASS_RESULTS: readonly EssentialPassResult[] = ['complete', 'incomplete', 'unknown'];
export const ESSENTIAL_PROGRESSION_TYPES: readonly EssentialProgressionType[] = ['carry', 'dribble'];
export const ESSENTIAL_PROGRESSION_RESULTS: readonly EssentialProgressionResult[] = ['retained', 'lost', 'unknown'];
export const ESSENTIAL_RESTART_TYPES: readonly EssentialRestartType[] = ['throw_in', 'kick_in', 'corner', 'goal_kick', 'goal_clearance', 'free_kick', 'ten_meter_kick', 'penalty', 'kick_off', 'other', 'unknown'];
export const ESSENTIAL_FOUL_CARDS: readonly EssentialFoulCard[] = ['yellow', 'red'];
export const FOOTBALL_ESSENTIAL_RESTART_TYPES: readonly EssentialRestartType[] = ['throw_in', 'corner', 'goal_kick', 'free_kick', 'penalty', 'kick_off', 'other', 'unknown'];
export const FUTSAL_ESSENTIAL_RESTART_TYPES: readonly EssentialRestartType[] = ['kick_in', 'corner', 'goal_clearance', 'free_kick', 'ten_meter_kick', 'penalty', 'kick_off', 'other', 'unknown'];
export const ESSENTIAL_THIRDS: readonly EssentialThird[] = ['defensive', 'middle', 'attacking'];
export const ESSENTIAL_QUALIFIERS_BY_CODE: Readonly<Record<EssentialActionCode, readonly EssentialQualifier[]>> = {
  F: ['unmarked', 'under_pressure', 'first_touch', 'transition', 'set_piece'],
  P: ['through_ball', 'cross', 'pivot', 'transition', 'set_piece', 'long_pass', 'line_break', 'halfway_cross'],
  PF: ['through_ball', 'cross', 'pivot', 'transition', 'set_piece', 'long_pass', 'line_break', 'halfway_cross'],
  C: ['under_pressure', 'transition', 'line_break', 'halfway_cross'],
  PP: ['bad_pass', 'tackled', 'bad_control', 'carry', 'out_of_play', 'under_pressure'],
  RP: ['tackle', 'interception', 'rebound', 'opponent_error', 'pressing', 'goalkeeper_save'],
  FL: ['tackle', 'handball', 'dangerous_play'],
  RE: ['quick_restart'],
};

export function validEssentialPosition(value: unknown): value is EssentialPosition {
  return typeof value === 'object' && value !== null && 'x' in value && 'y' in value &&
    typeof value.x === 'number' && Number.isFinite(value.x) && value.x >= 0 && value.x <= 1 &&
    typeof value.y === 'number' && Number.isFinite(value.y) && value.y >= 0 && value.y <= 1;
}

/** A relative third is known only when the selected team's attack direction is known. */
export function essentialThirdFromPosition(position: EssentialPosition | undefined, direction: 'x120' | 'x0' | undefined): EssentialThird | undefined {
  if (!position || !validEssentialPosition(position) || !direction) return undefined;
  const progress = direction === 'x0' ? 1 - position.x : position.x;
  return progress < 1 / 3 ? 'defensive' : progress < 2 / 3 ? 'middle' : 'attacking';
}

export function validateEssentialDraft(draft: EssentialScoutDraft): string | undefined {
  if (!ESSENTIAL_CODES.includes(draft.code)) return 'Ação essencial inválida.';
  if (!draft.teamId) return 'Selecione uma equipe.';
  if (draft.shirtNumber !== undefined && (!Number.isInteger(draft.shirtNumber) || draft.shirtNumber < 0 || draft.shirtNumber > 999)) return 'Camisa deve ser um inteiro entre 0 e 999.';
  if (draft.position !== undefined && !validEssentialPosition(draft.position)) return 'Posição fora do campo ou da quadra.';
  if (draft.destination !== undefined && !validEssentialPosition(draft.destination)) return 'Destino fora do campo ou da quadra.';
  if (draft.destination !== undefined && !['F', 'P', 'PF', 'C'].includes(draft.code)) return 'Destino só se aplica a finalização, passe ou progressão.';
  if (draft.destination !== undefined && draft.code === 'F' && !draft.position) return 'Alvo da finalização exige origem exata.';
  if (draft.third !== undefined && !ESSENTIAL_THIRDS.includes(draft.third)) return 'Terço inválido.';
  if (draft.third !== undefined && (draft.position !== undefined || draft.destination !== undefined)) return 'Terço manual e ponto exato não podem ser combinados.';
  if (draft.thirdAnchor !== undefined && draft.third === undefined) return 'Âncora de terço exige terço manual.';
  if (draft.thirdAnchor !== undefined && draft.thirdAnchor !== 'origin' && draft.thirdAnchor !== 'destination') return 'Âncora de terço inválida.';
  if (draft.thirdAnchor === 'destination' && !['P', 'PF', 'C'].includes(draft.code)) return 'Terço de destino só se aplica a passe ou progressão.';
  if (draft.qualifiers !== undefined && (!Array.isArray(draft.qualifiers) || new Set(draft.qualifiers).size !== draft.qualifiers.length || draft.qualifiers.some((value: unknown) => typeof value !== 'string' || !ESSENTIAL_QUALIFIERS_BY_CODE[draft.code].includes(value as EssentialQualifier)))) return 'Qualificadores inválidos, repetidos ou incompatíveis com o fundamento.';
  if (draft.code === 'F') {
    if (!draft.position && !draft.third) return 'Marque a origem ou o terço da finalização.';
    if (!draft.outcome || !ESSENTIAL_OUTCOMES.includes(draft.outcome)) return 'Selecione o resultado da finalização.';
  } else if (draft.outcome !== undefined) return 'Resultado só se aplica à finalização.';
  if (draft.passResult !== undefined && !ESSENTIAL_PASS_RESULTS.includes(draft.passResult)) return 'Resultado do passe inválido.';
  if (draft.code === 'P' && !draft.passResult) return 'Informe o resultado do passe.';
  if (draft.code === 'PF' && draft.passResult !== undefined && draft.passResult !== 'complete') return 'Passe para finalização exige passe completo.';
  if (draft.passResult !== undefined && draft.code !== 'P' && draft.code !== 'PF') return 'Resultado do passe só se aplica a P/PF.';
  if (draft.progressionType !== undefined && !ESSENTIAL_PROGRESSION_TYPES.includes(draft.progressionType)) return 'Tipo de progressão inválido.';
  if (draft.progressionResult !== undefined && !ESSENTIAL_PROGRESSION_RESULTS.includes(draft.progressionResult)) return 'Resultado da progressão inválido.';
  if (draft.code === 'C' && (!draft.progressionType || !draft.progressionResult)) return 'Informe tipo e resultado da progressão.';
  if (draft.code !== 'C' && (draft.progressionType !== undefined || draft.progressionResult !== undefined)) return 'Dados da progressão só se aplicam a C.';
  if (draft.foulCard !== undefined && !ESSENTIAL_FOUL_CARDS.includes(draft.foulCard)) return 'Cartão inválido.';
  if (draft.foulAccumulated !== undefined && typeof draft.foulAccumulated !== 'boolean') return 'Falta acumulada inválida.';
  if (draft.code !== 'FL' && (draft.foulCard !== undefined || draft.foulAccumulated !== undefined)) return 'Dados de falta só se aplicam a FL.';
  if (draft.restartType !== undefined && !ESSENTIAL_RESTART_TYPES.includes(draft.restartType)) return 'Tipo de reinício inválido.';
  if (draft.code === 'RE' && !draft.restartType) return 'Selecione o tipo de reinício.';
  if (draft.code !== 'RE' && draft.restartType !== undefined) return 'Tipo de reinício só se aplica a RE.';
  if (draft.capturedElapsedMs !== undefined && (!Number.isFinite(draft.capturedElapsedMs) || draft.capturedElapsedMs < 0)) return 'Tempo capturado inválido.';
}

const FOOTBALL_OUTCOME: Record<EssentialOutcome, string> = {
  gol: 'Goal', defesa: 'Saved', fora: 'Off T', bloqueada: 'Blocked', trave: 'Post',
};

export function projectEssentialFootballActions(events: readonly CanonicalFootballEvent[]): readonly EssentialScoutRecord[] {
  return events.flatMap(event => {
    const code = event.scout_trainer.essential_code;
    const teamId = event.scout_trainer.observation?.teamId;
    if (!code || !teamId) return [];
    const position = event.location ? normalized(event.location) : undefined;
    const shotEnd = event.shot?.end_location;
    const destinationLocation = event.pass?.end_location ?? event.carry?.end_location ?? event.scout_trainer.essential_destination ?? (Array.isArray(shotEnd) && typeof shotEnd[0] === 'number' && typeof shotEnd[1] === 'number' ? shotEnd as unknown as readonly [number, number] : undefined);
    const destination = destinationLocation ? normalized(destinationLocation) : undefined;
    const outcomeName = event.shot?.outcome && typeof event.shot.outcome === 'object' && 'name' in event.shot.outcome ? String(event.shot.outcome.name) : undefined;
    const outcome = code === 'F' ? ESSENTIAL_OUTCOMES.find(value => FOOTBALL_OUTCOME[value] === outcomeName) : undefined;
    return [{
      id: event.id, code, teamId,
      ...(event.scout_trainer.observation?.playerId ? { playerId: event.scout_trainer.observation.playerId } : {}),
      ...(event.scout_trainer.essential_shirt_number !== undefined ? { shirtNumber: event.scout_trainer.essential_shirt_number } : {}),
      ...(position ? { position } : {}), ...(destination ? { destination } : {}), ...(outcome ? { outcome } : {}),
      ...(event.scout_trainer.essential_third ? { third: event.scout_trainer.essential_third } : {}),
      ...(event.scout_trainer.essential_third_anchor ? { thirdAnchor: event.scout_trainer.essential_third_anchor } : {}),
      ...(event.scout_trainer.essential_qualifiers ? { qualifiers: event.scout_trainer.essential_qualifiers } : {}),
      ...(event.scout_trainer.essential_pass_result ? { passResult: event.scout_trainer.essential_pass_result } : {}),
      ...(event.scout_trainer.essential_progression_type ? { progressionType: event.scout_trainer.essential_progression_type } : {}),
      ...(event.scout_trainer.essential_progression_result ? { progressionResult: event.scout_trainer.essential_progression_result } : {}),
      ...(event.scout_trainer.essential_foul_card ? { foulCard: event.scout_trainer.essential_foul_card } : {}),
      ...(event.scout_trainer.essential_restart_type ? { restartType: event.scout_trainer.essential_restart_type } : {}),
      period: event.period, elapsedMs: timestampMs(event.timestamp), sequence: event.scout_trainer.capture_sequence,
    }];
  }).sort((a, b) => a.sequence - b.sequence);
}

export function projectEssentialFutsalActions(projection: FutsalScoutProjection): readonly EssentialScoutRecord[] {
  return projection.facts.flatMap(({ fact, sequence }) => {
    const code = fact.essentialCode;
    if (!code) return [];
    const teamId = fact.kind === 'shot' ? fact.shootingTeamId : fact.kind === 'foul' ? fact.offendingTeamId :
      'teamId' in fact ? fact.teamId : undefined;
    if (!teamId) return [];
    const outcome = fact.kind === 'shot' ? ({ goal: 'gol', saved: 'defesa', off_target: 'fora', blocked: 'bloqueada', post: 'trave' } as const)[fact.outcome as 'goal' | 'saved' | 'off_target' | 'blocked' | 'post'] : undefined;
    const destination = 'destination' in fact ? fact.destination : undefined;
    const playerId = 'playerId' in fact ? fact.playerId : undefined;
    return [{
      id: fact.id, code, teamId, ...(playerId ? { playerId } : {}),
      ...(fact.essentialShirtNumber !== undefined ? { shirtNumber: fact.essentialShirtNumber } : {}),
      ...(fact.position ? { position: fact.position } : {}), ...(destination ? { destination } : {}), ...(outcome ? { outcome } : {}),
      ...(fact.essentialThird ? { third: fact.essentialThird } : {}),
      ...(fact.essentialThirdAnchor ? { thirdAnchor: fact.essentialThirdAnchor } : {}),
      ...(fact.essentialQualifiers ? { qualifiers: fact.essentialQualifiers } : {}),
      ...((fact.kind === 'pass' || fact.kind === 'chance_pass') && fact.passResult ? { passResult: fact.passResult } : {}),
      ...(fact.kind === 'progression' ? { progressionType: fact.progressionType, progressionResult: fact.progressionResult } : {}),
      ...(fact.kind === 'foul' ? { foulAccumulated: fact.accumulated, ...(fact.card ? { foulCard: fact.card } : {}) } : {}),
      ...(fact.kind === 'restart' ? { restartType: fact.restart } : {}),
      period: fact.period, elapsedMs: fact.elapsedMs, sequence,
    }];
  }).sort((a, b) => a.sequence - b.sequence);
}

function normalized(location: readonly [number, number] | readonly [number, number, number]): EssentialPosition {
  const [x, y] = statsBombToNormalized(location);
  return { x, y };
}
