# Status — Scout Trainer 0.45

Branch: `main`  
SHA inicial: `7536764c27756e0b93203c3aa970cc0b6788bbd5`  
Node: `v22.23.2`  
Data: 2026-09-15

| Etapa | Estado    | Commit/working tree      | Testes                                                                                                | Observações                                                                 |
| ----- | --------- | ------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| M0    | concluída | working tree; sem commit | typecheck e build aprovados; testes direcionados iniciados, mas não encerraram no limite desta rodada | Baseline corrigido e pendências discriminadas abaixo                        |
| M1    | concluída | working tree; sem commit | `RallySequenceBuilder.test.ts`: 4/4; typecheck aprovado                                               | Projeção pura por rally, contexto espacial versionado e sem persistência    |
| M2    | concluída | working tree; sem commit | `MarkovAnalyzer.test.ts` + M1: 7/7; typecheck aprovado                                                | Motor Markov, padrões, valor espacial e células x/y puros                   |
| M3    | concluída | working tree; sem commit | M1+M2+M3: 9/9; typecheck aprovado                                                                     | Painel Sequências + Valor espacial integrado à Análise                      |
| M4    | concluída | working tree; sem commit | M2+M3+M4: 8/8; typecheck aprovado                                                                     | Perguntas táticas determinísticas em DTO estruturado                        |
| M5    | concluída | working tree; sem commit | M5: 7/7; typecheck aprovado                                                                           | Porta de IA, DTO agregado sanitizado e adaptador Gemini BYOK resiliente     |
| M6    | concluída | working tree; sem commit | M6: 7/7; typecheck aprovado; diff check aprovado                                                      | Exportação opt-in auditável e contratos futuros documentados                |
| M7    | concluída | working tree; sem commit | testes matemáticos, UI direcionada, build Vite e revisão visual executados                            | Explorador Caminhos do rally integrado; limitações reais registradas abaixo |

## Alterações de M0

- Removido o bloco de placar atual redundante do Resumo; o placar permanece no quadro de sets.
- O atalho configurado `Alt+T` agora é reconhecido também com foco no campo de scout e abre o editor tático.
- Removida a versão literal legada `Scout Trainer 0.2` do rodapé PDF; o rodapé não fixa uma versão antiga.
- Atualizado o teste AppFlow de substituição para usar o botão de atleta do banco, conforme a UI atual.

## Evidência executada

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado; sem atualização de dependências.
- Testes direcionados de espacial, analytics/exportação e AppFlow foram iniciados. O processo Vitest não encerrou na janela disponível; os avisos de canvas pertencem ao ambiente jsdom.
- E2E isolado do contrato Alt+T foi iniciado, mas não encerrou na janela disponível.

## Falhas restantes

- A suíte global e parte do AppFlow/critical-flow já tinham falhas de contrato de UI documentadas em `docs/scout-trainer-interface-0.4/ENTREGA.md` e `VALIDACAO.md`; não foram ampliadas para refatoração geral.
- Lint global continua com falhas preexistentes documentadas; não é gate de M0 neste pacote.
- A execução dos runners direcionados ficou inconclusiva por tempo de encerramento, portanto não é declarada aprovada.

Essas pendências não bloquearam M1 porque os contratos canônicos de eventos, rally, espacial e analytics permaneceram preservados; typecheck/build passaram e nenhuma alteração foi feita em IndexedDB, schema, reducers, métricas ou regras esportivas. A próxima ação única é iniciar M2.

## M1 — entrega

- Estados V1 pequenos: `serve`, `reception`, `attack`, `block`, `defense`, `free_ball`, `other` e terminais.
- Agrupamento por `rallyId`, ordenação por `sequence`, preservação de `sourceEventId` e evento original.
- Rallies sem vencedor permanecem `incomplete`; nenhum vencedor é inventado para erro sem resultado explícito.
- Coordenadas válidas são preservadas em `origin`/`target`; regiões usam `CourtZoneResolver` e `ZoneSystemProfile.version`.
- Superfícies `serviceZone`/`outZone` não são convertidas em regiões da quadra; coordenadas ausentes não viram `(0,0)`.
- Nenhuma alteração em schema, IndexedDB, UI, evento canônico ou persistência.

Testes dirigidos M1: `npx vitest run src/domain/analytics/sequence/RallySequenceBuilder.test.ts --reporter=verbose` — 1 arquivo e 4 testes aprovados. `npm run typecheck` — aprovado. Próximo passo único: iniciar M2.

## M2 — entrega

- `TransitionMatrix` e `MarkovAnalyzer`: transições, probabilidades condicionais, terminais e delta entre valores de estado.
- `StateValue`: probabilidade empírica de `terminal_win` por estado, com unidade `rally` e amostra pequena sinalizada.
- `SequencePatternAnalyzer`: padrões contíguos de 2 e 3 estados antes do terminal, com baseline e lift observado.
- `SpatialValueEstimator` e `SpatialMarkovAnalyzer`: regiões para destino de recepção/saque, origem/destino/trajetória de ataque e células configuráveis `x,y`.
- Saídas espaciais usam unidade `event`, preservam probabilidade empírica e retornam `n`, baseline, delta e disponibilidade; `n < 5` não fica disponível para ranking.
- Coordenadas ausentes não geram região/célula nem valor zero. Nenhum `stateId` contém coordenadas.
- Não foi implementado shrinkage, UI, IA, rede, persistência ou alteração de schema.

Fixtures M2: baseline espacial `10/20 = 0,50`, região `3` com `6/8 = 0,75` e delta `+0,25`; trajetórias com mesma origem e destinos distintos; bordas/ausência de coordenadas; matriz manual `reception -> attack` com `4` ocorrências e `attack -> terminal_win` `3/4`. Testes: `npx vitest run src/domain/analytics/markov/MarkovAnalyzer.test.ts src/domain/analytics/sequence/RallySequenceBuilder.test.ts --reporter=verbose` — 2 arquivos e 7/7 aprovados. `npm run typecheck` — aprovado. Próximo passo único: iniciar M3.

## M3 — entrega

- Nova aba `Sequências` dentro da Análise, sem Sankey e sem persistência paralela.
- Amostra de rallies completos, transições ordenadas por valor observado e tabelas de padrões de 2/3 estados.
- Valor espacial com ação, origem/destino, baseline, probabilidade, delta, `n` e aviso de amostra pequena.
- Quadra SVG de proporção 2:1 com células coloridas por delta, tooltip nativo e seleção acessível por clique/teclado.
- Tabelas de melhores/piores áreas e trajetórias de ataque.
- Ausência de coordenadas mostra estado explícito, sem transformar ausência em 0%.
- `SequenceAnalyticsService` calcula a projeção sob demanda no workspace existente; nenhum schema/store/export paralelo foi criado.
- Cobertura responsiva por CSS em 1366/1024/390px: cartões e tabelas refluem, enquanto a quadra mantém proporção 2:1.

Testes dirigidos: `npx vitest run src/ui/screens/summary/SequenceAnalyticsPanel.test.tsx src/domain/analytics/markov/MarkovAnalyzer.test.ts src/domain/analytics/sequence/RallySequenceBuilder.test.ts --reporter=dot` — 3 arquivos e 9/9 aprovados. `npm run typecheck` — aprovado. `git diff --check` — aprovado. Próximo passo único: iniciar M4.

## M4 — entrega

- Criado `TacticalQuestionService` com as 13 perguntas V1 do plano.
- Cada resposta retorna `questionId`, `answerType`, status, filtros, amostra/unidade, achados, IDs, números, baseline espacial e ressalvas.
- Perguntas sequenciais cobrem transições positivas/negativas, padrões antes de pontos/erros, rotação, qualidade de recepção, sideout/breakpoint e amostras insuficientes.
- Perguntas espaciais cobrem destino de recepção, destino de saque, origem/destino de ataque e trajetórias origem → destino.
- Filtros são aplicados sobre as sequências derivadas; nenhum evento cru é enviado a camada externa e não há texto generativo.
- Ausência de coordenadas retorna `reasonUnavailable: missing_coordinates`; amostra abaixo de 5 permanece explicitamente não disponível.
- Nenhuma internet, Gemini, UI, persistência ou dependência nova foi introduzida.

Testes M4: `npx vitest run src/application/analytics/TacticalQuestionService.test.ts src/ui/screens/summary/SequenceAnalyticsPanel.test.tsx src/domain/analytics/markov/MarkovAnalyzer.test.ts --reporter=dot` — 3 arquivos e 8/8 aprovados. `npm run typecheck` — aprovado. `git diff --check` — aprovado. Próximo passo único: iniciar M5.

## M5 — entrega

- Criada a porta `AIProvider` e o `TacticalExplanationService`; a IA recebe somente a projeção allowlist de `TacticalQuestionAnswer`, nunca eventos crus, nomes de atletas ou lista bruta de coordenadas.
- O DTO preserva números, amostra/unidade, filtros, baseline, delta, região/trajetória já agregados e IDs de achados; `stateId` e cálculo continuam locais.
- Criado `GeminiProvider` separado, com chave BYOK somente em memória, header de transporte sem logging, resposta estruturada JSON e erros tipados para 401/403/timeout/resposta inválida.
- Falha, ausência de chave e cancelamento retornam indisponibilidade sem alterar analytics ou fluxo da partida; não houve persistência, schema, UI, dependência ou chamada de API real.
- Testes M5: `npx vitest run src/application/ai/TacticalExplanationService.test.ts src/infrastructure/ai/gemini/GeminiProvider.test.ts --reporter=verbose` — 2 arquivos e 7/7 aprovados. `npm run typecheck` — aprovado.

M5 está encerrada. O próximo passo do plano é M6, não executado nesta rodada.

## M6 — entrega

- Exportação JSON, PDF e bundle aceitam `includeDerivedAnalytics` de forma opt-in; a exportação padrão permanece somente com os artefatos atuais.
- O bloco derivado contém rallies completos/incompletos, transições, valores de estado, padrões, regiões, células e trajetórias agregadas, sem copiar `RallySequence`/`ScoutEvent`.
- Cada bloco registra versão do método, filtros, amostra/unidade, baseline/delta quando aplicável, sistema e versão de zonas, resolução da grade e suavização (`none`, parâmetro `null`).
- Backups antigos continuam importáveis porque o campo derivado é opcional e o schema de eventos/banco não foi alterado; nenhuma matriz/grade foi adicionada ao evento canônico.
- Criados ADRs conceituais de `SequenceAnalyticsProfile`, `SpatialAnalyticsProfile`, BYOK e integração futura de carga. Apenas voleibol possui contrato de implementação nesta etapa.
- Testes M6: `npx vitest run src/application/reporting/DerivedAnalyticsReport.test.ts src/infrastructure/export/json/MatchJson.test.ts src/infrastructure/export/MatchReportExporters.test.ts --reporter=dot` — 3 arquivos e 7/7 aprovados. `npm run typecheck` — aprovado. `git diff --check` — aprovado.

M6 está encerrada. O próximo passo do plano é M7, não executado nesta rodada.

## Plano 0.46 — Etapa 1

- Implementado o evento terminal `fault` para toque na rede, invasão, dois toques e erro de rotação, com atleta opcional, ponto para o adversário e vínculo ao rally.
- A resolução de consequências passou a considerar ação + avaliação: `#` e `=` permanecem disponíveis para todas as ações do perfil compacto; erros encerram o rally e ações neutras continuam o rally quando aplicável.
- Infrações são registradas diretamente pelo fluxo gestual, sem trajetória, origem/destino ou abertura da quadra espacial.
- O reducer atualiza placar, saque, rotação e rally; o undo/redo existente continua append-only e reverte as consequências automáticas da infração.
- Backups antigos permanecem compatíveis; o importador JSON aceita o novo evento sem migração destrutiva.

Testes da Etapa 1: typecheck, lint e testes direcionados de resolver de rally, reducer, factory, timeline, importação JSON, UI gestual e integração IndexedDB aprovados. A entrega integrada do plano Luna Markov está registrada abaixo.

## Plano Luna Markov — entrega integrada

- A análise de Sequências/Markov foi substituída pelo explorador `Caminhos do rally`, integrado ao fluxo atual de `MatchAnalyticsPanel`.
- `RallyPathAnalyzer` normaliza eventos efetivos, resultados e infrações em rallies reais; rallies incompletos ou com vencedores conflitantes ficam fora da estimativa e são contabilizados.
- O modelo usa ambas as equipes e estados compostos por equipe, fundamento e qualidade. Probabilidade de transição, potencial de absorção e frequência observada de rallies vencidos têm campos e leituras distintas.
- O fluxo mostra somente prefixos observados, permite horizonte de um ou dois contatos, agrupa a cauda em `Outros` e conserva seleção de nós/ligação para abrir evidências.
- Filtros de equipe, fundamento, qualidade, atleta, rotação e quadra selecionam ocorrências iniciais; os contatos intermediários e o contexto da cadeia permanecem preservados.
- A quadra usa coordenadas e zonas existentes, mantém proporção 2:1, diferencia ausência de posição e permite origem/destino e trajetórias sem inventar dados.
- Comparação por qualidade, resumo de potencial/observado, cobertura, rallies correspondentes e matriz técnica ficaram disponíveis com tabelas recolhidas.
- Não houve registro novo, migração, alteração de schema, dependência pesada, reestimação da cadeia por caminho selecionado ou modelo de segunda ordem.

Verificações desta entrega: testes matemáticos de `RallyPathAnalyzer`, teste direcionado de `SequenceAnalyticsPanel`, suíte dirigida de analytics/UI (4 arquivos, 13 testes), `npm run typecheck`, `npm run build`, ESLint direcionado, `git diff --check`, E2E U7 e revisão visual preenchida em 1366×768, 1024×768 e 390×844 contra backup real. A suíte global do Vitest e o lint global não são declarados aprovados por conterem/excederem falhas legadas fora deste escopo.
