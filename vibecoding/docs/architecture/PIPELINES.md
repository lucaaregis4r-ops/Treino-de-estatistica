# Arquitetura das pipelines

Este documento registra o fluxo arquitetural do produto. Profiles, entrada de scout, validação,
eventos, IndexedDB, replay, UI operacional, estatísticas, treino, exportações, editor de profiles,
PWA, recovery, migrações, carga e E2E estão implementados.

O core automático da Evolução V2 também está implementado conforme os fluxos abaixo.

## Regra de dependência

```text
UI → Application → Domain
         ↑             ↑
         └─ Infrastructure
```

A UI aciona casos de uso. Casos de uso coordenam o domínio por contratos. A infraestrutura
implementa persistência, importação e exportação sem ser importada pelo domínio.

## Pipeline principal de scout

```text
Keyboard
  → ContinuousInputController
  → InputBuffer
  → ScoutCodeFramer (estrutura do CodeProfile)
  → fronteira inequívoca ou idle commit
  → RawScoutInput
  → ProfileResolver
  → Normalizer
  → Tokenizer
  → Parser
  → SemanticMapper
  → CanonicalScoutEventCandidate
  → SyntaxValidator
  → ProfileValidator
  → MatchValidator
  → CompetitionValidator
  → CompletenessEvaluator (não bloqueante)
  → EventFactory
  → ScoutEvent
  → EventRepository
  → MatchReducer
  → StatisticsInvalidation
  → UI update
```

O framer classifica incrementalmente o buffer como `empty`, `prefix`, `core_complete`, `enriching`,
`complete` ou `invalid`. Ele conhece somente a linguagem estrutural declarada pelo `CodeProfile`.
Quando encontra o prefixo inequívoco do evento seguinte, fecha o anterior; no último código, somente
faz auto-commit após a janela de ociosidade e se o núcleo estiver pronto. Enter permanece como commit
manual opcional. Prefixos e entradas inválidas nunca criam eventos.

## Pipeline de validade, completude e enriquecimento

```text
CanonicalScoutEventCandidate
  ├─ ValidationEngine
  │    └─ somente CaptureRequirement=blocking pode impedir persistência
  └─ CompletenessEvaluator
       └─ recommended ausente → partial + missingRecommendedFields
            → ScoutEvent persistido
            → feedback compacto na UI

detalhes adicionados depois
  → ScoutCorrectedEvent com mesmo rawCode e metadata enriquecida
  → novo snapshot de CompletenessResult
  → timeline efetiva / undo / redo / replay
```

`optional` não gera alerta e `derived` pertence aos resolvedores de contexto. Completude nunca muda
um candidato válido para inválido. O enriquecimento não altera silenciosamente o evento original.

Responsabilidades essenciais:

| Etapa                     | Entrada                     | Saída                 | Não faz                        |
| ------------------------- | --------------------------- | --------------------- | ------------------------------ |
| ContinuousInputController | estado do buffer + política | frames ordenados      | parsing ou regra esportiva     |
| InputBuffer               | caracteres do teclado       | candidato incremental | interpretação do código        |
| ScoutCodeFramer           | buffer + `CodeProfile`      | fronteiras + estado   | semântica de voleibol          |
| Normalizer                | texto bruto                 | texto normalizado     | validação de escalação         |
| Tokenizer                 | texto normalizado           | `Token[]`             | semântica de voleibol          |
| Parser                    | `Token[]`                   | `ParsedScoutCode`     | decisão sobre atleta em quadra |
| SemanticMapper            | código analisado + profiles | candidato canônico    | persistência                   |
| Validators                | candidato + contextos       | `ValidationResult`    | mutação do evento              |
| EventFactory              | candidato válido + metadata | `ScoutEvent` imutável | redução da partida             |
| EventRepository           | evento                      | log persistido        | cálculo visual de métricas     |
| MatchReducer              | estado + evento             | novo estado canônico  | acesso ao DOM ou IndexedDB     |

Nenhuma camada deve abreviar o fluxo colocando parser no teclado, regra de partida no parser ou
fórmula estatística na UI.

## Pipeline de identidade, elenco e escalação

```text
jerseyNumber + teamId
  → RosterPlayerResolver
  → playerId
  → SetLineup.positions / LineupSlot
  → tacticalRole + posição P1–P6 naquele instante
  → contexto imutável do ScoutEvent
```

`Player` representa identidade. Líbero pertence ao contexto da partida; função tática pertence ao
`LineupSlot`; posição pertence ao estado rotacional. O parser não resolve nenhum desses conceitos.

## Pipeline automático de resultado, placar e rotação

```text
ScoutEvent terminal
  → RallyOutcomeResolver
  → RallyResultEvent auditável
  → MatchReducer
  ├─ vencedor +1
  ├─ mantém ou troca servingTeamId
  ├─ RotationEngine somente quando a recepção conquista o saque
  └─ encerra o rally
       → SetScoringRules
       → SetFinishedEvent, quando aplicável
```

O replay do log é a única fonte do placar, saque e rotação. Correção, undo e redo selecionam a
versão efetiva do contato terminal e do resultado derivado correspondente. Pontos manuais geram o
mesmo evento auditável com motivo de correção operacional.

## Pipeline de contexto tático do rally

```text
log canônico + correções / undo / redo
  → projectEffectiveMatchEvents
  → RallyContextResolver
     ├─ RallyPhaseResolver → sideout / breakpoint / transition
     ├─ ReceptionContextResolver → qualidade da recepção para o ataque
     ├─ estado reduzido → servingTeamId + posição rotacional do levantador
     └─ último contato → ExpectedNextAction
  → TacticalRallyProjection
  → MatchWorkspace
```

A projeção não cria nem persiste eventos. Fase explicitamente capturada no metadata tem precedência;
os demais valores são derivados. Um `rally_result` terminal remove a próxima ação esperada. Como o
estado ao vivo e a reabertura executam a mesma projeção sobre o mesmo log efetivo, seus contextos são
idênticos inclusive após correção e undo.

```text
SubstitutionEvent
  → troca playerId do LineupSlot
  → preserva slotId + tacticalRole + ordem rotacional
```

## Pipeline de reconstrução da partida

```text
EventRepository
  → ordered ScoutEvent[]
  → MatchReducer (fold/replay)
  → Canonical MatchState
  → Rally reducers / score projections
  → consumers
```

O estado ao vivo e o estado reconstruído pelo replay do mesmo log devem ser equivalentes. Correção,
undo e redo devem preservar o histórico em vez de alterar silenciosamente eventos antigos.

## Pipeline de estatísticas

```text
Canonical events / match state
  → effective correction/undo-aware timeline
  → StatisticsEngine
  → MetricRegistry
  → selected MetricDefinition
  → filters
  → aggregators
  → MetricResult
  → view-model
  → UI
```

A interface recebe `MetricResult`; ela não conhece fórmulas. Mudanças no event store invalidam
somente caches de métricas afetadas.

Percentuais são razões entre `0` e `1` no domínio. O ViewModel é responsável apenas pela
apresentação localizada. Métricas CBV são selecionadas pelo `CompetitionProfile` versionado e
mantêm numerador, denominador e componentes auditáveis no resultado.

## Pipeline de treino

```text
TrainingProfile + ComplexityProfile
  → exercise generator
  → skill-specific scenario + role + observed details
  → compact code + typed tactical suffixes
  → operator attempt + timing (contacts separated by `;`)
  → parser/validator pipeline
  → core comparator + tactical detail audit
  → TrainingAttempt result
  → training metrics
  → UI
```

O treino reutiliza interpretação e validação do produto. O código principal continua no parser
canônico; os sufixos usam o mesmo `TacticalInputInterpreter` do editor rápido. Entradas de um único
contato sem espaços são entregues diretamente ao parser; o `ContinuousInputController` fica restrito
a sequências concatenadas. O comparador produz um erro por campo tático, com prefixo e valor
esperados. Direção não é um token obrigatório separado: é derivada quando `o` e `t` existem.

Na tela de scout, `visibleStream` e `pendingBuffer` têm responsabilidades diferentes. O primeiro
preserva toda a linha digitada; o segundo contém somente o sufixo ainda não enquadrado. Quando o
framer detecta uma fronteira, persiste o evento sem apagar `visibleStream`. O prefixo já persistido
fica protegido contra edição direta e deve ser alterado pelo fluxo auditável de correção.
Quando o `CodeProfile` declara `teamCodes`, o tokenizer inclui `TEAM` na gramática e o framer usa os
mesmos símbolos para detectar fronteiras. A UI resolve `*` para a primeira equipe e `a` para a
segunda antes de chamar o serviço; o contexto canônico continua armazenando `teamId`, preservando
as regras de elenco, placar e replay.
Após um `rally_result`, a projeção de saque e rotação identifica o atleta no P1 da equipe vencedora e
acrescenta somente `jogador + código de saque` ao sufixo pendente. Avaliação e detalhes continuam sob
responsabilidade do operador. Se lineup ou sacador não estiverem disponíveis, não há preenchimento.

O `ExerciseGenerator` produz a situação e o candidato esperado a partir dos profiles. A tentativa
passa por `RegisterScoutEventUseCase`; somente depois o `TrainingComparator` classifica diferenças
de jogador, fundamento, avaliação e detalhes realmente digitados. Metadados esperados não são mais
injetados na tentativa. Origem, destino e trajetória são aplicáveis por fundamento: por exemplo, o
saque pode ter apenas destino, enquanto o ataque usa a função tática para propor uma origem provável
(central 3, oposto 2, ponteiro 4) e explicita qualquer exceção. O `TimingEngine` mede cada tentativa e as métricas são
calculadas sobre o histórico persistido da sessão. A tela recebe um ViewModel já formatado.
Tentativas incorretas são persistidas para as métricas, mas não incrementam `currentExerciseIndex`;
o operador recebe a resposta completa, corrige os campos indicados e tenta novamente.

## Pipeline de profiles

```text
CodeProfile ──────────┐
ComplexityProfile ────┼→ ProfileContext → interpretation and validation
CompetitionProfile ───┘

TrainingProfile → exercise rules
```

- `CodeProfile` define a linguagem digitada.
- `ComplexityProfile` define quais dimensões são exigidas.
- `CompetitionProfile` define categorias e métricas de uma competição versionada.
- `TrainingProfile` define como exercícios são produzidos e avaliados.

## Pipeline de metadados táticos V2

```text
entrada V1 plana ou envelope V2
  → SemanticMapper conhece o fundamento
  → TacticalMetadataAdapter normaliza para schema 2.0.0
  → metadata especializada de saque/recepção/levantamento/ataque/bloqueio
  → evento canônico → IndexedDB / replay / JSON master

trajetória com direção explícita ──────────────────────────────→ preservada
trajetória sem direção + ZoneSystemProfile.directionRules
  → DirectionResolver → direção derivada, marcada como derived
```

Leitores de completude, validação, CSV, estatísticas e reedição consultam os mesmos acessores, por
isso eventos V1 e V2 coexistem. O upgrade IndexedDB v3 adapta registros de scout e correções sem
apagar os campos planos originais. Nomes de zonas, chamadas do levantador e combinações de ataque
pertencem a profiles/dicionários versionados, não a regras universais codificadas no domínio.

## Pipeline de entrada tática e quadra

```text
CodeProfile.tacticalInput
  ├─ prefixes + value aliases
  ├─ ZoneSystemProfile
  └─ keyboard shortcuts
       ↓
Alt+T → Quick Tactical Editor → TacticalInputInterpreter → TacticalCaptureDraft
       → foco retorna ao scout → código-base → SemanticMapper → metadata V2 especializada

quadra → clique origem/destino ─┐
       → arraste trajetória ────┴→ CourtLocation + captureMethod → mesmo TacticalCaptureDraft
```

A visualização usa uma quadra indoor 18×9 m. Cada metade possui P1–P6 (`4–3–2` na linha de ataque e
`5–6–1` no fundo), e o lado de destino é espelhado para manter a orientação real das duas equipes.
Posição de rotação e ponto geométrico não são equivalentes: o primeiro é um identificador tático; o
segundo pode carregar coordenadas normalizadas. Com duas zonas, `DirectionResolver` aplica as regras
versionadas do `ZoneSystemProfile`; com um gesto, a trajetória desenhada é preservada. Origem continua
opcional, inclusive no saque quando não foi observada.

O comando tático é secundário e não cria um segundo parser do código-base. O draft existe somente
durante a captura e é removido pelo `SemanticMapper`; IndexedDB e JSON recebem apenas metadata V2
canônica.

Na linha contínua, `ScoutCodeFramer` primeiro enquadra o núcleo e mantém aberta a possibilidade de
um sufixo. `InlineTacticalTokenizer` separa prefixos compactos (`YH`, `T5`, `O4`, etc.); o começo
inequívoco do próximo evento cria a fronteira. `ContinuousInputController` não confirma perfis
táticos por tempo ocioso: a fronteira seguinte ou Enter faz o commit. Antes do registro,
`ScoutScreen` envia somente o núcleo ao parser canônico e converte o sufixo em `TacticalCaptureDraft`.
Os atalhos vêm do profile, a correção rápida retorna o foco ao scout e todas as ações da
quadra possuem caminho equivalente pelo teclado.

## Pipeline de persistência e exportação

```text
Application use case
  → repository port
  → IndexedDB adapter

Canonical match + profile snapshot
  → JSON master export / equivalent reimport

Effective correction/undo-aware timeline
  → CSV projection / TXT raw-code sequence
```

O domínio conhece portas e dados canônicos, não IndexedDB nem detalhes de arquivo. A exportação JSON
deve permitir reimportação equivalente, incluindo versões e snapshot dos profiles usados.

## Pipeline do editor de profiles

```text
Editor UI
  → serialized mappings and grammar
  → ProfileEditorService
  → ProfileValidator
  → ProfileRegistry (runtime)
  → ProfileRepository (IndexedDB)
  → selectable CodeProfile
```

O editor produz dados JSON versionados, nunca módulos TypeScript. Profiles persistidos hidratam o
mesmo registry usado para criar partidas.

## Pipeline PWA

```text
manifest + raster/SVG icons
  → service-worker install
  → discover hashed build assets from index.html
  → versioned Cache Storage app shell
  → activate new worker, remove old app-shell caches and claim clients
  → network navigation or cached index fallback
```

O service worker é registrado somente no build de produção. Em desenvolvimento, o bootstrap remove
registros e caches `scout-trainer-*` antigos e recarrega uma vez quando necessário. Essa limpeza não
remove o IndexedDB, que permanece como fonte dos dados das partidas, profiles e registros livres.

## Pipeline de recovery e backup

```text
confirmed action → immediate IndexedDB append → canonical event log
                                              ↓ reload/crash
metadata + ordered log → deterministic replay → recovered workspace

JSON backup → size/schema/reference/profile validation
            → one multi-store IndexedDB transaction
            → profile registry hydration
            → deterministic replay → restored workspace
```

Upgrades seguem migrações incrementais por versão e preservam registros existentes. Uma restauração
só altera o banco depois da validação completa e confirma todas as stores na mesma transação.

## Pipeline de carga e validação final

```text
bulk event append → ordered read → linear effective-timeline projection
                  → statistics engine → exact metric assertions

Playwright/Chrome → create → scout → correct → undo → reload/recover
                  → export → training attempt
```

O histórico efetivo é calculado em tempo linear e a UI insere no DOM lotes de 200 itens.

## Pipeline de análises táticas

```text
log canônico
  → projectEffectiveMatchEvents (correction/undo-aware)
  → scouts efetivos com sourceEventId estável
  ├→ RallyContextResolver → contatos + resumos de rally
  └→ StatisticsEngine + Tactical MetricDefinitions
       → MetricResult
          ├→ valor agregado
          ├→ numerador / denominador
          ├→ componentes da fórmula
          └→ breakdown por categoria
               → TacticalAnalyticsViewModel
                    → filtros de equipe/grupo
                    → matriz de zonas | mapa de direções | tabela
```

As 24 definições pertencem ao domínio. Distribuições, qualidade e eficiência são agrupadas antes da
apresentação; sideout, breakpoint e transição usam os resumos derivados dos rallies. A aplicação
seleciona os recortes e a UI somente formata proporções, mantendo `N/D` visível para auditoria. O
mesmo fluxo é recalculado ao vivo e após reabertura, correção, undo ou redo.

## Pipeline de treinamento avançado

```text
TrainingProfile + CodeProfile + ComplexityProfile
  → ExerciseGenerator
     → saque por zonas | direção de saque | recepção | direção de ataque
     → setter call | combinação | rotação | rally completo
       → situação + detalhes táticos + código/sequência esperada
       → ContinuousInputController (enquadramento de um ou vários contatos)
       → RegisterScoutEventUseCase para cada contato
       → TrainingComparator semântico
       → TrainingAttempt
          ├→ correto / erros por componente
          ├→ duração
          ├→ completude
          └→ detalhes táticos capturados / esperados
       → TrainingPerformanceMetrics
          → precisão | velocidade | completude | correções | detalhamento tático
       → TrainingDashboardViewModel → UI
```

Sessões persistidas anteriores continuam legíveis: exercícios sem sequência usam o evento esperado
original, e tentativas sem os novos campos derivam completude da correção sem inventar detalhes
táticos. O teste de rally completo confirma três contatos concatenados pelo mesmo framing do scout.

## Pipeline de exportação local para pasta

```text
usuário conecta pasta (permissão read/write)
  → DirectoryExportPort
  → BrowserDirectoryExporter

usuário solicita exportação
  → ScoutTrainerService.exportBundle
     ├→ JsonMatchExporter → partida.json
     ├→ CsvMatchExporter → scouts.csv
     ├→ TxtMatchExporter → codigos.txt
     └→ SetScoresCsvExporter → placar-sets.csv (todos os sets)
  → subpasta Equipe-A-x-Equipe-B_data_hora_milisegundo
  → escrita dos quatro arquivos
```

A permissão nasce de uma ação explícita do usuário. Não existe sincronização, upload ou escrita
automática. O adaptador de navegador fica na infraestrutura; a aplicação conhece somente a porta. Em
navegadores sem `showDirectoryPicker`, os downloads individuais permanecem como fallback.

## Pipeline da área Livre

```text
texto arbitrário + Enter
  → FreeLogService (trim + sequência + timestamp)
  → FreeLogSessionRepository
  → IndexedDB freeLogSessions
  → histórico retomável
  ├→ CSV livre
  └→ TXT livre
```

O fluxo Livre é deliberadamente separado do scout canônico: não tokeniza, não valida fundamento,
não altera rally e não produz estatísticas de partida.

## Fronteira planejada para entrada visual e híbrida — V3

```text
Digitado
  → Normalizer → Tokenizer → Parser → SemanticMapper ─┐
                                                      ├→ CanonicalScoutEventCandidate
Visual
  → VisualScoutDraft → VisualScoutMapper ─────────────┤
                                                      │
Híbrido
  → texto + detalhes visuais → mapper combinado ──────┘
       → validação compartilhada
       → completude compartilhada
       → EventFactory compartilhada
       → ScoutEvent → MatchEvent → IndexedDB
```

Esta fronteira está decidida, mas ainda não implementada. Entrada visual não fabricará código para
o parser e os três modos não criarão tipos concorrentes de evento. A representação `[VISUAL] ...`
servirá somente para auditoria compatível com `rawCode`.

## Contexto derivado do levantador — V3

```text
ataque efetivo
  + lineup/rotação no instante do contato
  → ActiveSetterResolver + TacticalRallyProjection
  → levantador + P1–P6 + recepção + fase
  → distribuição, conversão, repetição e evenness
```

Levantamentos normais não são persistidos implicitamente. Somente ocorrências observadas de forma
independente, como erro de levantamento, podem produzir evento explícito.

## Snapshot histórico planejado — V3

```text
MatchEvent/ScoutEvent efetivo (fonte de verdade)
  → MatchAnalyticsService
  → MatchAnalyticsSnapshot (cache reconstruível)
       invalidar por schemaVersion | eventCount | lastSequence
```

A store e a migração v4→v5 pertencem à Macro 21 e ainda não existem. Gráficos nunca são persistidos.

## Pipeline de analytics avançado — V3 Macro 18

```text
scouts efetivos + TacticalRallyProjection
  ├→ recepções + referência empírica → Expected Sideout
  ├→ saques + referência empírica → Expected Breakpoint
  ├→ ataques + distribuição esperada → Attack Evenness
  ├→ ataques ordenados + levantador derivado → Setter Repetition
  └→ ataques + levantador/P/recepção/fase/combinação → Setter Attack Conversion
       → MatchReportModel.advanced
          ├→ StatisticsCsvExporter
          └→ MatchPdfRenderer
```

Referências ausentes nunca são substituídas por pesos arbitrários. Resultados indisponíveis carregam
motivo explícito. O fluxo recebe a timeline efetiva já corrigida e consciente de undo/redo; não cria
nem persiste eventos de levantamento.

## Pipeline de Visual Analytics — V3 Macro 19

```text
MatchReportModel
  ├→ resumo textual
  ├→ Recharts responsivo e acessível
  └→ tabela auditável com valor e N/D
```

Os componentes apenas selecionam, filtram e formatam dados do relatório. O número do set integra os
agrupamentos direcionais e o breakdown observado/referência de Attack Evenness atravessa o contrato
de reporting. Nenhum SVG, tooltip ou estado de filtro é persistido.

## Matriz de robustez V2

| Critério               | Cobertura executável                                    |
| ---------------------- | ------------------------------------------------------- |
| Input contínuo/idle    | `ContinuousInputController.test.ts` e Playwright        |
| Parcial/enriquecimento | integração IndexedDB e Playwright                       |
| Undo/redo/reload       | integração do serviço e Playwright                      |
| Migração               | testes de schema IndexedDB V1→V2→V3→V4                  |
| JSON export/import     | integração de backup e restauração pelo Playwright      |
| Métricas táticas       | dados artificiais exatos e visualização pelo Playwright |
| Carga                  | persistência, projeção e métricas com 5.000 eventos     |

## Mapeamento das pipelines para macroetapas

| Pipeline                                                         | Macroetapa |
| ---------------------------------------------------------------- | ---------: |
| Profiles e contratos                                             |          1 |
| Normalização, tokenização, parsing, mapping, validação e eventos |          2 |
| Persistência, Match e replay                                     |          3 |
| UI operacional e exportação JSON inicial                         |          4 |
| Estatísticas e profiles especializados                           |          5 |
| Treino                                                           |          6 |
| Exportações completas, editor e PWA                              |          7 |
| Recovery, carga e E2E                                            |          8 |
