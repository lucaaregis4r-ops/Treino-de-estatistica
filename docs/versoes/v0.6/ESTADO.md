# Estado da versão 0.6

**Atualizado em:** 01/10/2026. O aplicativo continua na versão 0.5.0. Este arquivo acompanha apenas a linha 0.6; o estado da 0.5.0 permanece em `docs/versoes/v0.5-proposta/ESTADO.md`.

| Etapa | Estado | Evidência |
|---|---|---|
| M0 — contratos e auditoria | **Concluída (documentação)** | [`CONTRATOS_M0.md`](CONTRATOS_M0.md): fluxos atuais, tipos propostos, compatibilidade, relógio, fixtures e viabilidade de xG |
| M1 — corrigir substituições | Implementada no futebol; vôlei não reproduzido | Tela real de futebol agora oferece troca entre atletas identificados; fluxo do vôlei não foi alterado |
| M2 — modalidade e quadra | Implementada; inspeção visual pendente | Criação, cadastro, filtro, backup 1.3, orientação por equipe/período e tela futsal com quadra dedicada; typecheck passou |
| M3 — relógio e T | Implementada; typecheck passou | Relógio de futsal com transições persistidas, tecla T, reabertura reconciliada e fim de período |
| M4 — scout essencial | Implementada; typecheck, testes dirigidos e lint aprovados | Fatos de controle, finalizações, reinícios e faltas com localização/tempo; placar e faltas por período derivadas do histórico |
| M5 — substituições do futsal | Implementada; typecheck, testes dirigidos, lint e E2E aprovados | Composição parcial/completa, substituição volante, goleiro-linha e histórico corrigível |
| M6 — tática e revisão | Implementada; verificação automatizada aprovada | Etiquetas opcionais por lance/intervalo, correção e remoção auditáveis |
| M7 — análises e xG | Implementada; verificação dirigida aprovada | Análises descritivas de futsal com cobertura; sem modelo de futebol |
| M8 — validação e entrega | **Parcial; entrega bloqueada** | [`etapas/M8_RESULTADO_VALIDACAO.md`](etapas/M8_RESULTADO_VALIDACAO.md): typecheck/build passaram; E2E futsal e substituição futebol passaram; suíte total interrompida após falhas AppFlow |
| S0 — contratos e protótipo do aditivo | Implementada | [Contratos](aditivo-cadeias-e-scout-minimo/S0_CONTRATOS.md), [fixtures](aditivo-cadeias-e-scout-minimo/S0_FIXTURES.md), [protótipo](aditivo-cadeias-e-scout-minimo/S0_PROTOTIPO.md); atalhos e desarme com troca automática de posse; campo fixo por período |
| S1 — scout mínimo de futsal | Implementada; verificação dirigida aprovada | [Resultado](aditivo-cadeias-e-scout-minimo/S1_RESULTADO.md): controle em um clique, ponto de bola, ações e retry; E2E nos dois viewports |
| S2 — rallys e posses completos | Implementada; verificação dirigida aprovada | [Resultado](aditivo-cadeias-e-scout-minimo/S2_RESULTADO.md): unidades derivadas com toda a evidência, limites/censura, filtros por unidade, correção/desfazer e backup |
| S3 — análise e apresentação das trajetórias | Implementada; verificação dirigida aprovada | [Resultado](aditivo-cadeias-e-scout-minimo/S3_RESULTADO.md): variantes completas, padrões contíguos, lista auditável, exportações e contraste do futsal |
| S4 — modelo probabilístico por contexto | Implementada; validação funcional fica na S5 | [Resultado](aditivo-cadeias-e-scout-minimo/S4_RESULTADO.md): modelo variável por esporte, recuo por suporte, comparação com três bases, validação deixando partida de fora e calibração por bootstrap de partidas |

## Rodada M0

- **Arquivos alterados:** `docs/versoes/v0.6/CONTRATOS_M0.md`, `ESTADO.md`, `README.md`, `PLANO_IMPLEMENTACAO_LUNA.md` e `etapas/M0_CONTRATOS_E_AUDITORIA.md`.
- **Comportamento implementado:** nenhum; M0 é etapa de contrato e auditoria.
- **Decisões:** futsal explícito e separado; backup futuro 1.3 com leitura legada; eventos próprios; relógio de tempo efetivo; substituições de futebol/vôlei/futsal com semânticas distintas; nenhum xG numérico de futsal com o dataset atual.
- **Verificação:** inspeção estática dos arquivos citados em `CONTRATOS_M0.md`, busca de dataset/eventos de futsal, conferência de links e formatação. Nenhum teste funcional, E2E ou piloto foi executado nesta etapa.
- **Pendências:** implementar as etapas M2–M8 e reproduzir o relato de substituição no vôlei antes de atribuir causa. Não há dados de chutes de futsal para calibrar xG.
- **Próxima etapa elegível:** M2 — modalidade e quadra.

## Rodada M1

- **Arquivos alterados:** `src/ui/screens/scout/football/FootballMinimalScoutScreen.tsx`, seu CSS, `src/application/ScoutTrainerService.ts`, este estado e `etapas/M1_CORRIGIR_SUBSTITUICOES.md`.
- **Comportamento implementado:** botão de substituição na tela de futebol em uso; seleção de equipe, atleta que sai e atleta que entra; registro com IDs distintos em `playerId`/`relatedPlayerId`; feedback de gravação/erro; validação no serviço para exigir dois atletas diferentes. O evento segue a trilha existente de correção, desfazer e exportação.
- **Escalação:** nenhum titular ou reserva foi inferido, pois o registro de futebol não tem escalação inicial observada. `Player.active` continua significando cadastro ativo.
- **Vôlei:** fluxo de troca por slot e reserva inspecionado; sem reprodução em UI e sem alterações nessa semântica.
- **Verificação:** revisão estática do caminho UI → serviço → evento de futebol. Testes e typecheck não foram executados nesta rodada.

## Rodada M2

- **Arquivos alterados:** tipos de modalidade/cadastro, serviço e tela de criação, tela de registros, filtro/lista de partidas, navegação da partida, nova `FutsalScoutScreen`, nova `FutsalCourtSurface`, orientação de quadra e `MatchJson`.
- **Comportamento implementado:** futsal disponível como terceira modalidade; criação sem exigir escalação inicial; modalidades persistem em partida, equipe e atleta; seleção de cadastro legado sem modalidade pede confirmação; histórico lista e filtra futsal; navegação abre somente o scout inicial do futsal, sem montar painéis de futebol ou vôlei.
- **Quadra:** superfície própria de proporção 40:20 nominal, com linha e círculo centrais, áreas de 6 m, marcas de 6/10 m, referências laterais e escanteios. Coordenadas de captura permanecem normalizadas. Dimensões reais não são presumidas nem distâncias em metros exibidas.
- **Orientação:** direção de ataque persistida por equipe e período, sem inferência inicial; a captura gestual comum aceita `sport='futsal'` e usa a superfície própria.
- **Backup:** versão 1.3.0 declara contrato próprio de futsal e mantém leitura de backups 1.0.0, 1.1.0 e 1.2.0. Não foram introduzidos eventos de scout nesta etapa.
- **Referência visual:** desenho nominal baseado na Lei 1 das [Leis de Futsal FIFA 2025–26](https://www.tff.org/Resources/TFF/Documents/MHK/2025-2026/futsal-laws-of-the-game.pdf); dimensões oficiais variam por competição.
- **Verificação:** `npm run typecheck` e `git diff --check` passaram. Não foram executados testes nem inspeção visual de navegador nesta rodada.

## Rodada M3

- **Arquivos alterados:** `src/domain/futsal/FutsalClock.ts`, `MatchEvent.ts`, `ScoutTrainerService.ts`, `MatchJson.ts`, tela e CSS de futsal, `App.tsx` e documentação M3.
- **Comportamento implementado:** dois períodos regressivos, padrão 20:00, com relógio independente do futebol. T e botão iniciam/pausam por uma transição persistida; repetição, modificadores, composição IME e foco em campos/diálogos são ignorados. Salvamento em voo bloqueia repetição e falha mantém o tempo anterior visível.
- **Limites e exceções:** ao chegar em 00:00, grava fim de período e bloqueia início normal. Permite autorizar e finalizar cobrança final, ajuste de tempo com justificativa e avanço confirmado do 1º para o 2º período. O tempo acumulado no 2º período parte da duração do 1º.
- **Reabertura:** se a última transição persistida estava rodando, a primeira abertura desta sessão mostra estado de reconciliação, congelado no tempo registrado. O operador escolhe retomar daquele ponto ou manter parado; o tempo fora do app não é somado automaticamente.
- **Verificação:** `npm run typecheck` e `git diff --check` passaram; revisão estática do domínio, serviço, tela e contrato de backup concluída. Não foram executados testes da suíte nem inspeção visual de navegador.
- **Próxima etapa:** M4 — scout essencial, que passa a registrar fatos com tempo do relógio de futsal.

## Rodada M4

- **Arquivos alterados:** `src/domain/futsal/FutsalScout.ts` e teste, `MatchEvent.ts`, `ScoutTrainerService.ts`, `MatchJson.ts` e teste, `FutsalScoutScreen.tsx`/CSS, `App.tsx`, `e2e/futsal-essential-scout.spec.ts`, documentação M4.
- **Comportamento implementado:** a faixa prepara controle por equipe, disputa, bola parada, desconhecido, finalização com resultado, reinício de futsal e falta. O toque na quadra registra coordenada normalizada e tempo capturado no início do gesto; também há registro sem posição.
- **Regras projetadas:** chutes separados não alteram posse; trocar a equipe controladora exige antes registrar disputa, bola parada ou trecho desconhecido. Gol confirmado soma uma vez para a equipe beneficiada, incluindo seleção explícita de gol contra. Faltas acumuláveis contam por equipe/período; 5ª e 6ª geram aviso sem marcar tiro automaticamente. Corrigir a natureza acumulável ou desfazer recompõe placar/contador a partir do histórico.
- **Backup:** eventos `futsal_fact_registered`, `futsal_fact_corrected` e `futsal_fact_undone` incluídos no contrato 1.3; validador verifica equipes, atletas, coordenadas, beneficiário do gol e referências de histórico.
- **Verificação:** `npm run typecheck`, 3 testes de projeção, 7 testes JSON, lint dos fontes alterados, `git diff --check` e E2E desktop/celular passaram. O E2E verifica layout estreito em 390 px; não foi feita inspeção visual manual em aparelho físico.
- **Próxima etapa:** M5 — substituições do futsal, com composição observada sem inferir titulares.

## Rodada M5

- **Arquivos alterados:** domínio/projeção de futsal e testes, `ScoutTrainerService.ts`, `MatchJson.ts` e testes, tela/CSS do scout de futsal, E2E M4/M5 e contratos/estado/plano de versão 0.6.
- **Composição:** ação para observar atletas conhecidos em quadra; aceita composição completa (cinco, ou inferioridade explícita) e parcial. Não converte `Player.active` em escalação nem preenche atletas não observados.
- **Substituições:** botão sempre acessível fora da quadra, com troca completa ou parcial (inclusive ambos os atletas não identificados). Usa tempo efetivo e sequência do relógio de futsal, aceita troca em relógio rodando e reprojeta estado quando composição é conhecida. Rejeita IDs de equipe incompatível, saída ausente de composição completa, entrada já em quadra, atleta repetido e composição acima de cinco. Não altera posse, placar, faltas nem estado do relógio.
- **Goleiro-linha:** início/fim por equipe como contexto observado independente; nenhuma inferência a partir de camisa, posse ou localização.
- **Histórico/backup:** correção, desfazer e importação/exportação 1.3 preservam substituições, composições e marcadores. Correção mantém a ordem original do fato na reprojeção temporal.
- **Verificação:** `npm run typecheck`, ESLint dos fontes/E2E alterados, `git diff --check`, 12 testes dirigidos do domínio/backup e E2E futsal desktop/390 px passaram. E2E inclui troca parcial sem IDs com relógio rodando, correção/desfazer e goleiro-linha.
- **Próxima etapa:** M6 — contexto tático e revisão do scout.

## Rodada M6

- **Arquivos alterados:** `FutsalScout.ts` e testes, `ScoutTrainerService.ts`, `MatchJson.ts` e testes, `FutsalScoutScreen.tsx`/CSS, `App.tsx`, E2E e referências/contratos/etapa M6.
- **Revisão opcional:** painel fechado por padrão para etiquetar um fato observado ou intervalo entre dois fatos no mesmo período. Vocabulário inclui organização ofensiva, origem de reinício, situação numérica, defesa/goleiro e estruturas ofensivas. “Não observado” e campo em branco são distintos; nenhuma estrutura é inferida de pontos esparsos.
- **Histórico e integridade:** revisar, reclassificar e remover mantém trilha corrigível; a remoção é reversível. Serviço/backup validam fatos-alvo e ordem/período do intervalo. Etiquetas não alteram fatos-base, posse, placar, faltas nem relógio.
- **Base técnica:** categorias inspiradas em estudos observacionais específicos de futsal; diferenças entre ligas e competições são mostradas como limite, sem percentuais normativos ou inferência causal.
- **Verificação:** `npm run typecheck`, ESLint dirigido, `git diff --check`, 13 testes dirigidos do domínio/backup e E2E em desktop/390 px passaram. E2E inclui detalhe opcional, reclassificação/remoção, intervalo, M4/M5 e cronômetro.
- **Próxima etapa:** M7 — análises descritivas com cobertura e bloqueio de modelos de futebol de campo no futsal.

## Rodada M7

- **Arquivos alterados:** novo seletor `FutsalAnalytics`, nova tela/CSS de análise futsal, exportadores CSV/PDF futsal, campos de cobertura no backup JSON, integração na navegação/serviço/bundle, testes dirigidos e E2E; documentação M7, índice e estado.
- **Relatórios:** placar e gols por período, finalizações/resultados por equipe, mapa somente de finalizações com posição registrada, faltas acumuladas e totais, reinícios, substituições, composições, intervalos de goleiro-linha, estados/tempo de controle coberto e contexto tático com n, denominador e cobertura. Mostra “indisponível” em métricas cujo denominador observado é zero; não completa a lacuna com zero.
- **Posse:** média de finalizações e proporção de posses com finalização calculadas somente quando há episódio de controle contínuo com início e fechamento observados. Episódios abertos ou interrompidos por lacuna não entram no denominador.
- **Exportação:** tela e menu oferecem CSV/PDF próprios de futsal; o JSON explicita modalidade e cobertura e mantém fatos brutos/corrigidos como fonte para restauração. Bundle usa relatórios próprios; exportação StatsBomb continua disponível somente quando há projeção de futebol.
- **Modelos:** nenhum modelo de futebol, estimator de valor de finalização ou xT é invocado/exibido na rota, análise ou exportação de futsal. xG numérico continua fora da versão 0.6 por falta de dados e validação própria.
- **Verificação:** `npm run typecheck`, ESLint dirigido, `git diff --check`, 18 testes dirigidos de domínio/export/backup/limites arquiteturais e E2E futsal desktop/390 px passaram. E2E confirma tela de análise e downloads CSV/PDF sem rótulos de métricas de futebol. Uma execução da suíte total registrou 9 falhas em `AppFlow.test.tsx`, com timeouts e expectativas antigas de interface; dois erros adicionais vistos durante edição foram corrigidos e os testes dirigidos passaram depois. A suíte total não foi reexecutada após as correções.
- **Limites conhecidos:** cobertura é descritiva e depende da disciplina de registro; classificação de posse não representa o jogo quando os marcos de controle estão incompletos. O piloto humano e inspeção visual pertencem à M8.
- **Próxima etapa:** M8 — validação final e entrega.

## Rodada M8 (validação parcial)

- **Arquivos alterados:** ajustes de seletores/expectativas em `AppFlow.test.tsx`; regressão E2E da substituição persistida no futebol em `recovery-stage5.spec.ts`; avanço para o 2º período no E2E de futsal; este estado e `etapas/M8_RESULTADO_VALIDACAO.md`.
- **Verificação aprovada:** `npm run typecheck`, `npm run build`, `git diff --check`, ESLint dirigido; E2E do futsal completo (incluindo avanço de período e ausência de xG); E2E isolado da substituição de futebol, com persistência após reabertura.
- **Falhas e limites:** a suíte total `npm test -- --maxWorkers=1` foi interrompida após 5m53s, já reportando 7 falhas em `AppFlow.test.tsx`; resultado completo indisponível. Os outros E2E legados de recuperação também têm seletores/fluxos desatualizados. Filtro, backups/correção/exclusão em todas as modalidades e inspeção visual 1366×768/390×844 ainda não foram integralmente verificados. Sem operador/trecho real, o piloto está **aguardando piloto**.
- **Decisão:** manter app e package-lock em 0.5.0. M8 não concluiu o aceite técnico e a entrega 0.6.0 não está pronta.
- **Próxima ação:** corrigir ou substituir cada teste de fluxo que falha com prova equivalente, executar a suíte total completa e fechar os demais critérios documentados em M8 antes de alterar a versão do app.

## Rodada S1 do aditivo

- **Arquivos alterados:** `FutsalScoutScreen.tsx`/CSS, `GestureCourtInput.tsx`, projeção e análise de futsal, testes de domínio/E2E e documentação do aditivo.
- **Operação:** topo compacto, controle em um clique, quadra dedicada sempre visível, toque padrão para localização da bola, faixa de ações com atalhos F/D/R/V e T independente. Formulários de composição, orientação, ajuste e revisão estão em Mais. Finalização registra origem e destino; desarme, falta e reinício aceitam um ponto.
- **Regras:** gol confirmado fecha o controle projetado e pede novo marco; defesa não fecha automaticamente. Falha ao persistir mantém rascunho e tempo para retry, sem duplicação. Desarme continua trocando a posse e a quadra só muda de orientação quando muda o período configurado.
- **Verificação:** [resultado detalhado](aditivo-cadeias-e-scout-minimo/S1_RESULTADO.md), E2E desktop 1366×768 e celular 390×844 com inspeção visual, fluxo essencial, retry/reabertura, regressão de desarme/orientação, testes dirigidos de domínio, TypeScript, ESLint e `git diff --check`.
- **Próxima etapa do aditivo:** S2 — trajetórias completas. M8 permanece parcial, e o aplicativo permanece em 0.5.0.

## Rodada S2 do aditivo

- **Arquivos alterados:** novo módulo `src/domain/analytics/observed-sequence/` com contrato comum e adaptadores puros de vôlei, futebol e futsal; `ScoutTrainerService.ts`, `DerivedAnalyticsReport.ts`, testes dirigidos e documentação.
- **Comportamento:** cada rally/posse mantém todos os passos em ordem, IDs de origem e histórico efetivo, contexto de set/período, começo, fim, resultado e motivo de censura. Seleção por equipe, período, resultado ou ação devolve a unidade inteira. Uma disputa, lacuna, gol ou virada de período não junta fragmentos distintos.
- **Compatibilidade:** projeção derivada no carregamento, sem novo evento, coluna, ID persistido ou migração. Eventos legados de futebol com `possession` são trilhas censuradas; fatos sem atribuição de posse permanecem como evidência não atribuída. O `sample.n` global do relatório de vôlei deduplica `rallyId`.
- **Verificação:** [resultado detalhado](aditivo-cadeias-e-scout-minimo/S2_RESULTADO.md), testes de unidade e integração de reabertura/importação, TypeScript, ESLint e `git diff --check`.
- **Próxima etapa do aditivo:** S3 — análises e apresentação. M8 permanece parcial; não há modelo probabilístico novo nem alteração de UI nesta etapa.

## Rodada S3 do aditivo

- **Arquivos alterados:** analisador `ObservedSequenceAnalysis`, painel compartilhado `ObservedSequencePanel`, exportadores próprios CSV/JSON/PDF, telas de análise de vôlei/futebol/futsal, CSS de contraste do futsal, testes e documentação.
- **Comportamento:** lista e inspeção de rallies/posses completos, variantes exatas e categorizadas, distribuição por tamanho e desfecho, padrões contíguos com suporte por unidade distinta. Filtros selecionam unidades inteiras; desfechos só usam as elegíveis. Um limite de processamento declara mineração incompleta sem cortar as variantes.
- **Visual:** os cartões da análise de futsal não exibem mais texto claro sobre branco; a inspeção visual e o teste E2E verificaram desktop e 390 px.
- **Verificação:** [resultado detalhado](aditivo-cadeias-e-scout-minimo/S3_RESULTADO.md); testes dirigidos de domínio/UI e exportação, E2E do fluxo essencial e contraste, TypeScript, ESLint e `git diff --check`.
- **Próxima etapa do aditivo:** S4 — modelo probabilístico. M8 continua parcial e a versão distribuída permanece 0.5.0.

## Rodada S4 do aditivo

- **Arquivos alterados:** `SequenceContextModel.ts`, integração de histórico no `ScoutTrainerService.ts`, estado de carregamento em `App.tsx`, painel compartilhado de trajetórias, tela de análise de futsal, barrel do domínio e documentação S4.
- **Modelo:** ajusta separadamente vôlei, futebol e futsal a partir das unidades completas. Resultados de rally são normalizados para ponto ganho/perdido pela equipe do primeiro contato; posses usam o desfecho observado relativo à equipe em controle. Categorias de saída são definidas por esporte e não são inferidas da partida de validação.
- **Contexto:** o modelo considera a trilha categorizada inteira, sem limite fixo de 2/3 ações. A ação que codificaria diretamente o resultado terminal (virada/desarme, falta ou reinício; no vôlei, toque final de falta) não vira preditor, evitando vazamento; permanece na trilha auditável. No treino, procura o maior sufixo observado com 20 unidades distintas e presença em 3 partidas; recua apenas o contexto probabilístico se não houver suporte. A trilha integral da S3 permanece intacta.
- **Validação e publicação:** LO(M)O separa partidas completas. A comparação usa Brier multiclasses, log loss e erro de calibração top-1 em dez faixas, frente à base global, base por equipe e primeira ordem. Só publica se melhorar Brier e log loss sobre as três bases e tiver erro de calibração ≤ 0,10. Intervalos de estados publicados usam bootstrap determinístico por partida; estados exigem 20 unidades e 3 partidas.
- **Integração:** análise lê o histórico apenas da modalidade selecionada; não persiste parâmetros nem mistura xG/xT ou estado entre esportes. A UI informa n e motivo quando o modelo não atende volume, suporte, desempenho, calibração ou limite de recursos; as descrições S3 permanecem disponíveis.
- **Verificação:** `npm run typecheck`, ESLint dirigido e `git diff --check` passaram. Não foram executados testes de unidade, E2E ou suíte, nem piloto nesta rodada; a validação funcional da S4 fica para S5.
- **Próxima etapa do aditivo:** S5 — validação e entrega. M8 continua parcial e a versão distribuída permanece 0.5.0.
