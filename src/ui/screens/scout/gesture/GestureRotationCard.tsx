import type { MatchWorkspace } from '../../../../application/ScoutTrainerService';
import type { CourtRotationPosition } from '../../../../domain/match/lineup/SetLineup';
import { visualCourtPlayers } from '../visualCourtPlayers';

const POSITIONS: readonly CourtRotationPosition[] = [4, 3, 2, 5, 6, 1];

export function GestureRotationCard({
  workspace,
  teamId,
}: {
  readonly workspace: MatchWorkspace;
  readonly teamId: string;
}) {
  const team = workspace.teams.find((candidate) => candidate.id === teamId);
  const tactical = workspace.state.tacticalStateByTeamId[teamId];
  const courtPlayers = visualCourtPlayers(workspace, teamId);
  const isServing = teamId === workspace.state.servingTeamId;

  return (
    <article className="gesture-rotation-card" aria-label={`Rotação de ${team?.name ?? 'equipe'}`}>
      <header>
        <strong>{team?.name}</strong>
        <small>{isServing ? 'SACANDO' : 'RECEBENDO'}</small>
      </header>
      <ol>
        {POSITIONS.map((position) => {
          const cell = courtPlayers.find((c) => c.position === position);
          const player = cell?.player;
          const setter = player?.id === tactical?.activeSetterPlayerId;
          const server = isServing && position === 1;
          const isLibero = player
            ? workspace.state.metadata?.liberoPlayerIds?.includes(player.id) ||
              player.registeredRole === 'libero'
            : false;
          return (
            <li
              key={position}
              title={player?.name}
              className={[
                setter ? 'setter' : '',
                server ? 'server' : '',
                isLibero ? 'libero' : '',
              ]
                .filter(Boolean)
                .join(' ') || undefined}
            >
              <span>P{position}</span>
              <b>#{player ? String(player.number).padStart(2, '0') : '—'}</b>
              <div aria-label="Marcadores">
                {setter && <em title="Levantador">L</em>}
                {server && <em title="Sacador">S</em>}
                {isLibero && <em title="Líbero">LI</em>}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

