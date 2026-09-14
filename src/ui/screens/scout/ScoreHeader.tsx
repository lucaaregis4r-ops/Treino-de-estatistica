import type { MatchWorkspace } from '../../../application/ScoutTrainerService';

interface ScoreHeaderProps {
  readonly workspace: MatchWorkspace;
  readonly busy: boolean;
  readonly onBack: () => void;
  readonly onSummary: () => void;
  readonly onScoreAdjust: (teamId: string, delta: number) => Promise<void>;
}

export function ScoreHeader({ workspace, busy, onBack, onSummary, onScoreAdjust }: ScoreHeaderProps) {
  const [teamA, teamB] = workspace.teams;
  const teamASets = workspace.state.sets.filter((set) => set.winnerTeamId === teamA.id).length;
  const teamBSets = workspace.state.sets.filter((set) => set.winnerTeamId === teamB.id).length;

  return (
    <header className="score-header" aria-label="Placar da partida">
      <button
        className="icon-button"
        type="button"
        onClick={onBack}
        aria-label="Voltar para início"
      >
        ←
      </button>
      <div className="score-header-team home">
        <strong>{teamA.name}</strong>
        <span>{workspace.state.score.teamA}</span>
        <div className="score-header-adjustments" aria-label={`Ajustar placar de ${teamA.name}`}>
          <button
            type="button"
            aria-label={`Diminuir placar de ${teamA.name}`}
            onClick={() => void onScoreAdjust(teamA.id, -1)}
            disabled={busy || workspace.state.score.teamA === 0}
          >
            Ajustar -1
          </button>
          <button
            type="button"
            aria-label={`Aumentar placar de ${teamA.name}`}
            onClick={() => void onScoreAdjust(teamA.id, 1)}
            disabled={busy}
          >
            Ajustar +1
          </button>
        </div>
      </div>
      <div className="score-header-center score-center">
        <small>SETS</small>
        <strong>
          {teamASets} × {teamBSets}
        </strong>
        <span>SET {workspace.state.currentSet}</span>
      </div>
      <div className="score-header-team away">
        <strong>{teamB.name}</strong>
        <span>{workspace.state.score.teamB}</span>
        <div className="score-header-adjustments" aria-label={`Ajustar placar de ${teamB.name}`}>
          <button
            type="button"
            aria-label={`Diminuir placar de ${teamB.name}`}
            onClick={() => void onScoreAdjust(teamB.id, -1)}
            disabled={busy || workspace.state.score.teamB === 0}
          >
            Ajustar -1
          </button>
          <button
            type="button"
            aria-label={`Aumentar placar de ${teamB.name}`}
            onClick={() => void onScoreAdjust(teamB.id, 1)}
            disabled={busy}
          >
            Ajustar +1
          </button>
        </div>
      </div>
      <button className="icon-button" type="button" onClick={onSummary} aria-label="Abrir resumo">
        ≡
      </button>
    </header>
  );
}
