# M7 — análise de futsal e decisão de xG

**Objetivo:** responder perguntas táticas com a coleta existente e impedir métricas de futebol de campo na modalidade nova. **Depende de:** M4–M6. **Próxima:** M8.

## Decisão obrigatória sobre xG

O [conceito de xG aparece na pesquisa sobre futsal](../REFERENCIAS_E_DECISOES.md#xg-no-futsal), mas o artefato local `reference/football-models/xg.json` foi treinado em futebol de campo, com geometria 105 × 68 m. A 0.6 **não calcula nem exibe xG/xGA para futsal**. Não basta adaptar a escala da quadra ou trocar o nome do modelo. `estimateXt()` e `attributeChances()` também não entram no pipeline do futsal. Uma versão futura poderá criar um modelo separado após dados e validação próprios.

## Relatórios da 0.6

- Placar, gols, chutes e chutes por posse; resultado por equipe/período.
- Mapa de chutes de **origem observada**, separado dos chutes sem origem. Perdas e recuperações só aparecem no mapa se o local respectivo foi observado; o último ponto anterior não vira local da troca.
- Finalizações/gols por organização ofensiva, bola parada e goleiro-linha, apenas quando esses contextos foram registrados. Mostrar `n`, denominador e cobertura; “não observado” não entra como zero.
- Faltas acumuladas por período e quantidade de reinícios identificados. Tempo de controle/posse só em intervalos efetivamente acompanhados e com estados A/B, disputa, parada e lacuna separados.
- Substituições por equipe/período, composição observada versus parcial e intervalos de goleiro-linha. Não declarar tempo em quadra de atleta se entrada/saída não delimitam um intervalo conhecido.
- Textos descritivos: “em X de Y posses classificadas”, “entre os chutes com origem conhecida”. Sem atribuir causalidade a formação, pressão ou troca.

## Arquitetura e exportação

Criar seletores/serviços de futsal; reutilizar componentes de visualização quando adequados, não `FootballAnalyticsPanel` integralmente. PDF/CSV/JSON devem mostrar modalidade e cobertura; backup JSON precisa fazer round-trip de relógio, fatos táticos, substituições, correções e campos desconhecidos compatíveis. Desabilitar/ocultar exportação StatsBomb de futebol na partida de futsal até haver adaptador específico, documentado e testado.

## Aceite e verificação

Fixtures calculáveis: dois chutes na mesma posse, um sem origem, gol contra, posse parcial, troca com local desconhecido, organização anotada em só metade das posses, goleiro-linha, substituição corrigida e sexta falta. Testar numerador/denominador, filtros, zero versus indisponível, evidência por ID, reload e exportação. Verificar busca por `estimateXg`, `estimateXt`, `attributeChances` e rótulos xG/xT na rota/render/exportação de futsal; nenhum deve aparecer. Typecheck, testes dirigidos e inspeção visual.

## Prompt para o Luna

```text
Leia o plano 0.6, a referência e este M7. Implemente apenas análises
descritivas sustentadas pelos eventos de futsal, com cobertura e
denominador. Bloqueie o uso do xG/xT/Markov de futebol nessa modalidade
e a exportação StatsBomb de futebol. Verifique resumos e exports com
fixtures calculáveis. Relate arquivos e testes; não inicie M8.
```

## Implementação M7 — 30/09/2026

- **Análise dedicada:** navegação Resumo/Análise de futsal usa projeção própria, sem montar o painel de futebol. Exibe placar registrado, gols por período, finalizações/resultados, média de finalizações por posse classificada, posses com finalização, origem observada e mapa de coordenadas conhecidas; faltas e substituições por equipe/período; reinícios; controle contínuo observado; composições e intervalos de goleiro-linha. Não calcula duração individual em quadra.
- **Definições e limites:** posse classificada exige marcos observados de início e encerramento de controle contínuo; episódios abertos, pausados, em disputa ou sem cobertura de controle não entram no denominador. Contextos táticos mostram finalizações e gols por categoria; cobertura é a fração de finalizações com pelo menos uma anotação daquela dimensão. A ausência de anotação não é contada como contexto ausente em jogo. Gols usam a equipe beneficiada, incluindo gol contra; ajustes manuais entram no total por período.
- **Exportação e integridade:** CSV e PDF descrevem modalidade, denominadores e cobertura. O backup JSON inclui modalidade e resumo dos dados cobertos, mantendo eventos originais como fonte canônica e compatível com importação; o exportador StatsBomb exige projeção de futebol. No bundle, estatísticas e PDF também seguem o relatório próprio de futsal.
- **xG e xT:** decisão desta versão permanece sem estimar nem expor modelo/indicador de gol ou valor esperado para futsal. A rota não invoca estimadores, atribuição de chances ou Markov do futebol; o registro não tem amostra própria suficiente para validar modelo de finalização.
- **Verificação:** `npm run typecheck`, lint dirigido, 18 testes dirigidos (domínio, exportadores, backup e limites arquiteturais), `git diff --check` e E2E futsal desktop/390 px passaram. E2E verifica Resumo/Análise, denominadores, ausência de rótulos de modelos de futebol e downloads CSV/PDF. Uma execução da suíte total encontrou 9 falhas em `AppFlow.test.tsx` (timeouts/expectativas antigas de interface); dois erros adicionais da rodada em andamento foram corrigidos e os testes dirigidos passaram depois. A suíte total não foi reexecutada após as correções.
- **Próxima etapa:** M8 — validação e entrega; inclui piloto real e inspeção visual pendentes.
