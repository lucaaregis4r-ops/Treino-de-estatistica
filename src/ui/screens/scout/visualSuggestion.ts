import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { Skill } from '../../../domain/scout/entities/Skill';

export function visualSuggestion(workspace: MatchWorkspace): {
  teamId: string;
  skill?: Skill;
  playerNumber?: number;
} {
  const next = workspace.tacticalRally?.expectedNextAction;
  const teamId = next?.teamId ?? workspace.state.servingTeamId ?? workspace.teams[0].id;
  const skill = next?.skill === 'set' ? 'attack' : next?.skill;
  if (skill !== 'serve') return { teamId, skill };
  const lineup = workspace.currentLineups?.find((lineup) => lineup.teamId === teamId);
  const slot = lineup && lineup.slots[lineup.positions[1]];
  const player = workspace.players.find(
    (player) => player.id === slot?.playerId && player.active !== false,
  );
  return { teamId, skill, playerNumber: player?.number };
}
