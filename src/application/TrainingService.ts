import type { TrainingSessionRepository } from './ports/repositories/TrainingSessionRepository';
import { ValidationError } from '../core/errors/ValidationError';
import { createEntityId } from '../core/ids/entityId';
import { failure, type Result, success } from '../core/result/Result';
import { RegisterScoutEventUseCase } from './use-cases/register-scout-event/RegisterScoutEventUseCase';
import {
  buildTrainingDashboard,
  type TrainingDashboardViewModel,
} from './view-models/TrainingDashboardViewModel';
import type { TrainingAttempt } from '../domain/training/attempts/TrainingAttempt';
import { TrainingComparator } from '../domain/training/comparator/TrainingComparator';
import type { TrainingSession } from '../domain/training/entities/TrainingSession';
import { ExerciseGenerator } from '../domain/training/exercises/ExerciseGenerator';
import type { TrainingExercise } from '../domain/training/exercises/TrainingExercise';
import {
  calculateTrainingPerformance,
  type TrainingPerformanceMetrics,
} from '../domain/training/metrics/TrainingPerformanceMetrics';
import { TimingEngine } from '../domain/training/timing/TimingEngine';
import type { ProfileRegistry } from '../profiles/ProfileRegistry';
import { ProfileResolver, type ResolvedProfileContext } from '../profiles/ProfileResolver';
import type { TrainingProfile } from '../profiles/types';
import type { RepositoryError } from '../core/errors/RepositoryError';
import type { ProfileError } from '../core/errors/ProfileError';
import { ContinuousInputController } from './input/ContinuousInputController';
import { tacticalValue } from '../domain/scout/tactical/TacticalMetadataAdapter';
import type { CanonicalScoutEventCandidate } from '../domain/scout/mapper/CanonicalScoutEventCandidate';
import { TacticalInputInterpreter } from '../domain/scout/input/TacticalInputInterpreter';
import type { ScoutEventMetadata } from '../domain/scout/events/ScoutEvent';
import type { CodeProfile } from '../profiles/types';
import { ParseError } from '../core/errors/ParseError';

export interface TrainingWorkspace {
  readonly session: TrainingSession;
  readonly currentExercise?: TrainingExercise;
  readonly metrics: TrainingPerformanceMetrics;
  readonly dashboard: TrainingDashboardViewModel;
}

export interface TrainingSubmission {
  readonly workspace: TrainingWorkspace;
  readonly attempt: TrainingAttempt;
}

export interface TrainingServiceDependencies {
  readonly createId: () => string;
  readonly now: () => number;
  readonly random: () => number;
}

const DEFAULT_DEPENDENCIES: TrainingServiceDependencies = {
  createId: createEntityId,
  now: Date.now,
  random: Math.random,
};

type TrainingServiceError = RepositoryError | ProfileError | ValidationError;

function tacticalDetails(candidate: CanonicalScoutEventCandidate): readonly unknown[] {
  const metadata = candidate.metadata;
  return [
    tacticalValue.skillType(metadata, candidate.skill),
    tacticalValue.originZoneId(metadata, candidate.skill),
    tacticalValue.targetZoneId(metadata, candidate.skill),
    tacticalValue.direction(metadata, candidate.skill),
    tacticalValue.setterCall(metadata),
    tacticalValue.attackCombination(metadata),
    tacticalValue.attackTempo(metadata),
    tacticalValue.blockersCount(metadata, candidate.skill),
  ];
}

interface TacticalTrainingField {
  readonly label: string;
  readonly token: string;
  readonly expected: unknown;
  readonly received: unknown;
}

function displayTacticalValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value) ?? '';
}

function sameTacticalValue(left: unknown, right: unknown): boolean {
  if (typeof left === 'string' && typeof right === 'string') {
    return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

function trainingParseMessage(error: ParseError | ValidationError): string {
  if (!(error instanceof ParseError)) return error.message;
  if (error.code === 'missing_token' && /evaluation/i.test(error.message)) {
    return 'Falta o símbolo de avaliação: use #, +, !, -, / ou =.';
  }
  if (error.code === 'unknown_evaluation') return 'O símbolo de avaliação não foi reconhecido.';
  if (error.code === 'unknown_skill') return 'O fundamento não foi reconhecido.';
  if (error.code === 'invalid_player') return 'O número do jogador é inválido.';
  if (error.code === 'trailing_input') return 'Há caracteres extras no código principal.';
  return 'O código principal não pôde ser interpretado.';
}

function tacticalTrainingFields(
  expected: CanonicalScoutEventCandidate,
  received?: CanonicalScoutEventCandidate,
): readonly TacticalTrainingField[] {
  const expectedMetadata = expected.metadata;
  const receivedMetadata = received?.metadata;
  return [
    {
      label: 'tipo do saque',
      token: 'y',
      expected: tacticalValue.skillType(expectedMetadata, expected.skill),
      received: received && tacticalValue.skillType(receivedMetadata, received.skill),
    },
    {
      label: 'zona de origem/contato',
      token: 'o',
      expected: tacticalValue.originZoneId(expectedMetadata, expected.skill),
      received: received && tacticalValue.originZoneId(receivedMetadata, received.skill),
    },
    {
      label: 'zona de destino',
      token: 't',
      expected: tacticalValue.targetZoneId(expectedMetadata, expected.skill),
      received: received && tacticalValue.targetZoneId(receivedMetadata, received.skill),
    },
    {
      label: 'chamada do central',
      token: 'l',
      expected: tacticalValue.setterCall(expectedMetadata),
      received: received && tacticalValue.setterCall(receivedMetadata),
    },
    {
      label: 'combinação de ataque',
      token: 'c',
      expected: tacticalValue.attackCombination(expectedMetadata),
      received: received && tacticalValue.attackCombination(receivedMetadata),
    },
    {
      label: 'tempo de ataque',
      token: 'q',
      expected: tacticalValue.attackTempo(expectedMetadata),
      received: received && tacticalValue.attackTempo(receivedMetadata),
    },
    {
      label: 'quantidade de bloqueadores',
      token: 'b',
      expected: tacticalValue.blockersCount(expectedMetadata, expected.skill),
      received: received && tacticalValue.blockersCount(receivedMetadata, received.skill),
    },
  ];
}

interface DecodedTrainingInput {
  readonly codes: readonly string[];
  readonly metadata: readonly (ScoutEventMetadata | undefined)[];
  readonly error?: string;
}

function metadataFromTacticalInput(
  raw: string,
  profile: CodeProfile,
  expectedEventCount: number,
): DecodedTrainingInput {
  const trimmed = raw.trim();
  if (!trimmed) return { codes: [], metadata: [], error: 'Digite um código.' };
  const hasStructuredInput = trimmed.includes(';') || /\s/.test(trimmed);
  if (!hasStructuredInput && expectedEventCount === 1) {
    return { codes: [trimmed], metadata: [undefined] };
  }
  if (!hasStructuredInput) {
    const controller = new ContinuousInputController(profile);
    const framed = controller.replace(trimmed);
    const finalFrame = controller.manualCommit();
    return {
      codes: [...framed.committedCodes, ...finalFrame.committedCodes],
      metadata: [],
    };
  }

  const segments = trimmed
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean);
  const interpreter = new TacticalInputInterpreter();
  const codes: string[] = [];
  const metadata: (ScoutEventMetadata | undefined)[] = [];
  for (const segment of segments) {
    const [code, ...tokens] = segment.split(/\s+/);
    if (!code) return { codes: [], metadata: [], error: 'Código principal ausente.' };
    codes.push(code);
    if (tokens.length === 0) {
      metadata.push(undefined);
      continue;
    }
    const interpreted = interpreter.interpret(tokens.join(' '), profile);
    if (!interpreted.ok) {
      return { codes: [], metadata: [], error: interpreted.error.message };
    }
    const values = interpreted.value;
    const derivedDirection =
      values.originZoneId && values.targetZoneId
        ? `Z${values.originZoneId}→Z${values.targetZoneId}`
        : values.direction;
    metadata.push({
      captureDraft: {
        ...(values.originZoneId ? { origin: { zoneId: values.originZoneId } } : {}),
        ...(values.targetZoneId ? { target: { zoneId: values.targetZoneId } } : {}),
        ...(derivedDirection ? { direction: derivedDirection } : {}),
        captureMethod: 'typed',
        ...(values.skillType ? { skillType: values.skillType } : {}),
        ...(values.setterCall ? { setterCall: values.setterCall } : {}),
        ...(values.combination ? { combination: values.combination } : {}),
        ...(values.tempo ? { tempo: values.tempo } : {}),
        ...(values.blockers !== undefined ? { blockersCount: values.blockers } : {}),
      },
    });
  }
  return { codes, metadata };
}

function tacticalTrainingErrors(
  expected: readonly CanonicalScoutEventCandidate[],
  received: readonly (CanonicalScoutEventCandidate | undefined)[],
): readonly { type: 'tactical'; code: string; message: string }[] {
  return expected.flatMap((event, index) => {
    return tacticalTrainingFields(event, received[index]).flatMap((field) => {
      if (field.expected === undefined || sameTacticalValue(field.received, field.expected)) {
        return [];
      }
      const expectedToken = `${field.token}${displayTacticalValue(field.expected)}`;
      return [
        {
          type: 'tactical' as const,
          code: `contact_${index + 1}_${field.label.replaceAll(' ', '_')}`,
          message:
            field.received === undefined
              ? `Falta ${field.label}: acrescente ${expectedToken}.`
              : `${field.label} diferente: use ${expectedToken} (recebido ${field.token}${displayTacticalValue(field.received)}).`,
        },
      ];
    });
  });
}

function tacticalDetailAudit(
  expected: readonly CanonicalScoutEventCandidate[],
  received: readonly (CanonicalScoutEventCandidate | undefined)[],
): { captured: number; expected: number } {
  let expectedCount = 0;
  let captured = 0;
  expected.forEach((event, eventIndex) => {
    const expectedValues = tacticalDetails(event);
    const receivedValues = received[eventIndex] ? tacticalDetails(received[eventIndex]) : [];
    expectedValues.forEach((value, detailIndex) => {
      if (value === undefined) return;
      expectedCount += 1;
      if (sameTacticalValue(receivedValues[detailIndex], value)) captured += 1;
    });
  });
  return { captured, expected: expectedCount };
}

export class TrainingService {
  private readonly resolver: ProfileResolver;
  private readonly generator: ExerciseGenerator;
  private readonly comparator = new TrainingComparator();
  private readonly timing = new TimingEngine();

  constructor(
    private readonly sessions: TrainingSessionRepository,
    private readonly profiles: ProfileRegistry,
    private readonly dependencies = DEFAULT_DEPENDENCIES,
  ) {
    this.resolver = new ProfileResolver(profiles);
    this.generator = new ExerciseGenerator(dependencies);
  }

  listProfiles(): readonly TrainingProfile[] {
    return this.profiles.list('training');
  }

  async listSessions(): Promise<Result<readonly TrainingSession[], RepositoryError>> {
    const result = await this.sessions.list();
    return result.ok
      ? success([...result.value].sort((a, b) => b.startedAt - a.startedAt))
      : result;
  }

  async startSession(profileId: string): Promise<Result<TrainingWorkspace, TrainingServiceError>> {
    const resolved = this.resolveTrainingProfiles(profileId);
    if (!resolved.ok) return failure(resolved.error);
    const trainingProfile = resolved.value.trainingProfile;
    if (!trainingProfile) return failure(new ValidationError('Training profile is missing.', []));
    const now = this.dependencies.now();
    const session: TrainingSession = {
      id: this.dependencies.createId(),
      profileId: trainingProfile.id,
      profileVersion: trainingProfile.version,
      complexityProfileId: resolved.value.complexityProfile.id,
      ...(resolved.value.competitionProfile
        ? { competitionProfileId: resolved.value.competitionProfile.id }
        : {}),
      startedAt: now,
      currentExerciseStartedAt: now,
      currentExerciseIndex: 0,
      status: 'active',
      exercises: this.generator.generate(
        trainingProfile,
        resolved.value.codeProfile,
        resolved.value.complexityProfile,
      ),
      attempts: [],
    };
    const saved = await this.sessions.save(session);
    return saved.ok ? success(this.workspace(session)) : failure(saved.error);
  }

  async loadSession(sessionId: string): Promise<Result<TrainingWorkspace, TrainingServiceError>> {
    const result = await this.sessions.findById(sessionId);
    if (!result.ok) return failure(result.error);
    return result.value
      ? success(this.workspace(result.value))
      : failure(new ValidationError('Training session was not found.', []));
  }

  async submit(
    sessionId: string,
    rawInput: string,
  ): Promise<Result<TrainingSubmission, TrainingServiceError>> {
    const loaded = await this.loadSession(sessionId);
    if (!loaded.ok) return loaded;
    const { session, currentExercise } = loaded.value;
    if (!currentExercise || session.status === 'completed') {
      return failure(new ValidationError('Training session is already completed.', []));
    }
    const resolved = this.resolveTrainingProfiles(session.profileId);
    if (!resolved.ok) return failure(resolved.error);
    const submittedAt = this.dependencies.now();
    const expectedEvents = currentExercise.expectedEvents ?? [currentExercise.expectedEvent];
    const decoded = metadataFromTacticalInput(
      rawInput,
      resolved.value.codeProfile,
      expectedEvents.length,
    );
    const codes = decoded.codes;
    const registrations = codes.map((code, index) =>
      new RegisterScoutEventUseCase().execute({
        rawCode: code,
        profiles: resolved.value,
        context: {
          matchId: session.id,
          rallyId: currentExercise.id,
          teamId: 'training_team',
          setNumber: 1,
          scoreBefore: { teamA: 0, teamB: 0 },
          sequence: index + 1,
          previousSequence: index,
          roster: [...new Set(expectedEvents.map((event) => event.playerNumber))].map((number) => ({
            id: `training_player_${number}`,
            teamId: 'training_team',
            number,
          })),
        },
        ...(decoded.metadata[index] ? { metadata: decoded.metadata[index] } : {}),
      }),
    );
    const receivedEvents = registrations.flatMap((registered, index) =>
      registered.ok
        ? [
            {
              playerNumber: Number(registered.value.normalizedCode.slice(0, 2)),
              skill: registered.value.event.skill,
              evaluation: registered.value.event.evaluation ?? '',
              outcome: registered.value.event.outcome ?? '',
              rawCode: codes[index] ?? '',
              normalizedCode: registered.value.normalizedCode,
              ...(registered.value.event.metadata
                ? { metadata: registered.value.event.metadata }
                : {}),
            } satisfies CanonicalScoutEventCandidate,
          ]
        : [],
    );
    const failed = registrations.find((registered) => !registered.ok);
    const tacticalReceivedEvents = expectedEvents.map((expected, index) => {
      const received = receivedEvents[index];
      if (received) return received;
      const metadata = decoded.metadata[index];
      return metadata ? { ...expected, metadata } : undefined;
    });
    const coreComparison =
      expectedEvents.length === 1
        ? this.comparator.compare(
            expectedEvents[0] ?? currentExercise.expectedEvent,
            receivedEvents[0],
            decoded.error
              ? { code: 'invalid_tactical_input', message: decoded.error }
              : failed && !failed.ok
                ? { code: 'invalid_scout_code', message: trainingParseMessage(failed.error) }
                : codes.length === 0
                  ? { code: 'invalid_scout_code', message: 'O código não pôde ser enquadrado.' }
                  : undefined,
          )
        : this.comparator.compareSequence(expectedEvents, receivedEvents);
    const tacticalErrors = tacticalTrainingErrors(expectedEvents, tacticalReceivedEvents);
    const comparison = {
      correct: coreComparison.correct && tacticalErrors.length === 0,
      errors: [...coreComparison.errors, ...tacticalErrors],
    };
    const detailAudit = tacticalDetailAudit(expectedEvents, tacticalReceivedEvents);
    const attempt: TrainingAttempt = {
      id: this.dependencies.createId(),
      exerciseId: currentExercise.id,
      expectedEvent: currentExercise.expectedEvent,
      ...(receivedEvents[0] ? { receivedEvent: receivedEvents[0] } : {}),
      receivedEvents,
      rawInput,
      correct: comparison.correct,
      startedAt: session.currentExerciseStartedAt,
      submittedAt,
      durationMs: this.timing.duration(session.currentExerciseStartedAt, submittedAt),
      complete:
        registrations.length > 0 &&
        registrations.every(
          (registered) =>
            registered.ok && registered.value.event.completeness?.status === 'complete',
        ),
      tacticalDetailsCaptured: detailAudit.captured,
      tacticalDetailsExpected: detailAudit.expected,
      errors: comparison.errors,
    };
    const nextIndex = comparison.correct
      ? session.currentExerciseIndex + 1
      : session.currentExerciseIndex;
    const completed = comparison.correct && nextIndex >= session.exercises.length;
    const updated: TrainingSession = {
      ...session,
      attempts: [...session.attempts, attempt],
      currentExerciseIndex: nextIndex,
      currentExerciseStartedAt: submittedAt,
      status: completed ? 'completed' : 'active',
      ...(completed ? { completedAt: submittedAt } : {}),
    };
    const saved = await this.sessions.save(updated);
    return saved.ok
      ? success({ workspace: this.workspace(updated), attempt })
      : failure(saved.error);
  }

  async continueSession(
    sessionId: string,
  ): Promise<Result<TrainingWorkspace, TrainingServiceError>> {
    const loaded = await this.loadSession(sessionId);
    if (!loaded.ok) return loaded;
    if (loaded.value.session.status === 'completed') return loaded;
    const updated: TrainingSession = {
      ...loaded.value.session,
      currentExerciseStartedAt: this.dependencies.now(),
    };
    const saved = await this.sessions.save(updated);
    return saved.ok ? success(this.workspace(updated)) : failure(saved.error);
  }

  private workspace(session: TrainingSession): TrainingWorkspace {
    const metrics = calculateTrainingPerformance(session.attempts);
    return {
      session,
      ...(session.status === 'active'
        ? { currentExercise: session.exercises[session.currentExerciseIndex] }
        : {}),
      metrics,
      dashboard: buildTrainingDashboard(metrics),
    };
  }

  private resolveTrainingProfiles(profileId: string): Result<ResolvedProfileContext, ProfileError> {
    const training = this.profiles.resolve('training', profileId);
    if (!training.ok) return failure(training.error);
    return this.resolver.resolve({
      code: { id: 'default_compact_v1', version: '1.0.0' },
      complexity: { id: training.value.complexityProfileId },
      training: { id: training.value.id, version: training.value.version },
      ...(training.value.competitionProfileId
        ? { competition: { id: training.value.competitionProfileId } }
        : {}),
    });
  }
}
