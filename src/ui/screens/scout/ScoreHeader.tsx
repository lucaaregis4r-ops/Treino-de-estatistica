import type { MatchWorkspace } from '../../../application/ScoutTrainerService';

interface ScoreHeaderProps {
  readonly workspace: MatchWorkspace;
  readonly busy: boolean;
  readonly onBack: () => void;
  readonly onSummary: () => void;
  readonly onPoint: (teamId: string) => Promise<void>;
}

export function ScoreHeader({ workspace, busy, onBack, onSummary, onPoint }: ScoreHeaderProps) {
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
        <button type="button" onClick={() => void onPoint(teamA.id)} disabled={busy}>
          Corrigir +1
        </button>
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
        <button type="button" onClick={() => void onPoint(teamB.id)} disabled={busy}>
          Corrigir +1
        </button>
      </div>
      <button className="icon-button" type="button" onClick={onSummary} aria-label="Abrir resumo">
        ≡
      </button>
    </header>
  );
}
