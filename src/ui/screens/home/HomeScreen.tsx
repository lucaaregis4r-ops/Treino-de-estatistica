import { useRef } from 'react';
import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';
import {
  MATCH_STATUS_LABELS,
  matchDateLabel,
  matchProfileLabel,
  sortMatchesByCreation,
} from '../matches/matchPresentation';

interface HomeScreenProps {
  readonly matches: readonly MatchMetadata[];
  readonly busy: boolean;
  readonly onNewMatch: () => void;
  readonly onTraining: () => void;
  readonly onAllMatches: () => void;
  readonly onOpenMatch: (matchId: string) => Promise<void>;
  readonly onImportBackup: (serialized: string) => Promise<void>;
}

export function HomeScreen({
  matches,
  busy,
  onNewMatch,
  onTraining,
  onAllMatches,
  onOpenMatch,
  onImportBackup,
}: HomeScreenProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const orderedMatches = sortMatchesByCreation(matches);
  const resumableMatch = orderedMatches.find((match) => match.status === 'in_progress');
  const recentMatches = orderedMatches.slice(0, 5);

  return (
    <main className="page-section home-screen" aria-labelledby="home-title">
      <header className="home-heading">
        <div>
          <p className="eyebrow">Área de trabalho</p>
          <h1 id="home-title">Seu espaço de scout</h1>
          <p>Retome uma partida ou comece um novo registro.</p>
        </div>
        <button
          className={`button ${resumableMatch ? 'secondary' : 'primary'}`}
          type="button"
          onClick={onNewMatch}
          disabled={busy}
        >
          Nova partida
        </button>
      </header>

      {resumableMatch && (
        <section className="resume-strip" aria-labelledby="resume-title">
          <div>
            <p className="eyebrow">Retomar</p>
            <h2 id="resume-title">{resumableMatch.name}</h2>
            <p>
              {matchDateLabel(resumableMatch.createdAt)} ·{' '}
              {MATCH_STATUS_LABELS[resumableMatch.status]}
            </p>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => void onOpenMatch(resumableMatch.id)}
            disabled={busy}
          >
            Continuar registro
          </button>
        </section>
      )}

      <section className="home-recent" aria-labelledby="recent-title">
        <div className="section-heading home-section-heading">
          <div>
            <h2 id="recent-title">Partidas recentes</h2>
            <p className="section-support">As cinco partidas mais recentes deste dispositivo.</p>
          </div>
          <button className="button ghost" type="button" onClick={onAllMatches} disabled={busy}>
            Ver todas
          </button>
        </div>
        {recentMatches.length === 0 ? (
          <div className="home-empty-state">
            <p>Nenhuma partida registrada ainda.</p>
            <button className="button primary" type="button" onClick={onNewMatch} disabled={busy}>
              Criar primeira partida
            </button>
          </div>
        ) : (
          <ul className="home-match-list">
            {recentMatches.map((match) => (
              <li key={match.id}>
                <button
                  className="home-match-link"
                  type="button"
                  onClick={() => void onOpenMatch(match.id)}
                  disabled={busy}
                >
                  <strong>{match.name}</strong>
                  <span>{matchDateLabel(match.createdAt)}</span>
                  <span>{matchProfileLabel(match.complexityProfileId)}</span>
                  <span>{MATCH_STATUS_LABELS[match.status]}</span>
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home-secondary-actions" aria-label="Outras ações">
        <button className="button secondary" type="button" onClick={onTraining} disabled={busy}>
          Iniciar treino
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={busy}
        >
          Importar backup
        </button>
        <input
          ref={importInputRef}
          className="sr-only"
          id="home-import-backup"
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void file.text().then(onImportBackup);
            event.currentTarget.value = '';
          }}
        />
        <span className="home-import-help">Arquivo JSON do Scout Trainer</span>
      </section>
    </main>
  );
}
