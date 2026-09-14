# Scout Trainer 0.4 — interface, registro fluido e análises permanentes

Plano de continuação para execução pelo Codex. Data: 11/09/2026.

## 1. Objetivo e ponto de partida

Refinar a versão 0.4 já em desenvolvimento em cinco frentes: interface moderna, seleção inequívoca dos controles, ações sem atleta e scout de apenas uma equipe, substituições diretamente na tabela de rotação e análises salvas com gráficos escolhidos para o relatório.

Este documento planeja a implementação; nenhuma etapa está marcada como executada. A captura enviada mostra um modo gestual local já funcional. A branch pública consultada ainda declara 0.3.0 e pode estar atrás desse trabalho. O checkout local do usuário, seus arquivos e o comportamento executável devem orientar a implementação. Não substituir esse checkout pela versão pública para começar o plano.

O pedido atual autoriza modernizar a interface, ampliando o escopo dos refinamentos gestuais anteriores. Preservar a quadra e o gesto existentes, rotação, regras do líbero, levantamento implícito, histórico, persistência e modos Digitado/Visual/Híbrido/Gestual disponíveis localmente. Continuar na família 0.4; não abrir uma versão 0.5.

## 2. Diagnóstico e direção visual

Na captura, os seletores de modo ocupam duas linhas grandes, o placar aparece em mais de um lugar, os comandos ficam dispersos e parte da área de operação está abaixo da região visível. Bordas, fundos coloridos e texto de destaque competem pela atenção. O relato do usuário confirma dificuldade para perceber a qualidade selecionada.

Proposta de composição:

| Região | Conteúdo e comportamento |
| --- | --- |
| Cabeçalho compacto | Voltar, nome da partida, um placar principal e navegação Registro / Resumo / Análise. |
| Barra de contexto | Equipe observada, set, saque e rotação; informações secundárias com menos destaque. |
| Área central | Ação atual, atleta ou Sem atleta, qualidade e quadra gestual existente. |
| Lateral | Tabelas de rotação das duas equipes e acesso visível às trocas. |
| Faixa de operação | Resumo da ação em preparação, Registrar e Desfazer; próximas à quadra. |
| Histórico compacto | Últimos registros com acesso à correção, sem ocupar a área principal. |

Usar fonte sem serifa legível; reservar números tabulares para placar e estatísticas. Espaçamentos consistentes de 4/8/12/16/24 px, botões com alturas uniformes e superfícies diferenciadas por contraste sutil. Preservar a identidade escura com verde como destaque mais contido. Cor intensa deve indicar seleção ou ação principal. Reduzir o peso do laranja da quadra e retirar brilhos/gradientes decorativos sem perder as linhas e a trajetória.

Não basta trocar a paleta: a entrega visual exige reorganização de espaço, hierarquia, tipografia e estados. Priorizar notebook de 1366×768, como na captura; considerar a altura útil menor por causa do navegador. Adaptar para tablet e tela estreita sem criar aplicativo nativo nesta rodada. Nenhuma operação pode depender de hover.

## 3. Regras de implementação

1. Executar uma macroetapa por solicitação. Ler as instruções locais e verificar o que já existe antes de editar.
2. Usar o mesmo caminho de validação, criação e persistência de eventos em todos os modos. Componentes visuais não alteram placar ou rotação diretamente.
3. Preservar o gesto `pointerdown → origem → pointermove → pointerup → destino`, com uma trajetória e coordenadas normalizadas. Não recriar a quadra nem trocar o arraste por dois cliques.
4. Preservar as regras atuais de inferência e qualificação posterior das ações. Não exigir levantamento. Ausência de `#` não significa erro; ausência de observação também não significa defesa confirmada.
5. Reutilizar React, CSS, gráficos, IndexedDB e exportadores existentes. Nova dependência só quando houver uma lacuna concreta; documentar a razão e respeitar o lockfile.
6. Não reformatar todo o repositório, não atualizar dependências incidentalmente e não repetir instalações com o mesmo erro sem diagnóstico.
7. Mudanças visuais pedem verificação em tela. Testes automatizados devem cobrir riscos reais de estado, persistência, placar, estatísticas e exportação, evitando testes que apenas reproduzem CSS.
8. Preservar dados e alterações locais. Não usar reset destrutivo nem apagar banco para resolver migração. Se existir um comportamento requerido, melhorar apenas a lacuna identificada.

## 4. Sequência de execução

| Etapa | Entrega | Depende de |
| --- | --- | --- |
| M0 | Reconhecimento curto e mapa dos arquivos locais | — |
| M1 | Interface reorganizada e consistente | M0 |
| M2 | Seleção clara e registro fluido | M1 |
| M3 | Ações sem atleta e scout de uma equipe | M2 |
| M4 | Trocas rápidas na tabela de rotação | M3 |
| M5 | Análises e filtros salvos | M3, M4 |
| M6 | Relatório com seleção persistente de gráficos | M5 |
| M7 | Validação integrada e fechamento da 0.4 | M6 |

### M0 — Reconhecimento curto

**Trabalho:** ler AGENTS.md e instruções aplicáveis, status do Git, package.json, status de implementação e os arquivos diretamente ligados ao registro, rotação, análises e exportação. Localizar a implementação gestual atual. Registrar os comandos que realmente existem e os testes relevantes. Verificar a versão atual do banco sem assumir a versão citada em planos antigos.

Criar ou atualizar uma seção de status no documento de acompanhamento existente, com o mapa de arquivos da M1–M6. Registrar diferenças relevantes entre este plano e a implementação local. Não transformar M0 em uma auditoria geral.

**Aceite:** ponto de partida e arquivos reais identificados; nenhuma implementação local perdida; distinguir funcionalidade existente, parcial e ausente. O status de um plano antigo não é evidência de que o gesto ainda precisa ser implementado.

### M1 — Interface moderna e organização da tela

**Trabalho:** aplicar a composição da seção 2. Criar ou reaproveitar variáveis de tema e componentes comuns de botão, seletor e painel. Compactar o seletor de modo em um único grupo, indicando um modo ativo; antes, verificar se Gestual é um modo independente ou uma opção do Visual, evitando dois controles com aparência de seleção concorrente.

Agrupar ação, qualidade, identificação e confirmação junto da quadra. Reduzir duplicação de placar e instruções. Manter contexto e rotação visíveis. Usar rótulos claros para comandos frequentes, evitando escondê-los em um botão “...” sem indicação.

Aplicar o mesmo padrão de cabeçalhos, filtros e botões em Registro, Resumo e Análise; priorizar a tela de registro, sem reconstruir todas as telas do sistema.

**Aceite:** no notebook de referência, quadra, qualidade e registro ficam disponíveis sem rolagem para uma ação comum, com navegador aberto. Em telas menores, a reorganização mantém controles acessíveis sem sobreposição nem rolagem horizontal da página. Validar captura antes/depois, trajetória após redimensionamento e textos legíveis. Não modificar regras esportivas nesta etapa.

### M2 — Feedback de seleção e fluidez

**Trabalho:** unificar o estado da ação em preparação entre botões e teclado. Cada opção deve distinguir repouso, hover, foco, selecionado e indisponível. Selecionado usa preenchimento, contorno e um indicador textual/ícone, além da cor. Aplicar a qualidade, equipe, atleta, fundamento, tipo de ação e modo.

Exibir resumo persistente e compacto, por exemplo: `Equipe A · Ataque · #04 · # Ponto`. Usar nomes de qualidade conforme fundamento e perfil: `#` em recepção não deve encerrar um rally como se fosse ponto de ataque. No ataque, manter `#` ponto e `=` erro segundo as regras já existentes.

Clique, toque ou tecla atualizam a seleção imediatamente, sem registrar só por selecionar. No gesto, arrastar prepara a trajetória; um único Enter ou Registrar confirma a ação completa. Se o checkout tiver um fluxo automático já validado, manter um único ponto de confirmação equivalente e documentá-lo. Nunca combinar dois disparos para o mesmo gesto.

Repetir a mesma qualidade mantém a seleção; escolher outra substitui a anterior. Esc cancela a preparação, preservando ações já gravadas. Após sucesso, limpar qualidade, atleta explicitamente escolhido e trajetória da ação anterior; manter preferências da sessão e apresentar as sugestões do novo contexto. Em falha de persistência, preservar o rascunho e permitir tentar novamente sem duplicar.

Tratar repetição de tecla, clique duplo, foco em campos de texto e atalhos enquanto um diálogo de troca está aberto. Mostrar retorno breve `Ação registrada` e Desfazer acessível. Registrar fica indisponível durante o envio, com causa clara se faltar informação obrigatória.

**Aceite:** mouse, toque e teclado exibem o mesmo estado; seleção continua visível após tirar o ponteiro; Enter repetido não duplica evento nem ponto; correção/desfazer mantém histórico e placar coerentes. Comparar uma sequência curta de rallies com o fluxo anterior e eliminar confirmações redundantes sem acrescentar passos ao caminho comum.

### M3 — Sem atleta e acompanhamento de uma equipe

**Trabalho:** disponibilizar `Sem atleta` no registro de qualquer equipe. A equipe da ação continua obrigatória. Não criar atleta fictício, número 0 ou associação automática ao jogador sugerido quando o usuário escolheu não identificar.

Adicionar configuração de captura por partida:

| Opção | Comportamento |
| --- | --- |
| Ambas as equipes | Fluxo completo atual; identificação do atleta continua opcional. |
| Somente Equipe A | Registrar prioritariamente A; ações de B podem ser omitidas ou registradas sem atleta. |
| Somente Equipe B | Mesmo comportamento invertido. |

Permitir escolher depois de abrir a partida e mudar durante o jogo. Guardar a cobertura por trecho/evento a partir da mudança; não aplicar a última configuração retroativamente ao histórico inteiro. Evitar exigir cadastro completo e escalação conhecida da equipe não acompanhada apenas para abrir a partida. Se a rotação dela for desconhecida, exibir “não informada”, sem inventar nomes, posições ou levantador.

Percorrer formulário, mapper, parser quando aplicável, completude, validação de elenco, criação do evento, persistência, replay, edição, filtros e exportação. Não resolver apenas retirando o campo obrigatório da tela. No código público, `ScoutEvent.playerId` já é opcional, enquanto `VisualScoutDraft.playerNumber` é obrigatório; confirmar essa diferença no checkout.

Para observação parcial, permitir escolher livremente a próxima equipe/ação sem exigir todas as ações adversárias. Oferecer `Ponto A` / `Ponto B` para encerrar um rally cujo desfecho não foi registrado por uma ação terminal, reutilizando o evento de resultado existente. Se uma ação `#`/`=` já encerrou o rally, não somar o ponto novamente. Rotação e saque seguem o motor de partida e o resultado efetivo.

**Regras analíticas:** ações sem atleta entram nos totais da equipe e nos mapas com coordenadas válidas; ficam fora das estatísticas individuais e aparecem em um agrupamento “Sem atleta identificado”. Mostrar a quantidade identificada e não identificada. Métricas que dependem de jogador, levantamento ou sequência completa devem usar apenas amostra elegível, indicar cobertura ou ficar indisponíveis. Equipe não observada não tem desempenho zero. Não inferir defesa ou continuidade somente porque a próxima ação não foi registrada. Manter métricas de placar quando o placar estiver completo e confiável.

**Aceite:** registrar ataque `#` sem atleta, salvar e reabrir; ponto conta uma vez, equipe recebe a ação, atleta algum recebe crédito. Fazer scout de A sem preencher B; finalizar rallies observados e não observados; preservar saque/rotação. Repetir para B. Alternar cobertura no meio do set sem reclassificar eventos anteriores. Importar uma partida antiga sem perder dados.

### M4 — Substituição prática na tabela

**Trabalho:** usar o mecanismo de substituição existente. Na tabela de rotação, cada atleta tem comando acessível `Trocar`, ou um modo `Trocas` explícito com acesso direto às células. O toque comum para selecionar o autor de uma ação não pode virar uma substituição acidental.

Fluxo: `Trocar no atleta que sai → escolher reserva → aplicar`. Exibir número e nome do atleta que sai, reservas elegíveis e opção de cancelar. Meta de até três interações no caso comum, sem navegar para outra tela. Após escolher a entrada, aplicar com retorno `Sai #04 · entra #12` e possibilidade de desfazer conforme o histórico existente.

Reaproveitar slot e evento de substituição; não reordenar P1–P6 para simular a troca. Preservar posição atual, turno de saque, levantador ativo e histórico dos jogadores anteriores. Reutilizar regras de competição e líbero existentes; não tratar entrada/saída do líbero como substituição comum se o motor as distingue.

Preservar o rascunho ao abrir/cancelar a troca. Se aplicar uma troca deixar o atleta do rascunho incompatível, pedir nova escolha desse campo, preservando trajetória e qualidade; não reassociar uma ação silenciosamente. Validar novamente a elegibilidade ao aplicar. Se o motor limita trocas entre rallies, apresentar esse limite claramente.

**Aceite:** trocar nas duas equipes e em rotação diferente de R1; atleta que entra ocupa o slot correto; contexto de saque/levantador se atualiza; cancelar não altera dados. Testar tentativa de atleta já em quadra, regras existentes do líbero e persistência da troca. Desfazer com ações posteriores deve respeitar replay/correção do sistema, sem apagar eventos posteriores nem alterar estatísticas antigas para o novo atleta.

### M5 — Análises que permanecem salvas

**Trabalho:** organizar Análise com filtros estáveis e cartões de gráficos. Persistir por partida a última seleção de filtros, modo espacial (pontos/jogadas/heatmap), origem/destino e preferências de visualização aplicáveis.

Adicionar `Salvar análise`: guardar nome editável, tipo de gráfico, filtros próprios, parâmetros da visualização e datas. Listar análises salvas com abrir, renomear e excluir. Excluir uma visualização não apaga os eventos da partida.

Separar três objetos: eventos são a fonte; cache analítico é reconstruível; configuração da análise salva é uma escolha permanente do usuário. Reabrir uma análise recalcula com o histórico efetivo atual mantendo seus filtros. Correção, exclusão lógica, desfazer e refazer invalidam resultados derivados, inclusive quando a quantidade de eventos não muda. Usar revisão do histórico ou mecanismo equivalente validado no projeto.

Persistir configurações pelo repositório local existente, com migração incremental se necessária. Incluir no backup JSON e restaurar de forma compatível com backups antigos. Não presumir que “snapshot analítico” já salva a configuração de um gráfico. A decisão ADR-014 pública excluía persistência de filtros: atualizar sua documentação com o novo requisito, preservando a ideia de cache reconstruível.

**Aceite:** salvar heatmap de ataques da Equipe A, set 2, qualidade `#`; fechar a aplicação e reabrir com a mesma configuração. Salvar recepção com outro filtro sem sobrescrever a primeira análise. Corrigir um evento e ver os valores atualizados; análise de amostra vazia mostra estado vazio, não gráfico antigo. Backup/restauração preserva as escolhas.

### M6 — Escolher gráficos para o relatório

**Trabalho:** colocar `Adicionar ao relatório` em cada gráfico disponível, inclusive heatmap. Após seleção, mostrar `No relatório` e permitir remover. O clique adiciona aquela configuração específica, capturando seus filtros e parâmetros; mudar filtros na tela depois não muda silenciosamente o item selecionado.

Criar painel `Relatório (N)` com itens escolhidos, filtros resumidos, reordenação por botões acessíveis, remoção e prévia. Permitir o mesmo tipo de gráfico com filtros diferentes. Evitar duplicata idêntica; manter seleção e ordem ao reabrir a partida. Ao exportar, resolver todos os itens contra a mesma revisão efetiva do histórico, congelando o conjunto de dados durante a geração. O relatório exportado é um retrato daquele momento.

Estender o modelo de relatório com itens tipados e adaptadores dos gráficos existentes. Reutilizar as consultas e fórmulas da análise. Não criar cálculos independentes no exportador. Cada item inclui título, equipes/atletas quando disponíveis, filtros, legenda, amostra, cobertura e referência da revisão/data de geração.

Adaptar a exportação para PDF com os gráficos realmente presentes, não somente seus títulos ou tabelas. O renderizador público escreve seis páginas fixas de texto e corta linhas; confirmar a implementação local. Preferir composição de relatório para impressão com SVG/imagens dos gráficos, CSS de impressão e caminho compatível com navegador/Electron; se for necessária biblioteca de PDF para download direto, limitar a mudança ao adaptador. “Salvar como PDF” pelo navegador deve ser apresentado com esse nome, sem fingir download automático.

Usar fundo claro para impressão, texto acentuado, legendas legíveis, paginação dinâmica e mapas completos. Não capturar toda a interface escura como uma fotografia do relatório. Gráficos sem amostra válida devem indicar a ausência, mantendo coerência com a prévia. Persistir também a seleção no backup da M5.

**Aceite:** selecionar apenas heatmap de ataque `#` do set 2 e eficiência por rotação; PDF contém exatamente esses dois gráficos analíticos, na ordem escolhida, além de identificação/resumo explicitamente previstos na prévia. Reabrir mantém seleção. Mudar o filtro do explorador não modifica os itens já adicionados. Comparar valores e amostras entre tela, prévia e PDF. Exportar mais itens do que cabem em seis páginas sem cortes, sobreposições ou perda de conteúdo. Testar também relatório sem seleção com orientação clara para escolher gráficos.

### M7 — Integração e encerramento

**Trabalho:** executar os testes obrigatórios do repositório e os cenários críticos abaixo. Reutilizar testes existentes e acrescentar cobertura somente para novas regras. Registrar capturas do fluxo e conferir o PDF gerado. Atualizar changelog, status, contexto e documentação dos pipelines afetados, mantendo uma única fonte de acompanhamento.

| Cenário | Resultado exigido |
| --- | --- |
| Partida anterior à atualização | Abre e continua sem perda de eventos ou alterações de placar. |
| Gesto, seleção `#` e Enter | Uma trajetória, uma ação, um ponto quando terminal. |
| Qualidade via clique/toque/teclado | Mesmo estado visível e sem seleção antiga herdada. |
| Scout somente A / somente B | Sem exigência de observar ambas; estatísticas indicam cobertura. |
| Ação sem atleta | Total de equipe correto, sem crédito individual fictício. |
| Troca e rally seguinte | Slot, saque, levantador e jogador sugerido coerentes. |
| Correção, desfazer e refazer | Replay e análises refletem o histórico efetivo. |
| Reiniciar e restaurar backup | Análises, filtros e seleção do relatório permanecem. |
| Exportação com vários gráficos | Mesmos dados da prévia, paginação dinâmica e conteúdo legível. |

Na branch pública existem `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` e `npm run test:e2e`; confirmar os scripts locais. Durante cada etapa, rodar verificações focadas e os gates exigidos pelas instruções do projeto; deixar a validação integrada para M7. Distinguir falhas preexistentes de regressões. Não declarar um teste executado quando a dependência ou o ambiente impedir sua execução.

**Aceite final:** os cinco pedidos funcionam no fluxo real, incluindo após reiniciar; dados anteriores permanecem acessíveis; capturas demonstram a nova organização; arquivo PDF demonstra os gráficos selecionados. Código e documentação continuam identificados como evolução da 0.4. Publicação de release não faz parte da execução deste plano.

## 5. Mapa inicial do código público

Referência consultada em 11/09/2026: https://github.com/lucaaregis4r-ops/Treino-de-estatistica . Confirmar equivalentes locais na M0. O mapa abaixo indica pontos de entrada; não autoriza reescrever todos os arquivos listados.

| Frente | Arquivos de referência |
| --- | --- |
| Layout e seleção | `src/ui/app/app.css`; `src/ui/screens/scout/ScoutScreen.tsx`, `ScoutModeSelector.tsx`, `VolleyballVisualScout.tsx`, `VolleyballVisualScout.css`, `keyboardShortcut.ts`. |
| Quadra existente | `src/ui/screens/scout/SpatialCourtInputV2.tsx`, `SpatialCourtInputV2.css`, `TacticalCourt.tsx`; localizar os arquivos gestuais adicionais do checkout. |
| Atleta opcional | `src/domain/scout/events/ScoutEvent.ts`; `src/domain/scout/mapper/VisualScoutDraft.ts`, `VisualScoutMapper.ts`; validadores, completude e casos de uso em `src/application/use-cases/register-scout-event/`. |
| Trocas | `src/ui/screens/scout/CourtLineup.tsx`; `src/application/ScoutTrainerService.ts`; `src/domain/match/lineup/`, eventos e replay. |
| Análises | `src/ui/screens/summary/MatchAnalyticsPanel.tsx`, `SpatialAnalyticsPanel.tsx`, `charts/`; `src/application/analytics/`; repositório de snapshots e `ScoutTrainerDatabase.ts`. |
| Relatório | `src/application/reporting/MatchReportModel.ts`; `src/infrastructure/export/pdf/MatchPdfRenderer.ts`; exportadores JSON e testes de exportação. |
| Acompanhamento | `vibecoding/IMPLEMENTATION_STATUS.md`; `vibecoding/docs/PROJECT_CONTEXT.md`; `vibecoding/docs/architecture/PIPELINES.md`; ADR-014. |

## 6. Prompt para iniciar no Codex

```text
Leia SCOUT_TRAINER_0.4_PLANO_REFINAMENTO_CODEX.md e as instruções aplicáveis do repositório.
Estamos continuando a versão 0.4 já existente localmente.
Execute somente M0 e M1 nesta rodada: reconhecimento curto e implementação da interface.
Preserve alterações locais, a quadra gestual, o pipeline canônico e as regras já funcionais.
Não recrie funcionalidades existentes nem instale dependências sem necessidade concreta.
Valide a tela no notebook de referência, atualize o status existente e informe:
o que mudou, como verificou e qualquer impedimento real.
Não avance para M2 nesta rodada.
```

Para as rodadas seguintes: `Execute somente a próxima macroetapa pendente deste plano. Reaproveite o reconhecimento e o status existentes, valide os critérios da etapa e atualize o acompanhamento.`

## 7. Controle inicial

- [ ] M0 — Reconhecimento curto.
- [ ] M1 — Interface e organização.
- [ ] M2 — Feedback e fluidez.
- [ ] M3 — Sem atleta e scout de uma equipe.
- [ ] M4 — Trocas na tabela.
- [ ] M5 — Análises permanentes.
- [ ] M6 — Relatório com gráficos selecionados.
- [ ] M7 — Validação integrada.

Manter o status efetivo no arquivo de acompanhamento existente; este checklist é o ponto de partida, não uma segunda fonte independente de progresso.
