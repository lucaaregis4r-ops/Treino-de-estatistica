> **Versão/escopo:** 0.4 — interface e registros históricos posteriores.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../../COMECE_AQUI.md).

# Matriz de validação

Auditoria U7 em 13/09/2026, com dados sintéticos e Chrome do sistema. **Aprovado** vale para o escopo indicado; **Parcial** não equivale a aprovar o cenário inteiro. Resultados detalhados e logs em `ENTREGA.md` e `../../output/u7/`. Nenhuma linha foi aprovada apenas por inspeção de classe CSS.

| ID | Cenário e observação esperada | Etapa | Resultado/evidência |
|---|---|---|---|
| V01 | Home vazia permite iniciar uma partida; sem métricas fictícias | U2 | Aprovado: `App.test`, criação sintética pelo roteiro U7 fase before e fluxo crítico de sacador; sem estatísticas fictícias na Home |
| V02 | Retomada abre ID correto e mostra data de origem conhecida | U2 | Aprovado: mesma fixture retomada, ID/metadados/eventos iguais no JSON reexportado; capturas Início/Partidas com data derivada de `createdAt` |
| V03 | Lista diferencia criada/em andamento/finalizada e busca sem resultado | U2 | Parcial: `MatchesScreen.test` cobre estados, busca normalizada e abertura do ID filtrado; busca sem resultado não exercitada no navegador nesta U7 |
| V04 | Importação válida funciona; inválida não apaga dados | U2 | Aprovado: importação válida no navegador; validação/restauração atômica e rejeição inválida em `indexeddb-repositories.test`, base isolada |
| V05 | Placar atual único e correto nas três áreas da partida | U3 | Falhou no critério de unicidade: cabeçalho correto 2×1, mas Resumo ainda monta `.summary-score` duplicando o placar atual; legado em `SummaryScreen.tsx`, não alterado nesta revisão |
| V06 | Cobertura, equipe ativa e sacador mantêm significados distintos | U3 | Parcial: contexto/sacador/rotação conferidos nas capturas, ação muda para a equipe receptora; todas as combinações de cobertura não foram reexecutadas |
| V07 | Captura espacial conserva x/y em cantos, centro, resize e scroll | U3 | Aprovado nos casos exercitados: Visual 5%/95% após scroll/resize; Gestual 20%/30%→80%/70% no JSON; testes de superfície, captura e geometria aprovados |
| V08 | Quadra 2:1 e linhas corretas; nome de equipe coincide com lado real | U3 | Aprovado no cenário normal: capturas desktop/tablet/celular; nomes gestuais derivados de `courtOrientation` fora do retângulo de medição; geometria existente preservada |
| V09 | Digitado: tecla/Enter e retorno funcionam conforme contrato local | U4 | Parcial: três eventos por código/Enter na fixture e E2E de sufixo inline aprovados; AppFlow e atalho tático Alt+T continuam falhando |
| V10 | Visual: seleção e fluxo de confirmação local preservados | U4 | Aprovado: E2E U7 registra uma ação, avaliação selecionada, origem/destino exatos e seleção preservada após resize |
| V11 | Híbrido: código + metadados não são descartados | U4 | Aprovado: E2E U7 grava `*02A+` uma vez, confirma modo híbrido/código no JSON; mapper e integração existentes aprovados |
| V12 | Gestual: uma intenção produz um registro e trajetória correta | U4 | Aprovado: saque e recepção com líbero, incrementos unitários e coordenadas verificadas no JSON; toque completo/incompleto e teste de vinte gestos aprovados |
| V13 | Sem atleta permanece sem atleta; nenhuma sugestão sobrescreve escolha | U4 | Aprovado: ausência persistida no Visual; seleção explícita sem atleta no Gestual e unitário do seletor com sugestão automática |
| V14 | Avaliações usam significado por ação/perfil; seleção persiste visualmente | U4 | Parcial: Ace/Erro gestual, toggle de #/= e destaque de ações rápidas cobertos por `GestureScout.test`; vocabulário de todos os perfis não auditado. Análise ainda exibe `neutral` no recorte sintético |
| V15 | Erro de gravação preserva rascunho; busy impede duplo envio | U4 | Parcial: testes existentes de draft/controller/componentes aprovados; falha real de IndexedDB e duplo clique sob latência não injetados no navegador nesta U7 |
| V16 | Refazer/cancelar rascunho e desfazer histórico têm alcances distintos | U4 | Parcial: touchCancel não grava e permite gesto seguinte; testes de replay/undo/redo aprovados. Sequência completa dos comandos de UI não reexecutada |
| V17 | Trocas atualizam equipe/slot corretos e mantêm regras existentes | U4 | Parcial: integração de substituição/replay aprovada; seletor gestual atualiza a rotação sem substituir atletas. Teste AppFlow de troca ainda usa `.options` sobre botão |
| V18 | Encerrar set e preparar próximo set continuam acessíveis | U4 | Aprovado no teste integrado isolado antes/depois e no serviço de próximo set; caso falhou na suíte concorrente, sem reproduzir isoladamente. Não houve novo ensaio de teclado no navegador |
| V19 | Histórico completo/correção/refazer acessíveis | U4 | Parcial: integração do MVP cobre correção/undo/redo/reabertura; AppFlow desse percurso ainda falha. Histórico renderizado, mas roteiro completo de UI não certificado |
| V20 | Filtros retornam o mesmo conjunto de eventos do baseline | U5 | Aprovado nos testes existentes de `SpatialAnalyticsPanel` e analytics; lógica/fonte de amostra não alterada por esta revisão. Não certifica todos os recortes possíveis |
| V21 | Totais, percentuais e heatmap conservam resultados e unidades | U5 | Aprovado nos testes de métricas, `SpatialProjection`, `heatmap`, gráficos e exporters; algoritmos e unidades sem alteração nesta revisão |
| V22 | Navegação de análise preserva filtros, salvo reset do contrato local | U5 | Aprovado: E2E U7 alterna Quadra/Desempenho, retorna com filtro de saque e salva destino/mapa de calor |
| V23 | Análise salva reabre correta e respeita escopo de partida/equipe | U5 | Parcial: `Saques U7` reaberta após reload, configuração/exportação conferidas; isolamento entre várias partidas/equipes não exercitado no navegador |
| V24 | Seleção real de gráficos aparece corretamente no relatório, se existente | U5 | Aprovado: seleção persiste em JSON após reload; PDF binário válido, 3 páginas, contém somente o tipo selecionado `win_probability` além do resumo/box score; testes do renderer aprovados |
| V25 | Sem coordenadas/sem eventos mostra ausência, não zeros inventados | U5 | Parcial: não há pontos fictícios; captura com três códigos sem coordenadas mostra `0 ações no recorte`, pois painel filtra `source=spatial`. Texto não distingue claramente falta de coordenadas de ausência de ações; pendência de apresentação |
| V26 | Nomes longos, formulários, toque e foco funcionam nos cinco viewports | U6 | Parcial: Gestual/nomes longos/20 reservas sem overflow em 1366×640, 1024×768, 768×1024, 390×844 e 683×320; operação alcançável, teclado dos detalhes aprovado. Último tamanho é proxy de reflow, não zoom nativo; demais formulários têm evidência histórica U6 |
| V27 | Atalhos não atuam em campo de texto/IME/modal incompatível | U6 | Parcial: Enter/Espaço/Escape nos detalhes não registram ação; seleção por teclado conferida. IME não executado. Alt+T no campo de scout não abre o editor no roteiro crítico; guard anterior às correções ignora inputs |
| V28 | Partida anterior ao redesenho reabre com os mesmos dados | U7 | Parcial: fixture U6 anterior às correções U7 reabre com match/atletas/eventos idênticos, análise salva após reload e PDF válido; migrações V1 em IndexedDB passam. Não se usou backup genuinamente anterior a U1 no navegador |
| V29 | Build/lint/testes requeridos aprovados ou falhas preexistentes discriminadas | U7 | Executado com falhas discriminadas: build/types passam; 392/401 na suíte completa; AppFlow isolado 8 falhas idênticas antes/depois; lint 18 erros/1 aviso legados; E2E U7 5/5, dirigidos 13/13; críticos 3/7. Ver `ENTREGA.md` |
| V30 | Sem novas dependências de rede para usar UI offline | U7 | Aprovado por auditoria desta alteração: dependências/lockfile/service worker idênticos ao início, sem fonte/CDN/requisição remota adicionada. Cold start offline do pacote não reexecutado |

Não transformar todas as linhas em testes automatizados novos. Usar testes existentes nos fluxos de dados e escrever teste pequeno apenas para mudança comportamental com risco real. Layout, texto e cor normalmente exigem inspeção visual e acessibilidade; teste que só afirma classe CSS não demonstra qualidade.
