import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { TrainingWorkspace } from '../../../application/TrainingService';
import type { TrainingAttempt } from '../../../domain/training/attempts/TrainingAttempt';
import type { TrainingSession } from '../../../domain/training/entities/TrainingSession';
import { formatTrainingSequence } from '../../../domain/training/exercises/TrainingCode';
import type { TrainingProfile } from '../../../profiles/types';

interface TrainingScreenProps {
  readonly profiles: readonly TrainingProfile[];
  readonly sessions: readonly TrainingSession[];
  readonly workspace?: TrainingWorkspace;
  readonly feedback?: TrainingAttempt;
  readonly busy: boolean;
  readonly onBack: () => void;
  readonly onStart: (profileId: string) => Promise<void>;
  readonly onResume: (sessionId: string) => Promise<void>;
  readonly onSubmit: (rawInput: string) => Promise<void>;
  readonly onContinue: () => Promise<void>;
  readonly onReset: () => void;
  readonly onManual: () => void;
}

export function TrainingScreen({
  profiles,
  sessions,
  workspace,
  feedback,
  busy,
  onBack,
  onStart,
  onResume,
  onSubmit,
  onContinue,
  onReset,
  onManual,
}: TrainingScreenProps) {
  const [selectedProfile, setSelectedProfile] = useState(profiles[0]?.id ?? '');
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackActionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!workspace) return;
    if (feedback) feedbackActionRef.current?.focus();
    else inputRef.current?.focus();
  }, [workspace, feedback]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || busy || feedback) return;
    await onSubmit(input);
    setInput('');
  }

  if (!workspace) {
    return (
      <section className="page-section training-setup" aria-labelledby="training-title">
        <div className="section-heading">
          <div>
            <h1 id="training-title">Treino situação → código</h1>
            <p className="section-support">
              Treino de códigos de vôlei. O registro de futebol é feito diretamente na partida.
            </p>
          </div>
          <button className="button ghost" type="button" onClick={onBack}>
            Voltar
          </button>
        </div>
        <div className="training-profile-grid">
          {profiles.map((profile) => (
            <label key={profile.id} className={selectedProfile === profile.id ? 'selected' : ''}>
              <input
                type="radio"
                name="training-profile"
                checked={selectedProfile === profile.id}
                onChange={() => setSelectedProfile(profile.id)}
              />
              <span>
                <strong>{profile.name}</strong>
                <small>
                  {profile.exerciseCount ?? 10} exercícios · meta{' '}
                  {profile.targetAccuracy ? `${profile.targetAccuracy * 100}%` : 'livre'}
                </small>
              </span>
            </label>
          ))}
        </div>
        <button
          className="button primary training-start"
          type="button"
          disabled={!selectedProfile || busy}
          onClick={() => void onStart(selectedProfile)}
        >
          Começar treino
        </button>
        {sessions.length > 0 && (
          <section className="training-history">
            <p className="eyebrow">Histórico local</p>
            <h2>Sessões anteriores</h2>
            <ul>
              {sessions.slice(0, 6).map((session) => (
                <li key={session.id}>
                  <span>
                    <strong>
                      {profiles.find((profile) => profile.id === session.profileId)?.name ??
                        session.profileId}
                    </strong>
                    <small>
                      {session.attempts.filter((attempt) => attempt.correct).length}/
                      {session.attempts.length} acertos
                    </small>
                  </span>
                  <button type="button" onClick={() => void onResume(session.id)}>
                    {session.status === 'active' ? 'Continuar' : 'Ver resumo'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
    );
  }

  const { session, currentExercise, dashboard } = workspace;
  if (session.status === 'completed') {
    return (
      <section className="page-section training-results" aria-labelledby="results-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sessão concluída</p>
            <h1 id="results-title">Resultado do treino</h1>
          </div>
          <button className="button ghost" type="button" onClick={onBack}>
            Início
          </button>
        </div>
        <div className="training-metrics">
          <article>
            <small>Precisão</small>
            <strong>{dashboard.accuracy}</strong>
          </article>
          <article>
            <small>Tempo médio</small>
            <strong>{dashboard.averageTime}</strong>
          </article>
          <article>
            <small>Mediana</small>
            <strong>{dashboard.medianTime}</strong>
          </article>
          <article>
            <small>Eventos/min</small>
            <strong>{dashboard.eventsPerMinute}</strong>
          </article>
          <article>
            <small>Completude</small>
            <strong>{dashboard.completeness}</strong>
          </article>
          <article>
            <small>Taxa de correção</small>
            <strong>{dashboard.correctionRate}</strong>
          </article>
          <article>
            <small>Correções</small>
            <strong>{dashboard.corrections}</strong>
          </article>
          <article>
            <small>Detalhamento tático</small>
            <strong>{dashboard.tacticalDetailRate}</strong>
          </article>
        </div>
        <div className="training-result-grid">
          <section>
            <p className="eyebrow">Erros por componente</p>
            <ul className="error-breakdown">
              {dashboard.errorCounts.map((error) => (
                <li key={error.label}>
                  <span>{error.label}</span>
                  <strong>{error.value}</strong>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="eyebrow">Tentativas</p>
            <ol className="attempt-history">
              {session.attempts.map((attempt, index) => (
                <li key={attempt.id} className={attempt.correct ? 'correct' : 'incorrect'}>
                  <span>{index + 1}</span>
                  <code>{attempt.rawInput}</code>
                  <small>
                    {attempt.correct
                      ? 'Correto'
                      : attempt.errors.map((error) => error.type).join(', ')}
                  </small>
                  <time>{(attempt.durationMs / 1000).toFixed(1)}s</time>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <button className="button primary" type="button" onClick={onReset}>
          Novo treino
        </button>
      </section>
    );
  }

  const feedbackExercise = feedback
    ? session.exercises.find((exercise) => exercise.id === feedback.exerciseId)
    : undefined;
  const feedbackExpectedEvents =
    feedbackExercise?.expectedEvents ?? (feedback ? [feedback.expectedEvent] : []);
  const completeExpectedCode = formatTrainingSequence(feedbackExpectedEvents);

  return (
    <section className="training-session" aria-labelledby="exercise-title">
      <header className="training-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Sair do treino">
          ←
        </button>
        <div>
          <p className="eyebrow">Sessão ativa</p>
          <strong>
            {session.currentExerciseIndex + 1} / {session.exercises.length}
          </strong>
        </div>
        <div className="training-live-metrics">
          <span>
            Precisão <strong>{dashboard.accuracy}</strong>
          </span>
          <span>
            Média <strong>{dashboard.averageTime}</strong>
          </span>
          <span>
            Completude <strong>{dashboard.completeness}</strong>
          </span>
          <span>
            Detalhes <strong>{dashboard.tacticalDetailRate}</strong>
          </span>
        </div>
      </header>
      <main className="exercise-stage">
        {feedback ? (
          <div className={feedback.correct ? 'feedback-card correct' : 'feedback-card incorrect'}>
            <p className="eyebrow">{feedback.correct ? 'Resposta correta' : 'Revisar código'}</p>
            <h2>{feedback.correct ? 'Código correto' : 'Código incorreto'}</h2>
            <div className="training-answer-comparison">
              <p>
                <span>Você digitou</span>
                <code>{feedback.rawInput || '—'}</code>
              </p>
              <p>
                <span>Resposta completa</span>
                <code>{completeExpectedCode}</code>
              </p>
            </div>
            {feedback.errors.length > 0 && (
              <ul aria-label="O que ajustar">
                {feedback.errors.map((error) => (
                  <li key={`${error.type}-${error.code}`}>{error.message}</li>
                ))}
              </ul>
            )}
            <div className="training-feedback-actions">
              <button
                ref={feedbackActionRef}
                className="button primary"
                type="button"
                onClick={() => void onContinue()}
              >
                {feedback.correct ? 'Próximo exercício' : 'Tentar novamente'}
              </button>
              <button className="button ghost" type="button" onClick={onManual}>
                Consultar manual completo
              </button>
            </div>
          </div>
        ) : (
          currentExercise && (
            <>
              <div className="exercise-prompt">
                <p className="eyebrow">Converta a situação em código</p>
                <h1 id="exercise-title">{currentExercise.playerLabel}</h1>
                {currentExercise.playerRoleLabel && (
                  <p className="exercise-role">{currentExercise.playerRoleLabel}</p>
                )}
                <div>
                  <span>{currentExercise.skillLabel}</span>
                  <strong>{currentExercise.evaluationLabel}</strong>
                </div>
                {(currentExercise.promptDetails ?? []).length > 0 && (
                  <ul className="exercise-details" aria-label="Detalhes táticos do exercício">
                    {(currentExercise.promptDetails ?? []).map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
                <p className="exercise-input-hint">
                  <strong>Como registrar:</strong> {currentExercise.inputHint}
                </p>
              </div>
              <form className="training-input" onSubmit={(event) => void submit(event)}>
                <label htmlFor="training-code">Seu código</label>
                <div>
                  <span>›</span>
                  <input
                    ref={inputRef}
                    id="training-code"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={currentExercise.expectedCode}
                    autoComplete="off"
                  />
                  <kbd>Enter</kbd>
                </div>
              </form>
            </>
          )
        )}
      </main>
    </section>
  );
}
