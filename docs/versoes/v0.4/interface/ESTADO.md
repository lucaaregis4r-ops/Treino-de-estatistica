> **Versão/escopo:** 0.4 — interface e registros históricos posteriores.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../COMECE_AQUI.md).

# Estado da implementação

## Recuperação funcional — Etapa 1 — 19/09/2026

Executada somente a Etapa 1 de `docs/versoes/v0.4/recuperacao/Scout_Trainer_Plano_Recuperacao_Funcional_Luna.md`, na branch local `recovery/functional-stage-1`, preservando a árvore já modificada. Diagnóstico confirmado: `sport` era persistido, mas toda partida ainda era aberta por `src/ui/screens/scout/ScoutScreen.tsx`, cujo estado e UI dependem de set, rally, saque, rotação P1–P6 e líbero. O formulário também enviava escalação e saque para futebol e preenchia doze jogadores fictícios por padrão.

Correção estrutural:

- `src/domain/match/entities/MatchSport.ts` define a resolução autoritativa. `sport` explícito prevalece; legado sem campo só é reconhecido como vôlei quando há evidência persistida de vôlei. Caso ambíguo não é convertido silenciosamente.
- `src/application/ScoutTrainerService.ts` salva `sport` e, para futebol, não cria `initialServingTeamId`, regras de pontuação de sets, líbero ou eventos de escalação P1–P6.
- `src/ui/screens/match-setup/NewMatchScreen.tsx` começa com elencos vazios, mantém nomes/elencos ao trocar modalidade e mostra configuração de rotação/líbero/saque/perfis de código apenas para vôlei. Futebol pode iniciar sem atletas fictícios e sem escalação.
- `src/ui/app/App.tsx` roteia futebol para `src/ui/screens/scout/football/FootballScoutScreen.tsx`; o `ScoutScreen` e os painéis de análise/resumo de vôlei não montam para futebol. Partida ambígua mostra recuperação explícita e não apaga dados.
- `src/infrastructure/export/json/MatchJson.ts` rejeita valores ilegíveis de `sport`, preservando backups legados sem o campo.

Verificações: `npm run typecheck` aprovado; `npm run build` aprovado com o aviso preexistente de chunk acima de 500 kB; lint direcionado dos arquivos da etapa aprovado. Testes focados: 9/9 aprovados em modalidade/formulário/adapter e 2/2 integrações aprovadas para criar, recarregar e abrir futebol e vôlei. Futebol reaberto manteve `sport=football`, elenco vazio, sem saque/scoring/lineup e sem controles de vôlei; vôlei explícito manteve rotação e quadras. O lint de `App.tsx` ainda acusa o erro/aviso de hooks preexistentes nas linhas do carregamento de configurações.

Limites reais: não foi feita captura em navegador nesta etapa; o teste visual foi DOM/integrado. O registrador de futebol é deliberadamente uma casca separada e informa que a gravação completa será recuperada na Etapa 3. Campo, dimensões, contraste e layout não foram tratados porque pertencem à Etapa 2. Próxima etapa: Etapa 2 somente após nova solicitação.

## F1 Futebol StatsBomb — 19/09/2026

F1 foi implementada somente no checkout local, preservando as alterações preexistentes. O `AGENTS.md` solicitado não existe com esse nome; o arquivo encontrado e lido foi `./ AGENTS.md` (com espaço inicial no nome).

Arquivos reais usados e alterados:

- Quadra gestual reutilizada: `src/ui/screens/scout/GestureCourtInput.tsx`, `src/ui/screens/scout/SpatialCourtSurface.tsx` e `src/domain/scout/tactical/CourtGeometry.ts`.
- Integração da modalidade: `src/ui/screens/match-setup/NewMatchScreen.tsx`, `src/application/ScoutTrainerService.ts`, `src/domain/match/entities/MatchMetadata.ts`, `src/ui/screens/scout/ScoutScreen.tsx` e `src/ui/screens/scout/gesture/GestureScout.tsx`.
- Campo novo: `src/ui/screens/scout/FootballCourtSurface.tsx` e `FootballCourtSurface.css`; a quadra de vôlei continua sendo a superfície padrão quando `sport` é ausente/`volleyball`.
- Contrato espacial: `src/domain/football/StatsBombContract.ts`; conversão reversível normalizada ↔ `0–120 × 0–80`, espelhamento por perspectiva e extensão `scout_trainer` versionada.
- Teste: `src/domain/football/StatsBombContract.test.ts`.

Persistência: `sport` é salvo em `MatchMetadata`; partidas antigas sem esse campo permanecem interpretadas pelo leitor legado como vôlei e não são reescritas. Futebol recebe orientações opcionais por período (`footballOrientation`) sem presumir lado físico quando desconhecido. O envelope canônico StatsBomb foi introduzido como tipo de domínio, sem ainda registrar botões/posses/importação/exportação — isso pertence a F2–F5.

Verificações F1: `npm run typecheck` aprovado. O teste StatsBomb e o teste existente de `GestureCourtInput` foram iniciados com Vitest, mas o runner ficou sem conclusão neste ambiente após 30s; portanto não são declarados aprovados. Não foi possível certificar por navegador os fluxos de criar/reabrir, ajuste de relógio, segundo período, backup legado ou montagem 100 vezes nesta execução. A compilação TypeScript confirma a integração dos caminhos alterados.

Próxima etapa: F2 — registro de posse/ação e gesto condicional, somente após nova solicitação. F3–F5 não foram iniciadas.

## F2 Futebol StatsBomb — execução local

F2 foi implementada sem iniciar F3–F5. O núcleo novo está em `src/domain/football/StatsBombContract.ts` e `FootballPossessionService.ts`: posse sequencial com `possession_team` separado de `team`, controle pendente sem posse inventada, lateral da mesma equipe abrindo nova posse, eventos `Pass`/`Ball Receipt*`/`Miscontrol` relacionados por IDs, e ausência de `pass.outcome` preservada quando sucesso não foi observado. `src/ui/screens/scout/football/FootballActionPanel.tsx` e `.css` adicionam a UI rápida somente à modalidade futebol; a pergunta do passe exige resposta explícita e pergunta o controlador no caso “tocou sem dominar”. O vôlei não usa o painel.

Arquivos de teste: `src/domain/football/StatsBombContract.test.ts`. Cobertos no código: passe dominado/tocado sem domínio com mesma equipe, miscontrol observado, interceptação antes da recepção sem `Ball Receipt*`, e duas posses consecutivas da mesma equipe após lateral. Correção/desfazer permanecem append-only no pipeline já existente; não foi feita reescrita de eventos nem inferência de placar.

Verificação F2: `npm run typecheck` foi iniciado, mas não concluiu dentro da janela devido a processos Vite/TSC antigos ativos no checkout; a execução Vitest também não retornou saída conclusiva. Portanto os testes não são declarados aprovados. Não foi feita validação visual E2E/reabertura nesta execução. Próxima etapa continua F3, somente mediante nova solicitação.

## F3 Futebol StatsBomb — execução local

F3 foi implementada somente para futebol, sem avançar F4/F5. `src/domain/football/StatsBombContract.ts` agora contém `FootballTacticalContext` e `FootballShotContext` com proveniência observada, qualificação segura de `play_pattern` apenas para reinícios identificados, derivados de zona/terço/corredor e distância em unidades do campo (sem declarar metros), além de alvo de chute `[120,y]` ou `[120,y,z]` sem fabricar altura.

UI nova e opcional: `src/ui/screens/scout/football/FootballContextDrawer.tsx`/`FootballContext.css` e `FootballShotPanel.tsx`. A gaveta preserva a captura rápida da F2 e mantém estrutura `3+1`, força percebida, pressão e observações sob `scout_trainer`; o alvo da mini-baliza só é incluído quando informado. O painel não cria xG, PSxG, velocidade ou formação StatsBomb. A superfície do vôlei permanece inalterada.

Teste acrescentado em `src/domain/football/StatsBombContract.test.ts`: origem escanteio versus recuperação sem `play_pattern`, fronteiras de derivados espaciais, distância sem unidade fictícia e alvo lateral com/sem `z`. Não foi possível concluir Vitest/typecheck nesta máquina por processos Vite/TSC antigos ativos; os resultados não são declarados aprovados. Reabertura visual e round-trip de backup ficam pendentes de execução posterior. Próxima etapa: F4, somente mediante nova solicitação.

Atualização 14/09/2026: refinamento de registro solicitado separadamente, sem avançar o plano. Ver `../REGISTRO_RAPIDO.md`: nomes/números legíveis, ação/equipe em destaque, confirmação ao soltar opcional, bola de graça com trajetória e defesa adversária, ajuste rápido de P1/saque/placar. Os resultados de U7 abaixo são o histórico de 13/09, não uma certificação global desta atualização.

Plano de interface reconciliado com o checkout local em 13/09/2026. U0 a U6 foram executadas sobre o checkout local, preservando as alterações preexistentes. U7 executada com as correções solicitadas de dimensionamento/contexto/seletor gestual; entrega **parcialmente verificada**, não 100% concluída. O resultado U7 abaixo prevalece sobre as contagens históricas de U4–U6. Evidências e lacunas: `ENTREGA.md` e `VALIDACAO.md`.

| Etapa | Escopo | Estado | Evidência |
|---|---|---|---|
| U0 | Inventário do código local | Concluída | `MAPA_LOCAL.md`; checkout, modos, confirmações, coordenadas, persistência, CSS, fixtures e baseline registrados |
| U1 | Tokens e controles compartilhados | Concluída | `tokens.css`, aliases globais, botões/foco, seleções pressionadas e rótulos de apresentação centralizados |
| U2 | Navegação, Início e Partidas | Concluída | cabeçalho global, Home com retomada/lista/importação, Partidas com busca/filtro e linhas responsivas |
| U3 | Espaço da partida e quadra | Concluída | cabeçalho/contexto reorganizados, grade responsiva, quadra mineral 2:1 e verificação de coordenadas normalizadas |
| U4 | Seleção, retorno do registro e trocas | Concluída | seleções persistentes, estados de sucesso/erro, confirmação protegida, histórico compacto e troca com retorno |
| U5 | Análises, resumo e relatório | Concluída | abas Quadra/Desempenho/Distribuição/Evolução, filtros e contagens efetivas, análises salvas por equipe, checkboxes persistentes do relatório, Resumo com navegação e exportação agrupada |
| U6 | Demais telas, toque e teclado | Concluída | formulários associados, reflow responsivo, foco do treino, termos do manual e alvos de toque verificados |
| U7 | Verificação final e entrega | Executada — parcialmente verificada | correções solicitadas, comparativos antes/depois, testes, backup e relatório em `ENTREGA.md`; lacunas discriminadas na matriz |

Próxima ação: fechar as pendências de validação da U7. Não há U8 neste pacote; nenhuma etapa posterior foi iniciada.

## Contexto local

- Branch/commit: `main` / `7960bf4fe93f8d731e0ceaece314fabac253f89b`.
- Alterações preexistentes: árvore muito modificada; preservada integralmente.
- Caminhos reconciliados: `MAPA_LOCAL.md`; tokens visuais agora partem de `src/ui/styles/tokens.css`; apresentação de partidas compartilhada em `src/ui/screens/matches/matchPresentation.ts`.
- Baseline: Node `22.23.2`; `npm run typecheck` aprovado; testes focados U4 18/18 aprovados; lint direcionado mantém erros de hooks legados; App/AppFlow ainda contém expectativas antigas de UI.

## Última execução

Arquivos alterados nesta etapa: `src/ui/app/App.tsx`, `src/ui/app/app.css`, `src/ui/screens/scout/CourtLineup.tsx`, `src/ui/screens/scout/EventTimeline.tsx`, `src/ui/screens/scout/ScoutScreen.tsx`, `src/ui/screens/scout/SpatialCourtInputV2.tsx`, `src/ui/screens/scout/VisualScoutForm.tsx`, `src/ui/screens/scout/VolleyballVisualScout.tsx`, `src/ui/screens/scout/VolleyballVisualScout.css`, `src/ui/screens/scout/gesture/AttackOutcomeBar.tsx`, `src/ui/screens/scout/gesture/GestureScout.tsx` e `src/ui/screens/scout/gesture/PlayerQuickPicker.tsx`. Testes próximos de Visual/Gestual foram ajustados aos rótulos do contrato.

Resultado: U4 concluída. A seleção de qualidade mostra símbolo e significado, aceita a tecla correspondente sem repetir ao manter a tecla pressionada e pode ser desmarcada. `Sem atleta identificado` permanece uma opção explícita no Visual, Híbrido e Gestual; a sugestão automática não sobrescreve essa escolha e atletas da reserva permanecem selecionáveis. `Refazer trajetória` e `Cancelar rascunho` agora têm alcances distintos no Visual. Registros híbridos e trocas protegem contra reenvio, exibem sucesso/erro e preservam o rascunho em falha. O histórico global compacta registros visuais e mantém correção/desfazer/refazer; a troca mostra quem sai, quem entra e o resultado.

Verificações U4: `npm run typecheck` aprovado; 6 arquivos de testes dirigidos e 18 testes aprovados. No Chrome do sistema, Visual confirmou ação sem atleta, qualidade selecionada após resize, registro único e retorno `Ação registrada.`; Gestual manteve `Sem atleta identificado` selecionado e rótulos corretos; a troca de `#01` por `#07 Reserva` atualizou a posição e retornou `Troca aplicada.`. Captura: `output/u4-register-success-1366x640.png`.

Pendências reais: o lint direcionado continua falhando apenas pelas regras de hooks já existentes em `App.tsx`, `ScoutScreen.tsx` e no reset de draft gestual; há um aviso de dependência de efeito em `App.tsx`. `AppFlow.test.tsx` ainda tem expectativas de UI anterior (`Registrar contato` e reserva como `<select>`), separadas das verificações dirigidas atuais. Nenhum bloqueio funcional de U4 foi encontrado.

## Execução U5

Arquivos alterados nesta etapa: `src/ui/screens/summary/MatchAnalyticsPanel.tsx`, `src/ui/screens/summary/SpatialAnalyticsPanel.tsx`, `src/ui/screens/summary/SpatialAnalyticsPanel.css`, `src/ui/screens/summary/SpatialAnalyticsPanel.test.tsx`, `src/ui/screens/summary/SummaryScreen.tsx`, `src/ui/app/App.tsx`, `src/ui/app/app.css` e `e2e/changelog-capture.spec.ts`.

Resultado: Análise inicia em Quadra e mantém as regiões montadas ao alternar Quadra, Desempenho, Distribuição e Evolução. O espaço da quadra exibe ações no recorte versus origem/destino registrados, mantém Origem/Destino acessível, agrupa posição do levantador em Mais filtros, conserva ajustes recolhidos do mapa de calor e mostra legenda de intensidade. Análises salvas permanecem vinculadas à partida/equipe, reabrem pelos IDs persistidos e indicam alterações não salvas. A inclusão no relatório usa checkbox persistente por gráfico elegível e mostra a contagem real; o Resumo ganhou entrada direta para Análise e um único menu Exportar com os formatos já existentes.

Verificações U5: `npm run typecheck` e `npm run build` aprovados; testes dirigidos de espacial, gráficos e renderer PDF em 3 arquivos/9 testes aprovados. O lint direcionado dos três componentes de análise passou. O roteiro E2E visual do changelog foi tentado, mas parou antes da Análise porque o fluxo legado não encontrou `Nova partida` após `Cadastros`; isso não foi considerado aprovação visual. O lint global mantém erros de hooks já existentes em `App.tsx` e outras telas, além de aviso de dependência no efeito de `App.tsx`.

Pendências reais: a suíte `AppFlow.test.tsx` ainda falha em seis expectativas legadas de captura/troca, separadas da U5; a captura visual completa da análise depende de corrigir o roteiro de navegação em etapa apropriada. O renderer PDF e os exporters existentes foram preservados e cobertos por teste, mas não foram substituídos.

## Execução U6

Arquivos alterados nesta etapa: `src/ui/app/app.css`, `src/ui/screens/match-setup/NewMatchScreen.tsx`, `src/ui/screens/registrations/RegistrationsScreen.tsx`, `src/ui/screens/registrations/registrations.css`, `src/ui/screens/profile-editor/ProfileEditorScreen.tsx`, `src/ui/screens/free-log/FreeLogScreen.tsx`, `src/ui/screens/training/TrainingScreen.tsx`, `src/ui/screens/training/TrainingTutorial.tsx`, `src/ui/screens/manual/ManualScreen.tsx` e `src/ui/screens/scout/SpatialCourtInputV2.css`.

Resultado: Nova partida, Cadastros, Editor de perfis e Área livre passaram a expor IDs/labels explícitos, erros associados e `type` semântico nos comandos. O Treino prepara o foco no primeiro comando do feedback e retorna ao campo no exercício seguinte, sem alterar correção ou persistência. As grades/listas receberam reflow para celular, nomes longos, elenco extenso e rolagem horizontal contida somente no quadro do Manual; os controles auxiliares usam os tokens comuns. A quadra espacial ganhou alvo de 44 px e contenção local de overscroll; a quadra gestual existente, com `touch-action: none` somente no frame, foi preservada. Termos conhecidos do Manual/Tutorial foram traduzidos para `Bola de graça`.

Verificações U6: `npm run typecheck` aprovado; `npm run build` aprovado com o aviso existente de chunk acima de 500 kB; lint direcionado dos sete componentes alterados aprovado; cinco arquivos/9 testes aprovados (`registrations`, `TrainingService`, `FreeLogService`, `App` e `SpatialCourtInputV2`). No Google Chrome do sistema, Manual, Treino, Cadastros e Perfis não apresentaram overflow em 1366×844, 1024×844, 768×844, 390×844 e 683×844 CSS px; Nova partida em 390×844 também não apresentou overflow e expôs 40 controles com 6 labels explícitos. O último tamanho é o proxy de reflow usado para a verificação de zoom de 200%.

Pendências reais: o lint global e seis expectativas legadas de `AppFlow.test.tsx` permanecem fora da U6, como já registrado; não foram reescritos porque dependem da UI antiga. O Chromium do Playwright não está instalado neste checkout, portanto não foi feita captura automatizada com o navegador empacotado nem validação de zoom nativo; a checagem responsiva usou o Google Chrome do sistema e larguras CSS equivalentes. Não houve bloqueio funcional identificado nas telas desta etapa.

## Execução U7 — revisão solicitada e entrega local

Correções: Gestual com seletor orientado pela rotação real (Rede P4/P3/P2, Fundo P5/P6/P1), líbero em botão dedicado, reservas acessíveis e nome no hover/seleção. Sugestões continuam derivadas do motor, sem reordenar os atletas nem representar uma linha de passe inventada. Detalhes/correção passaram a controles de 44 px e expansão no fluxo; Enter/Espaço, Tab/Shift+Tab e Escape com retorno de foco conferidos. Quadra, qualidade, ações e confirmação cabem no cenário normal em 1366×640; celular mantém fluxo vertical e rolagem natural.

Arquivos de produção desta revisão: `src/ui/app/app.css`, `src/ui/screens/scout/ScoutScreen.tsx`, `MatchContextBar.tsx`, `GestureCourtInput.tsx`, `GestureCourtInput.css`, `gesture/GestureScout.tsx`, `gesture/PlayerQuickPicker.tsx` e `gesture/gesture.css`. Testes: `gesture/PlayerQuickPicker.test.tsx` e `e2e/u7-interface.spec.ts`. Nenhuma alteração desta revisão em motor, schemas, banco, métricas, dependências, lockfile ou service worker. As mudanças preexistentes nesses caminhos foram preservadas.

Verificações em Node 22.23.2/Chrome do sistema: build e typecheck aprovados; testes dirigidos finais de Gestual/quadra/seletor 13/13. Suíte completa executada uma vez: 392/401 testes aprovados, 82/83 arquivos; 9 falhas em AppFlow. Na execução isolada, 8 falhas/5 aprovações, exatamente os mesmos casos reproduzidos em cópia do código anterior às correções. A nona falha (próximo set) não reproduziu isoladamente antes nem depois. Lint global: 18 erros e 1 aviso em código preexistente; lint dos arquivos sem violações legadas alterados nesta revisão aprovado. E2E críticos existentes: 3/7 aprovados; falhas discriminadas na entrega.

O roteiro U7 passou 5/5 cenários: comparação nos mesmos viewports/dados, gravação Visual/Híbrido/Gestual, atleta ausente, rotação, líbero, touchCancel, teclado dos disclosures, nomes longos, reservas, análises salvas após reload e PDF. Os quatro casos falhos do E2E crítico também falharam na cópia anterior às correções. Artefatos em `output/u7/`. O backup comparado foi produzido antes destas correções, em U6, não antes de U1; isso não substitui o ensaio com um backup genuinamente anterior ao redesenho. Migração/reabertura antigas são cobertas pelos testes existentes de IndexedDB, mas essa lacuna de ensaio visual permanece.

Pendências: reconciliar os testes/atalhos legados, resolver placar duplicado no Resumo e mensagem de análise sem coordenadas, completar os itens parciais da matriz e validar backup anterior a U1 e zoom nativo/IME. Não foi encontrada regressão nos fluxos de gravação/exportação exercitados; isso não equivale a aprovar toda a matriz. Próxima ação permanece o fechamento da U7, sem replanejar a interface.

## Refinamento de registro — 14/09/2026

Somente o escopo solicitado de registro/visibilidade foi implementado. O ajuste de contexto acrescenta serviço validado com os eventos existentes, sem migração; ele não reescreve os contatos passados. A bola de graça deixou de corrigir ataque anterior e grava contato/trajetória próprios; após gravar, o Gestual sugere defesa adversária. O modo rápido é opcional e a confirmação manual permanece.

Verificações em Node 22.23.2/Chrome do sistema: `npm run typecheck` e `npm run build` aprovados (permanece o aviso de chunk acima de 500 kB); 25 testes dirigidos em 5 arquivos aprovados; 2 cenários E2E de registro rápido/falha/reabertura e 3 E2E de compatibilidade aprovados. Lint direcionado do serviço, novo painel, seletor e novos testes aprovado; lint global mantém os mesmos 18 erros e 1 aviso preexistentes. Logs e capturas em `output/registro-rapido/`; uso e limites em `docs/versoes/v0.4/REGISTRO_RAPIDO.md`. A suíte global AppFlow não foi reexecutada nem declarada corrigida. Limite: velocidade equivalente ao digitado ainda exige avaliação com operador em jogo real; não foi prometida por teste automatizado. As pendências U7 acima permanecem fora deste ajuste.

## F4 Futebol StatsBomb — execução local

F4 foi implementada sem iniciar F5. Os seletores puros estão em `src/domain/football/FootballAnalytics.ts`: agrupamento por posse sem duplicação, filtros por equipe/período/tipo/contexto/zona/desfecho, modos de ações/trajetórias/densidade, contagem de posições observadas e posses perigosas com critério único. Eventos filtrados não são reconectados; o drill-down mantém IDs e `index` originais.

`src/ui/screens/summary/FootballAnalyticsPanel.tsx` fornece os três modos, denominadores explícitos e abertura da sequência original da posse. A densidade usa somente localidades válidas; `[x,y,z]` não é projetado como ponto extra. Testes em `src/domain/football/FootballAnalytics.test.ts` cobrem múltiplos passes/dois chutes na mesma posse, lateral como posse seguinte, evento parcial, posse aberta, filtro sem transição artificial, trajetórias e densidade. F5 não foi iniciada.

## F5 Futebol StatsBomb — execução local

F5 foi implementada sem novas etapas. `src/domain/football/StatsBombOpenData.ts` importa arrays Open Data v4.0.0 preservando `raw`, IDs, ordem, campos desconhecidos, nulos e extras; exporta backup completo e exportação pura com manifesto de eventos omitidos. `src/domain/football/FootballReferenceMarkov.ts` calcula referência, observado local e combinado apenas quando estado/desfecho/cobertura são equivalentes, com `alpha=10` explícito; distribuição local com zero posses não é apresentada como observação. `src/application/reporting/FootballReferenceReport.ts` fornece payload compatível com a infraestrutura de relatório existente, sem novo renderer/backend.

Fixture e referência offline: `test/fixtures/statsbomb-15946-sample.json`, recorte pinado de `hudl/open-data`/partida 15946; `reference/generate-statsbomb-reference.mjs`, `reference/statsbomb-reference-v1.json` e `reference/README.md`. A referência registra fonte, especificação, seleção, cobertura, contagens, SHA e regra de não aplicar parâmetro a `3+1`. Nenhum download ocorre no app/jogo. README e CHANGELOG foram atualizados.

Testes em `src/domain/football/StatsBombOpenData.test.ts` cobrem raw desconhecido, `statsbomb_xg` importado, parciais e manifesto; o cálculo cobre combinação/desativação por incompatibilidade. O script offline executou e regenerou o JSON. Vitest foi iniciado, mas ficou sem conclusão após carregar 0 testes; `tsc` também permaneceu sem saída por processos Vite/TSC antigos. Portanto as verificações automatizadas não são declaradas aprovadas. Limitações reais: o recorte é pequeno e não sustenta taxas públicas amplas; a integração visual do painel de relatório não foi certificada no navegador; placar/own-goal exige auditoria adicional quando eventos completos forem ligados ao workspace. Não há xG inventado.

## Recuperação funcional — etapa 2 de 5

A etapa 2 foi concluída sem iniciar a etapa 3. A causa reproduzida do campo reduzido a uma linha era `height: 100%` em `.football-surface` sem altura definida na cadeia de contêineres. A superfície agora reserva proporção 3:2 e usa um SVG com `viewBox="0 0 120 80"`, limites, linha e círculo centrais, áreas, pequenas áreas, marcas penais, arcos, cantos e gols. A inversão é exclusivamente visual; os eventos continuam em coordenadas canônicas.

Arquivos desta etapa: `src/ui/screens/scout/FootballCourtSurface.tsx`, `FootballCourtSurface.css`, `GestureCourtInput.tsx`, `GestureCourtInput.css`, `GestureCourtInput.test.tsx`, `football/FootballScoutScreen.tsx`, `football/FootballActionPanel.css`, `src/ui/app/App.tsx`, `src/ui/app/app.css` e `e2e/recovery-stage2.spec.ts`. O futebol aceita origem/destino por dois cliques e também arraste; o cálculo usa o retângulo desenhado corrente, inclusive depois de resize. O comportamento gestual do vôlei foi preservado. O cadastro de futebol mantém as equipes alinhadas e não exibe instruções de vôlei. Em tela estreita, os painéis empilham sem overflow horizontal.

Verificações aprovadas em 19/09/2026: `npm run typecheck`; `npm run build` (permanece somente o aviso de chunk acima de 500 kB); 7/7 testes dirigidos de gesto e cadastro; e 1/1 roteiro Playwright cobrindo 1280×720, 1366×768, 1920×1080, inversão e 390×844. Capturas reais posteriores à correção estão em `output/recovery-stage2/`. Não foi produzida uma captura automatizada anterior à correção nesta execução; portanto não se declara um par antes/depois local inexistente.

Limite da etapa: resultado, revisão e confirmação completos pertencem ao ciclo previsível da etapa 3 e não foram antecipados. Próxima etapa: etapa 3, somente mediante solicitação.

## Recuperação funcional — etapa 3 de 5

A etapa 3 foi concluída sem iniciar as etapas 4 ou 5. O futebol agora usa estados explícitos de escolha da ação, resultado, marcação espacial, revisão e confirmação. Passe e condução pedem origem/destino; recuperação, interceptação, desarme, drible e finalização usam ponto; perda, falta e substituição não exigem trajetória. Substituição permite identificar opcionalmente quem sai e quem entra, sem inventar atletas quando o elenco está incompleto.

Persistência e projeção append-only foram integradas ao repositório existente em `src/domain/match/events/MatchEvent.ts`, `src/domain/football/FootballRecorder.ts` e `src/application/ScoutTrainerService.ts`. Eventos canônicos guardam período, tempo esportivo, equipe, atleta opcional, tipo, resultado e coordenadas StatsBomb quando observadas. Posse só é gravada quando escolhida em `Posse observada`; não é inferida pela ação. Correção e desfazer são eventos novos, sem reescrever o registro anterior.

O relógio permite iniciar, pausar, ajustar e trocar entre os dois períodos. Estado em execução usa `referenceTimestamp` persistido e estado pausado reabre sem zerar ou avançar. O placar de futebol é projetado dos gols ativos; desfazer um gol o remove uma vez. Ajustes manuais são persistidos separadamente com motivo `football_manual:operator` e aparecem em uma seção identificada como ajuste manual.

UI alterada em `src/ui/screens/scout/football/FootballScoutScreen.tsx`, `FootballActionPanel.tsx`, `FootballActionPanel.css`, `src/ui/screens/scout/GestureCourtInput.tsx` e `src/ui/app/App.tsx`. Há comandos distintos para `Desfazer marcação`, `Cancelar evento` e `Desfazer último evento`; falha mantém o rascunho. Enter confirma somente rascunho válido fora de campos/controles, Escape cancela, e uma trava local impede envio duplicado. A equipe e a posse explicitamente escolhida permanecem como contexto; trocar ação limpa resultado e localizações incompatíveis.

Verificações aprovadas em 19/09/2026: `npm run typecheck`; lint direcionado dos arquivos da etapa; `npm run build` (somente o aviso conhecido de chunk acima de 500 kB); 9/9 testes dirigidos; e 1/1 roteiro Playwright. `src/tests/integration/football-recording-cycle.test.ts` cobre recuperação → passe completo → condução → passe incompleto → recuperação adversária → chute para fora, evento sem atleta, posse explícita, gol/desfazer, ajuste manual distinguível, correção, relógio e reabertura. `e2e/recovery-stage3.spec.ts` cobre gravação única, cancelamento sem persistência, gol, desfazer e reabertura. Capturas reais: `output/recovery-stage3/goal-confirmed-1366x768.png` e `after-undo-reload-1366x768.png`. `git diff --check` passou.

Limitações reais: o ajuste do relógio nesta etapa aceita minutos inteiros pela interface; acréscimos e formato minuto:segundo mais preciso ficam para refinamento posterior. A substituição aceita identidades opcionais, mas não valida regras de competição nem limite de trocas. A gaveta tática preexistente continua opcional e não foi ampliada nesta etapa. Próxima etapa: etapa 4, somente mediante solicitação.

## Recuperação funcional — etapa 4 de 5

A etapa 4 foi concluída sem iniciar a etapa 5. A auditoria encontrou e corrigiu uma falha real: os envelopes de futebol da etapa 3 eram persistidos e reabertos pelo IndexedDB, mas o importador do backup JSON ainda rejeitava esses tipos. O backup completo agora usa contrato `1.1.0`, identifica `modality`, inclui manifesto de compatibilidade e valida `football_event_registered`, `football_event_corrected`, `football_event_undone` e `football_clock_changed`. Backups `1.0.0` continuam aceitos e são normalizados em memória sem alterar seus eventos.

Não foi criada nova versão do banco: os envelopes usam a store append-only existente e nenhuma mudança de chave, índice ou forma armazenada foi necessária. Uma migração IndexedDB vazia aumentaria risco sem preservar dado adicional. A migração necessária foi feita no limite correto, o contrato de backup `1.0.0` → `1.1.0`.

`src/infrastructure/export/json/MatchJson.ts` passou a validar identidade estável, partida, sequência do envelope, horário de gravação, período/tempo esportivo canônico, proveniência `scout_trainer`, entidades e coordenadas 0–120 × 0–80. Referências de correção/desfazer precisam apontar para envelopes existentes. Coordenada ausente permanece ausente e coordenada inválida causa rejeição; não há preenchimento pelo centro do campo.

`src/domain/football/StatsBombOpenData.ts` ganhou validação e exportação do subconjunto local observado. O JSON puro omite `scout_trainer`, lista campos cobertos, eventos omitidos e limitações; não cria xG, tracking, atleta, posse, resultado ou localização ausentes. O backup Scout Trainer continua sendo a representação completa. A interface em `FootballScoutScreen.tsx` e `App.tsx` oferece comandos separados para backup completo e subconjunto StatsBomb; `ScoutTrainerService.ts` integra o exportador sem download automático durante o jogo.

Contrato e perdas estão documentados em `docs/referencia/COMPATIBILIDADE_DADOS_FUTEBOL.md`, ligado pelo `README.md`. Foram conferidos em 20/09/2026 o repositório oficial `hudl/open-data`, a documentação oficial de eventos e a estrutura JSON publicada. Fixture e testes permanecem offline. Nenhum cálculo de Markov, xG, referência ou `3+1` foi alterado.

Verificações aprovadas: `npm run typecheck`; lint direcionado dos arquivos sem dívida técnica preexistente; `npm run build` (somente aviso conhecido de chunk acima de 500 kB); 19/19 testes em 4 arquivos; 1/1 roteiro Playwright em `e2e/recovery-stage4.spec.ts`; e `git diff --check`. O round-trip cria uma partida com a sequência da etapa 3, fecha/reabre, exporta e restaura em outro banco, comparando eventos, localização e relógio. A captura real está em `output/recovery-stage4/exports-1366x768.png`.

Limitações reais: a compatibilidade StatsBomb declarada é somente do subconjunto observado, não equivalência integral com a coleta comercial; extras locais só são lossless no backup completo. O lint global mantém violações de hooks preexistentes em `App.tsx`, por isso não foi declarado aprovado. A simulação visual de falha de persistência e o roteiro operacional de dez minutos pertencem à etapa 5. Próxima etapa: etapa 5, somente mediante solicitação.

## Recuperação funcional — etapa 5 de 5

A etapa 5 foi executada e encerra o plano de recuperação; não existe etapa 6. A reclamação de que o campo desaparecia foi reproduzida: `GestureCourtInput.tsx` retornava `null` sempre que nenhuma ação espacial estava habilitada. No futebol, o campo agora permanece montado antes de escolher a ação e depois de salvar/cancelar; nesse estado fica inerte e informa que é necessário escolher uma ação espacial. O comportamento condicional original do vôlei foi preservado.

Também foram corrigidas duas regressões encontradas no roteiro: a altura disponível do campo em 1280×720 passou a considerar os controles atuais, e os jogadores iniciais 1–12 voltaram ao cadastro de vôlei. Futebol continua iniciando sem elenco fictício; a troca de modalidade preserva escalações digitadas e só remove/restaura os defaults automáticos. Uma fixture F4 que esperava trajetórias sem informar destinos foi corrigida, sem afrouxar o seletor de dados observados.

Arquivos desta etapa: `src/ui/screens/scout/GestureCourtInput.tsx`, `GestureCourtInput.css`, `GestureCourtInput.test.tsx`, `src/ui/screens/match-setup/NewMatchScreen.tsx`, `NewMatchScreen.sport.test.tsx`, `src/ui/app/app.css`, `src/tests/integration/football-recording-cycle.test.ts`, `src/domain/football/FootballAnalytics.test.ts`, `e2e/recovery-stage5.spec.ts` e `docs/versoes/v0.4/recuperacao/VALIDACAO_RECUPERACAO_ETAPA5.md`.

Verificações em 20/09/2026: `npm run typecheck` aprovado; quatro arquivos/14 testes focados aprovados; os quatro roteiros de recuperação totalizam 6/6 cenários Playwright aprovados quando executados sem saturação concorrente; `npm run build` aprovado, mantendo somente o aviso conhecido de chunk acima de 500 kB. O teste de falha de IndexedDB confirmou erro visível, zero confirmação falsa e rascunho/local preservados. O roteiro de vôlei confirmou registro, placar, quadras e reabertura. Evidências visuais estão em `output/recovery-stage5/`.

Limites reais: a rodada foi automatizada/controlada e não acompanhou dez minutos de jogo real com operador; essa avaliação ergonômica continua recomendada. A suíte antiga `AppFlow.test.tsx` e casos de `critical-flow.spec.ts` mantêm expectativas de navegação/textos anteriores e não foram reescritos nesta etapa. O plano de cinco etapas está implementado; a próxima atividade, se desejada, é validação humana em jogo real e triagem separada dos testes legados, não uma nova etapa funcional.
