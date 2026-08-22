import type { CodeProfile, ComplexityProfile, TrainingProfile } from '../../../profiles/types';
import type { Skill } from '../../scout/entities/Skill';
import type { ScoutEventMetadata } from '../../scout/events/ScoutEvent';
import type { CanonicalScoutEventCandidate } from '../../scout/mapper/CanonicalScoutEventCandidate';
import type { TrainingExercise, TrainingExerciseKind } from './TrainingExercise';

export interface ExerciseGeneratorDependencies {
  readonly createId: () => string;
  readonly random: () => number;
}

const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  serve: 'Saque',
  reception: 'Recepção',
  set: 'Levantamento',
  attack: 'Ataque',
  block: 'Bloqueio',
  dig: 'Defesa',
  free_ball: 'Free ball',
};

const EVALUATION_LABELS: Readonly<Record<string, string>> = {
  excellent: 'Excelente / ponto',
  positive: 'Positiva',
  neutral: 'Continuidade',
  negative: 'Negativa',
  very_negative: 'Muito negativa',
  error: 'Erro',
  ace: 'Ace',
  point: 'Ponto',
  perfect: 'Perfeita',
  blocked: 'Bloqueado',
};

const SKILL_EVALUATION_LABELS: Readonly<Partial<Record<Skill, Readonly<Record<string, string>>>>> =
  {
    serve: {
      '#': 'Ace',
      '+': 'Saque positivo',
      '!': 'Recepção limitada',
      '-': 'Recepção perfeita do rival',
      '/': 'Free ball do rival',
      '=': 'Erro de saque',
    },
    reception: {
      '#': 'Perfeita: todas as opções',
      '+': 'Boa',
      '!': 'Limitada aos 3 m',
      '-': 'Negativa',
      '/': 'Devolvida/overpass',
      '=': 'Erro de recepção',
    },
    set: {
      '#': 'Ataque contra 0–1 bloqueador',
      '+': 'Levantamento jogável',
      '=': 'Erro de levantamento',
    },
    attack: {
      '#': 'Ponto',
      '+': 'Defesa rival sem combinação',
      '!': 'Ataque coberto',
      '-': 'Defendido',
      '/': 'Bloqueado',
      '=': 'Erro de ataque',
    },
    block: {
      '#': 'Ponto de bloqueio',
      '+': 'Toque com contra-ataque',
      '!': 'Cobertura do rival',
      '/': 'Violação de rede',
      '=': 'Block-out/erro',
    },
    dig: {
      '#': 'Defesa com contra-ataque',
      '+': 'Defesa positiva',
      '/': 'Bola devolvida ao rival',
      '=': 'Erro de defesa',
    },
  };

function evaluationLabel(
  skill: Skill,
  evaluationCode: string,
  event: CanonicalScoutEventCandidate,
) {
  return (
    SKILL_EVALUATION_LABELS[skill]?.[evaluationCode] ??
    EVALUATION_LABELS[event.outcome] ??
    EVALUATION_LABELS[event.evaluation] ??
    event.evaluation
  );
}

export const ADVANCED_EXERCISE_KINDS = Object.freeze([
  'serve_zones',
  'serve_direction',
  'reception',
  'attack_direction',
  'setter_call',
  'attack_combination',
  'rotation',
  'full_rally',
] as const satisfies readonly TrainingExerciseKind[]);

type TrainingRole = 'central' | 'oposto' | 'ponteiro' | 'levantador' | 'líbero';

const ROLE_LABELS: Readonly<Record<TrainingRole, string>> = {
  central: 'Central',
  oposto: 'Oposto',
  ponteiro: 'Ponteiro',
  levantador: 'Levantador',
  líbero: 'Líbero',
};

function roleFor(skill: Skill, index: number): TrainingRole | undefined {
  if (skill === 'attack' || skill === 'block') {
    return (['central', 'oposto', 'ponteiro'] as const)[index % 3] ?? 'ponteiro';
  }
  if (skill === 'set') return 'levantador';
  if (skill === 'reception' || skill === 'dig') return index % 2 === 0 ? 'líbero' : 'ponteiro';
  return undefined;
}

function attackOrigin(role: TrainingRole | undefined): string {
  if (role === 'central') return '3';
  if (role === 'oposto') return '2';
  return '4';
}

function skillForKind(kind: TrainingExerciseKind, fallback: Skill): Skill {
  if (kind === 'serve_zones' || kind === 'serve_direction') return 'serve';
  if (kind === 'reception') return 'reception';
  if (kind === 'setter_call') return 'set';
  if (kind === 'attack_direction' || kind === 'attack_combination' || kind === 'full_rally') {
    return 'attack';
  }
  return fallback;
}

function metadataFor(
  kind: TrainingExerciseKind,
  skill: Skill,
  playerNumber: number,
  level: ComplexityProfile['level'],
  role: TrainingRole | undefined,
): ScoutEventMetadata | undefined {
  if (level === 'basic' || level === 'operational') return undefined;
  const target = String(((playerNumber + 2) % 6) + 1);
  const origin = skill === 'attack' ? attackOrigin(role) : String((playerNumber % 6) + 1);
  const trajectory =
    skill === 'serve'
      ? { target: { zoneId: target }, captureMethod: 'typed' as const }
      : {
          origin: { zoneId: origin },
          target: { zoneId: target },
          direction: `Z${origin}→Z${target}`,
          captureMethod: 'derived' as const,
        };
  const serveType = ['Q', 'M', 'H', 'T'][playerNumber % 4] ?? 'Q';
  const setterCall = ['K1', 'K7', 'K2', 'KD'][playerNumber % 4] ?? 'K1';
  const attackCombination = ['X5', 'V5', 'X6', 'V6', 'XP', 'VP'][playerNumber % 6] ?? 'X5';
  const tactical = {
    rotation: (playerNumber % 6) + 1,
    setterPosition: 1,
    phase: kind === 'full_rally' ? ('transition' as const) : ('sideout' as const),
    ...(skill === 'serve' ? { trajectory, serve: { serveType, trajectory } } : {}),
    ...(skill === 'reception'
      ? { reception: { contactLocation: { zoneId: origin }, grade: 'A' as const } }
      : {}),
    ...(skill === 'set'
      ? {
          set: {
            setterCall,
            targetLocation: { zoneId: target },
          },
        }
      : {}),
    ...(skill === 'attack'
      ? {
          trajectory,
          attack: {
            trajectory,
            combination: attackCombination,
            tempo: attackCombination.startsWith('X') ? '1' : '3',
            blockersCount: 1,
          },
        }
      : {}),
    ...(skill === 'block' ? { block: { blockersCount: 1 } } : {}),
    ...(skill === 'dig'
      ? { trajectory: { origin: { zoneId: origin }, captureMethod: 'typed' as const } }
      : {}),
    ...(skill === 'free_ball' ? { trajectory } : {}),
  };
  return {
    schemaVersion: '2.0.0',
    tactical,
    transition: kind === 'full_rally' ? 'first_ball' : 'none',
  };
}

function details(kind: TrainingExerciseKind, metadata?: ScoutEventMetadata): readonly string[] {
  const tactical = metadata?.tactical;
  const trajectory =
    tactical?.serve?.trajectory ?? tactical?.attack?.trajectory ?? tactical?.trajectory;
  const base = [
    tactical?.serve?.serveType && `Tipo de saque ${tactical.serve.serveType}`,
    trajectory?.origin?.zoneId && `Zona inicial Z${trajectory.origin.zoneId}`,
    trajectory?.target?.zoneId && `Zona final Z${trajectory.target.zoneId}`,
    trajectory?.direction && `Trajetória ${trajectory.direction}`,
    tactical?.reception?.grade && `Qualidade de recepção ${tactical.reception.grade}`,
    tactical?.reception?.contactLocation?.zoneId &&
      `Contato da recepção Z${tactical.reception.contactLocation.zoneId}`,
    tactical?.set?.setterCall && `Chamada do central ${tactical.set.setterCall}`,
    tactical?.set?.targetLocation?.zoneId &&
      `Destino do levantamento Z${tactical.set.targetLocation.zoneId}`,
    tactical?.attack?.combination && `Combinação de ataque ${tactical.attack.combination}`,
    tactical?.attack?.blockersCount !== undefined &&
      `Bloqueio enfrentado ${tactical.attack.blockersCount}`,
    tactical?.block?.blockersCount !== undefined && `Bloqueadores ${tactical.block.blockersCount}`,
  ].filter((value): value is string => Boolean(value));
  return kind === 'full_rally' ? ['Recepção → levantamento → ataque', ...base] : base;
}

function codeFor(skill: Skill, evaluationCode: string, playerNumber: number, profile: CodeProfile) {
  const skillCode = Object.entries(profile.skills).find(([, mapped]) => mapped === skill)?.[0];
  if (!skillCode) throw new Error(`Code profile does not support ${skill}.`);
  return `${String(playerNumber).padStart(2, '0')}${skillCode}${evaluationCode}`;
}

function candidate(
  skill: Skill,
  evaluationCode: string,
  playerNumber: number,
  profile: CodeProfile,
  metadata?: ScoutEventMetadata,
): CanonicalScoutEventCandidate {
  const evaluation = profile.evaluations[evaluationCode] ?? 'excellent';
  const outcome = profile.outcomeMappings?.[skill]?.[evaluationCode] ?? evaluation;
  const rawCode = codeFor(skill, evaluationCode, playerNumber, profile);
  return {
    playerNumber,
    skill,
    evaluation,
    outcome,
    rawCode,
    normalizedCode: rawCode,
    ...(metadata ? { metadata } : {}),
  };
}

function tacticalTokens(event: CanonicalScoutEventCandidate): readonly string[] {
  const tactical = event.metadata?.tactical;
  const trajectory =
    tactical?.serve?.trajectory ?? tactical?.attack?.trajectory ?? tactical?.trajectory;
  return [
    tactical?.serve?.serveType && `y${tactical.serve.serveType}`,
    trajectory?.origin?.zoneId && `o${trajectory.origin.zoneId}`,
    trajectory?.target?.zoneId && `t${trajectory.target.zoneId}`,
    tactical?.reception?.contactLocation?.zoneId && `o${tactical.reception.contactLocation.zoneId}`,
    tactical?.set?.setterCall && `l${tactical.set.setterCall}`,
    tactical?.set?.targetLocation?.zoneId && `t${tactical.set.targetLocation.zoneId}`,
    tactical?.attack?.combination && `c${tactical.attack.combination}`,
    tactical?.attack?.tempo && `q${tactical.attack.tempo}`,
    tactical?.attack?.blockersCount !== undefined && `b${tactical.attack.blockersCount}`,
    tactical?.block?.blockersCount !== undefined && `b${tactical.block.blockersCount}`,
  ].filter((value): value is string => Boolean(value));
}

function trainingCode(event: CanonicalScoutEventCandidate): string {
  const tokens = tacticalTokens(event);
  return tokens.length > 0 ? `${event.normalizedCode} ${tokens.join(' ')}` : event.normalizedCode;
}

function inputHint(events: readonly CanonicalScoutEventCandidate[]): string {
  if (events.length > 1)
    return 'Separe os contatos com ; e acrescente os detalhes após cada código.';
  const skill = events[0]?.skill;
  if (skill === 'serve') return 'Código + tipo (yQ/yM/yH/yT) + destino (t).';
  if (skill === 'reception')
    return 'Código de recepção + zona de contato (o). A qualidade é o símbolo final.';
  if (skill === 'set') return 'Código + chamada do central (l) + zona de destino (t).';
  if (skill === 'attack')
    return 'Código + combinação (c) + origem (o) + destino (t) + tempo (q) + bloqueadores (b).';
  if (skill === 'block') return 'Código de bloqueio + número de bloqueadores (b).';
  if (skill === 'dig' || skill === 'free_ball')
    return 'Código + zona de contato (o) e, se houver, destino (t).';
  return 'Digite jogador, fundamento e avaliação.';
}

export class ExerciseGenerator {
  constructor(private readonly dependencies: ExerciseGeneratorDependencies) {}

  generate(
    trainingProfile: TrainingProfile,
    codeProfile: CodeProfile,
    complexityProfile: ComplexityProfile,
  ): readonly TrainingExercise[] {
    const count = trainingProfile.exerciseCount ?? 10;
    const supportedSkills = trainingProfile.enabledSkills.filter((skill) =>
      Object.values(codeProfile.skills).includes(skill),
    );
    const evaluationCodes = Object.keys(codeProfile.evaluations);
    const advanced =
      complexityProfile.level === 'tactical' || complexityProfile.level === 'advanced';

    return Array.from({ length: count }, (_, index) => {
      const playerNumber = 1 + Math.floor(this.dependencies.random() * 18);
      const kind: TrainingExerciseKind = advanced
        ? (ADVANCED_EXERCISE_KINDS[index % ADVANCED_EXERCISE_KINDS.length] ?? 'code')
        : 'code';
      const fallback = supportedSkills[index % supportedSkills.length];
      if (!fallback)
        throw new Error('Training profile has no skills supported by the code profile.');
      const skill = skillForKind(kind, fallback);
      const evaluationCode = evaluationCodes[index % evaluationCodes.length] ?? '#';
      const role = roleFor(skill, index);
      const eventMetadata = metadataFor(kind, skill, playerNumber, complexityProfile.level, role);
      const expectedEvents =
        kind === 'full_rally'
          ? (['reception', 'set', 'attack'] as const).map((rallySkill, contactIndex) => {
              const contactPlayerNumber = ((playerNumber + contactIndex - 1) % 18) + 1;
              return candidate(
                rallySkill,
                evaluationCode,
                contactPlayerNumber,
                codeProfile,
                metadataFor(
                  kind,
                  rallySkill,
                  contactPlayerNumber,
                  complexityProfile.level,
                  roleFor(rallySkill, index),
                ),
              );
            })
          : [candidate(skill, evaluationCode, playerNumber, codeProfile, eventMetadata)];
      const expectedEvent = expectedEvents[expectedEvents.length - 1] ?? expectedEvents[0];
      if (!expectedEvent) throw new Error('Training exercise could not be generated.');
      return {
        id: this.dependencies.createId(),
        kind,
        playerNumber,
        playerLabel: kind === 'full_rally' ? 'Rally com 3 contatos' : `Jogador ${playerNumber}`,
        ...(role && kind !== 'full_rally' ? { playerRoleLabel: ROLE_LABELS[role] } : {}),
        skillLabel: kind === 'full_rally' ? 'Rally completo' : SKILL_LABELS[skill],
        evaluationLabel: evaluationLabel(skill, evaluationCode, expectedEvent),
        expectedCode: expectedEvents.map(trainingCode).join(' ; '),
        expectedEvent,
        expectedEvents,
        promptDetails: details(kind, eventMetadata),
        inputHint: inputHint(expectedEvents),
        ...(eventMetadata ? { metadata: eventMetadata } : {}),
      };
    });
  }
}
