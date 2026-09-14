import { expect, it } from 'vitest';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import { visualSuggestion } from './visualSuggestion';

it('suggests the actual server from position 1 and the receiving team after serve', () => {
  const workspace = { state: { servingTeamId:'a' }, teams:[{id:'a'},{id:'b'}], players:[{id:'p',number:7}], currentLineups:[{teamId:'a',positions:{1:'slot'},slots:{slot:{playerId:'p'}}}], tacticalRally:{expectedNextAction:{skill:'serve',teamId:'a'}} } as unknown as MatchWorkspace;
  expect(visualSuggestion(workspace)).toEqual({teamId:'a',skill:'serve',playerNumber:7});
  expect(visualSuggestion({...workspace,tacticalRally:{...workspace.tacticalRally,expectedNextAction:{skill:'set',teamId:'b',reason:'reception_completed'}}})).toEqual({teamId:'b',skill:'attack'});
  expect(visualSuggestion({...workspace,tacticalRally:{...workspace.tacticalRally,expectedNextAction:{skill:'reception',teamId:'b',reason:'serve_received'}}})).toEqual({teamId:'b',skill:'reception'});
});
