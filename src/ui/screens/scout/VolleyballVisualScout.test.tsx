import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { MatchWorkspace } from '../../../application/ScoutTrainerService';
import { VolleyballVisualScout } from './VolleyballVisualScout';

afterEach(cleanup);

it('requires a complete play, clears reset coordinates and submits the precise draft once', async () => {
  const workspace = {
    teams: [{ id: 'a', name: 'Equipe A' }, { id: 'b', name: 'Equipe B' }],
    players: [{ id: 'p', teamId: 'a', number: 7, name: 'Ana' }],
    state: { currentSet: 1 },
    profiles: { codeProfile: { skills: { A: 'attack', B: 'block' }, evaluations: { '#': 'excellent', '-': 'poor' } } },
  } as unknown as MatchWorkspace;
  const onRegister = vi.fn().mockResolvedValue(undefined);
  render(<VolleyballVisualScout workspace={workspace} busy={false} onRegister={onRegister} />);
  const submit = screen.getByRole('button', { name: /Registrar ação/ });
  expect(submit).toBeDisabled();
  fireEvent.keyDown(submit, {key:'Enter'});
  expect(onRegister).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /07 Ana/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Ataque' }));
  fireEvent.click(screen.getByRole('button', { name: 'Qualidade #' }));
  fireEvent.click(screen.getByRole('button', { name: 'Largada' }));
  expect(submit).toBeDisabled();
  const surface = screen.getByRole('button', { name: 'Quadra espacial clicável' });
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 1000, height: 500 } as DOMRect);
  fireEvent.click(surface, { clientX: 273, clientY: 341 });
  fireEvent.click(surface, { clientX: 812, clientY: 112 });
  expect(submit).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Refazer' }));
  expect(submit).toBeDisabled();
  expect(screen.queryByLabelText('Origem')).not.toBeInTheDocument();
  fireEvent.click(surface, { clientX: 273, clientY: 341 });
  fireEvent.click(surface, { clientX: 812, clientY: 112 });
  fireEvent.keyDown(surface, {key:'Enter'});
  fireEvent.keyDown(surface, {key:'Enter',repeat:true});
  await waitFor(() => expect(onRegister).toHaveBeenCalledExactlyOnceWith({
    teamId: 'a', playerNumber: 7, skill: 'attack', evaluation: 'excellent', skillType: 'Largada',
    spatial: { origin: { surface: 'court', x: .273, y: .682 }, destination: { surface: 'court', x: .812, y: .224 } },
  }));
});

it('shows live score, rotating positions, setter and only five recent actions with correction', () => {
  const workspace = {teams:[{id:'a',name:'Equipe A'},{id:'b',name:'Equipe B'}], players:[{id:'p1',teamId:'a',number:7,name:'Ana'},{id:'p2',teamId:'a',number:8,name:'Bia'}], state:{currentSet:2,score:{teamA:18,teamB:16},sets:[],tacticalStateByTeamId:{a:{activeSetterPlayerId:'p1'}}}, profiles:{codeProfile:{skills:{A:'attack'},evaluations:{'#':'excellent'}}}, currentLineups:[{teamId:'a',positions:{1:'s1',2:'s2'},slots:{s1:{playerId:'p1'},s2:{playerId:'p2'}}}],timeline:Array.from({length:6},(_,i)=>({sourceEventId:String(i),event:{playerId:'p1',teamId:'a',skill:'attack',evaluation:'excellent',setNumber:2}}))} as unknown as MatchWorkspace;
  const onEdit=vi.fn();
  const {rerender}=render(<VolleyballVisualScout workspace={workspace} busy={false} onRegister={vi.fn()} onEdit={onEdit}/>);
  expect(screen.getByLabelText('Placar da partida')).toHaveTextContent('18 × 16');
  expect(screen.getByRole('button',{name:/P1.*07.*Ana.*Levantador/})).toBeInTheDocument();
  const recent=screen.getByRole('region',{name:'Cinco últimas ações'});
  expect(within(recent).getAllByRole('listitem')).toHaveLength(5);
  fireEvent.click(within(recent).getAllByRole('button',{name:'Corrigir'})[0]);
  expect(onEdit).toHaveBeenCalledWith(workspace.timeline[5]);
  const lineup={...workspace.currentLineups[0],positions:{...workspace.currentLineups[0].positions,1:'s2',6:'s1'}};
  rerender(<VolleyballVisualScout workspace={{...workspace,currentLineups:[lineup]}} busy={false} onRegister={vi.fn()} onEdit={onEdit}/>);
  expect(screen.getByRole('button',{name:/P6.*07.*Ana.*Levantador/})).toBeInTheDocument();
});
