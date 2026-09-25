import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ScoutTrainerService } from '../../application/ScoutTrainerService';
import { TrainingService } from '../../application/TrainingService';
import { ProfileEditorService } from '../../application/profile-editor/ProfileEditorService';
import { ScoutTrainerDatabase } from '../../infrastructure/persistence/indexeddb/ScoutTrainerDatabase';
import { IndexedDbEventRepository } from '../../infrastructure/persistence/repositories/IndexedDbEventRepository';
import { IndexedDbMatchRepository } from '../../infrastructure/persistence/repositories/IndexedDbMatchRepository';
import { IndexedDbPlayerRepository } from '../../infrastructure/persistence/repositories/IndexedDbPlayerRepository';
import { IndexedDbTeamRepository } from '../../infrastructure/persistence/repositories/IndexedDbTeamRepository';
import { IndexedDbTrainingSessionRepository } from '../../infrastructure/persistence/repositories/IndexedDbTrainingSessionRepository';
import { IndexedDbProfileRepository } from '../../infrastructure/persistence/repositories/IndexedDbProfileRepository';
import { createDefaultProfileRegistry } from '../../profiles/registry/createDefaultProfileRegistry';
import { App } from './App';

const openedDatabases: ScoutTrainerDatabase[] = [];

function createService() {
  const database = new ScoutTrainerDatabase(`ui-flow-${crypto.randomUUID()}`);
  openedDatabases.push(database);
  const profiles = createDefaultProfileRegistry();
  return {
    database,
    service: new ScoutTrainerService(
      new IndexedDbMatchRepository(database),
      new IndexedDbEventRepository(database),
      new IndexedDbTeamRepository(database),
      new IndexedDbPlayerRepository(database),
      profiles,
    ),
    trainingService: new TrainingService(
      new IndexedDbTrainingSessionRepository(database),
      profiles,
      {
        createId: () => crypto.randomUUID(),
        now: Date.now,
        random: () => 0.4,
      },
    ),
    profileEditorService: new ProfileEditorService(
      new IndexedDbProfileRepository(database),
      profiles,
    ),
  };
}

afterEach(async () => {
  cleanup();
  await Promise.all(openedDatabases.splice(0).map((database) => database.close()));
});

describe('usable MVP flow', () => {
  it('creates, reopens, and routes football without volleyball state or controls', async () => {
    const { service, trainingService, profileEditorService } = createService();
    const created = await service.createMatch({
      sport: 'football', teamAName: 'Azul FC', teamBName: 'Verde FC',
      teamAPlayers: [], teamBPlayers: [], complexityProfileId: 'basic',
    });
    if (!created.ok) throw created.error;
    expect(created.value.state.metadata.sport).toBe('football');
    expect(created.value.state.metadata.initialServingTeamId).toBeUndefined();
    expect(created.value.state.metadata.scoringRules).toBeUndefined();
    expect(created.value.players).toEqual([]);
    expect(created.value.events.some((event) => event.type === 'set_lineup_confirmed')).toBe(false);

    const reopened = await service.loadMatch(created.value.state.metadata.id);
    if (!reopened.ok) throw reopened.error;
    expect(reopened.value.state.metadata.sport).toBe('football');

    render(<App service={service} trainingService={trainingService} profileEditorService={profileEditorService} />);
    const openButton = await screen.findByRole('button', { name: 'Continuar registro' }, { timeout: 5000 });
    await waitFor(() => expect(openButton).toBeEnabled());
    fireEvent.click(openButton);
    expect(await screen.findByLabelText('Registro de ação e jogador')).toBeInTheDocument();
    expect(screen.getByLabelText('Placar da partida')).toHaveTextContent('Azul FC x Verde FC');
    expect(screen.getByLabelText('Jogador da ação')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modo detalhado' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Líbero|Rotação: R1|Quem começa sacando|SET 1/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Quadra de Azul FC')).not.toBeInTheDocument();
  });

  it('keeps explicit volleyball on the existing volleyball recorder', async () => {
    const { service, trainingService, profileEditorService } = createService();
    const created = await service.createMatch({
      sport: 'volleyball', teamAName: 'Vôlei A', teamBName: 'Vôlei B',
      teamAPlayers: [1, 2, 3, 4, 5, 6], teamBPlayers: [7, 8, 9, 10, 11, 12],
      complexityProfileId: 'basic', initialServingTeam: 'teamA',
    });
    if (!created.ok) throw created.error;
    expect(created.value.state.metadata.sport).toBe('volleyball');
    expect(created.value.state.metadata.initialServingTeamId).toBe(created.value.teams[0].id);

    render(<App service={service} trainingService={trainingService} profileEditorService={profileEditorService} />);
    const openButton = await screen.findByRole('button', { name: 'Continuar registro' });
    await waitFor(() => expect(openButton).toBeEnabled());
    fireEvent.click(openButton);
    expect(await screen.findByLabelText('Contexto atual da partida')).toHaveTextContent('Rotação: R1');
    expect(screen.getByLabelText('Quadra de Vôlei A')).toBeInTheDocument();
    expect(screen.queryByText('Registro de futebol')).not.toBeInTheDocument();
  });

  it('opens a permanent code manual from the main navigation', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Ajuda' }));
    expect(screen.getByRole('heading', { name: 'Códigos' })).toBeInTheDocument();
    expect(screen.getByText('*08S#a12R+*03E+*10A#')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fundamentos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Avaliações' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Como registrar' })).toBeInTheDocument();
    expect(screen.getAllByText('*08S+YQO1T1')).toHaveLength(2);
    expect(
      screen.getByRole('heading', { name: 'Qualificadores por fundamento' }),
    ).toBeInTheDocument();
  });

  it('creates, scouts, corrects, undoes, redoes, adjusts, summarizes, and resumes a match', async () => {
    const { service, trainingService, profileEditorService } = createService();
    const firstRender = render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Nova partida' })).at(-1)!);

    fireEvent.click(screen.getByRole('button', { name: 'Usar elenco demonstrativo' }));
    fireEvent.click(screen.getByRole('radio', { name: /Operacional/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const scoutInput = await screen.findByLabelText<HTMLInputElement>(
      'Digite o código',
      undefined,
      {
        timeout: 20_000,
      },
    );
    expect(screen.getByLabelText('Placar da partida')).toBeInTheDocument();
    expect(screen.getByLabelText('Contexto atual da partida')).toBeInTheDocument();
    expect(screen.getByLabelText('Contexto atual da partida')).toHaveTextContent('Rotação: R1');
    expect(screen.getByLabelText('Quadra de Equipe A')).toBeInTheDocument();
    expect(screen.getByLabelText('Quadra de Equipe B')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Últimos eventos' })).toBeInTheDocument();
    await waitFor(() => expect(scoutInput).toHaveFocus());
    await waitFor(() => expect(scoutInput).toHaveValue('*01S'));

    fireEvent.change(scoutInput, { target: { value: '*01A#' } });
    fireEvent.click(screen.getByRole('button', { name: 'Habilitar ajuda' }));
    expect(
      screen.getByText('Ataque', { selector: '.capture-help-content strong' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ponto')).toBeInTheDocument();
    expect(
      screen.getByText('Direção', { selector: '.capture-help-content strong' }),
    ).toBeInTheDocument();
    fireEvent.submit(scoutInput.closest('form')!);
    expect(await screen.findByText('*01A#')).toBeInTheDocument();
    await waitFor(() => expect(scoutInput).toHaveFocus());
    await waitFor(() => expect(scoutInput.selectionStart).toBe(scoutInput.value.length));

    fireEvent.click(screen.getByText('Mais'));
    fireEvent.click(screen.getByRole('button', { name: 'Ajuda' }));
    expect(await screen.findByRole('heading', { name: 'Códigos' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByText('*01A#')).toBeInTheDocument();
    expect(screen.getByLabelText('Placar da partida')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Corrigir' }));
    const correctionInput = screen.getByLabelText('Corrigindo evento');
    fireEvent.change(correctionInput, { target: { value: '*01A+' } });
    fireEvent.submit(correctionInput.closest('form')!);
    expect(await screen.findByText('*01A+')).toBeInTheDocument();
    expect(screen.getByText('corrigido')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(await screen.findByText('*01A#')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refazer' }));
    expect(await screen.findByText('*01A+')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Corrigir +1' })[0]);
    await waitFor(() => expect(screen.getByText('Rally próximo')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Abrir resumo' }));
    expect(await screen.findByRole('heading', { name: 'Equipe A x Equipe B' })).toBeInTheDocument();
    expect(screen.getByText('Eventos ativos')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Atletas, rotações e levantador' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Box score por atleta' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Estatísticas por rotação' })).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Direcionamento por atacante e levantador' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar TXT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeInTheDocument();

    firstRender.unmount();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    const savedMatch = await screen.findByRole('button', {
      name: /Equipe A x Equipe B.*Operacional/i,
    });
    fireEvent.click(savedMatch);
    expect(await screen.findByText('*01A+')).toBeInTheDocument();
    expect(screen.getByText('Data Volley')).toBeInTheDocument();
  }, 60_000);

  it('registers one visual event and one hybrid event while preserving the typed mode', async () => {
    const { service, trainingService, profileEditorService } = createService();
    const created = await service.createMatch({
      teamAName: 'Equipe A',
      teamBName: 'Equipe B',
      teamAPlayers: [1],
      teamBPlayers: [7],
      complexityProfileId: 'tactical',
      codeProfileId: 'default_compact_v1',
    });
    if (!created.ok) throw created.error;
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Equipe A x Equipe B/ }));

    expect(await screen.findByLabelText('Digite o código')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visual' }));
    const visualForm = screen.getByRole('heading', { name: 'Registrar contato' }).closest('form');
    if (!visualForm) throw new Error('Visual scout form was not found.');
    fireEvent.submit(visualForm);
    await screen.findByText(/\[VISUAL\]/);

    fireEvent.click(screen.getByRole('button', { name: 'Híbrido' }));
    const hybridForm = screen
      .getByRole('heading', { name: 'Confirmar e enriquecer código' })
      .closest('form');
    if (!hybridForm) throw new Error('Hybrid scout form was not found.');
    fireEvent.change(within(hybridForm).getByLabelText('Código digitado'), {
      target: { value: '01A+' },
    });
    fireEvent.change(within(hybridForm).getByLabelText('Fundamento'), {
      target: { value: 'attack' },
    });
    fireEvent.change(within(hybridForm).getByLabelText('Avaliação'), {
      target: { value: 'positive' },
    });
    fireEvent.submit(hybridForm);
    await screen.findByText('01A+');

    const workspace = await service.loadMatch(created.value.state.metadata.id);
    expect(workspace.ok).toBe(true);
    if (!workspace.ok) return;
    expect(workspace.value.timeline).toHaveLength(2);
    expect(workspace.value.timeline.map((entry) => entry.event.inputMode)).toEqual([
      'visual',
      'hybrid',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Digitado' }));
    expect(screen.getByLabelText('Digite o código')).toBeInTheDocument();
  }, 60_000);

  it('projects effective spatial data after correction and undo and exposes it in the summary', async () => {
    const { service, trainingService, profileEditorService } = createService();
    const created = await service.createMatch({
      teamAName: 'Equipe A',
      teamBName: 'Equipe B',
      teamAPlayers: [1],
      teamBPlayers: [7],
      complexityProfileId: 'tactical',
      codeProfileId: 'default_compact_v1',
    });
    if (!created.ok) throw created.error;
    const matchId = created.value.state.metadata.id;
    const teamId = created.value.teams[0].id;
    const registered = await service.registerVisualScout(matchId, {
      teamId,
      playerNumber: 1,
      skill: 'attack',
      evaluation: 'positive',
      origin: { x: 0.2, y: 0.25 },
      target: { x: 0.8, y: 0.75 },
      captureMethod: 'drawn',
    });
    if (!registered.ok) throw registered.error;
    expect(registered.value.report.spatial?.density).toEqual([
      expect.objectContaining({ preset: 'attack_target', zoneId: '1', count: 1 }),
    ]);

    const sourceEventId = registered.value.timeline[0]?.sourceEventId;
    if (!sourceEventId) throw new Error('Spatial source event was not found.');
    const corrected = await service.correctScout(matchId, sourceEventId, '01A+', {
      captureDraft: {
        origin: { x: 0.2, y: 0.25 },
        target: { x: 0.2, y: 0.75 },
        captureMethod: 'drawn',
      },
    });
    if (!corrected.ok) throw corrected.error;
    expect(corrected.value.report.spatial?.density[0]).toMatchObject({ zoneId: '5', count: 1 });

    const undone = await service.undo(matchId);
    if (!undone.ok) throw undone.error;
    expect(undone.value.report.spatial?.density[0]).toMatchObject({ zoneId: '1', count: 1 });

    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Equipe A x Equipe B/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir resumo' }));
    expect(
      await screen.findByRole('heading', { name: 'Densidade e trajetórias na quadra' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Dados espaciais equivalentes ao heatmap' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Matriz espacial de origem por destino' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Jogadas' }));
    expect(screen.getByRole('img', { name: 'Mapa de jogadas individuais' })).toBeInTheDocument();
    expect(screen.getByText(/jogadas com origem e destino registrados/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Heatmap' }));
    expect(screen.getByRole('img', { name: 'Heatmap: Alvo de ataque' })).toBeInTheDocument();
  }, 60_000);

  it('updates the court workspace through a generic substitution', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Nova partida' })).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Usar elenco demonstrativo' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar atleta' })[0]);
    fireEvent.change(screen.getByLabelText('Camisa Equipe A 7'), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText('Nome Equipe A 7'), { target: { value: 'Reserva' } });
    fireEvent.change(screen.getByLabelText('Posição Equipe A 7'), { target: { value: 'setter' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    await screen.findByLabelText('Quadra de Equipe A', undefined, { timeout: 20_000 });

    fireEvent.click(screen.getAllByText('Substituição')[0]);
    const playerOut = screen.getByLabelText<HTMLSelectElement>('Equipe A: atleta que sai');
    const playerIn = screen.getByLabelText('Equipe A: atleta que entra');
    const outgoingOption = [...playerOut.options].find((option) =>
      option.textContent?.includes('#01'),
    );
    const incomingOption = within(playerIn).getByRole('button', { name: /#07/ });
    if (!outgoingOption) throw new Error('Substitution options were not found.');
    fireEvent.change(playerOut, { target: { value: outgoingOption.value } });
    fireEvent.click(incomingOption);
    fireEvent.click(screen.getAllByRole('button', { name: 'Substituir' })[0]);

    const teamACourt = screen.getByLabelText('Quadra de Equipe A');
    await waitFor(() =>
      expect(teamACourt.querySelector('[data-position="1"]')).toHaveTextContent('#07'),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Substituições recentes de Equipe A')).toHaveTextContent(
        '#1 saiu · #7 entrou',
      ),
    );
    expect(screen.getByLabelText('Digite o código')).toHaveFocus();
  }, 60_000);

  it('confirms a freely rearranged lineup between sets without creating substitutions', async () => {
    const { service, trainingService, profileEditorService } = createService();
    const created = await service.createMatch({
      teamAName: 'Equipe A',
      teamBName: 'Equipe B',
      teamAPlayers: [1, 2, 3, 4, 5, 6, 7],
      teamBPlayers: [8, 9, 10, 11, 12, 13],
      complexityProfileId: 'basic',
      scoringRules: {
        regularSetTarget: 1,
        decidingSetTarget: 1,
        minimumLead: 1,
        setsToWin: 2,
      },
    });
    if (!created.ok) throw created.error;
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Equipe A x Equipe B/ }));
    const input = await screen.findByLabelText('Digite o código');
    await waitFor(() => expect(input).toHaveValue('01S'));
    fireEvent.change(input, { target: { value: '01S#' } });
    fireEvent.submit(input.closest('form')!);

    expect(
      await screen.findByRole('heading', { name: 'Confirmar escalação do set 2' }),
    ).toBeInTheDocument();
    const positionOne = screen.getByLabelText<HTMLSelectElement>(
      'Equipe A: atleta em P1 no próximo set',
    );
    const bench = [...positionOne.options].find((option) => option.textContent?.includes('#07'));
    if (!bench) throw new Error('Bench player was not available for the next set.');
    fireEvent.change(positionOne, { target: { value: bench.value } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar escalação e iniciar set' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'Confirmar escalação do set 2' }),
      ).not.toBeInTheDocument(),
    );
    const reopened = await service.loadMatch(created.value.state.metadata.id);
    if (!reopened.ok) throw reopened.error;
    const teamALineup = reopened.value.currentLineups.find(
      (lineup) => lineup.teamId === created.value.teams[0].id,
    );
    const positionOnePlayer = reopened.value.players.find(
      (player) => player.id === teamALineup?.slots[teamALineup.positions[1]]?.playerId,
    );
    expect(positionOnePlayer?.number).toBe(7);
    expect(
      reopened.value.events.filter((event) => event.type === 'substitution_made'),
    ).toHaveLength(0);
  }, 60_000);

  it('frames a concatenated scout stream and closes its final event with Enter', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Nova partida' })).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Usar elenco demonstrativo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const input = await screen.findByLabelText('Digite o código', undefined, { timeout: 20_000 });
    await waitFor(() => expect(input).toHaveValue('*01S'));

    fireEvent.change(input, { target: { value: '*01A#*02S+a09R#' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('A09R#')).toBeInTheDocument();
    expect(screen.getByText('*02S+')).toBeInTheDocument();
    expect(screen.getByText('*01A#')).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue('*01A#*02S+a09R#*01S'));

    fireEvent.change(input, { target: { value: '99A#' } });
    expect(input).toHaveValue('*01A#*02S+a09R#*01S');

    fireEvent.change(input, { target: { value: '*01A#*02S+a09R#*01S*01X?' } });
    expect(screen.getByText('Código inválido')).toBeInTheDocument();
    const matches = await service.listMatches();
    const matchId = matches.ok ? matches.value[0]?.id : undefined;
    if (!matchId) throw new Error('Created match was not found.');
    const workspace = await service.loadMatch(matchId);
    expect(workspace.ok && workspace.value.timeline).toHaveLength(3);
  }, 60_000);

  it('prefills the correct server after each point without inventing the evaluation', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Nova partida' })).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Usar elenco demonstrativo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const input = await screen.findByLabelText('Digite o código', undefined, { timeout: 20_000 });

    await waitFor(() => expect(input).toHaveValue('*01S'));
    fireEvent.change(input, { target: { value: '*01S#' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(input).toHaveValue('*01S#*01S'));
    fireEvent.change(input, { target: { value: '*01S#*01S=' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(input).toHaveValue('*01S#*01S=a08S'));
  }, 60_000);

  it('registers a partial tactical core and enriches it through an auditable correction', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Nova partida' })).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Usar elenco demonstrativo' }));
    fireEvent.click(screen.getByRole('radio', { name: /Tático/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const input = await screen.findByLabelText('Digite o código', undefined, { timeout: 20_000 });

    fireEvent.change(input, { target: { value: '*01A#' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText(/parcial · faltam direção/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Completar' }));
    fireEvent.change(screen.getByLabelText('Tipo da ação'), { target: { value: 'potência' } });
    expect(screen.queryByLabelText('Zona de destino')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Exceção de origem/), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Direção'), { target: { value: 'diagonal' } });
    const correction = screen.getByLabelText('Corrigindo evento');
    fireEvent.change(correction, { target: { value: '*01A#' } });
    fireEvent.submit(correction.closest('form')!);

    expect(await screen.findByText('corrigido')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/parcial · faltam/)).not.toBeInTheDocument());
  }, 60_000);

  it('captures attack direction through the contextual mini court before committing', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Nova partida' })).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Usar elenco demonstrativo' }));
    fireEvent.click(screen.getByRole('radio', { name: /Tático/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const input = await screen.findByLabelText('Digite o código', undefined, { timeout: 20_000 });

    fireEvent.change(input, { target: { value: '*01A#' } });

    const court = await screen.findByRole(
      'button',
      {
        name: /Toque na quadra para marcar a origem/,
      },
      { timeout: 20_000 },
    );
    expect(court).toBeInTheDocument();
    Object.defineProperty(court, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 1000,
        height: 500,
        left: 0,
        top: 0,
        right: 1000,
        bottom: 500,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(court, { clientX: 100, clientY: 50 });
    expect(screen.getByRole('button', { name: /Toque onde a bola terminou/ })).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' });
    expect(confirmButton).toBeDisabled();

    fireEvent.pointerDown(court, { clientX: 600, clientY: 100 });
    expect(screen.getByText('Enter confirma · Esc cancela · R refaz')).toBeInTheDocument();
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);
    expect(await screen.findByText('*01A#')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Toque na quadra/ })).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.queryByText(/parcial · faltam direção/)).not.toBeInTheDocument(),
    );
  }, 60_000);

  it('cancels the contextual mini court with Escape and falls back to a partial attack', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click((await screen.findAllByRole('button', { name: 'Nova partida' })).at(-1)!);
    fireEvent.click(screen.getByRole('button', { name: 'Usar elenco demonstrativo' }));
    fireEvent.click(screen.getByRole('radio', { name: /Tático/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const input = await screen.findByLabelText('Digite o código', undefined, { timeout: 20_000 });

    fireEvent.change(input, { target: { value: '*01A#' } });
    await screen.findByRole(
      'button',
      { name: /Toque na quadra para marcar a origem/ },
      { timeout: 20_000 },
    );

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(
      screen.queryByRole('button', { name: /Toque na quadra para marcar a origem/ }),
    ).not.toBeInTheDocument();

    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText('*01A#')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/parcial · faltam direção/)).toBeInTheDocument());
  }, 60_000);

  it('creates a serialized code profile and makes it selectable for a new match', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Equipes e atletas' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Configurações de perfis' }));
    expect(await screen.findByRole('heading', { name: 'Editor de perfis' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Validar e salvar perfil' }));
    expect(await screen.findByText('Perfil Meu perfil salvo e ativado.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Partidas' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nova partida' }));
    fireEvent.click(screen.getByRole('button', { name: 'Usar elenco demonstrativo' }));
    const language = await screen.findByLabelText('Linguagem de código');
    fireEvent.change(language, { target: { value: 'meu_profile' } });
    expect(language).toHaveValue('meu_profile');
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    await screen.findByLabelText('Digite o código', undefined, { timeout: 20_000 });

    const matches = await service.listMatches();
    expect(matches.ok && matches.value[0]?.codeProfileId).toBe('meu_profile');
  }, 60_000);

  it('starts a persisted situation-to-code training session and returns component feedback', async () => {
    const { service, trainingService } = createService();
    render(<App service={service} trainingService={trainingService} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar treino' }));
    expect(
      await screen.findByRole('heading', { name: 'Treino situação → código' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Básico/ })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Começar treino' }));

    const input = await screen.findByLabelText('Seu código');
    fireEvent.change(input, { target: { value: '08X?' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('Revisar código')).toBeInTheDocument();
    expect(screen.getByText('Resposta completa')).toBeInTheDocument();
    expect(screen.getByText('08S#')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByLabelText('Seu código')).toHaveValue('');

    const sessions = await trainingService.listSessions();
    expect(sessions.ok && sessions.value[0]?.attempts).toHaveLength(1);
  }, 60_000);
});
