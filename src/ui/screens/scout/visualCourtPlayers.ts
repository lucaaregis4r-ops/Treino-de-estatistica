import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import type { CourtRotationPosition } from '../../../domain/match/lineup/SetLineup';

export function visualCourtPlayers(workspace: MatchWorkspace, teamId: string, liberoId?: string) {
  const lineup = workspace.currentLineups?.find(l=>l.teamId===teamId);
  const positions: readonly CourtRotationPosition[] = [4,3,2,5,6,1];
  const cells = positions.map(position=> {
    const slot=lineup?.slots[lineup.positions[position]];
    return {position,slot,player:workspace.players.find(p=>p.id===slot?.playerId && p.active!==false)};
  });
  const libero=workspace.players.find(p=>p.id===liberoId && p.teamId===teamId && p.active!==false);
  if(!libero || cells.some(c=>c.player?.id===libero.id)) return cells;
  const central=cells.find(c=> {
    const role=c.slot?.activeRole ?? c.slot?.tacticalRole ?? c.player?.registeredRole;
    return c.player && (role==='middle' || role==='middle_1' || role==='middle_2') && [1,5,6].includes(c.position) && !(c.position===1 && workspace.state.servingTeamId===teamId);
  });
  return cells.map(c=>c===central ? {...c,player:libero} : c);
}
