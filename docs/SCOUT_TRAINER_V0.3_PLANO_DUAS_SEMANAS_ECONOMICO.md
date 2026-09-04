# Scout Trainer v0.3 — Plano restante em duas semanas

## Objetivo deste plano

Concluir a v0.3 sem consumir desnecessariamente o limite semanal do Codex.

Este plano parte do estado real já alcançado:

| Entrega | Situação |
| --- | --- |
| Macro 17 — Fundação, auditoria e contratos | Concluída |
| Macro 18 — Advanced Volleyball Analytics | Concluída |
| Macro 19 — Visual Analytics | Concluída |
| Macro 20A — Pipeline comum e proveniência | Concluída |
| Macro 20B — Mapeamento visual/híbrido e captura | Concluída |
| Macro 20C — Geometria e projeção espacial | Pendente |
| Macro 20D — Integração | Pendente |
| Macro 21 — Histórico, temporada e perfil de adversário | Pendente |

A implementação restante será dividida por disponibilidade real de execução:

```text
ESTA SEMANA — restam ~8% de execução
→ fechar somente a Macro 20

PRÓXIMA SEMANA
→ construir a base histórica da Macro 21
→ construir tendências/Opponent Profile
→ fazer release 0.3.0
```

Não abrir novas macroetapas ou novos pacotes salvo bloqueio técnico real.

---

# 1. Regras de economia do Codex

## 1.1 Contexto mínimo

Em cada execução, ler somente:

1. `git status --short`;
2. último bloco relevante de `IMPLEMENTATION_STATUS.md`;
3. a seção desta execução;
4. arquivos diretamente envolvidos, localizados por símbolo.

Não reler integralmente:

- planos V1/V2;
- auditoria 0.2;
- relatórios das Macros 17–19;
- plano v0.3 inteiro;
- documentação externa já utilizada anteriormente.

Se um símbolo mudou de caminho, usar busca dirigida. Não iniciar auditoria geral do repositório.

## 1.2 Regra geral de testes

Teste serve para proteger a alteração feita, não para revalidar o projeto inteiro a cada execução.

Durante implementação:

- preferir testes já existentes;
- adicionar teste novo somente para comportamento novo ou risco claro de regressão;
- repetir apenas o teste que falhou;
- não criar um teste para cada botão, filtro, coordenada ou estado visual;
- não rodar Playwright completo durante desenvolvimento;
- não rodar suíte completa por rotina;
- não rodar benchmark pesado por rotina;
- não executar testes para mudanças exclusivamente documentais.

`typecheck` é o único check transversal padrão durante as duas primeiras execuções.

## 1.3 Documentação

Nesta semana:

- atualizar somente `IMPLEMENTATION_STATUS.md` com poucas linhas.

Na primeira execução da próxima semana:

- novamente atualizar somente `IMPLEMENTATION_STATUS.md`.

Somente no release:

- `ROADMAP.md`;
- `PROJECT_CONTEXT.md`;
- `PIPELINES.md`;
- `CHANGELOG.md`;
- versão `0.3.0`.

---

# 2. ESTA SEMANA — fechar Macro 20 com os ~8% restantes

## Meta

Chegar a um ponto de parada limpo: **Macro 20 funcionalmente concluída**.

Não começar a Macro 21 nesta semana, salvo se a Macro 20 terminar com folga evidente de execução.

A prioridade é entregar valor funcional, não gastar limite em validação redundante.

## 2.1 Implementar geometria canônica

Reutilizar o máximo possível da quadra tática já existente.

Criar somente se não houver equivalente:

- conversão pointer/touch/drag para `x` e `y` normalizados em `0..1`;
- `CourtOrientation`;
- `CourtZoneResolver` integrado ao `ZoneSystemProfile` existente.

Regras obrigatórias:

- resize não altera a coordenada normalizada;
- domínio rejeita coordenadas persistidas fora de `0..1`;
- orientação exibida é convertida para uma convenção canônica antes da criação do evento;
- X/Y é mais preciso que a zona derivada;
- scouts antigos somente com zona continuam válidos.

Não criar uma segunda geometria de quadra.

## 2.2 Criar uma única projeção espacial

Implementar:

```text
effective ScoutEvent[]
  → filtros
  → SpatialSample[]
  → densidade | trajetórias | matriz origem×destino
  → MatchReportModel.spatial
  → UI/tabela
```

Regras:

- `SpatialSample` não é persistido;
- reutilizar IDs, `Skill`, `CourtLocation`, rotação, posição do levantador e fase existentes;
- correção/undo/replay atuam sobre a timeline efetiva e naturalmente alteram a projeção;
- UI não recalcula a projeção espacial.

## 2.3 Integrar ao resumo da partida

Adicionar uma seção Spatial Analytics ao resumo existente.

### Entregas mínimas

- um heatmap genérico com presets para:
  - alvo de ataque;
  - alvo de saque;
  - contato de recepção;
- visualização de trajetórias quando houver origem/destino;
- matriz origem × destino;
- filtros já presentes no modelo, sem criar dimensões novas apenas para a UI;
- tabela ou resumo textual equivalente aos dados exibidos visualmente.

Reutilizar Canvas/SVG e componentes existentes. Não criar um elemento DOM por amostra.

Não reformular novamente o visual entregue na Macro 19.

## 2.4 Compatibilidade

Preservar:

- modo digitado;
- modo visual;
- modo híbrido;
- um único `CanonicalScoutEventCandidate`;
- `ScoutEvent`/`MatchEvent` efetivo como fonte de verdade;
- `inputMode` e coordenadas no JSON;
- backups anteriores;
- IndexedDB em v4 durante toda a Macro 20.

Não mexer na migração v5 nesta semana.

## 2.5 Testes permitidos nesta semana

O objetivo é gastar pouco.

### Obrigatórios

No máximo **dois focos de teste**:

1. geometria/projeção espacial:
   - uma fixture pequena cobrindo coordenada normalizada, orientação e matriz/densidade;
2. integração:
   - confirmar que `MatchReportModel.spatial` chega à seção visual e que correction **ou** undo altera o resultado efetivo.

Depois:

```bash
npm run typecheck
```

### Não rodar nesta semana

- suíte unitária completa;
- Playwright completo;
- `npm run test:e2e` completo;
- benchmark de 5.000 eventos;
- lint global;
- format global;
- build completo, salvo se necessário para diagnosticar erro real de integração.

### Benchmark de 5.000 eventos

Deixa de ser critério de bloqueio da v0.3.

A aplicação já possui histórico de robustez com partidas grandes, mas Spatial Analytics é novo. Portanto o benchmark fica registrado como **hardening pós-v0.3** ou pode ser executado futuramente se houver sinal real de lentidão.

Não gastar os últimos 8% semanais nisso.

## 2.6 Definição de concluído desta semana

A Macro 20 pode ser considerada concluída quando:

- digitado, visual e híbrido continuam convergindo no mesmo fluxo canônico;
- coordenadas/zonas/orientação usam uma convenção única;
- Spatial Analytics vem de uma projeção única;
- heatmap, trajetórias e matriz aparecem usando esse modelo;
- correção ou undo é refletido na projeção efetiva;
- backups continuam compatíveis;
- IndexedDB continua v4;
- testes dirigidos escolhidos passam;
- `typecheck` passa.

Não exigir gate completo para marcar a Macro 20.

Ao terminar, atualizar apenas `IMPLEMENTATION_STATUS.md` e **parar por esta semana**.

---

# 3. PRÓXIMA SEMANA — Execução 1: base histórica da Macro 21

## Meta

Implementar em uma única execução a antiga 21A + 21B:

- migração v5;
- snapshots reconstruíveis;
- agregação histórica;
- referências empíricas.

## 3.1 Migração e snapshots

Alterar IndexedDB de v4 para v5 somente aqui.

Criar/reutilizar:

- `MatchAnalyticsSnapshot`;
- `AnalyticsSnapshotRepository`;
- store `analyticsSnapshots`;
- builder usando o mesmo `MatchAnalyticsService` / `MatchReportModel`;
- serviço para apagar e reconstruir cache.

Snapshot deve guardar no mínimo:

- versão analítica;
- `matchId`;
- revisão append-only da fonte;
- data de geração.

Correction/undo/redo precisam invalidar a revisão por acrescentarem eventos ao log.

Snapshot é cache reconstruível, nunca fonte de verdade.

## 3.2 HistoricalAnalyticsService

Implementar uma única camada:

```text
partidas selecionadas
  → snapshots válidos/reconstruídos
  → HistoricalAnalyticsService
      ├→ série de atleta
      ├→ série da equipe
      ├→ referências empíricas
      └→ recorte do adversário
```

Reutilizar numeradores, denominadores e componentes auditáveis já existentes.

Não criar um segundo motor de estatísticas.

Não tirar média simples de percentuais com volumes diferentes.

Identidade:

- equipe por `teamId`;
- atleta por `playerId` quando disponível;
- camisa é rótulo, não identidade histórica universal.

## 3.3 Referências históricas

Produzir:

```text
ReceptionGrade → taxa histórica de sideout
ServeEvaluation → taxa histórica de breakpoint
```

Cada referência preserva:

- numerador;
- denominador;
- tamanho da amostra;
- partidas usadas;
- período.

Amostra insuficiente permanece explicitamente insuficiente.

Não criar taxa ou peso substituto.

## 3.4 Testes desta execução

Usar apenas dois focos:

1. snapshot/migração:
   - v4→v5;
   - cache válido;
   - uma invalidação combinada;
   - reconstrução equivalente;
2. histórico:
   - agregação ponderada;
   - identidade por ID;
   - referência suficiente/insuficiente.

Depois:

```bash
npm run typecheck
```

Não rodar E2E nem build completo.

Atualizar somente `IMPLEMENTATION_STATUS.md` e seguir para a execução final.

---

# 4. PRÓXIMA SEMANA — Execução 2: tendências, Opponent Profile e release

## Meta

Concluir a antiga 21C + 21D e publicar a v0.3.

## 4.1 Área histórica

Adicionar uma área simples para seleção de partidas/período.

Criar um componente de tendência reutilizável alimentado pelo `HistoricalAnalyticsService`.

### Equipe

Mostrar, quando houver dados:

- eficiência de ataque;
- eficiência de saque;
- recepção positiva;
- sideout;
- breakpoint;
- Attack Evenness;
- erros;
- aces;
- bloqueios.

### Atleta

Mostrar apenas métricas aplicáveis:

- eficiência / kill rate de ataque;
- recepção positiva/excelente;
- sideout;
- impacto de saque/breakpoint.

Não preencher gráfico com métrica sem sentido para o atleta.

## 4.2 Opponent Profile

Não criar novas fórmulas.

Reutilizar analytics existentes das partidas selecionadas:

- distribuição do levantador por P1–P6 e qualidade de recepção;
- Setter Repetition;
- ataque por origem, destino, direção e eficiência;
- saque por alvo/sacador/breakpoint;
- rotações por sideout, breakpoint, ataque e recepção.

Gráfico e tabela recebem o mesmo view model.

## 4.3 Testes finais mínimos

### Testes dirigidos

No máximo:

1. tendência com dados + estado vazio;
2. Opponent Profile reutilizando numeradores/denominadores históricos;
3. seleção de partidas por ID, se isso não estiver coberto pelos dois anteriores.

### Gate final enxuto

Executar:

```text
1. testes dirigidos finais
2. npm run typecheck
3. npm run build
4. um único smoke E2E combinado
```

Smoke E2E:

```text
abrir aplicação
→ abrir/registrar partida
→ confirmar scout digitado
→ abrir partida com captura visual/híbrida
→ abrir Spatial Analytics
→ abrir histórico com mais de uma partida
→ ver uma tendência
→ abrir Opponent Profile
```

Não verificar fórmulas detalhadas no E2E.

### Só rodar suíte completa se necessário

Rodar `npm test` completo somente se:

- houve alteração transversal inesperada em domínio compartilhado;
- teste dirigido revelou regressão fora da área alterada;
- build/E2E indicar comportamento inconsistente.

Não rodar Playwright completo apenas por protocolo.

Lint/format global também não são gate obrigatório se os arquivos alterados já estão válidos e o pipeline não exigir.

## 4.4 Release

Se o gate final estiver verde:

- marcar Macro 20 e 21 como concluídas no estado real;
- atualizar `ROADMAP.md`;
- atualizar `PROJECT_CONTEXT.md` sem repetir o plano inteiro;
- atualizar `PIPELINES.md` com o fluxo implementado;
- alterar versão para `0.3.0`;
- atualizar `CHANGELOG.md`;
- não repetir testes por mudanças apenas documentais/de versão, salvo build se o empacotamento exigir.

---

# 5. Hardening pós-v0.3 — não bloqueia o release

Itens úteis, mas que não justificam consumir execução semanal agora:

- benchmark isolado de Spatial Analytics com 5.000 eventos;
- suíte Playwright completa;
- auditoria de acessibilidade mais extensa;
- testes de todas as combinações de filtros;
- otimizações de renderização sem evidência de lentidão;
- refactors puramente estéticos/organizacionais.

Executar futuramente apenas se houver necessidade real ou sobra de execução.

---

# 6. Resumo operacional

```text
ESTA SEMANA (~8%)
└── EXECUÇÃO A
    Macro 20C + integração essencial do 20D
    → fechar Spatial Analytics
    → 2 focos de teste + typecheck
    → atualizar só IMPLEMENTATION_STATUS
    → PARAR

PRÓXIMA SEMANA
├── EXECUÇÃO B
│   Macro 21A + 21B
│   → v5 + snapshots + histórico + referências
│   → 2 focos de teste + typecheck
│
└── EXECUÇÃO C
    Macro 21C + 21D
    → tendências + Opponent Profile
    → testes dirigidos + typecheck + build + 1 smoke E2E
    → documentação + versão 0.3.0
```

Total restante: **3 execuções**, sendo apenas **1 nesta semana**.

---

# 7. Comandos prontos para o Codex

## ESTA SEMANA — fechar Macro 20

```text
Continue o Scout Trainer v0.3 considerando Macro 20A e 20B já concluídas.
Tenho pouco limite de execução restante nesta semana, então faça somente a entrega necessária para concluir funcionalmente a Macro 20.

Implemente a geometria canônica, a projeção Spatial Analytics e sua integração essencial no MatchReportModel e no resumo da partida, reutilizando a quadra, tipos e analytics existentes. Não altere IndexedDB para v5 e não comece a Macro 21.

Leia somente git status, o último bloco relevante de IMPLEMENTATION_STATUS.md, a seção desta execução no plano e os arquivos localizados pelos símbolos diretamente envolvidos. Não reabra auditorias nem releia planos antigos.

Use no máximo dois focos de teste: geometria/projeção e integração. Depois rode apenas typecheck. Não rode suíte completa, Playwright completo, benchmark de 5.000 eventos, lint global, format global ou build completo salvo se necessário para diagnosticar uma falha real.

Quando Spatial Analytics estiver funcional e os checks mínimos estiverem verdes, marque a Macro 20 como concluída apenas em IMPLEMENTATION_STATUS.md e pare. Não inicie a Macro 21.
```

## PRÓXIMA SEMANA — base histórica

```text
Continue o Scout Trainer v0.3 pela execução de base histórica da Macro 21.

Implemente em uma única execução a migração IndexedDB v4→v5, snapshots analíticos reconstruíveis, AnalyticsSnapshotRepository, HistoricalAnalyticsService e referências históricas de sideout/breakpoint. Reutilize o MatchAnalyticsService/MatchReportModel atual e não crie um segundo motor estatístico.

Leia somente o status atual, a seção desta execução e os arquivos diretamente afetados. Use apenas dois focos de teste: snapshot/migração e agregação histórica. Depois rode typecheck. Não rode E2E nem build completo.

Atualize somente IMPLEMENTATION_STATUS.md e pare quando a base histórica estiver funcional.
```

## PRÓXIMA SEMANA — tendências e release

```text
Continue o Scout Trainer v0.3 pela execução final.

Implemente tendências de equipe/atleta e Opponent Profile usando exclusivamente o HistoricalAnalyticsService e analytics existentes. Não crie novas fórmulas de opponent.

Faça somente os testes dirigidos essenciais da UI/histórico, rode typecheck, build e um único smoke E2E combinado cobrindo scout, captura visual/híbrida, Spatial Analytics, histórico, tendência e Opponent Profile. Não rode Playwright completo nem suíte unitária completa salvo se algum check indicar regressão transversal.

Se tudo estiver verde, atualize ROADMAP.md, PROJECT_CONTEXT.md, PIPELINES.md e CHANGELOG.md, altere a versão para 0.3.0 e finalize a v0.3. O benchmark de 5.000 eventos e hardening adicional não bloqueiam esta release.
```
