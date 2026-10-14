import { matchEventSequence, type MatchEvent } from '../../match/events/MatchEvent';
import { projectFutsalScout, type FutsalFact, type FutsalScoutProjection, type ProjectedFutsalFact } from '../../futsal/FutsalScout';
import { coverageFor, uniqueReasons, type ObservedBoundary, type ObservedSequence, type ObservedSequenceProjection, type ObservedStep, type SequenceCensorReason } from './ObservedSequence';

type ClockEvent = Extract<MatchEvent, { type: 'futsal_clock_changed' }>;
type TimelineItem = { readonly order: number; readonly period: 1 | 2; readonly fact: ProjectedFutsalFact } | { readonly order: number; readonly period: 1 | 2; readonly clock: ClockEvent };
type Open = { readonly teamId: string; readonly period: 1 | 2; readonly start: ObservedBoundary; readonly steps: ObservedStep[]; readonly reasons: SequenceCensorReason[]; adjustedSinceLastFact: boolean; lastFactTime?: number };

function teamFor(fact: FutsalFact): string | undefined {
  switch (fact.kind) {
    case 'control': return fact.state === 'team' ? fact.controlledTeamId : undefined;
    case 'shot': return fact.shootingTeamId;
    case 'tackle': return fact.winningTeamId;
    case 'restart': case 'composition': case 'substitution': case 'tactical_context': case 'chance_pass': case 'pass': case 'progression': case 'possession_loss': case 'ball_recovery': return fact.teamId;
    case 'foul': return fact.offendingTeamId;
    case 'tactical_annotation': return fact.teamId;
    case 'score_adjustment': return fact.beneficiaryTeamId;
  }
}

function factStep(item: ProjectedFutsalFact): ObservedStep {
  const fact = item.fact;
  const teamId = teamFor(fact);
  return {
    sourceId: fact.id, effectiveHistoryId: item.sourceEventId, order: item.sequence,
    kind: fact.kind, role: fact.kind === 'control' || fact.kind === 'tackle' ? 'control' : ['composition', 'substitution', 'tactical_context', 'tactical_annotation', 'score_adjustment'].includes(fact.kind) ? 'context' : 'action',
    ...(teamId ? { teamId } : {}), elapsedMs: fact.elapsedMs,
    ...(fact.position ? { position: fact.position } : {}),
    ...((fact.kind === 'shot' || fact.kind === 'chance_pass' || fact.kind === 'pass' || fact.kind === 'progression') && fact.destination ? { destination: fact.destination } : {}),
  };
}

function clockStep(event: ClockEvent): ObservedStep {
  return { sourceId: event.id, effectiveHistoryId: event.id, order: matchEventSequence(event), kind: `clock:${event.command}`, role: 'context', elapsedMs: event.elapsedMs };
}

/** Replays only effective facts; corrections and undo can rebuild every boundary. */
export function projectFutsalObservedSequences(matchId: string, events: readonly MatchEvent[], projection: FutsalScoutProjection = projectFutsalScout(events)): ObservedSequenceProjection {
  const timeline: TimelineItem[] = [
    ...projection.facts.map(fact => ({ order: fact.sequence, period: fact.fact.period, fact })),
    ...events.filter((event): event is ClockEvent => event.type === 'futsal_clock_changed').map(clock => ({ order: matchEventSequence(clock), period: clock.period, clock })),
  ].sort((a, b) => a.order - b.order);
  const units: ObservedSequence[] = [];
  const unassigned: ObservedStep[] = [];
  let open: Open | undefined;

  function begin(teamId: string, period: 1 | 2, step: ObservedStep, reason: string, missingStart = false) {
    open = { teamId, period, start: { sourceId: step.sourceId, reason, elapsedMs: step.elapsedMs }, steps: [step], reasons: missingStart ? ['missing_start'] : [], adjustedSinceLastFact: false, lastFactTime: step.elapsedMs };
  }
  function add(step: ObservedStep) {
    if (!open) { unassigned.push(step); return; }
    if (step.role !== 'context' || !step.kind.startsWith('clock:')) {
      if (step.elapsedMs !== undefined && open.lastFactTime !== undefined && step.elapsedMs < open.lastFactTime && !open.adjustedSinceLastFact) open.reasons.push('invalid_order');
      open.lastFactTime = step.elapsedMs;
      open.adjustedSinceLastFact = false;
    }
    open.steps.push(step);
  }
  function close(end: ObservedBoundary | undefined, outcome: string | undefined, extraReasons: readonly SequenceCensorReason[] = []) {
    if (!open) return;
    const reasons = uniqueReasons([...open.reasons, ...extraReasons, ...(!end ? ['missing_end' as const] : [])]);
    const coverage = coverageFor(reasons);
    const participants = [...new Set([open.teamId, ...open.steps.flatMap(step => step.teamId ? [step.teamId] : [])])];
    units.push({
      unitId: `futsal:${matchId}:${open.period}:${encodeURIComponent(open.teamId)}:${encodeURIComponent(open.start.sourceId ?? '')}`,
      sport: 'futsal', matchId, context: { kind: 'period', number: open.period }, teamId: open.teamId,
      participantTeamIds: participants, steps: [...open.steps], start: open.start,
      ...(end ? { end } : {}), ...(outcome ? { outcome } : {}),
      coverage, censorReasons: reasons, eligibleForOutcome: coverage === 'complete' && Boolean(outcome),
    });
    open = undefined;
  }

  for (const item of timeline) {
    const step = 'fact' in item ? factStep(item.fact) : clockStep(item.clock);
    if (open && open.period !== item.period) close({ sourceId: step.sourceId, reason: 'period_boundary', elapsedMs: step.elapsedMs }, 'period_boundary', ['period_boundary']);
    if ('clock' in item) {
      if (open) {
        add(step);
        if (item.clock.command === 'adjust' || item.clock.command === 'reconcile') open.adjustedSinceLastFact = true;
        if (item.clock.command === 'finish_period' || item.clock.command === 'advance_period') close({ sourceId: step.sourceId, reason: 'period_boundary', elapsedMs: step.elapsedMs }, 'period_boundary', ['period_boundary']);
      } else unassigned.push(step);
      continue;
    }
    const fact = item.fact.fact;
    if (fact.essentialCode) {
      if (open) { add(step); close({ sourceId: step.sourceId, reason: 'suspended', elapsedMs: step.elapsedMs }, 'suspended', ['suspended']); }
      else unassigned.push(step);
      continue;
    }
    if (fact.kind === 'tactical_annotation' || fact.kind === 'score_adjustment') { unassigned.push(step); continue; }
    if (fact.kind === 'control') {
      if (fact.coverage === 'suspended') {
        if (open) { add(step); close({ sourceId: step.sourceId, reason: 'suspended', elapsedMs: step.elapsedMs }, 'suspended', ['suspended']); }
        else unassigned.push(step);
        continue;
      }
      if (fact.state === 'team' && fact.controlledTeamId) {
        if (open && open.teamId !== fact.controlledTeamId) close({ sourceId: step.sourceId, reason: 'turnover', elapsedMs: step.elapsedMs, teamId: fact.controlledTeamId }, 'turnover');
        if (!open) begin(fact.controlledTeamId, fact.period, step, 'observed_control');
        else add(step);
      } else if (open) {
        add(step);
        const reason = fact.state === 'dead_ball' ? 'dead_ball' : fact.state === 'contested' ? 'contested' : 'unknown_control';
        close({ sourceId: step.sourceId, reason, elapsedMs: step.elapsedMs }, reason, fact.state === 'unknown' ? ['unknown_control'] : []);
      } else unassigned.push(step);
      continue;
    }
    if (fact.kind === 'tackle') {
      if (open && open.teamId === fact.losingTeamId) { add(step); close({ sourceId: step.sourceId, reason: 'turnover', elapsedMs: step.elapsedMs, teamId: fact.winningTeamId }, 'turnover'); }
      else {
        if (open) close({ sourceId: step.sourceId, reason: 'conflicting_control', elapsedMs: step.elapsedMs }, 'conflicting_control', ['conflicting_terminal']);
        begin(fact.losingTeamId, fact.period, step, 'unattributed_tackle', true);
        close({ sourceId: step.sourceId, reason: 'turnover', elapsedMs: step.elapsedMs, teamId: fact.winningTeamId }, 'turnover');
      }
      begin(fact.winningTeamId, fact.period, step, 'observed_tackle');
      continue;
    }
    if (fact.kind === 'shot') {
      if (!open) begin(fact.shootingTeamId, fact.period, step, 'unattributed_shot', true);
      else { if (open.teamId !== fact.shootingTeamId) open.reasons.push('conflicting_terminal'); add(step); }
      if (fact.outcome === 'goal') close({ sourceId: step.sourceId, reason: 'goal', elapsedMs: step.elapsedMs, ...(fact.beneficiaryTeamId ? { teamId: fact.beneficiaryTeamId } : {}) }, 'goal');
      continue;
    }
    if (fact.kind === 'restart' || fact.kind === 'foul') {
      if (open) { add(step); close({ sourceId: step.sourceId, reason: fact.kind, elapsedMs: step.elapsedMs }, fact.kind); }
      else unassigned.push(step);
      continue;
    }
    add(step);
  }
  close(undefined, undefined);
  return { units, unassigned };
}
