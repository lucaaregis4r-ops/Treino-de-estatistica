> **Versão/escopo:** 0.45 (roadmap; correspondência SemVer proposta no pacote: 0.4.5).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# PACOTE CONSOLIDADO — SCOUT TRAINER 0.45 / LUNA

> Revisão espacial: `x,y` entra formalmente no analytics como contexto para Markov/valor espacial, sem virar stateId bruto.


---

# ARQUIVO: LEIA_PRIMEIRO.md

# Scout Trainer 0.45 — pacote de implementação para Luna

## Missão da versão

A 0.45 é uma versão de **consolidação + inteligência analítica**, não uma reescrita do Scout Trainer.

O projeto já possui uma base madura de voleibol: quatro modos de registro, evento canônico, rally/rotação, replay determinístico, persistência IndexedDB, dados espaciais, analytics, probabilidade estimada de vitória, análises salvas e exportação. A 0.45 deve usar essa base para responder perguntas de **sequência + espaço**, especialmente:

- quais estados e ações aumentaram a probabilidade de ganhar o rally;
- quais transições aparecem antes de um ponto ou erro;
- como recepção, rotação, fase, atleta e contexto alteram o desfecho;
- **para quais áreas a recepção levou a bola quando o sideout/rally win foi maior**;
- **para onde sacar esteve associado a maior breakpoint**;
- **quais origens, destinos e trajetórias de ataque tiveram maior valor observado**;
- quais sequências têm maior ou menor valor;
- como explicar essas leituras em linguagem natural sem entregar o cálculo ao LLM.

Decisão central: o `x,y` **não vira stateId bruto**. Coordenadas, regiões e trajetórias são contexto analítico usado para condicionar/segmentar o Markov e produzir mapas de valor com `n`, baseline e delta.

A versão também cria uma camada **BYOK (Bring Your Own Key)** opcional para Gemini. A IA recebe somente resultados analíticos já calculados pelo sistema e os interpreta. Ela **não calcula placar, Markov, eficiência, rotação ou probabilidade**.

Basquete, futsal e futebol não são implementados nesta versão. A 0.45 só evita decisões que tornem impossível reaproveitar o núcleo sequencial depois.

## Fonte de verdade

1. Código executável atual.
2. Testes atuais.
3. `CHANGELOG.md`.
4. `docs/versoes/v0.4/interface/ENTREGA.md` e `VALIDACAO.md`.
5. Este pacote.
6. Planos históricos somente como contexto.

Não reconstruir algo apenas porque um plano antigo diz que está ausente.

## Regra de execução para Luna

Executar **uma macroetapa por solicitação**.

Antes de editar:
- ler ` AGENTS.md` (há um espaço inicial no nome);
- verificar `git status`;
- ler somente os arquivos indicados na etapa;
- confirmar se a funcionalidade já existe.

Durante:
- não atualizar dependências sem necessidade;
- não executar `npm install` se `node_modules` já estiver válido;
- não formatar o repositório inteiro;
- não alterar schema/banco se a etapa não exigir;
- não mover arquitetura existente;
- preferir funções pequenas, puras e testáveis.

Depois:
- rodar somente testes direcionados + `typecheck`;
- rodar build apenas nas etapas indicadas;
- atualizar `STATUS_0_45.md`;
- parar. Não começar a etapa seguinte.

## Versão

Nome de produto/roadmap: **0.45**.

Se o projeto seguir SemVer no `package.json`, o fechamento pode usar `0.4.5`. Não alterar versão antes da etapa final.

## Fora de escopo

- análise automática de vídeo;
- visão computacional;
- criação do núcleo completo de futebol/futsal/basquete;
- banco remoto/cloud;
- autenticação;
- sincronização multiusuário;
- substituir IndexedDB;
- treinar modelo de IA;
- enviar eventos crus ou nuvem bruta de coordenadas para IA por padrão;
- tornar a IA obrigatória;
- calibrar uma previsão universal de vitória com dados externos inexistentes.


---

# ARQUIVO: ESTADO_ATUAL.md

# Estado atual observado no repositório

Referência: branch `main`, 14/09/2026.

## O que já está pronto e deve ser preservado

### Produto
- React + TypeScript + Vite.
- Electron para desktop.
- PWA/local-first.
- Persistência em IndexedDB.
- `package.json` atual em `0.4.0`.

### Registro
- Digitado, Visual, Híbrido e Gestual.
- Eventos convergem para histórico canônico.
- Origem/destino espacial.
- Contexto de placar, set, equipe, rotação, levantador e rally.
- Gestual com Pointer Events.
- Registro sem atleta já aparece no domínio atual.
- Cobertura parcial da partida já possui tipos em `ScoutEvent` (`both`, `team_a`, `team_b`).
- Correção, desfazer/refazer e replay.

### Analytics
- Saque, recepção e ataque.
- Sideout e breakpoint.
- Distribuição do levantador.
- Métricas por rotação/posição.
- Analytics espacial.
- Heatmap.
- Probabilidade estimada de set/partida.
- Análises/filtros salvos e seleção de gráficos para relatório aparecem na revisão atual.

### Implicação espacial para 0.45
- O Scout já possui origem/destino espacial e analytics espacial; a 0.45 deve **reutilizar** esse sistema de coordenadas.
- `x,y` passa a ser entrada formal de analytics, não somente visualização.
- O estado Markov permanece pequeno; região/célula/trajetória entram como contexto.
- A implementação deve distinguir coordenada ausente de `(0,0)` e preservar a versão do sistema de zonas/coordenadas.
- O primeiro caso tático prioritário é **destino da recepção/passe -> probabilidade de sideout/rally win**; depois saque por destino e ataque por origem/destino/trajetória.

### Arquitetura útil para 0.45
- `ScoutEvent` possui `rallyId`, `sequence`, `teamId`, `skill`, `outcome`, `evaluation`, `setNumber`, `scoreBefore`, contexto de lineup e metadados.
- `TacticalRallyProjection` já organiza contatos/rallies.
- `MatchAnalyticsService` já é o agregador de analytics de partida.
- `StatisticsEngine` e métricas avançadas já existem.
- Analytics é derivado dos eventos; essa regra deve continuar.
- Existe `WinProbabilityService`; Markov não deve duplicar essa responsabilidade.

## Dívidas conhecidas da 0.4 que afetam a 0.45

A U7 não certificou a suíte inteira:
- placar repetido no Resumo;
- AppFlow possui expectativas antigas;
- parte do `critical-flow` usa navegação/rótulos antigos;
- Alt+T em input tem comportamento funcional pendente;
- lint global ainda possui erros legados;
- textos de análise sem coordenadas ainda podem ser ambíguos;
- rodapé do PDF ainda carrega versão antiga em evidência da U7;
- avisos de Recharts em abas ocultas.

A 0.45 começa fechando apenas as dívidas que podem contaminar a nova camada analítica. Não transformar o M0 em faxina geral.

## O que NÃO existe hoje

- motor de Markov;
- matriz de transição;
- valor de estado/ação baseado em sequência;
- ranking de sequências anteriores a ponto/erro;
- camada BYOK;
- adaptador Gemini;
- contrato de provider de IA;
- núcleo real para esportes de invasão.

## Decisão arquitetural da 0.45

A fonte da verdade permanece:

`ScoutEvent -> projeção de rally -> analytics determinístico -> visualização/exportação`

A IA entra depois:

`analytics determinístico -> DTO reduzido -> provider BYOK -> explicação`

Nunca:

`eventos -> LLM -> estatística`


---

# ARQUIVO: DECISOES_DE_ESCOPO.md

# Decisões de escopo da 0.45

## Entram agora
- fechamento mínimo das dívidas 0.4 que contaminam analytics;
- projeção sequencial por rally;
- Markov/transições;
- valor observado de estados/transições;
- contexto espacial `x,y` preservado na projeção;
- análise espacial por origem, destino e trajetória;
- comparação de regiões/células com baseline da ação;
- mapa de probabilidade/valor espacial com amostra explícita;
- padrões antes de ponto/erro;
- perguntas táticas determinísticas, incluindo perguntas espaciais;
- painel Sequências + Valor espacial;
- BYOK Gemini opcional para interpretação;
- exportação auditável dos novos resultados.

## Decisão central sobre `x,y`

`x,y` **não vira estado Markov bruto**. Coordenadas e regiões são contexto analítico. O sistema pode condicionar o Markov por região e construir superfícies de valor, evitando explosão de estados e sparsidade.

## São preparados, mas não implementados
- perfil de sequência reutilizável por esporte;
- perfil espacial reutilizável por esporte;
- futura integração de dados de carga;
- futura identidade compartilhada de atleta;
- possibilidade de provider de IA além de Gemini.

## Ficam para 0.5+
- núcleo de esportes de invasão;
- futebol;
- futsal;
- basquete;
- modelos xT/xG específicos;
- análise de vídeo;
- ingestão automática de tracking;
- banco remoto/unificado real;
- histórico multi-organização;
- calibração robusta de probabilidade com grande base externa;
- modelos espaciais avançados que exijam dependências científicas pesadas.

## Motivo

A 0.45 deve provar que a arquitetura atual consegue transformar **eventos em sequências, sequências + espaço em valor e valor em explicações**. O Scout Trainer já registra origem/destino; portanto, ignorar o espaço empobreceria justamente o diferencial do produto. A solução preserva o núcleo Markov pequeno e usa `x,y` como contexto para permitir análises táticas úteis sem criar milhares de estados raros.


---

# ARQUIVO: MARKOV_ESPACIAL.md

# Markov espacial e valor de quadra — 0.45

## Objetivo

Usar as coordenadas espaciais já registradas pelo Scout Trainer para responder perguntas como:

- recepções que terminaram em quais regiões estiveram associadas a maior chance de vencer o rally?
- saques direcionados a quais áreas produziram maior chance de breakpoint?
- ataques saindo de onde e terminando onde tiveram maior valor observado?
- quais trajetórias `origem -> destino` estiveram associadas aos melhores desfechos?

O espaço entra como **contexto analítico de primeira classe**, sem transformar cada coordenada em um novo estado Markov.

## Princípio arquitetural

Não criar estados como:

`reception_x0.43_y0.71`

ou:

`attack_P4_x0.81_y0.13_cross_#`

O estado principal continua pequeno:

`serve | reception | attack | block | defense | free_ball | other | terminal_win | terminal_loss`

Cada observação pode carregar contexto espacial separado:

```ts
interface SpatialContext {
  origin?: { x: number; y: number };
  target?: { x: number; y: number };
  originRegionId?: string;
  targetRegionId?: string;
  coordinateSystemVersion: string;
}
```

A análise espacial condiciona ou segmenta o cálculo; ela não multiplica automaticamente o espaço de estados.

## Três níveis de análise

### Nível A — Markov principal

Usa somente o estado principal e contexto esportivo. Responde:

`P(terminal_win | reception)`

### Nível B — Markov condicionado por região

Aplica região como contexto antes do cálculo. Exemplos:

`P(terminal_win | reception, targetRegion = R3)`

`P(terminal_win | attack, originRegion = P4, targetRegion = fundo_1)`

Comparar sempre com um baseline equivalente sob os mesmos filtros:

`deltaVsBaseline = P(win | state + region + filters) - P(win | state + filters)`

Isso permite frases como:

> Recepções terminando na região central próxima à rede estiveram associadas a +14 p.p. na probabilidade estimada de vencer o rally, n=37.

Nunca escrever que a região **causou** a diferença.

### Nível C — superfície contínua de valor

Preservar `x,y` normalizado e derivar uma superfície visual. V1 não precisa de modelo pesado.

Preferência de implementação:
1. usar coordenadas normalizadas existentes;
2. dividir a quadra em uma grade configurável ou reutilizar o sistema de zonas atual;
3. agregar `n`, vitórias e valor por célula;
4. comparar cada célula com o baseline da ação;
5. aplicar suavização estatística centralizada quando habilitada;
6. renderizar mapa de valor/probabilidade sem alterar o evento canônico.

A resolução da grade deve ser configurável. Começar com granularidade conservadora; não usar células tão pequenas que quase todas tenham n=1/2.

## Origem, destino e trajetória

A semântica depende da ação:

| Ação | Coordenada mais importante | Pergunta típica |
|---|---|---|
| saque | destino | para onde sacar esteve associado a mais breakpoint? |
| recepção | destino | para onde a recepção levou a bola e qual foi o valor? |
| ataque | origem + destino | de onde para onde os ataques tiveram maior valor? |
| defesa | origem e/ou destino conforme dado disponível | onde defendemos e para onde a bola foi conduzida? |
| free ball | destino | quais destinos permitiram melhor continuidade? |

Não forçar coordenada inexistente. `origin` e `target` são opcionais e a UI deve distinguir **sem coordenada** de **valor 0**.

## Unidade de observação

Toda saída espacial declara a unidade:

- `event`: cada ação espacial elegível é uma observação ligada ao desfecho do rally;
- `rally`: cada rally conta no máximo uma vez para a pergunta/recorte definido.

A implementação V1 deve definir explicitamente qual unidade cada métrica usa. Não misturar denominadores silenciosamente.

Para perguntas como “passes nesta área”, usar a ação de recepção como observação e ligar cada recepção ao terminal real de seu rally.

## Amostra e estabilização

Sempre retornar `n` e disponibilidade.

Padrão inicial:
- n < 5: não ranquear;
- 5–14: mostrar com aviso;
- n >= 15: normal.

Além da probabilidade empírica, o motor pode expor uma estimativa ajustada por baseline para evitar células 2/2 = 100% dominando o ranking.

Uma opção simples e auditável é shrinkage Beta-Binomial:

`adjustedP = (wins + priorStrength * baselineP) / (n + priorStrength)`

Regras:
- `priorStrength` centralizado e configurável;
- exportar o valor usado;
- manter também a probabilidade empírica;
- não esconder n pequeno com suavização;
- ranking continua obedecendo os limites de amostra.

Se a implementação dessa suavização tornar M2 grande demais, manter o contrato e entregar primeiro `empiricalP + sample warning`, registrando a suavização como subentrega antes de M3. Não substituir por heurística opaca.

## DTOs sugeridos

```ts
interface SpatialRegionFinding {
  findingId: string;
  skill: string;
  spatialRole: 'origin' | 'target' | 'trajectory';
  regionId?: string;
  originRegionId?: string;
  targetRegionId?: string;
  sampleUnit: 'event' | 'rally';
  n: number;
  wins: number;
  losses: number;
  empiricalPointProbability: number | null;
  adjustedPointProbability?: number | null;
  baselinePointProbability: number | null;
  deltaVsBaseline: number | null;
  available: boolean;
  warning?: 'small_sample';
}
```

```ts
interface SpatialValueCell {
  cellId: string;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  center: { x: number; y: number };
  n: number;
  empiricalPointProbability: number | null;
  adjustedPointProbability?: number | null;
  deltaVsBaseline: number | null;
  available: boolean;
}
```

## Relação com a IA

A IA não recebe coordenadas cruas de todos os eventos.

Ela recebe achados agregados, por exemplo:

```json
{
  "findingId": "reception-target-R3",
  "label": "Recepção -> região central próxima à rede",
  "n": 37,
  "pointProbability": 0.68,
  "baseline": 0.54,
  "deltaVsBaseline": 0.14,
  "warning": null
}
```

Assim o Gemini explica o resultado; não cria o cálculo espacial.

## Critério de sucesso

A 0.45 deve conseguir responder, offline e sem IA:

> Em quais regiões uma determinada ação esteve associada a maior ou menor probabilidade de vencer o rally, com qual amostra e quanto isso diferiu do baseline comparável?


---

# ARQUIVO: PLANO_MESTRE_0_45.md

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


---

# ARQUIVO: MAPA_DE_ARQUIVOS.md

# Mapa de arquivos para a 0.45

Este mapa evita que o Luna abra o repositório inteiro.

## Ler sempre no início de uma etapa

- ` AGENTS.md`
- `package.json`
- `CHANGELOG.md`
- `docs/versoes/v0.4/interface/ENTREGA.md`
- `docs/versoes/v0.4/interface/VALIDACAO.md`
- `docs/versoes/v0.45/STATUS_0_45.md` (depois de criado)

## M0
- `src/ui/screens/summary/SummaryScreen.tsx`
- `src/ui/app/AppFlow.test.tsx`
- `e2e/critical-flow.spec.ts`
- `src/infrastructure/export/pdf/MatchPdfRenderer.ts`
- testes atuais de spatial analytics relevantes
- arquivos apontados pelas falhas reproduzidas, somente depois da reprodução

## M1
- `src/domain/scout/events/ScoutEvent.ts`
- `src/domain/rally/context/TacticalRallyProjection.ts`
- `src/domain/rally/context/RallyContextResolver.ts`
- `src/application/analytics/MatchAnalyticsService.ts`
- `src/domain/statistics/queries/scoutEventQueries.ts`
- arquivos do sistema atual de coordenadas/zonas usados pelo `SpatialAnalyticsPanel`

Arquivos novos preferidos:
- `src/domain/analytics/sequence/*`

## M2
- tudo de M1 que for diretamente necessário
- `src/application/analytics/WinProbabilityService.ts` apenas para respeitar fronteira de responsabilidade
- `src/domain/analytics/sequence/*`
- zone/coordinate helpers atuais que já definem quadra e regiões

Arquivos novos:
- `src/domain/analytics/markov/*`
- `src/application/analytics/SequenceAnalyticsService.ts`

Preferir adicionar `SpatialMarkovAnalyzer`/`SpatialValueEstimator` no novo domínio analítico em vez de sobrecarregar o componente visual.

## M3
- `src/ui/screens/summary/SummaryScreen.tsx`
- `src/ui/screens/summary/MatchAnalyticsPanel.tsx`
- `src/ui/screens/summary/SpatialAnalyticsPanel.tsx`
- componente atual de quadra/heatmap
- componentes atuais de filtros/análises salvas
- CSS local da área de resumo/análise

Arquivos novos:
- `src/ui/screens/summary/sequence/*`

## M4
- `src/application/analytics/SequenceAnalyticsService.ts`
- DTOs da M2
- painel de Sequências/Valor espacial

Arquivos novos:
- `src/application/analytics/TacticalQuestionService.ts`
- tipos/testes associados

## M5
- `src/application/ports/` para seguir padrão existente de portas
- componentes/configuração de UI em que fizer sentido
- nunca editar motor de rally para adicionar IA

Arquivos novos:
- `src/application/ai/*`
- `src/infrastructure/ai/gemini/*`

## M6
- `src/application/reporting/MatchReportModel.ts`
- `src/infrastructure/export/json/MatchJson.ts`
- `src/infrastructure/export/pdf/MatchPdfRenderer.ts`
- infraestrutura existente de análises salvas

Documentação:
- ADR do núcleo sequencial multi-esporte
- ADR do perfil espacial multi-esporte
- ADR BYOK
- nota futura de integração de carga

## Arquivos de alto risco

Evitar editar salvo necessidade comprovada:
- `src/application/ScoutTrainerService.ts`
- `src/ui/screens/scout/ScoutScreen.tsx`
- reducers/replay de partida
- banco/migrações IndexedDB
- parser/tokens
- `package-lock.json`

A 0.45 é principalmente analytics. Se Markov/valor espacial começar a exigir alterações profundas nesses arquivos, parar e registrar o motivo antes de continuar.


---

# ARQUIVO: CONTRATO_ANALYTICS.md

# Contrato analítico da 0.45

## 1. Vocabulário

### Evento
Registro canônico existente (`ScoutEvent`).

### Rally sequence
Projeção ordenada dos contatos/eventos elegíveis de um `rallyId`.

### Estado
Categoria analítica do contato. Deve ser pequena e estável.

### Contexto
Metadados usados para filtro/segmentação. Não devem virar estado automaticamente. Inclui contexto esportivo e espacial.

### Contexto espacial
Coordenadas `x,y`, origem/destino, zona/região derivada e versão do sistema de coordenadas. É parte formal do analytics, mas não multiplica automaticamente os estados Markov.

### Transição
Par ordenado `from -> to`.

### Terminal
Resultado observável do rally para a equipe analisada:
- `terminal_win`
- `terminal_loss`

### Valor de estado
Probabilidade estimada de terminar o rally em `terminal_win` a partir daquele estado dentro da amostra e método definidos.

### Valor de transição
Mudança entre o valor esperado antes/depois da transição. Não é causalidade.

### Valor espacial
Probabilidade/valor observado para uma ação sob determinado contexto espacial comparada a um baseline equivalente.

## 2. Regras estatísticas

- Sempre retornar `n` e a unidade da amostra quando relevante (`event` ou `rally`).
- Não mostrar 0% quando a métrica é indisponível.
- Rallies incompletos não recebem vencedor inventado.
- Filtros são aplicados antes da matriz ou comparação.
- A equipe de referência deve ser explícita.
- O mesmo rally não pode ser contado duas vezes quando a unidade declarada for `rally`.
- Estados absorventes não geram novas transições esportivas.
- Matriz, padrões e mapas devem ser reconstruíveis a partir dos eventos.
- A versão do método analítico deve acompanhar exportações.
- Coordenada ausente não equivale a `(0,0)` nem a valor zero.
- Resultados espaciais comparam-se a um baseline sob os mesmos filtros esportivos sempre que possível.
- Nenhum `delta` deve ser descrito como causal.

## 3. Granularidade

### Estado principal V1
`serve | reception | attack | block | defense | free_ball | other | terminal_win | terminal_loss`

### Dimensões opcionais de filtro/contexto
`teamId | setNumber | playerId | phase | receptionGrade | setterPosition | rotation | evaluation | outcome | originZone | targetZone | originX | originY | targetX | targetY`

Não produzir automaticamente estados como:

`attack_P3_receptionA_zone4_cross_#`

ou:

`reception_x0.43_y0.71`

Isso destrói a amostra e dificulta a interpretação.

## 4. Contrato espacial

O `x,y` normalizado deve ser preservado na projeção quando já existir no evento. A região é derivada por um perfil/zone system versionado; não reescrever o evento canônico para armazenar todas as derivações.

```ts
interface SpatialContext {
  origin?: { x: number; y: number };
  target?: { x: number; y: number };
  originRegionId?: string;
  targetRegionId?: string;
  coordinateSystemVersion: string;
}
```

Três saídas são distintas:
1. Markov principal por estado;
2. Markov/valor condicionado por região;
3. superfície `x,y` agregada para mapa de valor.

Para ataques e outras ações direcionais, a trajetória `originRegion -> targetRegion` pode ser analisada sem virar o estado principal.

## 5. Resultados

```ts
interface TransitionFinding {
  id: string;
  from: SequenceStateId;
  to: SequenceStateId;
  count: number;
  probability: number | null;
  fromStatePointProbability: number | null;
  toStatePointProbability: number | null;
  deltaPointProbability: number | null;
  sampleSize: number;
  available: boolean;
  warning?: 'small_sample';
}
```

```ts
interface SequencePatternFinding {
  pattern: readonly SequenceStateId[];
  occurrences: number;
  wins: number;
  losses: number;
  pointProbability: number | null;
  liftVsBaseline: number | null;
}
```

```ts
interface SpatialRegionFinding {
  findingId: string;
  skill: string;
  spatialRole: 'origin' | 'target' | 'trajectory';
  regionId?: string;
  originRegionId?: string;
  targetRegionId?: string;
  sampleUnit: 'event' | 'rally';
  n: number;
  empiricalPointProbability: number | null;
  adjustedPointProbability?: number | null;
  baselinePointProbability: number | null;
  deltaVsBaseline: number | null;
  available: boolean;
  warning?: 'small_sample';
}
```

## 6. Amostra e suavização

Padrão inicial centralizado:
- n < 5: indisponível para ranking;
- 5–14: mostrar com aviso;
- >= 15: normal.

Para mapas/células espaciais, manter sempre o valor empírico. Pode haver uma probabilidade ajustada por baseline, desde que:
- o método seja explícito e testável;
- o parâmetro seja centralizado;
- o valor empírico continue disponível;
- n pequeno continue sinalizado.

Método simples permitido para V1:

`adjustedP = (wins + priorStrength * baselineP) / (n + priorStrength)`

## 7. Perguntas

As perguntas táticas não consultam LLM. Elas consultam os resultados acima.

A IA recebe algo semelhante a:

```json
{
  "matchId": "local-id",
  "team": "Equipe A",
  "filters": {"set": 2, "phase": "sideout"},
  "sample": {"rallies": 31},
  "findings": [
    {
      "findingId": "transition-12",
      "label": "Recepção -> Ataque",
      "n": 18,
      "pointProbability": 0.61,
      "deltaPointProbability": 0.09
    },
    {
      "findingId": "reception-target-R3",
      "label": "Recepção -> região central próxima à rede",
      "n": 17,
      "pointProbability": 0.69,
      "baseline": 0.54,
      "deltaVsBaseline": 0.15
    }
  ]
}
```

Nomes de atletas devem ser omitidos/anonimizados por padrão na chamada externa. Eventos crus e listas completas de coordenadas também não são enviados por padrão.

## 8. Validação matemática mínima

Fixtures manuais pequenas devem possuir resultado calculável no papel.

Exemplo sequencial:
- 4 rallies passam por `reception -> attack`;
- 3 terminam em vitória;
- 1 em derrota;
- probabilidade empírica observada = 0,75.

Exemplo espacial:
- baseline de recepções: 10/20 rallies ganhos = 0,50;
- região R3: 6/8 ganhos = 0,75;
- `deltaVsBaseline = +0,25` antes de qualquer ajuste.

O teste deve conferir denominador, região e resultado. Não testar apenas snapshot visual.


---

# ARQUIVO: PROMPTS_LUNA.md

# Prompts de execução para GPT-5.6 Luna

Use **um prompt por rodada**. Não juntar etapas.

---

## Prompt M0

Você está implementando somente M0 do pacote Scout Trainer 0.45.

Leia primeiro:
- ` AGENTS.md`
- `package.json`
- `CHANGELOG.md`
- `docs/versoes/v0.4/interface/ENTREGA.md`
- `docs/versoes/v0.4/interface/VALIDACAO.md`
- `docs/versoes/v0.45/LEIA_PRIMEIRO.md`
- `docs/versoes/v0.45/PLANO_MESTRE_0_45.md`
- `docs/versoes/v0.45/etapas/M0.md`

Regras:
1. Não implemente Markov, valor espacial, IA ou novos esportes.
2. Reproduza antes de corrigir.
3. Corrija somente dívidas que bloqueiam um baseline confiável para analytics.
4. Não atualize dependências.
5. Não formate o projeto inteiro.
6. Preserve IndexedDB e dados antigos.
7. Inclua os testes espaciais já existentes no baseline quando forem direcionados e baratos.
8. Ao terminar, atualize `STATUS_0_45.md`.
9. Pare após M0.

Entregue no final: arquivos alterados, testes executados, resultados, falhas restantes e por que não bloqueiam M1.

---

## Prompt M1

Execute somente M1 — modelo canônico de sequência + contexto espacial.

Leia:
- ` AGENTS.md`
- `docs/versoes/v0.45/STATUS_0_45.md`
- `docs/versoes/v0.45/etapas/M1.md`
- `docs/versoes/v0.45/CONTRATO_ANALYTICS.md`
- `docs/versoes/v0.45/MARKOV_ESPACIAL.md`
- `src/domain/scout/events/ScoutEvent.ts`
- `src/domain/rally/context/TacticalRallyProjection.ts`
- `src/domain/rally/context/RallyContextResolver.ts`
- `src/application/analytics/MatchAnalyticsService.ts`
- arquivos reais do sistema de zonas/coordenadas usados pelo spatial analytics atual, somente os necessários

Implemente uma projeção pura de sequência por rally. Não persista cópia dos dados. Não altere o schema do banco. Não crie UI. Não implemente Markov ainda.

O stateId deve continuar pequeno. Preserve `origin/target x,y` como contexto e derive região por função/perfil versionado. Não crie estados com coordenadas. Não invente `(0,0)` quando faltar dado.

Prefira novos arquivos em `src/domain/analytics/sequence/`.

Crie testes pequenos com rallies completos, incompletos, fora de ordem, com/sem coordenadas e coordenadas em bordas de região. Rode testes dirigidos e typecheck. Atualize STATUS e pare.

---

## Prompt M2

Execute somente M2 — motor Markov + valor espacial.

Leia:
- STATUS
- M2
- CONTRATO_ANALYTICS
- MARKOV_ESPACIAL
- implementação de `src/domain/analytics/sequence/`
- implementação espacial/zone system atual necessária
- `src/application/analytics/WinProbabilityService.ts` apenas para respeitar a fronteira existente

Implemente funções/classes puras para:
1. matriz e probabilidade de terminal;
2. delta de valor de transições;
3. padrões 2/3 estados;
4. valor condicionado por região;
5. valor por célula x,y para mapa;
6. origem/destino/trajetória quando aplicável.

Regras inegociáveis:
- equipe analisada explícita;
- `x,y` é contexto, não stateId;
- recepção: analisar principalmente destino;
- saque: analisar principalmente destino;
- ataque: origem, destino e trajetória;
- toda comparação espacial retorna baseline, n e delta;
- declarar unidade `event` ou `rally`;
- coordenada ausente é indisponível;
- n<5 não entra em ranking;
- não chamar associação de causalidade;
- não fazer UI, IA, rede ou persistência.

Se implementar shrinkage, use método explícito/testável e preserve probabilidade empírica. Não introduza dependência científica pesada.

Fixtures obrigatórias:
- Markov manual verificável;
- espacial com baseline 10/20=0,50 e região 6/8=0,75, delta +0,25;
- trajetórias com mesma origem e destinos diferentes;
- bordas e ausência de coordenada.

Testes + typecheck. Atualize STATUS e pare.

---

## Prompt M3

Execute somente M3 — painel Sequências + Valor espacial.

Leia:
- STATUS
- M3
- serviços analíticos de M2
- `SummaryScreen.tsx`
- `MatchAnalyticsPanel.tsx`
- `SpatialAnalyticsPanel.tsx`
- componente real de quadra e sistema de coordenadas
- componentes reais de filtros/análises salvas

Adicione análise Sequências + Valor espacial reutilizando sistemas existentes. Não crie persistência paralela. Não modifique o cálculo para atender layout.

Sequências: amostra, melhores/piores transições, padrões antes de ponto/erro e tabela.

Valor espacial: ação, origem/destino/trajetória, quadra colorida por probabilidade ou delta vs baseline, n por região, melhores/piores áreas e trajetórias de ataque.

Regras UX:
- sempre mostrar métrica/baseline;
- sem dado != 0%;
- n pequeno deve aparecer;
- não fazer 1/1 parecer evidência forte;
- reutilizar a quadra atual;
- não implementar Sankey.

Teste valores renderizados contra fixture controlada, clique/tooltip de região, falta de coordenadas e viewport responsiva. Atualize STATUS e pare.

---

## Prompt M4

Execute somente M4 — perguntas táticas determinísticas.

Leia STATUS, M4, CONTRATO_ANALYTICS, MARKOV_ESPACIAL e serviço de Sequências.

Implemente `TacticalQuestionService` que responde as treze perguntas definidas no plano por DTO estruturado. Inclua perguntas de recepção por área, saque por área, origem/destino do ataque e trajetórias.

Nenhuma internet e nenhuma prosa de LLM.

Cada resposta precisa de números, amostra/unidade, filtros, finding IDs, baseline quando aplicável e ressalvas. Se faltar x,y ou amostra, retornar indisponibilidade explícita.

Teste com fixtures. Não crie Gemini. Atualize STATUS e pare.

---

## Prompt M5

Execute somente M5 — BYOK Gemini.

Leia STATUS, M5, `TacticalQuestionService` e padrões de ports/infrastructure existentes.

Crie porta de provider de IA e adaptador Gemini separado. A IA interpreta apenas DTOs agregados calculados localmente.

Regras inegociáveis:
- nenhuma chave no repositório;
- chave em memória por padrão;
- nunca logar chave;
- não persistir chave no IndexedDB;
- não enviar eventos crus;
- não enviar lista bruta de coordenadas x,y;
- não enviar nomes de atletas por padrão;
- achados espaciais entram agregados com região/célula, n, baseline e delta;
- validar resposta estruturada;
- falha da IA não pode afetar analytics ou partida;
- app funciona integralmente sem chave.

Use mock/fake provider nos testes; não faça teste unitário depender da API real. Atualize STATUS e pare.

---

## Prompt M6

Execute somente M6 — relatório/exportação e contratos futuros.

Leia STATUS, M6, report model, JSON exporter, PDF renderer e sistema de análise salva.

Inclua resultados de Sequências + Valor espacial de forma opt-in e auditável. Exportar filtros, n/unidade, baseline, versão do método, coordinate/zone system, resolução e parâmetro de suavização se usado. Preserve importação/backup antigo. Não persista matriz/grade no evento canônico.

Se criar `SequenceAnalyticsProfile`/`SpatialAnalyticsProfile`, implemente apenas voleibol. Para futebol/futsal/basquete, somente ADR/documentação. Para dashboard de carga, apenas contrato conceitual de integração; não migre banco.

Atualize STATUS e pare.

---

## Prompt M7

Execute somente M7 — hardening/release.

Não adicione features.

Execute a matriz de validação da 0.45, incluindo os cenários espaciais: bordas, coordenada ausente, baseline/delta, trajetória, amostra pequena, recálculo após undo/correção, exportação e payload IA agregado.

Conserte regressões introduzidas pela 0.45, atualize README/CHANGELOG/documentação e só então altere a versão.

Não “limpe” dívidas antigas não relacionadas apenas para deixar números bonitos. Discrimine o que é novo, antigo, aprovado e não verificado.

Ao final, produza um resumo de release e pare.


---

# ARQUIVO: VALIDACAO_0_45.md

# Matriz de validação — 0.45

| ID | Cenário | Esperado |
|---|---|---|
| S01 | Eventos fora de ordem | sequência ordenada por `sequence` |
| S02 | Dois rallies | nunca misturar estados |
| S03 | Rally incompleto | sem terminal inventado |
| S04 | Sem atleta | sequência continua válida |
| S05 | Cobertura parcial | ausência adversária não vira erro/zero |
| S06 | Matriz | probabilidades de saídas elegíveis coerentes |
| S07 | Terminal | estado absorvente |
| S08 | Amostra n<5 | ranking indisponível |
| S09 | Amostra 5–14 | aviso de amostra pequena |
| S10 | Pattern 2 estados | contagem correta |
| S11 | Pattern 3 estados | contagem correta |
| S12 | Filtro por set | usa somente rallies do set |
| S13 | Filtro por fase | não vaza outros contextos |
| S14 | UI sem dados | mensagem de indisponibilidade, não 0% |
| S15 | Salvar análise | filtro/visão reabrem corretamente |
| S16 | Sem chave IA | todo analytics funciona |
| S17 | Chave inválida | erro local, sem perda de estado |
| S18 | Timeout IA | retry possível, sem travar UI |
| S19 | Payload IA | sem chave/eventos crus/nomes/coordenadas cruas por padrão |
| S20 | Resposta inventando finding | rejeitar/ignorar referência inexistente |
| S21 | PDF | resultados selecionados + amostra + método |
| S22 | JSON | schema/versionamento backward compatible |
| S23 | Backup antigo | reabre sem exigir campos 0.45 |
| S24 | Correção/undo | analytics recalcula a partir da fonte atual |
| S25 | Offline | Markov, valor espacial e perguntas determinísticas funcionam |
| S26 | Regressão | registro, placar e rotação permanecem intactos |
| S27 | `x,y` preservado | projeção mantém coordenadas existentes sem alterar evento |
| S28 | Coordenada ausente | não cria `(0,0)` e não colore célula falsa |
| S29 | Borda de região | mapeamento é determinístico e testado |
| S30 | Baseline espacial | recorte usa baseline sob os mesmos filtros esportivos |
| S31 | Fixture espacial | baseline 10/20=.50; R3 6/8=.75; delta=.25 |
| S32 | Unidade de amostra | saída declara `event` ou `rally`; denominador confere |
| S33 | Recepção espacial | destino do passe gera achado por região/célula |
| S34 | Saque espacial | destino do saque gera achado por região/célula |
| S35 | Ataque origem | regiões de origem são comparáveis |
| S36 | Ataque destino | regiões de destino são comparáveis |
| S37 | Trajetória | `originRegion -> targetRegion` tem n/valor corretos |
| S38 | Mapa n pequeno | 1/1 não aparece como ranking confiável |
| S39 | Troca de filtro | mapa e tabela usam o mesmo recorte |
| S40 | Tooltip/região | mostra n, probabilidade, baseline e delta corretos |
| S41 | Suavização | se ativa, mantém empírico e parâmetro/método explícitos |
| S42 | Export espacial | zone system/resolução/amostra/baseline são auditáveis |
| S43 | IA espacial | recebe apenas achados agregados; findingId válido |
| S44 | Undo espacial | correção de x,y recalcula mapa/achados sem dado residual |

## Gate de release

Bloqueadores:
- S01–S08;
- S12–S14;
- S16–S19;
- S23–S32;
- S33–S40;
- S42–S44.

S41 só bloqueia se a suavização for habilitada na release. Se não for entregue, a UI deve trabalhar com probabilidade empírica + regras de amostra e documentar a ausência do ajuste.

Os demais podem ser documentados como limitação somente se não corromperem dados nem produzirem conclusão enganosa.


---

# ARQUIVO: STATUS_0_45_TEMPLATE.md

# Status — Scout Trainer 0.45

Branch:
SHA inicial:
Node:
Data:

| Etapa | Estado | Commit/working tree | Testes | Observações |
|---|---|---|---|---|
| M0 | não iniciada | | | |
| M1 | bloqueada | | | |
| M2 | bloqueada | | | |
| M3 | bloqueada | | | |
| M4 | bloqueada | | | |
| M5 | bloqueada | | | |
| M6 | bloqueada | | | |
| M7 | bloqueada | | | |

## Regras para atualizar
- uma etapa por rodada;
- registrar somente evidência executada;
- não chamar teste não executado de aprovado;
- indicar falhas preexistentes separadamente;
- registrar arquivos principais alterados;
- registrar próximo passo único.


---

# ARQUIVO: etapas/M0.md

# M0 — baseline 0.4 confiável

## Leia
Veja `MAPA_DE_ARQUIVOS.md`, seção M0.

## Faça
1. Registre SHA/branch/status.
2. Use Node 22 compatível com manifests.
3. Reproduza typecheck, build e testes relevantes.
4. Corrija V05 (placar duplicado) se ainda existir.
5. Atualize testes claramente obsoletos por mudanças já aceitas da UI, sem alterar comportamento só para fazê-los passar.
6. Resolva/documente o contrato do Alt+T.
7. Remova versão hardcoded antiga do PDF se confirmada.
8. Crie `STATUS_0_45.md`.

## Não faça
Markov, IA, schema, dependência nova, redesign.

## Aceite
Baseline analítico confiável e pendências restantes explicitadas.


---

# ARQUIVO: etapas/M1.md

# M1 — sequência canônica + contexto espacial

## Objetivo
Transformar eventos existentes em sequência analítica derivada, preservando o espaço necessário para análises posteriores.

## Arquivos novos preferidos
`src/domain/analytics/sequence/`.

## Regras
- agrupar por rallyId;
- ordenar por sequence;
- preservar sourceEventId;
- terminal deriva do resultado real;
- rally incompleto continua incompleto;
- não persistir projeção;
- contexto fica separado do stateId;
- preservar `origin/target x,y` existentes;
- derivar região somente por função/perfil versionado;
- nunca inventar `(0,0)` para coordenada ausente;
- não transformar coordenadas em stateId.

## Testes
- eventos fora de ordem;
- rally completo;
- rally incompleto;
- ação sem atleta;
- cobertura parcial;
- dois rallies no mesmo set não se misturam;
- evento com origem/destino preserva coordenadas;
- evento sem coordenada continua válido;
- ponto exatamente na borda de uma região tem mapeamento determinístico.

## Pare quando
Builder e perfil de voleibol estiverem estáveis, incluindo contexto espacial, sem alterar schema/banco.


---

# ARQUIVO: etapas/M2.md

# M2 — Markov, valor de sequência e valor espacial

## Objetivo
Calcular transições e valor observado, incluindo `x,y`, sem IA.

## Entregas
- TransitionMatrix;
- MarkovAnalyzer;
- StateValue;
- SequencePatternAnalyzer;
- SpatialMarkovAnalyzer;
- SpatialValueEstimator;
- grade/region mapping reutilizando o sistema espacial atual quando possível;
- SequenceAnalyticsService.

## Regras sequenciais
- equipe de referência explícita;
- terminal_win/loss absorventes;
- amostra sempre visível;
- filtro antes do cálculo;
- padrões 2/3 estados;
- sem causalidade.

## Regras espaciais
- `x,y` é contexto, não stateId;
- recepção usa principalmente destino;
- saque usa principalmente destino;
- ataque usa origem, destino e trajetória;
- devolver baseline comparável e delta;
- declarar `sampleUnit`;
- coordenada ausente fica indisponível, não vira zero;
- regiões/células com n<5 não entram em ranking;
- manter probabilidade empírica;
- ajuste/shrinkage, se usado, deve ser explícito e testável;
- sem UI, rede ou persistência.

## Teste mínimo manual
1. Fixture sequencial pequena com probabilidades conhecidas.
2. Fixture espacial: baseline 10/20 = 0,50; região R3 6/8 = 0,75; delta esperado +0,25.
3. Ataques com mesma origem e destinos diferentes para validar trajetória.
4. Coordenadas de borda e coordenadas ausentes.

## Pare quando
Resultados sequenciais e espaciais puderem ser consumidos por qualquer UI sem conhecer `ScoutEvent` cru.


---

# ARQUIVO: etapas/M3.md

# M3 — UI Sequências + Valor espacial

## Objetivo
Tornar o motor legível para analista/treinador e transformar `x,y` em leitura tática útil.

## Blocos de sequência
- tamanho da amostra;
- melhores/piores transições;
- padrões antes de ponto;
- padrões antes de erro;
- tabela de transição;
- filtros.

## Blocos espaciais
- ação analisada;
- origem/destino/trajetória quando aplicável;
- quadra com probabilidade ou delta vs baseline;
- n por região/célula;
- tabela de melhores/piores regiões;
- trajetórias de ataque;
- baseline do recorte;
- aviso de amostra pequena.

## UX
Use linguagem esportiva. Mostrar “sem amostra suficiente”, nunca zero fictício.
Reutilize quadra/sistema de coordenadas atual.
Não implemente Sankey nesta etapa.
Não deixar 1/1 = 100% parecer evidência forte.

## Testes
Valores renderizados, filtros, ausência de dados, amostra pequena, coordenada ausente, clique em célula/região, troca entre origem/destino e viewport 1366×768, 1024×768, 390×844.

## Pare quando
A análise sequencial e espacial já for útil sem IA.


---

# ARQUIVO: etapas/M4.md

# M4 — perguntas táticas

## Objetivo
Converter resultados analíticos em respostas estruturadas e auditáveis.

## Perguntas
As treze perguntas estão no plano mestre, incluindo recepção por área, saque por área, origem/destino de ataque e trajetórias.

## Saída
DTO com finding IDs, números, filtros, amostra/unidade, baseline quando houver comparação espacial e ressalvas.

## Regra
Sem prosa generativa e sem rede. Nenhuma pergunta espacial consulta eventos crus diretamente se o serviço analítico já expõe o finding.

## Pare quando
A camada puder alimentar UI, PDF ou LLM com o mesmo contrato, inclusive para achados espaciais.


---

# ARQUIVO: etapas/M5.md

# M5 — BYOK Gemini

## Objetivo
Adicionar explicação em linguagem natural sem transferir cálculo ao modelo.

## Arquitetura
Port -> service -> provider Gemini.

## Privacidade
Chave em memória, sem log/IndexedDB/export.
Payload agregado e minimizado.
Nomes anonimizados por padrão.
Não enviar `ScoutEvent` cru nem lista de coordenadas evento a evento.
Achados espaciais entram como regiões/células agregadas com n, baseline e delta.

## Resiliência
Timeout, cancelamento, erro legível, resposta inválida rejeitada, retry manual.
Analytics segue funcionando offline.

## Testes
Fake provider: sucesso, chave ausente, 401/403, timeout, JSON inválido.
Provar que payload não contém ScoutEvent cru, API key nem nuvem bruta de x,y.
Provar que finding espacial citado existe no DTO.

## Pare quando
A IA puder ser removida/desligada sem mudar nenhum número sequencial ou espacial.


---

# ARQUIVO: etapas/M6.md

# M6 — relatório, exportação e extensibilidade

## Objetivo
Levar Sequências + Valor espacial aos artefatos existentes e preparar o próximo salto sem implementá-lo.

## Faça
- seleção opt-in de blocos de Sequências no relatório;
- seleção opt-in de regiões/trajetórias/mapa espacial;
- JSON com versão/metodologia/filtros/amostra/unidade/baseline;
- registrar coordinate/zone system e resolução da grade;
- registrar parâmetro de suavização se usado;
- narrativa IA somente se usuário pedir;
- ADR de `SequenceAnalyticsProfile`;
- ADR de `SpatialAnalyticsProfile`;
- ADR BYOK;
- nota de integração futura com dados de carga.

## Não faça
Futebol/futsal/basquete, cloud DB, sincronização ou migração de atleta.
Não salvar matriz/grade derivada dentro de cada ScoutEvent.

## Pare quando
Backup antigo continuar válido e exportação sequencial/espacial nova for auditável.


---

# ARQUIVO: etapas/M7.md

# M7 — hardening e release

## Objetivo
Certificar a 0.45 sem adicionar features.

## Verificações obrigatórias
- typecheck;
- testes unitários direcionados;
- suíte completa;
- E2E crítico;
- build;
- lint direcionado;
- offline sem IA;
- chave ausente/inválida/timeout/resposta inválida;
- rally incompleto;
- partida sem coordenadas;
- coordenadas de borda;
- baseline/delta espacial contra fixture manual;
- n pequeno no mapa;
- trajetória de ataque;
- correção/undo de x,y;
- export sequencial/espacial;
- backup antigo.

## Release
Atualize README/CHANGELOG e versão somente depois dos gates. Não esconda dívida antiga não relacionada.

## Pare quando
A 0.45 for auditável, backward compatible e nenhum resultado de IA puder alterar os números determinísticos.
