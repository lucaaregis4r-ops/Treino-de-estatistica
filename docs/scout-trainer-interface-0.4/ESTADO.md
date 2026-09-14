# Estado da implementação

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

Verificações em Node 22.23.2/Chrome do sistema: `npm run typecheck` e `npm run build` aprovados (permanece o aviso de chunk acima de 500 kB); 25 testes dirigidos em 5 arquivos aprovados; 2 cenários E2E de registro rápido/falha/reabertura e 3 E2E de compatibilidade aprovados. Lint direcionado do serviço, novo painel, seletor e novos testes aprovado; lint global mantém os mesmos 18 erros e 1 aviso preexistentes. Logs e capturas em `output/registro-rapido/`; uso e limites em `docs/REGISTRO_RAPIDO.md`. A suíte global AppFlow não foi reexecutada nem declarada corrigida. Limite: velocidade equivalente ao digitado ainda exige avaliação com operador em jogo real; não foi prometida por teste automatizado. As pendências U7 acima permanecem fora deste ajuste.
