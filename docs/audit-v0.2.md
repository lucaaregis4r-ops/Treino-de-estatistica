# Auditoria técnica — Scout Trainer 0.2

Data da auditoria: 25 de agosto de 2026
Escopo: macroetapa 1 do plano 0.2
Regra desta etapa: documentar o estado atual sem alterar comportamento funcional.

## 1. Resumo executivo

O projeto já possui uma base reaproveitável para a versão 0.2. O histórico de `MatchEvent` é persistido no IndexedDB, `OpenMatchUseCase` reconstrói o estado por replay, resultados terminais de rally podem gerar placar e troca de saque, a rotação é aplicada quando a equipe receptora vence, e correção/undo/redo são representados por eventos.

A implementação, porém, está dividida entre duas arquiteturas parcialmente sobrepostas. `ScoutTrainerService` concentra criação, registro, replay, correção, placar, sets, escalações, estatísticas, importação e exportação. Ao mesmo tempo, há casos de uso e um `ScoutEventHistory` alternativo que não participam do fluxo de produção. A UI ainda calcula ou interpreta parte do contexto operacional, embora o placar e o vencedor do rally já sejam decididos fora do React.

Conclusão: não é necessário reescrever a aplicação. A migração deve consolidar o fluxo existente de `MatchEvent` como caminho único, extrair responsabilidades do serviço central e tornar explícita a geração dos eventos derivados.

## 2. Fotografia do repositório

- Stack: React, TypeScript, Vite, Vitest, Playwright, IndexedDB e Electron.
- Versão declarada em `package.json`: `0.1.0`.
- Persistência principal: banco IndexedDB `scout-trainer`, versão 4.
- Aplicação web/PWA e empacotamento portátil para Windows.
- Branch local auditada: `main`, um commit atrás de `origin/main` no início da auditoria.
- Alteração remota pendente: somente `README.md` no commit conhecido `74b34c4`.
- Arquivo do plano 0.2 estava local e não rastreado pelo Git.
- Não foi encontrado `AGENTS.md` no repositório.

## 3. Mapa do fluxo atual

### 3.1 Criação e abertura da partida

```text
NewMatchScreen
  -> App.createMatch
  -> ScoutTrainerService.createMatch
      -> valida equipes, atletas, perfis e escalações
      -> grava Team, Player e MatchMetadata
      -> grava set_lineup_confirmed para cada escalação disponível
  -> ScoutTrainerService.loadMatch
      -> OpenMatchUseCase
          -> MatchRepository + EventRepository
          -> replayMatch
      -> carrega equipes, atletas e perfis
      -> projeta timeline, rally tático e estatísticas
  -> MatchWorkspace
  -> ScoutScreen
```

`CreateMatchUseCase` existe, mas não é usado pelo fluxo de produção; a criação completa está implementada diretamente em `ScoutTrainerService`.

### 3.2 Captura contínua e criação de ScoutEvent

```text
teclado em ScoutScreen
  -> ContinuousInputController
  -> ScoutCodeFramer
      -> detecta código completo, prefixo, enriquecimento ou erro
      -> separa vários códigos no mesmo buffer
  -> ScoutScreen interpreta sufixo/detalhes táticos
  -> ScoutTrainerService.registerScout
  -> RegisterScoutEventUseCase
      -> Normalizer
      -> Tokenizer
      -> Parser
      -> SemanticMapper
      -> ValidationEngine
      -> CompletenessEvaluator
      -> EventFactory
  -> scout_registered
  -> EventRepository.appendMany
  -> loadMatch/replay
```

O input suporta commit por fronteira do próximo código, commit manual e, para perfis não táticos, commit após 280 ms de inatividade. A UI mantém uma fila de Promises para preservar a ordem de vários códigos reconhecidos no mesmo stream.

### 3.3 Rally, placar, saque, set e rotação

```text
ScoutEvent terminal
  -> RallyOutcomeResolver
  -> ScoutTrainerService.automaticResultEvents
      -> rally_result
      -> opcionalmente set_finished
  -> MatchReducer
      -> +1 no placar
      -> servingTeamId = vencedor
      -> rotaciona vencedor se ele estava recebendo
      -> atualiza SetState
      -> marca partida completa quando alcança setsToWin
```

O `RallyOutcomeResolver` atual encerra rally nos casos:

- ace de saque;
- ponto de ataque;
- ponto de bloqueio;
- erro de saque;
- erro de ataque.

Resultados como erro de recepção e outras combinações terminais ainda não estão cobertos. O fim de set é calculado por `setWinner`, com alvo 25, tie-break 15, diferença mínima de 2 e melhor de cinco por padrão.

### 3.4 Replay, correção, undo e redo

```text
EventRepository.listByMatch
  -> projectScoutTimeline
      -> aplica correções ativas
      -> exclui registros desfeitos
      -> reinsere ações refeitas
  -> projectEffectiveMatchEvents
      -> mantém apenas eventos derivados ligados à versão ativa do scout
  -> reduceMatch
  -> MatchState
```

`correctScout` cria `scout_corrected` com um `replacementEvent` e regenera `rally_result`/`set_finished` quando necessário. `undo` e `redo` acrescentam `scout_undone` e `scout_redone`; não decrementam placar diretamente. Esse é o caminho correto para a arquitetura desejada.

Existe também `ScoutEventHistory`, com tipos próprios `scout`, `correction`, `undo` e `redo`. Ele aparece apenas em seus testes e não participa da persistência ou do replay da partida.

### 3.5 Lineup, roster, rotação e substituição

- `Player` contém identidade, equipe, número, nome e estado ativo; não contém função tática.
- `SetLineup` separa `LineupSlot`, `tacticalRole`, `playerId` e posição P1–P6.
- `RotationEngine` movimenta os slots, preservando a função tática associada ao slot.
- `EventFactory` anexa ao scout o `lineupContext` do jogador no instante da captura.
- `SubstitutionEvent` troca o atleta do slot e mantém o slot/função.
- `ScoutTrainerService.substitute` valida e persiste substituições, mas não há caminho correspondente exposto na interface atual.
- O líbero é armazenado em `MatchMetadata.liberoPlayerIds`, porém ainda não há regra operacional de entrada/saída do líbero.
- Não existe resolução de levantador ativo, agrupamento de substituições ou detecção de inversão do 5x1.

### 3.6 Estatísticas

```text
timeline efetiva + RallyContextResolver
  -> StatisticsEngine
      -> MetricRegistry
      -> métricas básicas/CBV/táticas
  -> StatisticsDashboardViewModel
  -> TacticalAnalyticsViewModel
  -> SummaryScreen
```

O motor usa definições registradas e retorna `MetricResult` com valor, numerador, denominador, componentes e breakdown auditável. O escopo já aceita equipe, atleta, set, skill, rotação, fase e direção.

Já existem métricas de:

- volume, pontos, erros e eficiência de ataque;
- volume, aces, erros e sucesso/eficiência de saque;
- volume e qualidade de recepção;
- pontos e eficiência de bloqueio;
- distribuições táticas por origem, destino, direção, tipo, combinação e rotação;
- sideout, breakpoint e transição;
- distribuição do levantador por atacante, zona, chamada, rotação e recepção.

Limitações relevantes:

- `setterPosition` ainda não é um filtro canônico do escopo estatístico;
- a rotação tática é derivada procurando o slot com papel fixo `setter`, não o levantador realmente ativo;
- não há matriz conjunta origem × destino por atleta e posição do levantador;
- a tela calcula apenas escopo por equipe no carregamento atual;
- participação do atleta por set existe no contrato, mas não é alimentada no workspace;
- algumas métricas dependem da completude manual dos metadados táticos.

### 3.7 UI

`App.tsx` faz a composição das dependências e também centraliza navegação, downloads e várias operações assíncronas. `ScoutScreen.tsx` reúne em um único componente:

- cabeçalho e correção manual de ponto;
- contexto de saque;
- captura contínua;
- enriquecimento tático;
- quadra tática;
- editor rápido;
- correção de evento;
- undo/redo;
- timeline paginada;
- visualização de lineup e rotação;
- exportação.

`TacticalCourt` já é um componente separado. `SummaryScreen` apresenta placar, sets, métricas básicas, métricas táticas e exportações. `NewMatchScreen` configura roster, líbero, lineup, saque inicial e perfis.

### 3.8 Exportação e persistência

- JSON: exportação mestre com schema `1.0.0`, metadados, equipes, atletas, snapshots de perfis e todos os `MatchEvent`.
- Importação JSON: valida tamanho, schema, entidades, perfis, IDs e sequências; restaura tudo em transação IndexedDB.
- CSV de scouts: exporta apenas a timeline efetiva, não o histórico bruto.
- TXT: exporta os códigos efetivos, um por linha.
- CSV de sets: exporta placares e vencedor por set.
- Bundle atual: `partida.json`, `scouts.csv`, `codigos.txt` e `placar-sets.csv`.
- Pasta conectada: usa File System Access API; o handle só permanece em memória na sessão atual.
- Persistência: eventos append-only com índices por partida e sequência única; entidades ficam em stores separados.
- PDF e `MatchReportModel` ainda não existem.

## 4. Responsabilidades por módulo

| Módulo              | Responsabilidade atual                                           | Reutilização recomendada                                       |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `domain/match`      | eventos, replay, placar, sets, lineup, rotação e substituição    | manter como núcleo do estado da partida                        |
| `domain/rally`      | fase, contexto tático, estado e resultado terminal               | ampliar regras terminais e separar projeções de comandos       |
| `domain/scout`      | linguagem, parsing, validação, evento canônico e metadata tática | manter pipeline e consolidar um único histórico                |
| `domain/statistics` | registro, filtros, métricas básicas/CBV/táticas                  | ampliar escopos e analytics compostos                          |
| `application`       | orquestração e view-models; hoje também instancia infraestrutura | dividir `ScoutTrainerService` em casos de uso/serviços menores |
| `infrastructure`    | IndexedDB, importação e exportação                               | manter adapters e introduzir portas de exportação              |
| `ui`                | navegação, formulários, captura e visualização                   | decompor `ScoutScreen`; consumir contexto já resolvido         |

## 5. Pontos de acoplamento

1. `ScoutTrainerService` importa diretamente exportadores/importador concretos de `infrastructure`, invertendo a dependência desejada para application.
2. `MatchBackupRepository`, uma porta de application, depende do tipo concreto `MatchExport` declarado em infrastructure.
3. `ScoutScreen` instancia `DirectionResolver` e `TacticalInputInterpreter` e constrói `ScoutEventMetadata`.
4. `ScoutScreen` resolve visualmente o sacador e a posição do levantador a partir de `SetLineup`.
5. `ScoutTrainerService.loadMatch` recalcula replay, timeline, métricas e projeções completas após cada ação; o caminho é simples e determinístico, mas centralizado e potencialmente caro.
6. `RallyOutcomeResolver` está no domínio, porém a tradução para `MatchEvent` e o fechamento do set estão embutidos no serviço de aplicação.
7. A correção recria o scout usando parte do contexto histórico armazenado e parte do lineup atual; isso exige cuidado para não contaminar correções retroativas.
8. `App.tsx` conhece operações concretas de download e File System Access, além da navegação e do estado global.

## 6. Código duplicado ou concorrente

- `ScoutEventHistory` duplica a semântica implementada por `MatchEvent` + `ScoutTimeline`.
- `CreateMatchUseCase` e `RegisterAndPersistScoutEventUseCase` coexistem com implementações diretas em `ScoutTrainerService`, mas não são usados no fluxo principal.
- Os tipos `score_changed`, `serving_team_changed` e `rally_ended` permanecem no modelo e no importador, enquanto o fluxo atual usa preferencialmente `rally_result`.
- A descoberta da posição do levantador aparece em `RallyContextResolver` e novamente em `ScoutScreen`.
- A montagem de lineup padrão/configurado e a seleção de lineup corrente aparecem em múltiplos pontos de `ScoutTrainerService`.
- Metadados táticos podem vir de formulário, comando inline ou editor rápido e são combinados dentro da UI; a normalização canônica posterior reduz divergências, mas há mais de um caminho de montagem.

## 7. Responsabilidades incorretas ou frágeis na UI

A UI não altera o placar diretamente: `Corrigir +1` dispara uma intenção para application. Também não escolhe o vencedor automático do rally. Esses limites devem ser preservados.

Devem migrar para application/domain:

- resolução do sacador atual;
- resolução do levantador e sua posição;
- interpretação e merge canônico de metadados táticos;
- escolha do contexto histórico usado em correções;
- construção de um view-model único de contexto da partida.

Podem permanecer na UI:

- estado visual de foco, painel aberto e paginação;
- desenho/seleção bruta de pontos da quadra;
- captura de intenção do operador;
- apresentação de validação e completude.

## 8. Riscos priorizados

### Altos

1. **Dois modelos de histórico:** evoluir `ScoutEventHistory` e `ScoutTimeline` em paralelo pode produzir semânticas diferentes de correção e undo/redo.
2. **Evento derivado criado fora de uma fábrica explícita:** vínculos entre scout, `rally_result` e `set_finished` dependem de IDs e sequências montados manualmente em `ScoutTrainerService`.
3. **Correção manual de ponto:** quando não há rally corrente, `awardPoint` prepara `rally_started` e `rally_result` com a mesma sequência; o índice único `[matchId, sequence]` pode rejeitar a gravação. Além disso, a ação é `rally_result` com razão manual, não um tipo explícito de correção.
4. **Contexto retroativo:** correções podem consultar o lineup corrente quando o evento não carrega contexto suficiente; futuras substituições tornam esse fallback perigoso.
5. **Levantador fixo por slot:** analytics e UI assumem que o slot cadastrado como `setter` identifica sempre o levantador ativo, incompatível com substituições e inversão do 5x1.

### Médios

1. O resolver terminal cobre apenas parte dos desfechos possíveis do rally.
2. A substituição existe em domínio/application, mas não pode ser executada pela UI.
3. O líbero é cadastro passivo, sem eventos ou regras de atuação.
4. `MatchMetadata.status` não é atualizado quando o reducer conclui a partida; a conclusão reside apenas em `MatchState.matchCompleted`.
5. Recarregar todo o workspace e recalcular todas as métricas após cada contato pode degradar partidas longas; há teste com 5.000 eventos, mas não um orçamento separado por etapa.
6. A validação de importação é profunda para scouts, mas menos específica para cada variante de evento de sistema.
7. A pasta de exportação conectada não é restaurada após recarregar a aplicação.

### Baixos

1. Nomes do bundle atual diferem dos nomes propostos para 0.2.
2. A camada de arquitetura é testada apenas no sentido `domain/core`; não impede application de depender de infrastructure.
3. O E2E crítico não cobre partida de três sets, substituição, rotação completa ou correção manual de placar.

## 9. Proposta de migração incremental

### Etapa 2 — motor derivado de eventos

1. Declarar `MatchEvent` + `ScoutTimeline` como histórico canônico e descontinuar o modelo paralelo `ScoutEventHistory`.
2. Extrair `MatchEventFactory` de `ScoutTrainerService`, incluindo criação atômica e sequenciamento de `rally_started`, `rally_result`, `set_finished` e correções.
3. Ampliar `RallyOutcomeResolver` com uma tabela explícita de desfechos terminais.
4. Introduzir `MatchReplayService` como fachada para projeção + reducer, preservando `reduceMatch` puro.
5. Modelar correções manuais como eventos auditáveis e reproduzíveis, sem mutação direta.
6. Adicionar testes de determinismo, correção terminal/não terminal, sequência única e equivalência undo + redo.

### Etapa 3 — lineup e tática derivada

1. Expor comandos/casos de uso de lineup e substituição sem passar regras pela UI.
2. Adicionar papel cadastrado e papel ativo sem fundi-los com posição rotacional.
3. Criar `ActiveSetterResolver` e depois `TacticalPatternDetector`.
4. Derivar agrupamentos de substituição do mesmo set, score, equipe e janela pré-rally.
5. Anexar ao scout a identidade/posição do levantador e formação vigentes no momento do evento.

### Etapa 4 — workspace

1. Criar view-model de contexto pronto para renderização.
2. Extrair gradualmente `ScoreHeader`, `MatchContextBar`, `CourtLineup`, `ScoutInput`, `InputFeedback`, `EventTimeline`, `TacticalQuickEditor`, `EventEditor` e `MatchActions`.
3. Manter `ContinuousInputController` e a fila ordenada de commits, cobrindo foco e atalhos em E2E.

### Etapas 5 e 6 — analytics e relatório

1. Ampliar `StatisticsScope` com identidade e posição real do levantador/formação.
2. Criar consultas compostas e `MatchAnalyticsService`, reaproveitando `StatisticsEngine` e os numeradores/denominadores existentes.
3. Introduzir `MatchReportModel` independente da UI.
4. Implementar PDF como renderer do report model e atualizar o bundle sem retirar o JSON mestre.

## 10. Critérios de segurança para as próximas alterações

- Todo estado exibido de placar, saque, set, rotação e lineup deve ser reproduzível do log.
- Eventos de sistema devem ter IDs e sequências únicos, ordenação determinística e vínculo explícito com a causa.
- Correções retroativas não podem consultar estado futuro sem uma regra explícita de replay.
- Adapters de IndexedDB/exportação devem permanecer substituíveis por portas de application.
- Cada extração do `ScoutTrainerService` e do `ScoutScreen` deve manter os testes verdes antes da extração seguinte.
- JSON deve continuar round-trip compatível ou receber migração de schema explícita.

## 11. Cobertura e lacunas de testes observadas

Há testes unitários para parser, validação, input contínuo, histórico, rally, reducer, rotação, roster, regras de set, métricas, exportadores e componentes selecionados. Há integração para IndexedDB e limites de camada, teste de desempenho com 5.000 eventos e E2E do fluxo crítico de captura/exportação.

Prioridades de cobertura antes de ampliar comportamento:

- `awardPoint` iniciando um novo rally;
- replay após múltiplas correções, undo e redo intercalados;
- evento terminal corrigido para não terminal e vice-versa;
- fim de set/partida e início do set seguinte;
- substituição seguida de scout e replay;
- rotação completa com troca de saque;
- round-trip JSON com todos os tipos de evento;
- E2E de três sets e 150+ contatos, conforme o plano 0.2.

## 12. Decisão recomendada

A macroetapa 2 deve começar pela consolidação do histórico e pela extração de `MatchEventFactory`, não por uma nova implementação de reducer. `reduceMatch`, `replayMatch`, `RallyOutcomeResolver`, `ScoutTimeline`, `RotationEngine`, o pipeline de parsing e `StatisticsEngine` são o núcleo reutilizável. O objetivo imediato é tornar esse núcleo o único caminho de produção e cobrir as inconsistências conhecidas antes de expandir lineup, UI e analytics.

## 13. Verificações executadas nesta auditoria

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado; 122 módulos transformados.
- `npx prettier --check docs/audit-v0.2.md`: aprovado após formatação.
- `npm test`: 35 arquivos e 206 testes concluíram com sucesso, mas a execução terminou com erro porque seis workers não iniciaram dentro do timeout do Vitest.
- Repetição serial: confirmou uma falha de espera em `AppFlow.test.tsx`, no cenário “frames a concatenated scout stream and closes its final event with Enter”. O terceiro código (`A03R#`) não apareceu antes do timeout do `findByText`; a fila ainda estava ocupada e a UI mostrava apenas os dois primeiros eventos.

Nenhuma dessas verificações foi causada por mudança de comportamento nesta macroetapa, pois o único arquivo criado foi esta documentação. A instabilidade/falha do fluxo concatenado deve ser tratada como baseline conhecido e estabilizada no início da macroetapa 2, junto com os testes de sequenciamento do input.
