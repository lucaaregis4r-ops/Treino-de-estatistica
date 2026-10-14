import type { MatchEvent } from '../match/events/MatchEvent';
export type BasketballTactic = 'pick_roll' | 'pick_pop' | 'low_post' | 'isolation' | 'cut' | 'give_and_go' | 'drive_kick' | 'transition' | 'handoff' | 'spot_up' | 'off_ball_screen' | 'putback' | 'other';
export type BasketballPressure = 'none' | 'on_ball' | 'half_court' | 'full_court' | 'trap';
type FactContext = { readonly teamId: string; readonly playerId?: string; readonly position?: Point; readonly gameSeconds?: number; readonly shotSeconds?: number; readonly pressure?: BasketballPressure };
export type BasketballFactDraft =
  | (FactContext & { readonly kind: 'shot'; readonly value: 1 | 2 | 3; readonly outcome: 'made' | 'missed' | 'blocked'; readonly tactic?: BasketballTactic; readonly assistPlayerId?: string; readonly possessionEnds?: boolean })
  | (FactContext & { readonly kind: 'turnover'; readonly cause: 'bad_pass' | 'lost_ball' | 'violation' | 'offensive_foul' | 'other'; readonly tactic?: BasketballTactic })
  | (FactContext & { readonly kind: 'rebound'; readonly side: 'offensive' | 'defensive'; readonly rimTouched?: boolean })
  | (FactContext & { readonly kind: 'foul'; readonly category: 'personal' | 'technical' | 'unsportsmanlike' })
  | (FactContext & { readonly kind: 'tactic'; readonly tactic: BasketballTactic })
  | (FactContext & { readonly kind: 'pass'; readonly receiverId?: string })
  | (FactContext & { readonly kind: 'possession' });
export interface Point { readonly x: number; readonly y: number }
export type BasketballFact = BasketballFactDraft & { readonly id: string; readonly period: number; readonly timestamp: number };
export interface BasketballProjection { readonly facts: readonly BasketballFact[]; readonly score: Readonly<Record<string, number>>; readonly undoTargetHistoryEventId?: string }
export function validateBasketballFact(fact: BasketballFact, teamIds: ReadonlySet<string>, playerTeams: ReadonlyMap<string, string>): string | undefined {
  if (typeof fact.id !== 'string' || !fact.id || !Number.isSafeInteger(fact.period) || fact.period < 1 || fact.period > 10 || !Number.isFinite(fact.timestamp)) return 'Período ou identificação inválidos.';
  if (!teamIds.has(fact.teamId)) return 'Equipe inválida.';
  if (fact.playerId && playerTeams.get(fact.playerId) !== fact.teamId) return 'Atleta não pertence à equipe.';
  if (fact.position && (!Number.isFinite(fact.position.x) || !Number.isFinite(fact.position.y) || fact.position.x < 0 || fact.position.x > 1 || fact.position.y < 0 || fact.position.y > 1)) return 'Posição fora da quadra.';
  if (fact.gameSeconds !== undefined && (!Number.isInteger(fact.gameSeconds) || fact.gameSeconds < 0 || fact.gameSeconds > (fact.period <= 4 ? 600 : 300))) return 'Tempo do quarto inválido.';
  if (fact.shotSeconds !== undefined && (!Number.isInteger(fact.shotSeconds) || fact.shotSeconds < 0 || fact.shotSeconds > 24)) return 'Relógio de arremesso inválido.';
  if (fact.pressure && !['none', 'on_ball', 'half_court', 'full_court', 'trap'].includes(fact.pressure)) return 'Pressão defensiva inválida.';
  const tactics: readonly string[] = ['pick_roll', 'pick_pop', 'low_post', 'isolation', 'cut', 'give_and_go', 'drive_kick', 'transition', 'handoff', 'spot_up', 'off_ball_screen', 'putback', 'other'];
  if (fact.kind === 'tactic' && (!('tactic' in fact) || !fact.tactic)) return 'Ação tática inválida.';
  if ('tactic' in fact && fact.tactic && !tactics.includes(fact.tactic)) return 'Ação tática inválida.';
  if (fact.kind === 'shot' && (![1, 2, 3].includes(fact.value) || !['made', 'missed', 'blocked'].includes(fact.outcome))) return 'Finalização inválida.';
  if (fact.kind === 'shot' && fact.possessionEnds !== undefined && typeof fact.possessionEnds !== 'boolean') return 'Fim de posse inválido.';
  if (fact.kind === 'shot' && fact.assistPlayerId && (fact.outcome !== 'made' || playerTeams.get(fact.assistPlayerId) !== fact.teamId || fact.assistPlayerId === fact.playerId)) return 'Assistência inválida.';
  if (fact.kind === 'pass' && fact.receiverId && (playerTeams.get(fact.receiverId) !== fact.teamId || fact.receiverId === fact.playerId)) return 'Destino do passe inválido.';
  if (fact.kind === 'turnover' && !['bad_pass', 'lost_ball', 'violation', 'offensive_foul', 'other'].includes(fact.cause)) return 'Perda de posse inválida.';
  if (fact.kind === 'rebound' && !['offensive', 'defensive'].includes(fact.side)) return 'Rebote inválido.';
  if (fact.kind === 'rebound' && fact.rimTouched !== undefined && typeof fact.rimTouched !== 'boolean') return 'Contato com o aro inválido.';
  if (fact.kind === 'foul' && !['personal', 'technical', 'unsportsmanlike'].includes(fact.category)) return 'Falta inválida.';
  if (!['shot', 'turnover', 'rebound', 'foul', 'tactic', 'pass', 'possession'].includes(fact.kind)) return 'Tipo de lance inválido.';
  return undefined;
}
export interface BasketballPossession { readonly teamId: string; readonly period: number; readonly startSeconds?: number; readonly endSeconds?: number; readonly duration?: number; readonly points: number; readonly pressure?: BasketballPressure; readonly complete: boolean; readonly endedBy?: 'basket' | 'turnover' | 'defensive_rebound' | 'manual' }
export function basketballPossessions(facts: readonly BasketballFact[], teamIds: readonly string[]): BasketballPossession[] {
  const result: BasketballPossession[] = [];
  let current: BasketballPossession | undefined;
  const other = (id: string) => teamIds.find(team => team !== id);
  for (const fact of facts) {
    if (fact.kind === 'rebound' && fact.side === 'defensive' && current && current.teamId !== fact.teamId && current.period === fact.period && !current.complete) {
      const duration = current.startSeconds !== undefined && fact.gameSeconds !== undefined && current.startSeconds >= fact.gameSeconds ? current.startSeconds - fact.gameSeconds : undefined;
      result[result.length - 1] = { ...current, endSeconds: fact.gameSeconds, duration, complete: true, endedBy: 'defensive_rebound' };
      current = undefined;
    }
    if (current && !current.complete && current.period === fact.period && current.teamId !== fact.teamId) {
      const duration = current.startSeconds !== undefined && fact.gameSeconds !== undefined && current.startSeconds >= fact.gameSeconds ? current.startSeconds - fact.gameSeconds : undefined;
      result[result.length - 1] = { ...current, endSeconds: fact.gameSeconds, duration, complete: true, endedBy: 'manual' };
      current = undefined;
    }
    if (!current || current.period !== fact.period || current.teamId !== fact.teamId || fact.kind === 'possession') {
      if (current && !current.complete) result[result.length - 1] = { ...current, complete: false };
      current = { teamId: fact.teamId, period: fact.period, startSeconds: fact.kind === 'possession' || (fact.kind === 'rebound' && fact.side === 'defensive') ? fact.gameSeconds : undefined, points: 0, pressure: fact.pressure, complete: false };
      result.push(current);
    }
    if (fact.pressure && fact.pressure !== 'none') current = { ...current, pressure: fact.pressure };
    if (fact.kind === 'shot' && fact.outcome === 'made') current = { ...current, points: current.points + fact.value };
    const ended = fact.kind === 'turnover' || (fact.kind === 'shot' && fact.outcome === 'made' && fact.possessionEnds !== false);
    if (ended) {
      const duration = current.startSeconds !== undefined && fact.gameSeconds !== undefined && current.startSeconds >= fact.gameSeconds ? current.startSeconds - fact.gameSeconds : undefined;
      result[result.length - 1] = { ...current, endSeconds: fact.gameSeconds, duration, complete: true, endedBy: fact.kind === 'turnover' ? 'turnover' : 'basket' };
      current = other(fact.teamId) ? { teamId: other(fact.teamId)!, period: fact.period, startSeconds: fact.gameSeconds, points: 0, complete: false } : undefined;
      if (current) result.push(current);
    } else result[result.length - 1] = current;
  }
  return result;
}
export function projectBasketball(events: readonly MatchEvent[]): BasketballProjection {
  const active = new Map<string, BasketballFact>();
  const operations: { id: string; type: 'register' | 'correct'; factId: string; previous?: BasketballFact }[] = [];
  const undone = new Set<string>();
  for (const event of events) {
    if (event.type === 'basketball_fact_registered') { active.set(event.fact.id, event.fact); operations.push({ id: event.id, type: 'register', factId: event.fact.id }); }
    if (event.type === 'basketball_fact_corrected') { const previous = active.get(event.targetFactId); if (previous) { active.set(event.targetFactId, event.replacementFact); operations.push({ id: event.id, type: 'correct', factId: event.targetFactId, previous }); } }
    if (event.type === 'basketball_fact_undone') { const operation = operations.find(item => item.id === event.targetHistoryEventId); if (operation && !undone.has(operation.id)) { undone.add(operation.id); if (operation.type === 'register') active.delete(operation.factId); else if (operation.previous) active.set(operation.factId, operation.previous); } }
  }
  const facts = [...active.values()];
  const score: Record<string, number> = {};
  for (const fact of facts) if (fact.kind === 'shot' && fact.outcome === 'made') score[fact.teamId] = (score[fact.teamId] ?? 0) + fact.value;
  return { facts, score, undoTargetHistoryEventId: [...operations].reverse().find(item => !undone.has(item.id))?.id };
}
