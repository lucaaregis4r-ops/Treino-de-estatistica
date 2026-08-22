import type { MatchMetadata } from '../../../domain/match/entities/MatchMetadata';

interface HomeScreenProps {
  readonly matches: readonly MatchMetadata[];
  readonly busy: boolean;
  readonly onNewMatch: () => void;
  readonly onTraining: () => void;
  readonly onOpenMatch: (matchId: string) => Promise<void>;
  readonly onImportBackup: (serialized: string) => Promise<void>;
}

const complexityLabels: Readonly<Record<string, string>> = {
  basic: 'Básico',
  operational: 'Operacional',
  tactical: 'Tático',
  advanced: 'Avançado',
  cbv: 'CBV 2025/26',
};

export function HomeScreen({
  matches,
  busy,
  onNewMatch,
  onTraining,
  onOpenMatch,
  onImportBackup,
}: HomeScreenProps) {
  return (
    <section className="page-section home-screen" aria-labelledby="home-title">
      <div className="hero-copy">
        <h1 id="home-title">Scout Trainer</h1>
        <div className="hero-actions">
          <button className="button primary" type="button" onClick={onNewMatch}>
            Nova partida
          </button>
          <button className="button secondary" type="button" onClick={onTraining}>
            Iniciar treino
          </button>
          <label className="button secondary" aria-disabled={busy}>
            Restaurar backup JSON
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void file.text().then(onImportBackup);
                event.currentTarget.value = '';
              }}
            />
          </label>
        </div>
      </div>
      <aside className="recent-panel" aria-labelledby="recent-title">
        <div className="panel-title-row">
          <div>
            <h2 id="recent-title">Partidas recentes</h2>
          </div>
          <span className="local-badge">Local</span>
        </div>
        {matches.length === 0 ? (
          <div className="empty-state">
            <span className="empty-glyph">01</span>
            <p>Nenhuma partida ainda.</p>
          </div>
        ) : (
          <ul className="match-list">
            {matches.map((match) => (
              <li key={match.id}>
                <button type="button" onClick={() => void onOpenMatch(match.id)} disabled={busy}>
                  <span>
                    <strong>{match.name}</strong>
                    <small>
                      Perfil {complexityLabels[match.complexityProfileId] ?? match.complexityProfileId}
                    </small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </section>
  );
}
