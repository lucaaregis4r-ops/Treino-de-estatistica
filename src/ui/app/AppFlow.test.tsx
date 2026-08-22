import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('opens a permanent code manual from the main navigation', async () => {
    const { service, trainingService, profileEditorService } = createService();
    render(
      <App
        service={service}
        trainingService={trainingService}
        profileEditorService={profileEditorService}
      />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Manual' }));
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

    fireEvent.click(screen.getByRole('radio', { name: /Operacional/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const scoutInput = await screen.findByLabelText('Digite o código', undefined, {
      timeout: 20_000,
    });

    fireEvent.change(scoutInput, { target: { value: '*01A#' } });
    fireEvent.submit(scoutInput.closest('form')!);
    expect(await screen.findByText('*01A#')).toBeInTheDocument();

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
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar TXT' })).toBeInTheDocument();

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
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const input = await screen.findByLabelText('Digite o código', undefined, { timeout: 20_000 });

    fireEvent.change(input, { target: { value: '*01A#*02S+a03R#' } });
    fireEvent.submit(input.closest('form')!);

    expect(await screen.findByText('A03R#')).toBeInTheDocument();
    expect(screen.getByText('*02S+')).toBeInTheDocument();
    expect(screen.getByText('*01A#')).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue('*01A#*02S+a03R#*01S'));

    fireEvent.change(input, { target: { value: '99A#' } });
    expect(input).toHaveValue('*01A#*02S+a03R#*01S');

    fireEvent.change(input, { target: { value: '*01A#*02S+a03R#*01S*01X?' } });
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
    fireEvent.click(screen.getByRole('radio', { name: /Tático/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar e iniciar scout' }));
    const input = await screen.findByLabelText('Digite o código', undefined, { timeout: 20_000 });

    fireEvent.change(input, { target: { value: '*01A#' } });
    fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText(/parcial · faltam zona de origem/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Completar' }));
    fireEvent.change(screen.getByLabelText('Tipo da ação'), { target: { value: 'potência' } });
    fireEvent.change(screen.getByLabelText('Zona de origem'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Zona de destino'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Direção'), { target: { value: 'diagonal' } });
    const correction = screen.getByLabelText('Corrigindo evento');
    fireEvent.submit(correction.closest('form')!);

    expect(await screen.findByText('corrigido')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/parcial · faltam/)).not.toBeInTheDocument());
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

    fireEvent.click(await screen.findByRole('button', { name: 'Perfis' }));
    expect(await screen.findByRole('heading', { name: 'Editor de perfis' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Validar e salvar perfil' }));
    expect(await screen.findByText('Perfil Meu perfil salvo e ativado.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nova partida' }));
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
