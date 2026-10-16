import type { MarkovLink, MarkovNode } from '../analytics/MarkovGraph';
import { classifyBasketballShotZone, type BasketballShotZone } from './BasketballGeometry';
import type { BasketballFact, BasketballTactic } from './BasketballScout';

type CourtEventPoint = { xNorm: number; yNorm: number; weight: number; type: 'point' | 'error' | 'rally'; label?: string };
type CourtVector = { from: [number, number]; to: [number, number]; outcome: 'kill' | 'error' | 'rally'; label?: string; count?: number };

export type BasketballCreationTrigger =
  | 'pick_roll'
  | 'drive_kick'
  | 'isolation'
  | 'low_post'
  | 'cut_spot_up'
  | 'fluid_direct';

export interface BasketballTacticalPossession {
  readonly id: string;
  readonly teamId: string;
  readonly period: number;
  readonly rhythm: 'transition' | 'set_offense';
  readonly trigger: BasketballCreationTrigger;
  readonly triggerRaw?: BasketballTactic;
  readonly zone: BasketballShotZone | 'turnover' | 'unknown';
  readonly outcome: 'made' | 'missed' | 'blocked' | 'turnover';
  readonly points: number;
  readonly factId: string;
  readonly factIds: readonly string[];
  readonly playerId?: string;
  readonly assistPlayerId?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly originPosition?: { readonly x: number; readonly y: number };
}

export interface BasketballTacticalModel {
  readonly teamId: string;
  readonly sampleCount: number;
  readonly totalPoints: number;
  readonly pointsPerPossession: number;
  readonly effectiveFieldGoalPercentage: number;
  readonly fieldGoalPercentage: number;
  readonly turnoversCount: number;
  readonly nodes: readonly MarkovNode[];
  readonly links: readonly MarkovLink[];
  readonly vectors: readonly CourtVector[];
  readonly courtEvents: readonly CourtEventPoint[];
  readonly zoneSummary: readonly { zone: BasketballShotZone; name: string; total: number; made: number; missed: number; points: number; fgPercent: number }[];
  readonly coachBriefing: {
    readonly sampleCount: number;
    readonly totalPoints: number;
    readonly ppp: number;
    readonly madeCount: number;
    readonly missedCount: number;
    readonly turnoversCount: number;
    readonly narrative: string;
  };
}

const TRIGGER_LABELS: Record<BasketballCreationTrigger, string> = {
  pick_roll: 'Pick & Roll / Pop',
  drive_kick: 'Infiltração / Kick',
  isolation: '1v1 Isolamento',
  low_post: 'Poste Baixo / Garrafão',
  cut_spot_up: 'Corte / Chute Spot-up',
  fluid_direct: 'Ação Fluida / Direta',
};

const ZONE_LABELS: Record<BasketballShotZone | 'turnover' | 'unknown', string> = {
  rim: 'Aro (< 2m)',
  paint: 'Garrafão',
  mid_range: 'Meia Distância',
  corner_3: '3PT Zona Morta',
  arc_3: '3PT Perímetro',
  turnover: 'Perda de Posse',
  unknown: 'Local não observado',
};

function normalizeTrigger(tactic?: BasketballTactic): BasketballCreationTrigger {
  if (!tactic) return 'fluid_direct';
  if (tactic === 'pick_roll' || tactic === 'pick_pop') return 'pick_roll';
  if (tactic === 'drive_kick') return 'drive_kick';
  if (tactic === 'isolation') return 'isolation';
  if (tactic === 'low_post') return 'low_post';
  if (['cut', 'give_and_go', 'spot_up', 'handoff', 'off_ball_screen'].includes(tactic)) return 'cut_spot_up';
  return 'fluid_direct';
}

/**
 * Extracts tactical sequences from raw basketball facts for a team.
 */
export function extractBasketballTacticalPossessions(
  facts: readonly BasketballFact[],
  teamId: string
): BasketballTacticalPossession[] {
  const result: BasketballTacticalPossession[] = [];
  let current: BasketballFact[] = [];
  const finish = (terminal: BasketballFact, outcome: BasketballTacticalPossession['outcome']) => {
    if (!current.length || current[0].teamId !== teamId) { current = []; return; }
    const first = current[0];
    const shot = [...current].reverse().find((fact) => fact.kind === 'shot');
    const recordedTactic = current.find((fact) => 'tactic' in fact && fact.tactic);
    const triggerRaw = recordedTactic && 'tactic' in recordedTactic ? recordedTactic.tactic : undefined;
    const rhythmFact = current.find((fact) => fact.rhythm);
    const points = current.reduce((sum, fact) => sum + (fact.kind === 'shot' && fact.outcome === 'made' ? fact.value : 0), 0);
    result.push({
      id: first.id, teamId, period: first.period,
      rhythm: rhythmFact?.rhythm === 'transition' || triggerRaw === 'transition' ? 'transition' : 'set_offense',
      trigger: normalizeTrigger(triggerRaw), triggerRaw,
      zone: outcome === 'turnover' ? 'turnover' : shot?.position ? classifyBasketballShotZone(shot.position) : 'unknown',
      outcome, points, factId: terminal.id, factIds: current.map((fact) => fact.id),
      playerId: shot?.playerId ?? terminal.playerId,
      ...(shot?.kind === 'shot' ? { assistPlayerId: shot.assistPlayerId } : {}),
      position: shot?.position ?? terminal.position,
      originPosition: shot?.originPosition ?? terminal.originPosition,
    });
    current = [];
  };

  for (const fact of facts) {
    if (current.length && fact.period !== current[0].period) current = [];
    if (fact.kind === 'possession') current = [];
    if (fact.kind === 'rebound' && fact.side === 'defensive') {
      if (current.length && current[0].teamId !== fact.teamId) {
        const lastShot = [...current].reverse().find((item) => item.kind === 'shot');
        if (lastShot?.kind === 'shot' && lastShot.outcome !== 'made') finish(lastShot, lastShot.outcome);
        else current = [];
      } else current = [];
    }
    if (current.length && fact.teamId !== current[0].teamId) {
      if (fact.kind === 'foul') continue;
      current = [];
    }
    current.push(fact);
    if (fact.kind === 'turnover') finish(fact, 'turnover');
    else if (fact.kind === 'shot' && fact.outcome === 'made' && fact.possessionEnds !== false) finish(fact, 'made');
  }

  return result;
}

/**
 * Summarizes observed basketball possessions, shot positions, and tactical sequences.
 */
export function analyzeBasketballTacticalMarkov(
  facts: readonly BasketballFact[],
  teamId: string,
  filter?: { readonly period?: number; readonly playerId?: string; readonly selectedNodeId?: string }
): BasketballTacticalModel {
  let possessions = extractBasketballTacticalPossessions(facts, teamId);

  if (filter?.period) {
    possessions = possessions.filter((p) => p.period === filter.period);
  }
  if (filter?.playerId) {
    possessions = possessions.filter((p) => p.playerId === filter.playerId);
  }
  const visiblePossessions = filter?.selectedNodeId
    ? possessions.filter((possession) => {
      const node = filter.selectedNodeId;
      return node === `rhythm_${possession.rhythm}` ||
        node === `trigger_${possession.trigger}` || node === `zone_${possession.zone}`;
    })
    : possessions;
  const visibleFactIds = filter?.selectedNodeId
    ? new Set(visiblePossessions.flatMap((possession) => possession.factIds))
    : undefined;

  const sampleCount = possessions.length;
  const fieldGoals = facts.filter((fact): fact is Extract<BasketballFact, { kind: 'shot' }> => fact.teamId === teamId && fact.kind === 'shot' && fact.value !== 1 && (filter?.period === undefined || fact.period === filter.period) && (filter?.playerId === undefined || fact.playerId === filter.playerId));
  const madeShots = fieldGoals.filter((fact) => fact.outcome === 'made');
  const totalPoints = possessions.reduce((sum, p) => sum + p.points, 0);
  const turnoversCount = possessions.filter((p) => p.outcome === 'turnover').length;
  const made3Count = madeShots.filter((fact) => fact.value === 3).length;

  const pointsPerPossession = sampleCount > 0 ? totalPoints / sampleCount : 0;
  const fieldGoalPercentage = fieldGoals.length > 0 ? (madeShots.length / fieldGoals.length) * 100 : 0;
  const effectiveFieldGoalPercentage =
    fieldGoals.length > 0 ? ((madeShots.length + 0.5 * made3Count) / fieldGoals.length) * 100 : 0;
  const zoneSummary = (['rim', 'paint', 'mid_range', 'corner_3', 'arc_3'] as const).map((zone) => {
    const attempts = fieldGoals.filter((fact) => (!visibleFactIds || visibleFactIds.has(fact.id)) && fact.position && classifyBasketballShotZone(fact.position) === zone);
    const made = attempts.filter((fact) => fact.outcome === 'made');
    return {
      zone, name: ZONE_LABELS[zone], total: attempts.length, made: made.length,
      missed: attempts.length - made.length,
      points: made.reduce((sum, fact) => sum + fact.value, 0),
      fgPercent: attempts.length ? Math.round(made.length / attempts.length * 100) : 0,
    };
  }).filter((item) => item.total > 0);

  // 1. Build Markov Nodes
  const nodes: MarkovNode[] = [];
  const links: MarkovLink[] = [];

  // Stage 1: Rhythm (Transition vs Set Offense)
  const transitions = possessions.filter((p) => p.rhythm === 'transition');
  const setOffenses = possessions.filter((p) => p.rhythm === 'set_offense');

  if (transitions.length > 0 || sampleCount === 0) {
    const transPoints = transitions.reduce((s, p) => s + p.points, 0);
    const transPpp = transitions.length > 0 ? transPoints / transitions.length : 0;
    nodes.push({
      id: 'rhythm_transition',
      stage: 1,
      title: 'Transição Rápida',
      subtitle: `${transitions.length} posses · ${transPoints} pts`,
      sampleN: transitions.length,
      rate: transPpp,
      rateLabel: 'PPP',
      status: transPpp >= 1.05 ? 'positive' : transPpp >= 0.85 ? 'neutral' : 'warning',
    });
  }

  if (setOffenses.length > 0 || sampleCount === 0) {
    const setPoints = setOffenses.reduce((s, p) => s + p.points, 0);
    const setPpp = setOffenses.length > 0 ? setPoints / setOffenses.length : 0;
    nodes.push({
      id: 'rhythm_set_offense',
      stage: 1,
      title: 'Ataque Posicionado',
      subtitle: `${setOffenses.length} posses · ${setPoints} pts`,
      sampleN: setOffenses.length,
      rate: setPpp,
      rateLabel: 'PPP',
      status: setPpp >= 0.95 ? 'positive' : setPpp >= 0.80 ? 'neutral' : 'warning',
    });
  }

  // Stage 2: Advantage Triggers
  const triggers: BasketballCreationTrigger[] = [
    'pick_roll',
    'drive_kick',
    'isolation',
    'low_post',
    'cut_spot_up',
    'fluid_direct',
  ];

  for (const trig of triggers) {
    const subset = possessions.filter((p) => p.trigger === trig);
    if (subset.length === 0) continue;

    const trigPoints = subset.reduce((s, p) => s + p.points, 0);
    const trigPpp = trigPoints / subset.length;
    const trigMade = subset.filter((p) => p.outcome === 'made').length;
    const trigRate = Math.round((trigMade / subset.length) * 100);

    nodes.push({
      id: `trigger_${trig}`,
      stage: 2,
      title: TRIGGER_LABELS[trig],
      subtitle: `${subset.length} ações · ${trigPoints} pts`,
      sampleN: subset.length,
      rate: trigRate,
      rateLabel: '% Acerto',
      status: trigPpp >= 1.05 ? 'positive' : trigPpp >= 0.80 ? 'neutral' : 'warning',
    });

    // Link from Stage 1 to Stage 2
    for (const rId of ['rhythm_transition', 'rhythm_set_offense'] as const) {
      const rhythmKey = rId === 'rhythm_transition' ? 'transition' : 'set_offense';
      const rSub = subset.filter((p) => p.rhythm === rhythmKey);
      if (rSub.length > 0) {
        const parentTotal = rId === 'rhythm_transition' ? transitions.length : setOffenses.length;
        const prob = parentTotal > 0 ? rSub.length / parentTotal : 0;
        const rMade = rSub.filter((p) => p.outcome === 'made').length;
        const linkType = rMade / rSub.length >= 0.5 ? 'kill' : rMade > 0 ? 'rally' : 'error';

        links.push({
          fromId: rId,
          toId: `trigger_${trig}`,
          volume: rSub.length,
          probability: prob,
          type: linkType,
        });
      }
    }
  }

  // Stage 3: Zones and Outcomes
  const zones: (BasketballShotZone | 'turnover' | 'unknown')[] = [
    'rim',
    'paint',
    'mid_range',
    'corner_3',
    'arc_3',
    'turnover',
    'unknown',
  ];

  for (const z of zones) {
    const subset = possessions.filter((p) => p.zone === z);
    if (subset.length === 0) continue;

    const zPoints = subset.reduce((s, p) => s + p.points, 0);
    const zMade = subset.filter((p) => p.outcome === 'made').length;
    const zRate = z === 'turnover' ? 0 : Math.round((zMade / subset.length) * 100);

    nodes.push({
      id: `zone_${z}`,
      stage: 3,
      title: ZONE_LABELS[z],
      subtitle: z === 'turnover' ? `${subset.length} perdas de posse` : `${zMade}/${subset.length} cestas (${zPoints} pts)`,
      sampleN: subset.length,
      rate: zRate,
      rateLabel: z === 'turnover' ? 'Erros' : '% Conversão',
      status: z === 'turnover' ? 'negative' : zRate >= 50 ? 'positive' : zRate >= 35 ? 'neutral' : 'warning',
    });

    // Links from Stage 2 (Triggers) to Stage 3 (Zones)
    for (const trig of triggers) {
      const tSub = subset.filter((p) => p.trigger === trig);
      if (tSub.length > 0) {
        const parentTotal = possessions.filter((p) => p.trigger === trig).length;
        const prob = parentTotal > 0 ? tSub.length / parentTotal : 0;
        const madeCount = tSub.filter((p) => p.outcome === 'made').length;
        const linkType = z === 'turnover'
          ? 'error'
          : madeCount / tSub.length >= 0.5
            ? 'kill'
            : madeCount > 0
              ? 'rally'
              : 'error';

        links.push({
          fromId: `trigger_${trig}`,
          toId: `zone_${z}`,
          volume: tSub.length,
          probability: prob,
          type: linkType,
        });
      }
    }
  }

  // 2. Show each observed field goal, including misses followed by offensive rebounds.
  const vectors: CourtVector[] = [];
  const courtEvents: CourtEventPoint[] = [];

  for (const shot of fieldGoals) {
    if (visibleFactIds && !visibleFactIds.has(shot.id)) continue;
    if (!shot.position) continue;

    const toNorm: [number, number] = [shot.position.x, shot.position.y];
    const fromNorm: [number, number] | undefined = shot.originPosition
      ? [shot.originPosition.x, shot.originPosition.y]
      : undefined;

    const made = shot.outcome === 'made';
    const zone = classifyBasketballShotZone(shot.position);

    if (fromNorm) vectors.push({
      from: fromNorm,
      to: toNorm,
      outcome: made ? 'kill' : 'error',
      label: `${ZONE_LABELS[zone]} · ${made ? `Cesta de ${shot.value}` : shot.outcome === 'blocked' ? 'Toco' : 'Arremesso errado'}`,
      count: 1,
    });

    courtEvents.push({
      xNorm: shot.position.x,
      yNorm: shot.position.y,
      weight: made ? 1.6 : 1.0,
      type: made ? 'point' : 'error',
      label: `${ZONE_LABELS[zone]} · ${made ? `Cesta de ${shot.value}` : shot.outcome === 'blocked' ? 'Toco' : 'Arremesso errado'}`,
    });
  }

  // 3. Automated Coach Briefing Narrative
  const bestTrigger = triggers
    .map((trig) => {
      const sub = possessions.filter((p) => p.trigger === trig);
      const pts = sub.reduce((s, p) => s + p.points, 0);
      return { trig, count: sub.length, ppp: sub.length > 0 ? pts / sub.length : 0 };
    })
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.ppp - a.ppp)[0];

  const rimShots = fieldGoals.filter((shot) => shot.position && classifyBasketballShotZone(shot.position) === 'rim');
  const rimMade = rimShots.filter((shot) => shot.outcome === 'made').length;
  const rimEfficiency = rimShots.length > 0 ? Math.round((rimMade / rimShots.length) * 100) : 0;

  const bestTrigText = bestTrigger
    ? `O gatilho mais produtivo foi o ${TRIGGER_LABELS[bestTrigger.trig]} (${bestTrigger.ppp.toFixed(2)} PPP em ${bestTrigger.count} jogadas).`
    : 'Amostra inicial distribuída entre os gatilhos.';
  const rimText = rimShots.length > 0
    ? ` Na área do aro, a conversão foi de ${rimEfficiency}% (${rimMade}/${rimShots.length}).`
    : '';
  const turnoverText = turnoversCount > 0
    ? ` Atenção às ${turnoversCount} perdas de posse (${Math.round((turnoversCount / sampleCount) * 100)}% das posses).`
    : ' Nenhuma perda de posse registrada.';
  const narrative = sampleCount === 0
    ? 'Nenhuma posse completa registrada para esta equipe até o momento.'
    : `Eficiência global de ${pointsPerPossession.toFixed(2)} PPP com eFG de ${Math.round(effectiveFieldGoalPercentage)}%. ${bestTrigText}${rimText}${turnoverText}`;

  return {
    teamId,
    sampleCount,
    totalPoints,
    pointsPerPossession,
    effectiveFieldGoalPercentage,
    fieldGoalPercentage,
    turnoversCount,
    nodes,
    links,
    vectors,
    courtEvents,
    zoneSummary,
    coachBriefing: {
      sampleCount,
      totalPoints,
      ppp: pointsPerPossession,
      madeCount: madeShots.length,
      missedCount: fieldGoals.length - madeShots.length,
      turnoversCount,
      narrative,
    },
  };
}
