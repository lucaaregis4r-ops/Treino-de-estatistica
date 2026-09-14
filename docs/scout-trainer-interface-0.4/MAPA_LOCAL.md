# Mapa local — Scout Trainer Interface 0.4

Inventário U0 executado em 13/09/2026. Este documento descreve o checkout local, que é a fonte de verdade. U1–U7 preservaram as alterações preexistentes; a auditoria U7 está em `ENTREGA.md`/`VALIDACAO.md`. Contagens de U0–U6 abaixo são históricas, não o resultado final da U7.

## Checkout e baseline

| Item | Valor |
|---|---|
| Branch | `main` |
| HEAD | `7960bf4fe93f8d731e0ceaece314fabac253f89b` |
| Referência remota do pacote | mesmo commit-base, consultado no plano |
| Versão do pacote | `0.3.0` |
| Node usado nos testes | `22.23.2` via `/home/lucasregis/.nvm` |
| Node do shell sem seleção | `18.19.1`; incompatível com o Playwright local |
| Situação | árvore muito modificada, com alterações em aplicação, domínio, infraestrutura, UI, testes e documentos; preservada integralmente |
| Instruções locais | arquivo ` AGENTS.md` (há um espaço inicial no nome) |

O checkout já contém recursos posteriores à referência: modo Gestual, captura espacial compartilhada, rotação/substituições, análises espaciais, configurações salvas, gráficos para relatório e banco IndexedDB na versão 8. A referência remota não foi usada para substituir ou reconstruir o código local.

## Caminhos confiáveis

| Função | Caminho local | Estado proprietário | Escrita/saída | Testes ou evidência |
|---|---|---|---|---|
| Shell e navegação | `src/ui/app/App.tsx` | `screen`, `workspace`, `busy`, `message` | chama `ScoutTrainerService`; injeta handlers em `ScoutScreen`, `SummaryScreen` e análise | `src/ui/app/App.test.tsx`, `src/ui/app/AppFlow.test.tsx` |
| Estilo global/importação | `src/main.tsx`, `src/ui/app/app.css` | CSS global carregado uma vez pelo entrypoint | estilos de navegação, hero, painéis, registro, quadras e botões | lint/inspeção visual |
| Início e Partidas | `src/ui/screens/home/HomeScreen.tsx`, `src/ui/screens/matches/MatchesScreen.tsx`, `matchPresentation.ts` | lista `matches` em `App`; filtros somente na apresentação | `listMatches`, `openMatch`, `createMatch`, importação | `App.test.tsx`, `MatchesScreen.test.tsx`, `AppFlow.test.tsx`, capturas U2 |
| Nova partida | `src/ui/screens/match-setup/NewMatchScreen.tsx` | estado do formulário local | `App.createMatch` → `ScoutTrainerService.createMatch` | `AppFlow.test.tsx`, fluxo visual U0 |
| Contexto da partida | cabeçalho em `App.tsx`, `MatchContextBar.tsx`, `ScoreHeader.tsx` | `ScoutScreen` e `workspace.state` | placar, sets vencidos, cobertura, detalhes e recuperação | inspeção visual U3 e testes de fluxo |
| Seletor de modo | `ScoutModeSelector.tsx` | `inputMode` + `gestureMode` em `ScoutScreen` | troca entre `typed`, `visual`, `hybrid` e `gesture` | `ScoutModeSelector.test.tsx` |
| Histórico/correção | `EventTimeline.tsx` | `workspace.timeline` e `historyLimit` | `onCorrect`, `onUndo`, `onRedo`; linhas visuais compactas com correção e histórico completo | `AppFlow.test.tsx`, testes de serviço e verificação U4 |
| Escalações/trocas | `CourtLineup.tsx`, `NextSetLineupEditor.tsx` | `workspace.currentLineups` e eventos de partida | `service.substitute`, `service.startNextSet`; troca com sai/entra, busy e retorno | `AppFlow.test.tsx` e verificação U4 |
| Serviço de domínio/aplicação | `src/application/ScoutTrainerService.ts` | workspace reconstituído dos repositórios/eventos | `registerScout`, `registerVisualScout`, `registerHybridScout`, `correctScout`, `undo`, `redo` | testes de casos de uso, integração e fluxo |
| Eventos e validação | `src/application/use-cases/register-scout-event/`, `src/domain/scout/mapper/`, `src/domain/scout/validators/` | candidato canônico e contexto de validação | cria evento `scout_registered` e derivados de rally/placar | testes de mapper, validação e reducers |
| Partida/persistência | `src/infrastructure/persistence/indexeddb/`, `ScoutTrainerDatabase.ts` | IndexedDB, versão 8 | partidas, eventos, equipes, atletas, snapshots, análises e gráficos | testes de integração IndexedDB |
| Análise espacial | `SpatialAnalyticsPanel.tsx`, `SpatialAnalyticsPanel.css`, `heatmap.ts` | filtros e configuração local do painel | `onSaveAnalysisConfiguration` → `IndexedDbAnalysisConfigurationRepository` | `SpatialAnalyticsPanel.test.tsx`, fluxo de análise |
| Relatório | `MatchAnalyticsPanel.tsx`, `MatchReportModel.ts`, exporters em `src/infrastructure/export/` | seleção de gráficos em `App` | `IndexedDbReportChartConfigurationRepository`, PDF/JSON/CSV/TXT | testes de exportação e análise |
| Telas auxiliares U6 | `NewMatchScreen.tsx`, `RegistrationsScreen.tsx`, `ProfileEditorScreen.tsx`, `TrainingScreen.tsx`, `FreeLogScreen.tsx`, `ManualScreen.tsx` | estado local dos formulários; `App` mantém navegação e serviços | labels/erros associados, reflow responsivo, foco de feedback e listas preservam handlers existentes | typecheck, lint direcionado, 5 arquivos/9 testes e matriz Chrome |

## Modos de entrada e confirmação

Atualização de registro em 14/09: `QuickMatchAdjustment.tsx` abre o ajuste de P1, equipe sacadora e placar em uma ação; `App` → `ScoutTrainerService.adjustMatchContext` valida e grava um lote dos tipos de evento existentes. `ScoutScreen` mantém a confirmação manual e oferece envio ao soltar via o mesmo `commitCurrentGesture`, com trava e retenção do draft em erro. `Bola de graça` agora seleciona o contato atual; grava `free_ball`/trajetória, sem corrigir ataque anterior. `GestureExpectedActionResolver` traduz a expectativa `free_ball_sent` em defesa adversária apenas no Gestual. Esses comportamentos substituem a descrição histórica do callback `free_ball` abaixo. Guia: `../REGISTRO_RAPIDO.md`.

| Modo | UI efetivamente montada | Coordenadas | Confirmação | Escrita final |
|---|---|---|---|---|
| Digitado | `ScoutScreen.tsx` + `ScoutInput.tsx` | Código tático; quando habilitado, `SpatialCourtInputV2` usa o retângulo da superfície em dois cliques | `Enter` executa `manualCommit`; fora do tático também existe auto-commit após 280 ms. `Escape` limpa rascunho/captura. Em edição, `Enter` corrige | `enqueueCodes` serializa a fila e chama `onRegister` → `service.registerScout` |
| Visual | `VolleyballVisualScout.tsx` | `SpatialCourtInputV2`/`SpatialCourtSurface`; origem e destino normalizados por `getBoundingClientRect` | seleciona ação, qualidade, atleta opcional e trajetória; botão ou `Enter` submete o formulário. `Escape` refaz a trajetória | `onRegister` → `service.registerVisualScout` → `VisualScoutMapper` |
| Híbrido | `VisualScoutForm.tsx`, orquestrado por `ScoutScreen.tsx` | campos táticos e `SpatialCourtInputV2` separado quando a configuração permite | exige código digitado e campos do formulário; `submitVisual` combina código e draft visual | `onRegisterHybrid` → `service.registerHybridScout` → `HybridScoutMerger` |
| Gestual | `gesture/GestureScout.tsx` + `GestureCourtInput.tsx` | arraste no frame; `framePointToSpatialPoint` distingue `court`/`outZone` e usa retângulos de frame e quadra | trajetória torna o draft apto; botão `Registrar · Enter` ou `Enter` no `ScoutScreen` confirma uma vez; `Escape` limpa o draft | `commitCurrentGesture` → `onRegisterVisual` → `service.registerVisualScout`, com `#`/`=` convertidos em avaliação `excellent`/`error` e ausência em `neutral` |

Detalhes de confirmação observados:

- O `onConfirm` de `SpatialCourtInputV2` confirma somente a geometria. A persistência depende do `onRegister` do formulário ou do commit gestual.
- O `SpatialCourtInputV2` atual está efetivamente usado no Visual e no painel tático do Digitado/Híbrido. `src/ui/screens/scout/MiniCourt.tsx` e `TacticalCourt.tsx` existem, mas não são montados pelos fluxos atuais de `ScoutScreen`; não devem ser tratados como a quadra ativa sem nova evidência.
- `GestureDraftState.ts` separa `awaiting_gesture`, `awaiting_player`, `ready_to_commit`, `committing` e `error`. A seleção de atleta pode ser identificada ou `Sem atleta`; Visual, Híbrido e Gestual preservam a seleção explícita sem atleta mesmo quando existe sugestão automática.
- `#` e `=` são toggles: o mesmo botão pode ser clicado novamente para voltar a `undefined`; `AttackOutcomeBar.test`/`GestureScout.test` cobrem isso. `Bola de graça` e ações secundárias também possuem `aria-pressed`/destaque local. No callback atual, apenas `free_ball` tem tratamento de escrita — ele corrige o ataque anterior; as demais ações rápidas não produzem evento próprio.
- O modo Gestual é apresentado como modo único, mas internamente ativa `gestureMode` e força `inputMode` para `visual`.

## Análises, salvamento e relatório

`App.tsx` carrega, por partida, `analysisConfigurations` e `reportChartConfigurations`. Os repositórios são criados em `createBrowserService.ts` e usam as stores `analysisConfigurations` e `reportChartConfigurations` da `ScoutTrainerDatabase.ts` (versão 8). O painel espacial preserva filtros de equipe, atleta, set, posição do levantador, avaliação e coordenada; o painel de análise expõe a seleção persistida de gráficos para o PDF. A Análise mantém as quatro seções montadas (`Quadra`, `Desempenho`, `Distribuição`, `Evolução`) e inicia em `Quadra`; o painel de análises salvas é filtrado por partida/equipe, acusa alterações não salvas e informa contagem de coordenadas efetivas. Não há nova persistência paralela na camada de UI.

## CSS e composição atual

`src/main.tsx` importa primeiro `src/ui/styles/tokens.css` e depois `app.css`; os estilos específicos são importados pelos componentes `VolleyballVisualScout.tsx`, `GestureCourtInput.tsx` e `SpatialCourtSurface.tsx`. Os aliases históricos de `app.css` apontam para os tokens compartilhados. A U2 acrescentou os seletores de entrada/histórico `.home-heading`, `.resume-strip`, `.home-match-list`, `.matches-toolbar`, `.matches-list` e `.match-row`, com adaptação para 800 px e 560 px. A U3 acrescentou `.match-context-primary-row`, `.match-context-secondary-row`, `.match-context-details`, `.capture-heading` e as áreas da grade `.capture`, `.lineups`, `.timeline` e `.footer`; em 1366 px a grade usa escalações laterais e até 1279 px empilha a captura e as escalações. Os principais seletores encontrados são:

- navegação e entrada: `.app-nav`, `.match-workspace-nav`, `.scout-header`, `.button`, `.home-screen`, `.hero-copy`, `.panel-title-row`, `.capture-heading`;
- contexto da partida: `.match-context-bar`, `.match-context-primary-row`, `.match-context-secondary-row`, `.match-context-details`, `.recovery-tools`;
- captura tática: `.capture-workspace`, `.scout-input`, `.tactical-panel`, `.tactical-court-panel`, `.court-mode-toggle`, `.tactical-court`, `.court-zone`;
- visual/espacial: `.volley-visual`, `.volley-board`, `.volley-court`, `.volley-visual button[aria-pressed='true']`, `.spatial-v2-surface`;
- gestual: `.gesture-scout`, `.gesture-preparation-panel`, `.gesture-operation-bar`, `.gesture-picker button[aria-pressed='true']`, `.gesture-outcome button[aria-pressed='true']`, `.gesture-quick-actions button[aria-pressed='true']`;
- análise: `.analysis-tabs`, `.spatial-points-panel`, `.analysis-more-filters`, `.analysis-toolbar`, `.analysis-heat-court`, `.analysis-heat-legend`, `.win-probability-card`, `.report-chart-option`.

Há duplicação/legado de estilos no próprio checkout: `.mini-court*` aparece em blocos separados de `app.css`; `.score-header` tem regras gerais e sobrescritas posteriores; o arquivo global também contém regras antigas de captura junto às regras específicas novas. Isto foi somente registrado; nenhum CSS foi reorganizado na U0.

Atualização U6: `app.css` mantém os aliases dos tokens e recebeu apenas regras pontuais de reflow para telas auxiliares; `registrations.css` concentra a lista/cadastro e `SpatialCourtInputV2.css` mantém `touch-action` no alvo espacial. A rolagem horizontal do Manual fica em `.manual-table-wrap`; não há `overflow: hidden` global para cortar o conteúdo. O foco do feedback de Treino é controlado em `TrainingScreen.tsx`; não há modal novo nem biblioteca visual adicionada.

## Fixtures e cenários reproduzíveis

Atualização U7: `PlayerQuickPicker.tsx` recebe `gestureLineup`, elenco ativo da equipe da ação e IDs de líberos, todos derivados em `ScoutScreen.tsx`. A ordem é P4/P3/P2 e P5/P6/P1, sem ordenar pela sugestão. Selecionar líbero/reserva só altera o rascunho; não executa substituição. Mais de um líbero usa um seletor de disponibilidade e mantém um único botão de registro. `GestureScout.tsx` separa preparação, quadra, qualidade/ações e confirmação; `gesture.css` respeita a grade externa principal + escalações de 256 px. A largura do seletor foi ajustada para 220 px para acomodar os rótulos explícitos pedidos, um ajuste local de legibilidade em relação aos 196 px previstos no contrato; abaixo de 1024 px segue fluxo vertical. `GestureCourtInput.tsx` recebe os nomes dos lados por `courtOrientation`, fora da superfície normalizada. `MatchContextBar.tsx` fecha seus disclosures por Escape e retorna o foco; `data-native-keys` impede disparo do registro ao operar os detalhes.

Roteiro U7: `e2e/u7-interface.spec.ts`, usando Playwright já instalado e `channel: 'chrome'` do projeto. `output/u7/partida-antes.json` é a fixture sintética de U6, preservada antes das correções desta solicitação. Não regenerar a fase `before` no código novo e chamá-la de baseline antigo. As capturas `before-*`/`after-*` usam os mesmos dados e tamanhos. O PDF é salvo binário diretamente do download.

- partida vazia/em andamento: `AppFlow.test.tsx` cria uma partida via `createService()` com `ScoutTrainerDatabase` de nome aleatório;
- duas equipes e jogadores: `ScoutTrainerService.createMatch` nos testes de fluxo e integração;
- eventos sem atleta: `VisualScoutForm`/`VolleyballVisualScout` oferecem `Sem atleta identificado`; há casos de analytics com `playerId` ausente;
- ação espacial: `VolleyballVisualScout.test.tsx`, `SpatialCourtInputV2.test.tsx`, `GestureCourtInput.test.tsx` e os testes de integração de projeção usam coordenadas normalizadas;
- análise salva: `SpatialAnalyticsPanel.test.tsx` cobre `Salvar análise`; o armazenamento real está nos repositórios IndexedDB acima;
- finalização de partida, correção, desfazer/refazer, substituição e novo set: cenários correspondentes em `AppFlow.test.tsx` e `ScoutTrainerService`.

Não foi necessário limpar a base do usuário. A captura manual U0 criou uma partida de demonstração no perfil padrão apenas no contexto do navegador local usado para as imagens.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `npm run typecheck` com Node 22.23.2 | aprovado após U5 |
| testes focados de captura/análise, 10 arquivos | 31/31 aprovados |
| `App.test.tsx` + `MatchesScreen.test.tsx` | 2/2 arquivos e 2/2 testes aprovados |
| cenário de Perfis em `AppFlow.test.tsx` | aprovado após navegação `Cadastros` → `Perfis` → `Partidas` |
| verificação visual U2 | 1366×640 e 390×844; página sem overflow horizontal; foco de navegação visível |
| verificação visual U3 | 1366×640, 1024×768 e 390×844; grade lateral/empilhada, modos montados, sem overflow horizontal |
| risco de coordenadas U3 | quadra 2:1; pontos 5%/95% preservados após tamanhos diferentes; overlays sem captura de ponteiros |
| testes focados U3 | 7 arquivos e 19 testes aprovados |
| verificação U4 | Visual/Gestual: seleção, tecla de qualidade, sem atleta, retorno de sucesso e rascunho preservado pelos handlers de falha; troca de reserva atualizada |
| testes focados U4 | 6 arquivos e 18 testes aprovados |
| `npm run lint` | falhou no baseline: 22 erros e 1 aviso, espalhados por testes, `App.tsx`, `NewMatchScreen.tsx`, `ScoutScreen.tsx`, Visual, Gestual e Análise |
| `App.test.tsx` + `AppFlow.test.tsx` | 8/14 aprovados; 6 falhas de expectativa de UI antiga |
| U5 — testes focados de análise/exportação | 3 arquivos, 9/9 testes aprovados; canvas sem implementação no jsdom foi apenas aviso |
| U5 — `npm run build` | aprovado; aviso existente de chunk acima de 500 kB |
| U5 — E2E visual do changelog | bloqueado antes da Análise: roteiro legado não encontrou `Nova partida` após `Cadastros` em 30 s; não foi usado como validação |
| execução visual | servidor Vite em `127.0.0.1:4175`, Chromium headless em 1366×640; Início, Partidas, Nova partida, quatro modos e Análise capturados |

Capturas geradas no checkout: `output/u0-home-1366x640.png`, `u0-matches-1366x640.png`, `u0-new-match-1366x640.png`, `u0-register-typed-1366x640.png`, `u0-register-visual-1366x640.png`, `u0-register-híbrido-1366x640.png`, `u0-register-gestual-1366x640.png` e `u0-analysis-1366x640.png`.

## Bloqueios reais e próxima etapa

1. O lint global não está limpo; as violações são baseline do checkout e não foram introduzidas pela U0.
2. Auditoria U7: AppFlow tem oito falhas reproduzíveis tanto na cópia anterior às correções quanto no código atual; a suíte completa teve ainda uma falha transitória de próximo set. Há seletores/rótulos antigos e expectativas temporais/de projeção a reconciliar, não apenas seis falhas de texto. O E2E crítico também não está limpo. Detalhes e evidências em `ENTREGA.md`.
3. O callback das ações rápidas gestuais secundárias não grava evento próprio; `free_ball` segue uma correção do ataque anterior. Isso é uma lacuna funcional a decidir antes de prometer esses comandos no redesenho.
4. O checkout está sujo e muito à frente da referência. Qualquer etapa posterior deve continuar usando os caminhos acima e não fazer saneamento global.

Próxima ação: **fechamento das pendências de validação da U7**, executada e parcialmente verificada. Não há U8 prevista. Build/typecheck, verificações dirigidas e capturas foram executados; a matriz não foi marcada como inteiramente aprovada.
