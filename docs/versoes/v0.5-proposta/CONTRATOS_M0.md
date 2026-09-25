# Contratos M0 — base para 0.5 proposta

**Data da inspeção:** 21/09/2026. **Escopo:** decisão de contratos; nenhuma tela, rota, migração ou dado foi alterado.

## Base confirmada

- `package.json`: versão declarada `0.4.0`; scripts disponíveis: `dev`, `build`, `desktop`, `build:exe`, `test`, `test:e2e`, `lint`, `typecheck`, `format` e `format:check`.
- O checkout já tinha 128 entradas no `git status --porcelain` antes desta entrega: 16 modificadas, 85 removidas e 27 não rastreadas. Entre as modificações existentes estão `App.tsx`, `NewMatchScreen.tsx`, `ScoutTrainerService.ts`, metadados/eventos de partida e exportação JSON. Elas não foram revertidas, formatadas nem incorporadas como conclusão de M0.
- A base atual já separa partidas de futebol e vôlei por `MatchMetadata.sport`; `resolveMatchSport` só infere legado como vôlei quando há evidência específica. Sem evidência, resulta em `undefined` e a UI pede identificação — não há classificação silenciosa.

## Contrato de navegação (referência para M1)

Não serão criadas rotas novas nesta etapa. A aplicação hoje usa o estado interno de `App.tsx`; M1 deve manter um único ponto de navegação e substituir gradualmente o conteúdo/rotulagem, sem duplicar telas.

| Contexto | Destinos estáveis | Regra de modalidade/retorno |
|---|---|---|
| Fora de uma partida | Início, Partidas, Cadastros, Treino e Manual; criação de partida a partir de Início/Partidas | `Cadastros` contém atletas, equipes e perfis. Manual retorna a Início quando aberto fora da partida. |
| Partida aberta | Voltar a Partidas, cabeçalho/placar, Registro, Resumo, Análise e Manual | O registro seleciona `FootballScoutScreen` para futebol e `ScoutScreen` para vôlei. Resumo/Análise só aparecem quando a modalidade está resolvida. Manual retorna ao Registro ou Resumo, conforme origem. |
| Legado com modalidade ambígua | Tela de recuperação de modalidade | Não mostrar controles de vôlei nem de futebol até a recuperação explícita; não preencher `sport` por heurística fraca. |

M1 deve preservar partida aberta, seleção de modalidade e rascunhos ainda não enviados ao trocar seção. O botão de retorno da partida volta à lista, não descarta o histórico. A URL não é contrato atual; se rotas forem introduzidas, elas devem representar esses mesmos estados e permitir restaurar o contexto da partida por `matchId`.

## Contrato de identidade, equipe e inscrição (referência para M2/M3)

Há três níveis distintos; IDs de um nível não devem ser reutilizados como IDs de outro.

| Nível | Finalidade e campos mínimos | Imutabilidade/compatibilidade |
|---|---|---|
| Atleta permanente | `athleteId`, nome completo como texto único, ativo, criação/atualização e, quando conhecido, dados de contato/cadastro independentes de equipe | O atleta não tem camisa, função de jogo ou equipe globais. O `AthleteRegistration.number` e `.position` atuais são dados legados/de transição, nunca a autoridade para reescrever vínculos ou partidas. |
| Vínculo de elenco | `membershipId`, `teamRegistrationId`, `athleteId`, ativo, camisa opcional, função específica opcional, modalidade/aplicabilidade explícita e timestamps | Camisa e função pertencem ao vínculo. Um atleta pode ter camisa/função diferentes por equipe. Vínculos legados de `TeamRegistration.athleteIds` devem ser preservados e apresentados como **sem classificação/migração confirmada**, não assumidos como vôlei. |
| Inscrição da partida | `playerId` da partida, `matchId`, `teamId` da partida, nome e camisa instantâneos, função quando escolhida e estado ativo | É um retrato criado para a partida. Alterar atleta ou elenco posteriormente não muda jogadores, escalações, eventos, relatórios ou backups já gravados. |

Para M2/M3, a aplicabilidade de esporte deve ser um valor explícito (`volleyball`, `football` ou `both`); registros antigos sem esse valor ficam `unknown_legacy` até confirmação do operador. Funções de vôlei (`setter`, `libero` etc.) não podem ser oferecidas como posições de futebol. Número de camisa é único somente no escopo de uma equipe/partida quando a regra daquele fluxo o exigir; não é identidade global. A criação de futebol pode continuar sem elenco, com atleta desconhecido distinto de um atleta permanente fictício.

## Contrato de rascunho e gravação de elenco (referência para M2/M3)

O editor mantém um rascunho estruturado em memória, por exemplo `RosterDraft { rows: RosterDraftRow[] }`. Cada linha possui `clientRowId` estável, `athleteId?`, `shirtNumber?`, `fullName`, `role?`, `sportApplicability`, `errors[]` e a intenção (criar, vincular, editar ou remover). O nome completo é sempre um campo único: espaços, acentos e apóstrofos não delimitam atletas.

- Enter e o botão “adicionar linha” acrescentam uma linha; não submetem nem serializam o formulário.
- Importação é opcional: o texto é convertido uma única vez em linhas candidatas e abre uma prévia editável. Linhas ambíguas, camisa inválida, duplicata no escopo ou função incompatível são erros por linha e bloqueiam a confirmação, sem descartar entradas válidas ou alterar o banco.
- A confirmação valida o conjunto completo e envia objetos estruturados a um caso de uso de lote. A UI não grava IndexedDB diretamente nem volta a transformar o elenco em `textarea` para criar a partida.
- O lote deve ter `batchId`, estados recuperáveis (`prepared`, `committing`, `committed`/`rolled_back`) e operações idempotentes por ID. Em falha/interrupção, a próxima abertura recupera ou desfaz somente esse lote; nenhuma equipe deve apontar para atleta parcialmente criado. A implementação pode usar uma transação de persistência ou diário durável equivalente, mas não múltiplos `save` independentes sem recuperação.

O fluxo atual em `NewMatchScreen` ainda interpreta linhas por vírgula/linha/ponto e vírgula e reconverte equipe cadastrada em texto. Isso é uma limitação registrada, não o contrato novo; será removida/adaptada por M2/M3 com a prévia estruturada.

## Contrato de observação, posse e marcos (referência para M4/M5)

O evento canônico de futebol continua sendo o registro histórico. Uma observação de controle local é armazenada como evento `football_event_registered` com evento canônico de tipo `1000`, extensão `scout_trainer.observation` e `capture_sequence`. Ela é dado local, não uma ação StatsBomb simulada.

| Conceito | Campos/semântica mínimos |
|---|---|
| Observação espacial | instante/`capture_sequence`, período, `teamId?`, `playerId?`, controle `before`/`after`, posição observada quando disponível, `precision` (`point` ou `zone`), `coverage` e origem do operador. A bola exibida é a última posição observada e sua idade; ausência de posição não autoriza interpolação. |
| Controle | `controlled(teamId, playerId?)`, `contested`, `dead_ball(restartTeamId?)` ou `unknown`. Só uma observação de controle explícito da equipe adversária confirma troca de controle. Disputa, parada e desconhecido não são posse de nenhuma equipe. |
| Posse/intervalo | Projeção derivada, identificada por período e limites de eventos, com equipe, início/fim, completude, marcos e cobertura. Reinício, troca adversária confirmada, bola morta, período novo ou lacuna encerram/segmentam conforme os fatos observados. `coverage: suspended` abre lacuna e o intervalo não entra em duração controlada. |
| Perda | É atribuída à equipe que tinha controle imediatamente antes, somente quando há perda/controle adversário observado. A localização da perda é a última localização observada associada à perda; se não houver, permanece ausente/`unknown`, nunca copiada do clique anterior. |
| Chute | É ação `shot` observada, com posição se marcada e resultado observado. Gol encerra em bola morta. Rebote pode manter a mesma posse apenas se o controle posterior da mesma equipe for observado; não se deduz troca nem fim pelo chute isolado. |

Os eventos tipo `1000` participam da ordenação, controle, cobertura, lacunas e âncora espacial da projeção, mas **não** entram na lista de ações de uma posse (`projectControl` já os exclui de `segment.events`), contagem de passe/condução/chute, xG/xT, nem exportação StatsBomb pura. O backup JSON completo preserva o histórico e a extensão; a exportação StatsBomb pura os omite com motivo no manifesto. M4 poderá acrescentar uma projeção explícita de marcos por posse, sem converter marcos em `pass`, `carry` ou eventos fictícios.

## Elegibilidade, autoria, correção e invalidação

- Autoria só é informada para jogador/equipe selecionados ou observados. `unknown`, não observado, zero e não aplicável continuam estados distintos. Não inferir recebedor, condução, quebra de linha, trajetória ou autor intermediário por duas posições.
- Métricas de tempo de controle usam somente intervalos com cobertura contínua; disputas e lacunas vão para denominador/tempo excluído separado. Métricas de posse, pressão, localização e finalização devem expor população elegível, cobertura e exclusões; denominador zero é “não disponível”, nunca zero fabricado.
- Métricas dependentes de local exigem localização observada e precisão compatível. Modelos existentes só podem receber as ações/entradas que declararem elegíveis; marcos por posse não são substitutos para passe ou condução.
- Correção de ação, hora/período, equipe/jogador, `before`/`after`, cobertura, reinício, localização/precisão ou resultado pode invalidar a projeção da posse afetada e todas as projeções posteriores do período. Por segurança, M4/M5 devem invalidar o cache derivado da partida inteira e recalcular a partir do histórico efetivo; o evento bruto/correção permanece auditável. Correção de cadastro permanente não reescreve instantâneos de partidas.

## Riscos concretos e pendências para as próximas etapas

1. `AthleteRegistration` ainda concentra camisa e posição, e `TeamRegistration` só contém `athleteIds`; é necessária a camada de vínculo antes de tornar camisa/função por equipe editável.
2. Não há contrato de lote recuperável nos repositórios expostos à UI; M2/M3 precisam adicioná-lo antes de gravar várias linhas.
3. A criação atual usa parser textual e perfis de função de vôlei. Não reutilizar esse parser como persistência do novo editor, nem mostrar suas funções no futebol.
4. `FootballObservation` atual carrega controle/cobertura, mas a localização de uma observação isolada e a projeção de marcos por posse ainda não têm representação específica. M4 decide a extensão mínima versionada e adiciona testes de correção/lacuna.
5. A invalidação de análises já ocorre ao registrar/corrigir eventos de futebol, mas o desfazer atual deve ser auditado quando a projeção de posse passar a ser cacheada; M4/M5 devem garantir invalidação simétrica.

## Evidências de inspeção e verificação

- Navegação: `src/ui/app/App.tsx`; criação/reuso atual: `src/ui/screens/match-setup/NewMatchScreen.tsx`; cadastro atual: `src/ui/screens/registrations/RegistrationsScreen.tsx` e `src/domain/match/entities/Registration.ts`.
- Modalidade/legado: `src/domain/match/entities/MatchMetadata.ts` e `src/domain/match/entities/MatchSport.ts`.
- Futebol, histórico e backup: `src/domain/football/FootballObservation.ts`, `src/domain/football/StatsBombOpenData.ts`, `src/application/ScoutTrainerService.ts`, `src/domain/match/events/MatchEvent.ts` e `src/infrastructure/export/json/MatchJson.ts`.
- Persistência atual: `src/infrastructure/persistence/indexeddb/ScoutTrainerDatabase.ts` e `src/ui/app/createBrowserService.ts`.
- Teste seletivo executado: `npx vitest run src/domain/football/FootballRedesign.test.ts src/infrastructure/export/json/MatchJson.test.ts src/tests/integration/registrations.test.ts src/ui/screens/match-setup/NewMatchScreen.sport.test.tsx --reporter=verbose` — 4 arquivos, 19 testes aprovados. A suíte completa e teste operacional ao vivo não foram executados nesta etapa documental.
