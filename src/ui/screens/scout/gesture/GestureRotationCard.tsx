import type { MatchWorkspace } from '../../../../application/ScoutTrainerService';
import type { CourtRotationPosition } from '../../../../domain/match/lineup/SetLineup';

const POSITIONS: readonly CourtRotationPosition[] = [4, 3, 2, 5, 6, 1];

export function GestureRotationCard({
  workspace,
  teamId,
}: {
  readonly workspace: MatchWorkspace;
  readonly teamId: string;
}) {
  const team = workspace.teams.find((candidate) => candidate.id === teamId);
  const lineup = workspace.currentLineups.find((candidate) => candidate.teamId === teamId);
  const tactical = workspace.state.tacticalStateByTeamId[teamId];

  return (
    <article className="gesture-rotation-card" aria-label={`Rotação de ${team?.name ?? 'equipe'}`}>
      <header>
        <strong>{team?.name}</strong>
        <small>{teamId === workspace.state.servingTeamId ? 'SACANDO' : 'RECEBENDO'}</small>
      </header>
      <ol>
        {POSITIONS.map((position) => {
          const slot = lineup?.slots[lineup.positions[position]];
          const player = workspace.players.find((candidate) => candidate.id === slot?.playerId);
          const setter = player?.id === tactical?.activeSetterPlayerId;
          const server = teamId === workspace.state.servingTeamId && position === 1;
          return (
            <li key={position} title={player?.name} className={setter ? 'setter' : undefined}>
              <span>P{position}</span>
              <b>#{player ? String(player.number).padStart(2, '0') : '—'}</b>
              <div aria-label="Marcadores">
                {setter && <em title="Levantador">L</em>}
                {server && <em title="Sacador">S</em>}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}
