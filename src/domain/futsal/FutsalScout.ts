import { matchEventSequence, type MatchEvent } from '../match/events/MatchEvent';
import { validateEssentialDraft, type EssentialActionCode, type EssentialQualifier, type EssentialThird, type EssentialThirdAnchor } from '../essential/EssentialScout';

export type FutsalObservation = 'observed' | 'partial' | 'not_observed';
export type FutsalControlCoverage = 'continuous' | 'suspended';
export type FutsalRestart = 'kick_in' | 'corner' | 'goal_clearance' | 'free_kick' | 'ten_meter_kick' | 'penalty' | 'kick_off' | 'other' | 'unknown';
export type FutsalShotOutcome = 'pending' | 'goal' | 'saved' | 'blocked' | 'off_target' | 'post';
export type FutsalOrganization = 'positional' | 'transition' | 'set_piece' | 'other' | 'not_observed';
export type FutsalDefensiveContext = 'pressure' | 'block_high' | 'block_medium' | 'block_low' | 'recovery' | 'goalkeeper_save' | 'not_observed';
export type FutsalAttackingStructure = '3-1' | '4-0' | '2-2' | 'other' | 'not_observed';
export type FutsalAnnotationScope = 'event' | 'interval';

interface FutsalFactBase {
  readonly id: string;
  readonly period: 1 | 2;
  readonly elapsedMs: number;
  readonly observation: FutsalObservation;
  readonly position?: { readonly x: number; readonly y: number };
  /** Sparse capture marker; it never proves continuous control. */
  readonly essentialCode?: EssentialActionCode;
  readonly essentialShirtNumber?: number;
  readonly essentialThird?: EssentialThird;
  readonly essentialThirdAnchor?: EssentialThirdAnchor;
  readonly essentialQualifiers?: readonly EssentialQualifier[];
}

export type FutsalFact = FutsalFactBase & (
  | { readonly kind: 'control'; readonly state: 'team' | 'contested' | 'dead_ball' | 'unknown'; readonly controlledTeamId?: string; readonly coverage: FutsalControlCoverage }
  | { readonly kind: 'shot'; readonly shootingTeamId: string; readonly playerId?: string; readonly outcome: FutsalShotOutcome; readonly beneficiaryTeamId?: string; readonly destination?: { readonly x: number; readonly y: number } }
  | { readonly kind: 'chance_pass'; readonly teamId: string; readonly playerId?: string; readonly destination?: { readonly x: number; readonly y: number }; readonly passResult?: import('../essential/EssentialScout').EssentialPassResult }
  | { readonly kind: 'pass'; readonly teamId: string; readonly playerId?: string; readonly destination?: { readonly x: number; readonly y: number }; readonly passResult: import('../essential/EssentialScout').EssentialPassResult }
  | { readonly kind: 'progression'; readonly teamId: string; readonly playerId?: string; readonly destination?: { readonly x: number; readonly y: number }; readonly progressionType: import('../essential/EssentialScout').EssentialProgressionType; readonly progressionResult: import('../essential/EssentialScout').EssentialProgressionResult }
  | { readonly kind: 'possession_loss' | 'ball_recovery'; readonly teamId: string; readonly playerId?: string }
  | { readonly kind: 'tackle'; readonly winningTeamId: string; readonly losingTeamId: string; readonly playerId?: string }
  | { readonly kind: 'restart'; readonly teamId?: string; readonly playerId?: string; readonly restart: FutsalRestart }
  | { readonly kind: 'foul'; readonly offendingTeamId: string; readonly accumulated: boolean; readonly playerId?: string; readonly card?: import('../essential/EssentialScout').EssentialFoulCard }
  | { readonly kind: 'composition'; readonly teamId: string; readonly playerIds: readonly string[]; readonly certainty: 'complete' | 'partial'; readonly shortHanded?: boolean }
  | { readonly kind: 'substitution'; readonly teamId: string; readonly playerOutId?: string; readonly playerInId?: string; readonly certainty: 'complete' | 'partial' }
  | { readonly kind: 'tactical_context'; readonly teamId: string; readonly numericalSituation: 'own_flying_goalkeeper' | 'opponent_flying_goalkeeper'; readonly active: boolean }
  | { readonly kind: 'tactical_annotation'; readonly scope: FutsalAnnotationScope; readonly teamId?: string; readonly targetFactId?: string; readonly startFactId?: string; readonly endFactId?: string; readonly organization?: FutsalOrganization; readonly restartOrigin?: FutsalRestart; readonly numericalSituation?: 'regular' | 'own_flying_goalkeeper' | 'opponent_flying_goalkeeper' | 'short_handed' | 'other' | 'not_observed'; readonly defensiveContext?: FutsalDefensiveContext; readonly attackingStructure?: FutsalAttackingStructure; readonly note?: string; readonly removed?: true }
  | { readonly kind: 'score_adjustment'; readonly beneficiaryTeamId: string; readonly delta: -1 | 1; readonly reason: string }
);
export type FutsalFactDraft = FutsalFact extends infer Fact
  ? Fact extends FutsalFactBase ? Omit<Fact, 'id' | 'period' | 'elapsedMs'> : never
  : never;

export interface FutsalFactRegisteredEvent {
  readonly type: 'futsal_fact_registered'; readonly id: string; readonly matchId: string; readonly sequence: number; readonly timestamp: number; readonly fact: FutsalFact;
}
export interface FutsalFactCorrectedEvent {
  readonly type: 'futsal_fact_corrected'; readonly id: string; readonly matchId: string; readonly sequence: number; readonly timestamp: number; readonly targetFactId: string; readonly replacementFact: FutsalFact;
}
export interface FutsalFactUndoneEvent {
  readonly type: 'futsal_fact_undone'; readonly id: string; readonly matchId: string; readonly sequence: number; readonly timestamp: number; readonly targetHistoryEventId: string;
}
export type FutsalFactHistoryEvent = FutsalFactRegisteredEvent | FutsalFactCorrectedEvent | FutsalFactUndoneEvent;

export interface ProjectedFutsalFact {
  readonly fact: FutsalFact;
  readonly sourceEventId: string;
  readonly sequence: number;
}
export interface FutsalScoutProjection {
  readonly facts: readonly ProjectedFutsalFact[];
  readonly score: Readonly<Record<string, number>>;
  readonly accumulatedFouls: Readonly<Record<string, number>>;
  readonly control: FutsalFact | undefined;
  readonly compositions: Readonly<Record<string, { readonly playerIds: readonly string[]; readonly certainty: 'complete' | 'partial'; readonly shortHanded: boolean }>>;
  readonly flyingGoalkeeperTeams: readonly string[];
  readonly undoTargetHistoryEventId?: string;
}

function isFutsalFactEvent(event: MatchEvent): event is MatchEvent & FutsalFactHistoryEvent {
  return event.type === 'futsal_fact_registered' || event.type === 'futsal_fact_corrected' || event.type === 'futsal_fact_undone';
}

/** Replays immutable registrations, corrections and undo markers without deleting history. */
export function projectFutsalScout(events: readonly MatchEvent[]): FutsalScoutProjection {
  const history = events.filter(isFutsalFactEvent).sort((a, b) => matchEventSequence(a) - matchEventSequence(b));
  const undone = new Set(history.filter((event): event is FutsalFactUndoneEvent => event.type === 'futsal_fact_undone').map(event => event.targetHistoryEventId));
  const registrations = new Map<string, FutsalFactRegisteredEvent>();
  for (const event of history) if (event.type === 'futsal_fact_registered' && !undone.has(event.id)) registrations.set(event.fact.id, event);
  const current = new Map<string, ProjectedFutsalFact>();
  for (const [factId, registration] of registrations) current.set(factId, { fact: registration.fact, sourceEventId: registration.id, sequence: registration.sequence });
  for (const event of history) {
    if (event.type !== 'futsal_fact_corrected' || undone.has(event.id) || !current.has(event.targetFactId)) continue;
    current.set(event.targetFactId, { fact: event.replacementFact, sourceEventId: event.id, sequence: current.get(event.targetFactId)!.sequence });
  }
  const facts = [...current.values()].filter(({ fact }) => !(fact.kind === 'tactical_annotation' && fact.removed)).sort((a, b) => a.sequence - b.sequence);
  const score: Record<string, number> = {};
  const accumulatedFouls: Record<string, number> = {};
  const compositions: Record<string, { playerIds: string[]; certainty: 'complete' | 'partial'; shortHanded: boolean }> = {};
  const flyingGoalkeeperTeams = new Set<string>();
  for (const { fact } of facts) {
    if (fact.kind === 'shot' && fact.outcome === 'goal' && fact.beneficiaryTeamId) score[fact.beneficiaryTeamId] = (score[fact.beneficiaryTeamId] ?? 0) + 1;
    if (fact.kind === 'score_adjustment') score[fact.beneficiaryTeamId] = (score[fact.beneficiaryTeamId] ?? 0) + fact.delta;
    if (fact.kind === 'foul' && fact.accumulated) {
      const key = `${fact.period}:${fact.offendingTeamId}`;
      accumulatedFouls[key] = (accumulatedFouls[key] ?? 0) + 1;
    }
    if (fact.kind === 'composition') compositions[fact.teamId] = { playerIds: [...fact.playerIds], certainty: fact.certainty, shortHanded: fact.shortHanded === true };
    if (fact.kind === 'substitution') {
      const composition = compositions[fact.teamId];
      if (composition) {
        if (fact.certainty === 'partial' && !fact.playerOutId) composition.playerIds = fact.playerInId ? [fact.playerInId] : [];
        else {
          if (fact.playerOutId) composition.playerIds = composition.playerIds.filter(id => id !== fact.playerOutId);
          if (fact.playerInId && !composition.playerIds.includes(fact.playerInId)) composition.playerIds.push(fact.playerInId);
        }
        if (fact.certainty === 'partial') { composition.certainty = 'partial'; composition.shortHanded = false; }
        if (composition.certainty === 'complete') composition.shortHanded = composition.playerIds.length < 5 || composition.shortHanded;
      }
    }
    if (fact.kind === 'tactical_context') {
      if (fact.active) flyingGoalkeeperTeams.add(fact.teamId);
      else flyingGoalkeeperTeams.delete(fact.teamId);
    }
  }
  const latestOperation = [...history].reverse().find((event): event is FutsalFactRegisteredEvent | FutsalFactCorrectedEvent =>
    (event.type === 'futsal_fact_registered' || event.type === 'futsal_fact_corrected') && !undone.has(event.id));
  const latestControl = [...facts].reverse().find(({ fact }) => fact.essentialCode || fact.kind === 'control' || fact.kind === 'tackle' || fact.kind === 'shot' && fact.outcome === 'goal')?.fact;
  const control: FutsalFact | undefined = latestControl?.essentialCode
    ? { id: latestControl.id, period: latestControl.period, elapsedMs: latestControl.elapsedMs, observation: 'partial', kind: 'control', state: 'unknown', coverage: 'suspended' }
    : latestControl?.kind === 'tackle'
    ? { id: latestControl.id, period: latestControl.period, elapsedMs: latestControl.elapsedMs, observation: latestControl.observation, ...(latestControl.position ? { position: latestControl.position } : {}), kind: 'control', state: 'team', controlledTeamId: latestControl.winningTeamId, coverage: 'continuous' }
    : latestControl?.kind === 'shot' && latestControl.outcome === 'goal'
      ? { id: latestControl.id, period: latestControl.period, elapsedMs: latestControl.elapsedMs, observation: latestControl.observation, ...(latestControl.position ? { position: latestControl.position } : {}), kind: 'control', state: 'dead_ball', coverage: 'continuous' }
    : latestControl;
  return { facts, score, accumulatedFouls, control, compositions, flyingGoalkeeperTeams: [...flyingGoalkeeperTeams], ...(latestOperation ? { undoTargetHistoryEventId: latestOperation.id } : {}) };
}

export function validateFutsalFact(fact: FutsalFact, teamIds: ReadonlySet<string>, playerIdsByTeam: ReadonlyMap<string, ReadonlySet<string>>): string | undefined {
  if (!Number.isFinite(fact.elapsedMs) || fact.elapsedMs < 0 || (fact.period !== 1 && fact.period !== 2)) return 'Tempo ou período inválido.';
  if (fact.position && (![fact.position.x, fact.position.y].every(Number.isFinite) || fact.position.x < 0 || fact.position.x > 1 || fact.position.y < 0 || fact.position.y > 1)) return 'A posição deve estar dentro da quadra.';
  if (fact.observation === 'not_observed' && fact.position) return 'Um fato não observado não pode conter posição inventada.';
  if (fact.essentialCode !== undefined) {
    const expected = fact.kind === 'shot' ? 'F' : fact.kind === 'chance_pass' ? 'PF' : fact.kind === 'pass' ? 'P' : fact.kind === 'progression' ? 'C' : fact.kind === 'possession_loss' ? 'PP' : fact.kind === 'ball_recovery' ? 'RP' : fact.kind === 'foul' ? 'FL' : fact.kind === 'restart' ? 'RE' : undefined;
    if (fact.essentialCode !== expected) return 'Código essencial incompatível com o fato.';
    const teamId = fact.kind === 'shot' ? fact.shootingTeamId : fact.kind === 'foul' ? fact.offendingTeamId : 'teamId' in fact ? fact.teamId : undefined;
    const outcome = fact.kind === 'shot' ? ({ goal: 'gol', saved: 'defesa', off_target: 'fora', blocked: 'bloqueada', post: 'trave' } as const)[fact.outcome as 'goal' | 'saved' | 'off_target' | 'blocked' | 'post'] : undefined;
    if (!teamId || fact.kind === 'shot' && fact.outcome === 'pending') return 'Finalização essencial exige resultado.';
    const invalid = validateEssentialDraft({
      code: fact.essentialCode, teamId,
      ...(fact.position ? { position: fact.position } : {}),
      ...('destination' in fact && fact.destination ? { destination: fact.destination } : {}),
      ...(outcome ? { outcome } : {}),
      ...((fact.kind === 'pass' || fact.kind === 'chance_pass') && fact.passResult ? { passResult: fact.passResult } : {}),
      ...(fact.kind === 'progression' ? { progressionType: fact.progressionType, progressionResult: fact.progressionResult } : {}),
      ...(fact.kind === 'foul' ? { foulAccumulated: fact.accumulated, ...(fact.card ? { foulCard: fact.card } : {}) } : {}),
      ...(fact.kind === 'restart' ? { restartType: fact.restart } : {}),
      ...(fact.essentialShirtNumber !== undefined ? { shirtNumber: fact.essentialShirtNumber } : {}),
      ...(fact.essentialThird !== undefined ? { third: fact.essentialThird } : {}),
      ...(fact.essentialThirdAnchor !== undefined ? { thirdAnchor: fact.essentialThirdAnchor } : {}),
      ...(fact.essentialQualifiers !== undefined ? { qualifiers: fact.essentialQualifiers } : {}),
    });
    if (invalid) return invalid;
  } else if (fact.kind === 'chance_pass' || fact.kind === 'pass' || fact.kind === 'progression' || fact.kind === 'possession_loss' || fact.kind === 'ball_recovery' ||
    fact.essentialShirtNumber !== undefined || fact.essentialThird !== undefined || fact.essentialThirdAnchor !== undefined || fact.essentialQualifiers !== undefined) return 'Fato essencial sem código.';
  const playerBelongsTo = (playerId: string | undefined, teamId: string) => !playerId || playerIdsByTeam.get(teamId)?.has(playerId) === true;
  if (fact.kind === 'chance_pass' || fact.kind === 'pass' || fact.kind === 'progression' || fact.kind === 'possession_loss' || fact.kind === 'ball_recovery') {
    if (!teamIds.has(fact.teamId) || !playerBelongsTo(fact.playerId, fact.teamId)) return 'Equipe ou atleta da ação essencial inválido.';
    if ('destination' in fact && fact.destination && (![fact.destination.x, fact.destination.y].every(Number.isFinite) || fact.destination.x < 0 || fact.destination.x > 1 || fact.destination.y < 0 || fact.destination.y > 1)) return 'Destino fora da quadra.';
  }
  if (fact.kind === 'control') {
    if (fact.observation === 'not_observed' && fact.controlledTeamId) return 'Controle de equipe não pode ser afirmado em trecho não observado.';
    if (fact.state === 'team' && (!fact.controlledTeamId || !teamIds.has(fact.controlledTeamId))) return 'Selecione a equipe com controle observado.';
    if (fact.state !== 'team' && fact.controlledTeamId !== undefined) return 'Controle de equipe não se aplica a este estado.';
  }
  if (fact.kind === 'shot') {
    if (!teamIds.has(fact.shootingTeamId) || !playerBelongsTo(fact.playerId, fact.shootingTeamId)) return 'Equipe ou atleta da finalização inválido.';
    if (fact.outcome === 'goal' ? !fact.beneficiaryTeamId || !teamIds.has(fact.beneficiaryTeamId) : fact.beneficiaryTeamId !== undefined) return 'Informe a equipe beneficiada somente para gol confirmado.';
    if (fact.destination && (![fact.destination.x, fact.destination.y].every(Number.isFinite) || fact.destination.x < 0 || fact.destination.x > 1 || fact.destination.y < 0 || fact.destination.y > 1)) return 'O destino deve estar dentro da quadra.';
    if (fact.destination && !fact.position) return 'O destino da finalização exige origem observada.';
  }
  if (fact.kind === 'tackle' && (!teamIds.has(fact.winningTeamId) || !teamIds.has(fact.losingTeamId) || fact.winningTeamId === fact.losingTeamId || !playerBelongsTo(fact.playerId, fact.winningTeamId) || fact.observation === 'not_observed')) return 'Desarme exige equipes distintas e vencedor observado.';
  if (fact.kind === 'restart' && (!(['kick_in', 'corner', 'goal_clearance', 'free_kick', 'ten_meter_kick', 'penalty', 'kick_off', 'other', 'unknown'] as const).includes(fact.restart) || fact.teamId !== undefined && !teamIds.has(fact.teamId) || fact.playerId !== undefined && (!fact.teamId || !playerBelongsTo(fact.playerId, fact.teamId)))) return 'Tipo, equipe ou atleta do reinício inválido.';
  if (fact.kind === 'foul' && fact.card !== undefined && fact.card !== 'yellow' && fact.card !== 'red') return 'Cartão inválido.';
  if (fact.kind === 'foul' && (!teamIds.has(fact.offendingTeamId) || !playerBelongsTo(fact.playerId, fact.offendingTeamId) || typeof fact.accumulated !== 'boolean')) return 'Equipe, atleta ou contagem da falta inválida.';
  if (fact.kind === 'score_adjustment' && (!teamIds.has(fact.beneficiaryTeamId) || !fact.reason.trim())) return 'Ajuste de placar requer equipe e justificativa.';
  if (fact.kind === 'composition') {
    if (!teamIds.has(fact.teamId) || fact.playerIds.length > 5 || new Set(fact.playerIds).size !== fact.playerIds.length || fact.playerIds.some(id => !playerBelongsTo(id, fact.teamId))) return 'Composição deve conter atletas únicos da equipe, até cinco.';
    if (fact.certainty === 'complete' && fact.playerIds.length < 5 && !fact.shortHanded) return 'Composição completa com menos de cinco atletas exige marcar inferioridade numérica.';
    if (fact.certainty === 'partial' && fact.shortHanded) return 'Inferioridade numérica só pode ser afirmada com composição completa.';
  }
  if (fact.kind === 'substitution') {
    if (!teamIds.has(fact.teamId) || (fact.playerOutId !== undefined && !playerBelongsTo(fact.playerOutId, fact.teamId)) || (fact.playerInId !== undefined && !playerBelongsTo(fact.playerInId, fact.teamId))) return 'Equipe ou atleta da substituição inválido.';
    if (fact.playerOutId && fact.playerInId && fact.playerOutId === fact.playerInId) return 'Atleta que sai e entra devem ser diferentes.';
    if (fact.certainty === 'complete' && (!fact.playerOutId || !fact.playerInId)) return 'Substituição completa exige identificar quem sai e quem entra.';
  }
  if (fact.kind === 'tactical_context' && !teamIds.has(fact.teamId)) return 'Equipe da situação tática inválida.';
  if (fact.kind === 'tactical_annotation') {
    if (fact.teamId !== undefined && !teamIds.has(fact.teamId)) return 'Equipe da anotação tática inválida.';
    if (fact.scope === 'event' ? !fact.targetFactId || fact.startFactId !== undefined || fact.endFactId !== undefined : !fact.startFactId || !fact.endFactId || fact.targetFactId !== undefined) return 'Vínculo da anotação tática inválido.';
    if (fact.removed !== true && ![fact.organization, fact.restartOrigin, fact.numericalSituation, fact.defensiveContext, fact.attackingStructure].some(value => value !== undefined)) return 'Selecione ao menos uma categoria tática observada.';
    if (fact.note !== undefined && fact.note.trim().length > 200) return 'A nota tática deve ter até 200 caracteres.';
  }
  return undefined;
}

export function validateFutsalFactReferences(fact: FutsalFact, facts: readonly ProjectedFutsalFact[]): string | undefined {
  if (fact.kind !== 'tactical_annotation') return undefined;
  const byId = new Map(facts.map(item => [item.fact.id, item]));
  const isReviewable = (id: string | undefined) => {
    if (!id) return undefined;
    const found = byId.get(id);
    return found && ['control', 'tackle', 'shot', 'restart', 'foul'].includes(found.fact.kind) ? found : undefined;
  };
  if (fact.scope === 'event') return isReviewable(fact.targetFactId) ? undefined : 'O lance vinculado não existe ou não pode receber revisão tática.';
  const start = isReviewable(fact.startFactId), end = isReviewable(fact.endFactId);
  if (!start || !end || start.fact.period !== end.fact.period || start.sequence > end.sequence) return 'O intervalo precisa começar e terminar em lances observados do mesmo período, na ordem correta.';
  return undefined;
}
