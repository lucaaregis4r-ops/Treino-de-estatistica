> **Versão/escopo:** 0.45 (roadmap; correspondência SemVer proposta no pacote: 0.4.5).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Plano mestre — Scout Trainer 0.45

## Resultado esperado

Ao fim da 0.45, uma partida de voleibol poderá ser analisada como **sequência + espaço**. O sistema mostrará transições entre estados, probabilidade empírica/Markov de desfecho do rally, valor das transições, padrões que antecederam pontos/erros e **quais regiões/trajetórias da quadra estiveram associadas a maior ou menor chance de vencer o rally**.

O `x,y` já registrado deixa de ser apenas recurso visual e passa a ser uma dimensão analítica formal. A implementação deve preservar um estado Markov pequeno e usar coordenadas/regiões como contexto, evitando milhares de estados esparsos.

Opcionalmente, o usuário poderá fornecer sua própria chave Gemini para receber uma interpretação textual **ancorada nos números produzidos localmente**. A IA nunca substitui o cálculo.

## Ordem das macroetapas

| Etapa | Entrega | Risco | Dependência |
|---|---|---:|---|
| M0 | Baseline confiável da 0.4 | baixo | — |
| M1 | Modelo canônico de sequência + contexto espacial | médio | M0 |
| M2 | Motor Markov + valor espacial | alto | M1 |
| M3 | UI Sequências + Mapa de valor | médio | M2 |
| M4 | Perguntas táticas determinísticas | médio | M2/M3 |
| M5 | BYOK + Gemini como intérprete | médio | M4 |
| M6 | Relatório/exportação + contratos futuros | médio | M3–M5 |
| M7 | Hardening, documentação e release | médio | todas |

## M0 — baseline confiável

Objetivo: impedir que a 0.45 seja construída sobre regressões conhecidas.

Fazer:
- conferir branch/status e Node 22;
- reproduzir testes direcionados do registro, rally, analytics, espacial e exportação;
- corrigir o placar duplicado do Resumo;
- atualizar testes AppFlow/critical-flow que estiverem apenas desatualizados em relação à UI atual;
- decidir e testar Alt+T: ou atalho funciona em input, ou o contrato documenta explicitamente que não funciona;
- corrigir versão fixa/legada no PDF se for literal hardcoded;
- criar `docs/versoes/v0.45/STATUS_0_45.md`.

Não fazer:
- refatorar CSS;
- limpar todo lint global;
- mudar IndexedDB;
- implementar Markov.

Gate: `typecheck` + testes direcionados do caminho canônico, spatial analytics e analytics passam. Build passa. Falhas globais restantes são discriminadas.

## M1 — modelo canônico de sequência + contexto espacial

Criar um domínio derivado e puro. Nenhum dado novo obrigatório no evento.

Estrutura sugerida:

`src/domain/analytics/sequence/`
- `SequenceState.ts`
- `RallySequence.ts`
- `RallySequenceBuilder.ts`
- `VolleyballSequenceProfile.ts`
- `SpatialContext.ts`
- testes correspondentes

### Estado em duas camadas

**Estado principal pequeno** para evitar explosão/sparsidade:
- `serve`
- `reception`
- `attack`
- `block`
- `defense`
- `free_ball`
- `other`
- `terminal_win`
- `terminal_loss`

**Contexto esportivo**, sem multiplicar automaticamente a matriz:
- qualidade/evaluation;
- outcome;
- fase (`sideout`, `breakpoint`, `transition`);
- receptionGrade;
- rotação;
- posição do levantador;
- atleta;
- equipe.

**Contexto espacial**:
- `origin.x/y` quando houver;
- `target.x/y` quando houver;
- zona/região de origem derivada;
- zona/região de destino derivada;
- versão do sistema de coordenadas/zonas.

### Regra principal do espaço

Não criar estados como `reception_x0.42_y0.71`.

O `x,y` permanece associado à observação/contato. Regiões são derivadas por um zone system/perfil versionado e usadas como filtros/condicionantes na M2.

O builder:
1. agrupa por `rallyId`;
2. ordena por `sequence`;
3. classifica eventos que representam contato conforme regra explícita;
4. preserva `sourceEventId`;
5. preserva contexto espacial já existente sem inventar coordenadas;
6. deriva um terminal a partir do vencedor real do rally;
7. marca rally incompleto como `incomplete`, sem inventar vencedor.

Não persistir sequência nem regiões derivadas duplicadas no banco. É projeção derivada.

Gate: fixtures reproduzem ordem, terminal e coordenadas existentes; evento sem coordenada continua válido; nenhum `(0,0)` artificial é criado.

## M2 — motor Markov + valor espacial

Criar:

`src/domain/analytics/markov/`
- `TransitionMatrix.ts`
- `MarkovAnalyzer.ts`
- `StateValue.ts`
- `SequencePatternAnalyzer.ts`
- `SpatialMarkovAnalyzer.ts`
- `SpatialValueEstimator.ts`
- `SpatialGrid.ts` ou integração com zone system já existente
- testes

`src/application/analytics/`
- `SequenceAnalyticsService.ts`

### M2-A — Markov sequencial

Para um filtro:
- contagem `state -> nextState`;
- probabilidade condicional;
- tamanho da amostra;
- probabilidade de terminar o rally em ponto da equipe observada;
- valor de estado;
- `deltaPointProbability` de uma transição;
- top transições positivas/negativas;
- padrões de 2 e 3 estados antes de `terminal_win` e `terminal_loss`.

### M2-B — Markov condicionado por região

O estado não muda. O motor calcula o valor sob um recorte espacial.

Exemplos:
- `P(win | reception, targetRegion=R3)`;
- `P(win | serve, targetRegion=R6)`;
- `P(win | attack, originRegion=P4, targetRegion=R1)`.

Toda comparação espacial usa, quando possível, um baseline equivalente:

`deltaVsBaseline = P(win | state + spatialContext + filters) - P(win | state + filters)`

Retornar:
- `spatialRole`: `origin | target | trajectory`;
- região/célula;
- `sampleUnit`: `event | rally`;
- `n`;
- probabilidade empírica;
- probabilidade ajustada opcional;
- baseline;
- `deltaVsBaseline`;
- disponibilidade/aviso.

### M2-C — superfície contínua `x,y`

Criar uma saída apropriada para heatmap de valor sem armazenar nova cópia dos eventos.

V1:
- coordenadas normalizadas;
- grade conservadora/configurável ou reutilização das zonas atuais;
- `n`, wins/losses e probabilidade por célula;
- delta contra baseline;
- células sem amostra suficiente marcadas como indisponíveis;
- resolução não pode gerar mapa dominado por n=1/2.

Não exigir KDE, ML ou biblioteca científica pesada na 0.45.

### M2-D — origem, destino e trajetória

Semântica inicial:
- saque: destino;
- recepção: **destino do passe**;
- ataque: origem + destino;
- defesa: origem/destino somente onde o registro atual suportar;
- free ball: destino.

Ataque pode produzir achado de trajetória `originRegion -> targetRegion`.

### Regra de valor

Separar:
1. **probabilidade de ganhar o rally** — modelo sequencial/espacial;
2. **probabilidade estimada de ganhar set/partida** — serviço já existente.

A 0.45 não chama `deltaPointProbability`/`deltaVsBaseline` de causalidade. Usar “associação”, “valor observado” ou “diferença estimada dentro da amostra”.

### Amostra pequena e estabilização

Toda saída traz:
- `sampleSize`/`n`;
- `sampleUnit` quando necessário;
- `available`;
- `reasonUnavailable` quando necessário.

Padrão inicial:
- n < 5: indisponível para ranking;
- 5–14: mostrar com aviso;
- >= 15: normal.

Para regiões/células, manter a probabilidade empírica e permitir ajuste por baseline com método explícito. Opção simples:

`adjustedP = (wins + priorStrength * baselineP) / (n + priorStrength)`

Se implementado, `priorStrength` deve ser centralizado, configurável e exportado na metodologia. Suavização nunca remove o aviso de amostra pequena.

Gate: matriz soma corretamente por linha; terminais são absorventes; rallies incompletos não viram win/loss; filtros espaciais não alteram eventos; fixture espacial manual produz região, baseline e delta esperados.

## M3 — UI “Sequências + Valor espacial”

Adicionar dentro da área de Análise; não criar uma nova aplicação global.

Componentes sugeridos:

`src/ui/screens/summary/sequence/`
- `SequenceAnalyticsPanel.tsx`
- `TransitionTable.tsx`
- `StateValueCards.tsx`
- `SequencePatterns.tsx`
- `SequenceFilters.tsx`
- `SpatialValuePanel.tsx`
- `SpatialValueCourt.tsx`
- `SpatialRegionTable.tsx`
- `TrajectoryValueTable.tsx`

### Primeira entrega visual

**Sequências**:
- resumo da amostra;
- “O que mais aumentou a chance de ganhar o rally?”;
- “O que mais reduziu?”;
- transições mais frequentes;
- padrões antes de ponto;
- padrões antes de erro.

**Valor espacial**:
- seletor de ação (`serve`, `reception`, `attack`, etc. conforme disponibilidade);
- seletor `origem | destino | trajetória` quando aplicável;
- mapa da quadra mostrando `deltaVsBaseline` ou probabilidade;
- tooltip/click com `n`, probabilidade, baseline e delta;
- tabela das melhores/piores regiões;
- para ataque, tabela de trajetórias origem -> destino;
- opção de trocar entre valor empírico e ajustado se ambos existirem.

Filtros compartilhados:
- equipe;
- set;
- rotação;
- fase;
- atleta quando elegível;
- qualidade/receptionGrade quando fizer sentido.

### UX estatística

- célula sem dado não é 0%;
- n pequeno é visualmente identificado;
- mapa não deve usar uma escala que faça 1/1 parecer evidência forte;
- sempre mostrar qual métrica está colorindo a quadra;
- mostrar baseline do recorte;
- não usar linguagem causal.

Não começar com Sankey. Uma tabela/barra + quadra de valor é mais útil e auditável.

Reusar a quadra/componente espacial atual sempre que possível, sem duplicar sistema de coordenadas.

Gate: números da UI batem com fixture do serviço; clique em região revela denominador correto; viewport 1366×768, 1024×768 e 390×844; ausência de coordenada não quebra o painel.

## M4 — perguntas táticas determinísticas

Antes da IA, o sistema deve responder sozinho a perguntas comuns.

Criar `TacticalQuestionService` determinístico que produza DTOs, não prosa livre.

Perguntas V1:
1. Quais transições mais aumentaram a chance de ponto?
2. Quais mais reduziram?
3. O que normalmente aconteceu antes dos pontos?
4. O que normalmente aconteceu antes dos erros?
5. Em qual rotação o padrão foi mais favorável?
6. Depois de recepção A/B/C, quais sequências foram mais eficientes?
7. Em sideout e breakpoint, quais padrões diferiram?
8. Quais achados têm amostra insuficiente?
9. **Para quais regiões as recepções levaram a bola quando a chance de sideout/rally win foi maior?**
10. **Para quais regiões os saques estiveram associados a maior chance de breakpoint?**
11. **Quais regiões de origem do ataque tiveram maior/menor valor?**
12. **Quais destinos de ataque tiveram maior/menor valor?**
13. **Quais trajetórias origem -> destino tiveram maior/menor valor com amostra suficiente?**

Cada resposta inclui:
- `questionId`;
- `answerType`;
- números;
- amostra/unidade;
- filtros;
- evidências/finding IDs;
- baseline quando houver comparação espacial;
- ressalvas.

Isso vira o contrato de entrada da IA.

Gate: todas as treze perguntas funcionam sem internet/chave quando os dados necessários existem; as espaciais retornam “indisponível” de forma explícita quando faltarem coordenadas/amostra.

## M5 — BYOK Gemini

Adicionar IA como recurso opcional.

Arquitetura:

`src/application/ai/`
- `AiInsightProvider.ts` (port)
- `AiInsightService.ts`
- `AiInsightSchema.ts`

`src/infrastructure/ai/gemini/`
- `GeminiAiInsightProvider.ts`
- mapper/validação de resposta

`src/ui/`
- configuração local de sessão;
- botão “Interpretar com IA” na análise de Sequências/Valor espacial;
- estado de carregamento/erro/retry.

### Segurança e privacidade

V1:
- nenhuma chave embutida;
- chave digitada pelo usuário;
- manter apenas em memória durante a sessão por padrão;
- não colocar chave em logs, analytics, exportação ou URL;
- não salvar chave no IndexedDB;
- enviar somente DTO analítico agregado;
- não enviar nomes de atletas por padrão;
- **não enviar eventos crus nem nuvem de coordenadas `x,y` evento a evento**;
- enviar apenas regiões/células/achados agregados necessários;
- mostrar claramente que a chamada vai a um serviço externo.

### Regra principal

O provider **não recebe liberdade para inventar números**.

Prompt estruturado:
- explique somente o JSON fornecido;
- não faça novos cálculos;
- não afirme causalidade;
- cite `findingId`/métrica;
- diferencie probabilidade de rally de probabilidade de set/partida;
- ao explicar espaço, mencionar `n`, baseline e delta;
- se não houver amostra, diga que não há base.

Resposta ideal em JSON validado:
- `summary`;
- `findings[]`;
- `caveats[]`;
- `followUpQuestions[]`.

Se Gemini falhar, analytics continua íntegro e utilizável.

Gate: aplicação funciona 100% sem chave; chave inválida não apaga estado; mock provider prova que somente DTO agregado sai do app.

## M6 — exportação e preparação futura

### Exportação 0.45

Adicionar ao relatório/JSON, de forma opt-in:
- resumo de sequências;
- top transições;
- padrões antes de ponto/erro;
- **top regiões de valor por ação**;
- **trajetórias relevantes**;
- **mapa/grade de valor selecionado quando o formato suportar**;
- filtros usados;
- tamanho/unidade da amostra;
- baseline;
- método/versão do analytics;
- resolução/zone system do cálculo espacial;
- parâmetros de suavização se usados.

Não salvar matriz/grade gigante no evento canônico.

Narrativa da IA:
- não entra automaticamente no backup;
- pode entrar no relatório apenas se o usuário pedir “Incluir interpretação da IA”;
- sempre rotulada como interpretação gerada por modelo externo.

### Preparação para outros esportes

Criar apenas contratos pequenos, caso a implementação prove necessidade:

`SequenceAnalyticsProfile`
- `sportId`;
- `buildState(event, context)`;
- `terminalState(rally/result)`;
- `stateLabels`.

`SpatialAnalyticsProfile`
- `sportId`;
- coordinate system/version;
- region mapping;
- semantics of origin/target by action.

Implementar somente `volleyball`.

Não criar estados de futebol/basquete/futsal agora.

### Dashboard de carga/banco único

Somente documentação/ADR nesta versão:
- eventos de scout continuam em IndexedDB;
- futura integração ocorre por camada de importação/normalização;
- não acoplar carga física ao `ScoutEvent`;
- planejar identificador externo/atleta compartilhado sem migrar agora.

Gate: exportação antiga continua funcionando e importação de backup anterior não quebra.

## M7 — hardening e release

- rodar typecheck;
- testes unitários direcionados;
- suíte completa;
- E2E crítico;
- build;
- lint direcionado aos arquivos 0.45;
- conferir PWA/offline sem usar IA;
- testar chave inexistente/inválida/resposta inválida;
- testar partida sem coordenadas e rally incompleto;
- testar coordenadas de borda/limite de região;
- testar troca de resolução/filtros sem corromper estado;
- conferir n/baseline/delta do mapa contra fixture manual;
- atualizar README/CHANGELOG;
- registrar limitações;
- somente aqui alterar versão.

Critério de saída:
- analytics determinístico funciona offline;
- Markov é auditável;
- `x,y` participa do analytics sem explodir os estados;
- mapas espaciais mostram amostra e baseline;
- IA é opcional;
- nenhum resultado de IA altera evento, placar ou banco;
- backward compatibility preservada.
