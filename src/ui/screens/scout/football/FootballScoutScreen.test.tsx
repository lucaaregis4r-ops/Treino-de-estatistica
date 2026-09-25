import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ScoutTrainerService } from '../../../../application/ScoutTrainerService';
import { ScoutTrainerDatabase } from '../../../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbPlayerRepository } from '../../../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { IndexedDbTeamRepository } from '../../../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { createDefaultProfileRegistry } from '../../../../profiles/registry/createDefaultProfileRegistry';
import { FootballScoutScreen } from './FootballScoutScreen';

const databases: ScoutTrainerDatabase[] = [];

afterEach(async () => {
  cleanup();
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

it('keeps a failed quick control mark available for an explicit retry', async () => {
  const database = new ScoutTrainerDatabase(`football-screen-${crypto.randomUUID()}`);
  databases.push(database);
  const service = new ScoutTrainerService(
    new IndexedDbMatchRepository(database), new IndexedDbEventRepository(database),
    new IndexedDbTeamRepository(database), new IndexedDbPlayerRepository(database), createDefaultProfileRegistry(),
  );
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const observing = await service.observeFootballControl(created.value.state.metadata.id, { after: { kind: 'unknown' }, coverage: 'continuous' });
  if (!observing.ok) throw observing.error;
  const rejectedObserve = vi.fn().mockRejectedValue(new Error('offline'));

  render(<FootballScoutScreen
    workspace={observing.value}
    onObserve={rejectedObserve}
    onRegister={vi.fn().mockResolvedValue(undefined)}
    onCorrect={vi.fn().mockResolvedValue(undefined)}
    onOrientation={vi.fn().mockResolvedValue(undefined)}
    onUndo={vi.fn().mockResolvedValue(undefined)}
    onSaveAssisted={vi.fn().mockResolvedValue(undefined)}
    onClock={vi.fn().mockResolvedValue(undefined)}
    onScoreAdjust={vi.fn().mockResolvedValue(undefined)}
    onExportBackup={vi.fn()}
    onExportStatsBomb={vi.fn()}
  />);

  const field = screen.getByRole('application');
  fireEvent.pointerDown(field, { pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(field, { pointerId: 1, clientX: 10, clientY: 10 });
  await screen.findByText('Não foi possível salvar o marco. Ele foi preservado para tentar novamente.');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar marco' }));
  await waitFor(() => expect(rejectedObserve).toHaveBeenCalledTimes(2));
});


it('records explicit ball pressure and a player action in the single recorder; ignores shortcuts in a select', async () => {
  const database = new ScoutTrainerDatabase(`football-quick-${crypto.randomUUID()}`);
  databases.push(database);
  const service = new ScoutTrainerService(new IndexedDbMatchRepository(database), new IndexedDbEventRepository(database), new IndexedDbTeamRepository(database), new IndexedDbPlayerRepository(database), createDefaultProfileRegistry());
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [7], teamBPlayers: [9], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const controlled = await service.observeFootballControl(created.value.state.metadata.id, { before: { kind: 'unknown' }, after: { kind: 'controlled', teamId: created.value.teams[0].id }, coverage: 'continuous' });
  if (!controlled.ok) throw controlled.error;
  const onObserve = vi.fn().mockResolvedValue(undefined);
  const onRegister = vi.fn().mockResolvedValue(undefined);
  render(<FootballScoutScreen workspace={controlled.value} onObserve={onObserve} onRegister={onRegister} onCorrect={vi.fn()} onOrientation={vi.fn()} onUndo={vi.fn()} onSaveAssisted={vi.fn()} onClock={vi.fn()} onScoreAdjust={vi.fn()} onExportBackup={vi.fn()} onExportStatsBomb={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Modo detalhado' })).not.toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'p' });
  await screen.findByText('Pressão na bola registrada.');
  expect(onObserve).toHaveBeenCalledWith(expect.objectContaining({ pressure: expect.objectContaining({ kind: 'present_unspecified', pressedTeamId: created.value.teams[0].id }) }));
  fireEvent.keyDown(screen.getByLabelText('Jogador da ação'), { key: 's' });
  expect(onObserve).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(window, { key: 's', repeat: true });
  expect(onObserve).toHaveBeenCalledTimes(1);
  const player = controlled.value.players.find(p => p.teamId === created.value.teams[0].id)!;
  fireEvent.change(screen.getByLabelText('Jogador da ação'), { target: { value: player.id } });
  fireEvent.keyDown(window, { key: 'd' });
  const field = screen.getByRole('application');
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(screen.queryByRole('button', { name: 'Registrar ação' })).not.toBeInTheDocument();
  await screen.findByText('Ação registrada.');
  expect(onRegister).toHaveBeenCalledWith(expect.objectContaining({ action: 'dribble', playerId: player.id, outcome: 'won', location: { x: .5, y: .5 }, observation: expect.objectContaining({ pressure: expect.objectContaining({ kind: 'present_unspecified' }) }) }));
  expect(screen.getByLabelText('Jogador da ação')).toHaveValue('');
});

it('saves a loss with one shortcut and preserves a failed automatic action for retry', async () => {
  const database = new ScoutTrainerDatabase(`football-instant-${crypto.randomUUID()}`);
  databases.push(database);
  const service = new ScoutTrainerService(new IndexedDbMatchRepository(database), new IndexedDbEventRepository(database), new IndexedDbTeamRepository(database), new IndexedDbPlayerRepository(database), createDefaultProfileRegistry());
  const created = await service.createMatch({ sport: 'football', teamAName: 'A', teamBName: 'B', teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic' });
  if (!created.ok) throw created.error;
  const controlled = await service.observeFootballControl(created.value.state.metadata.id, { before: { kind: 'unknown' }, after: { kind: 'controlled', teamId: created.value.teams[0].id }, coverage: 'continuous' });
  if (!controlled.ok) throw controlled.error;
  const onRegister = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  render(<FootballScoutScreen workspace={controlled.value} onObserve={vi.fn()} onRegister={onRegister} onCorrect={vi.fn()} onOrientation={vi.fn()} onUndo={vi.fn()} onSaveAssisted={vi.fn()} onClock={vi.fn()} onScoreAdjust={vi.fn()} onExportBackup={vi.fn()} onExportStatsBomb={vi.fn()} />);
  fireEvent.keyDown(window, { key: 'l' });
  await screen.findByRole('button', { name: 'Tentar salvar ação' });
  expect(onRegister).toHaveBeenCalledTimes(1);
  expect(onRegister.mock.calls[0][0]).toMatchObject({ action: 'loss', outcome: 'observed', observation: { after: { kind: 'unknown' } } });
  expect(onRegister.mock.calls[0][0].location).toBeUndefined();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar ação' }));
  await screen.findByText('Ação registrada.');
  expect(onRegister).toHaveBeenCalledTimes(2);
  expect(onRegister.mock.calls[1][0]).toEqual(onRegister.mock.calls[0][0]);
});
