import {expect,it} from 'vitest';
import type {MatchWorkspace} from '../../../application/ScoutTrainerService';
import {visualCourtPlayers} from './visualCourtPlayers';

it('keeps the serving middle for the entire serve turn and uses libero in the back row afterward',()=>{
 const workspace={players:[{id:'central',teamId:'a',number:3},{id:'libero',teamId:'a',number:12}],state:{servingTeamId:'a'},currentLineups:[{teamId:'a',positions:{1:'s'},slots:{s:{playerId:'central',activeRole:'middle'}}}]} as unknown as MatchWorkspace;
 expect(visualCourtPlayers(workspace,'a','libero').find(c=>c.position===1)?.player?.id).toBe('central');
 const receiving={...workspace,state:{...workspace.state,servingTeamId:'b'}};
 expect(visualCourtPlayers(receiving,'a','libero').find(c=>c.position===1)?.player?.id).toBe('libero');
 const at=(position:number)=>({...workspace,currentLineups:[{...workspace.currentLineups[0],positions:{[position]:'s'}}]}) as unknown as MatchWorkspace;
 for(const position of [5,6]) expect(visualCourtPlayers(at(position),'a','libero').find(c=>c.position===position)?.player?.id).toBe('libero');
 expect(visualCourtPlayers(at(4),'a','libero').find(c=>c.position===4)?.player?.id).toBe('central');
 expect(visualCourtPlayers(receiving,'a').find(c=>c.position===1)?.player?.id).toBe('central');
});
