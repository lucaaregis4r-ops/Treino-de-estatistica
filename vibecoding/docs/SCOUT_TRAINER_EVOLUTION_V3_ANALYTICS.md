# Scout Trainer — Evolução V3 Analytics

## Status

Macroetapas 17 e 18 concluídas em 1º de setembro de 2026. A fundação documental e os cinco grupos
de analytics avançado estão implementados. As funcionalidades das macroetapas 19–21 permanecem
pendentes.

## Escopo da evolução

A V3 está organizada em quatro entregas incrementais:

1. analytics avançado sobre o log efetivo da partida;
2. visual analytics como nova apresentação do `MatchReportModel`;
3. entrada visual/híbrida e analytics espacial sobre o mesmo `ScoutEvent` canônico;
4. histórico multi-partida com snapshots reconstruíveis.

Todo o escopo relacionado a vídeo está proibido: não haverá player, upload, sincronização,
timestamps, clips, FFmpeg, câmera, tracking ou visão computacional.

## Baseline auditado

- branch: `main`;
- versão: `0.2.0`;
- runtime: React e React DOM;
- aplicação: React, TypeScript, Vite e Electron;
- persistência: IndexedDB, schema v4;
- testes: Vitest e Playwright;
- fonte de verdade: `MatchEvent`/`ScoutEvent` efetivo e replay determinístico;
- exportação mestre: JSON versionado e restaurável.

O HEAD contém 48 arquivos de teste com 264 testes unitários e 7 cenários E2E. Os números de 224
testes e 4 fluxos presentes no plano V3 eram referências antigas.

## Auditoria dos contratos

### Entrada digitada

O fluxo de produção continua sendo:

```text
rawCode
  → Normalizer
  → Tokenizer
  → Parser
  → SemanticMapper
  → CanonicalScoutEventCandidate
  → AttackOriginResolver
  → ValidationEngine
  → CompletenessEvaluator
  → EventFactory
  → ScoutEvent
  → MatchEvent
  → IndexedDB
```

`RegisterScoutEventUseCase` ainda concentra tanto a parte textual quanto a parte compartilhável de
validação/criação. A Macro 20 deverá extrair essa segunda parte sem alterar o parser digitado.

### Evento canônico e auditoria

`CanonicalScoutEventCandidate` já é o ponto de convergência adequado. Ele preserva `rawCode` e
`normalizedCode`; `ScoutEvent` preserva profiles, contexto da escalação, levantador, completude e
metadata tática. Ainda não existe `ScoutInputMode`, portanto a proveniência `typed | visual |
hybrid` permanece pendente da Macro 20.

Entradas visuais não fabricarão texto para atravessar tokenizer/parser. A representação humana
`[VISUAL] ...` será somente auditável e não parseável.

### Levantador implícito

`ActiveSetterResolver`, `RallyContextResolver`, `ReceptionContextResolver` e
`TacticalRallyProjection` já derivam o levantador ativo, P1–P6, fase e recepção associada ao ataque.
`MatchAnalyticsService` usa esse contexto para distribuição e ataques por posição do levantador.

Levantamentos normais continuarão implícitos. Apenas uma ação observável independente, como erro de
levantamento, pode gerar evento explícito. Eventos sintéticos de levantamento são proibidos.

### Coordenadas e quadra

`CourtLocation` e `BallTrajectory` já aceitam coordenadas X/Y e método de captura. A UI transforma
pointer em coordenadas normalizadas no intervalo 0–1 e `TacticalCourt` registra seleção ou desenho.
A Macro 20 deve generalizar e testar essa base, sem criar um segundo sistema geométrico.

### Analytics e relatórios

`MatchAnalyticsService` constrói o `MatchReportModel` com métricas auditáveis, sideout, breakpoint,
rotações, distribuição e direção. UI, CSV e PDF consomem o mesmo modelo. As métricas avançadas da
Macro 18 devem residir em módulos de domínio e ser apenas orquestradas pelo serviço.

### Persistência e histórico

O banco permanece na versão 4 e não possui `analyticsSnapshots`. A migração v4→v5 pertence somente
à Macro 21. Snapshots serão cache invalidável; o log efetivo continuará sendo a fonte de verdade.

## Divergências e dívida observadas

- O status antigo informava 224 testes/4 E2E; o HEAD possui 264 testes/7 E2E.
- Um E2E ainda procurava campos antigos de zona embora a origem normal do ataque já seja derivada;
  o teste foi alinhado ao contrato atual, sem mudança funcional.
- O checkout Windows usa CRLF enquanto o Prettier assumia LF; o baseline passou a aceitar o fim de
  linha local sem reformatar o projeto inteiro.
- `ScoutTrainerService` ainda importa exportadores concretos de infraestrutura. É dívida existente,
  não ampliada nesta macro.
- `MatchAnalyticsService` já é extenso. A V3 deve adicionar matemática em módulos de domínio, não no
  serviço ou em React.
- Não há `ScoutInputMode`, pipeline visual ou snapshot histórico implementados ainda. Recharts foi
  incorporado na Macro 19 apenas na camada de apresentação.

## Contratos canônicos da V3

```text
DIGITADO ── Normalizer/Tokenizer/Parser/SemanticMapper ─┐
                                                       ├→ CanonicalScoutEventCandidate
VISUAL/HÍBRIDO ── VisualScoutMapper ───────────────────┘
                                                              ↓
                                                    validação/completude/fábrica
                                                              ↓
                                                         ScoutEvent
```

```text
ataque efetivo + lineup vigente
  → levantador ativo e P1–P6 derivados
  → analytics do levantador
```

```text
MatchEvent/ScoutEvent efetivo = fonte de verdade
AnalyticsSnapshot             = cache reconstruível
```

## Ordem e gates

As próximas macroetapas devem seguir a ordem 18 → 19 → 20 → 21. Ao final de cada uma:

```text
npm run test
npm run test:e2e
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Nenhuma macro pode anunciar a seguinte como concluída. A versão permanece `0.2.0` até a conclusão
integral da V3.

## Macro 18 concluída

Foram implementados Expected Sideout, Expected Breakpoint, Attack Evenness, Setter Repetition e
Setter Attack Conversion. As métricas pertencem ao domínio, usam eventos efetivos e são projetadas
em `MatchReportModel.advanced`, CSV e PDF. Referências empíricas ausentes produzem resultado
indisponível explícito. O levantamento normal continua implícito.

## Macro 19 concluída

O resumo agora usa Recharts para comparar equipes, rotações, distribuição do levantador, Attack
Evenness e Setter Repetition. Cada visualização conserva resumo textual e tabela auditável. Os
filtros de distribuição usam dimensões reais de levantador, recepção, set e fase; mapas de quadra e
captura visual/híbrida permanecem reservados para a Macro 20.
