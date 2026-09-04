# Implementation Status

## Current phase

Evolution V3 — Correção Macro 20 · Correção concluída

## Completed

- Correção Macro 20 · Etapa 6 (limpeza e fechamento): auditados os componentes espaciais alterados;
  captura usa mini-quadra contextual e a leitura usa heatmap/jogadas, sem bola gigante, curvas,
  animações, partículas ou heatmap durante a captura. A visualização individual mostra somente
  origem/destino efetivamente registrados. Checks dirigidos e typecheck passam; IndexedDB permanece
  na versão prevista.

- Correção Macro 20 · Etapa 5 (jogadas individuais e integração): o painel espacial agora oferece
  `Heatmap | Jogadas`. O modo Heatmap mantém a leitura agregada por região; o modo Jogadas usa
  somente `SpatialSample` com origem e destino reais, desenhando linhas retas individuais sem
  inventar trajetória, curva, animação ou volume visual. O filtro de fundamento/equipe existente
  continua compartilhado pelos dois modos; saque permanece limitado aos dados espaciais disponíveis.
- Teste dirigido de integração alterna entre os dois modos e confirma os mapas correspondentes;
  `npm run typecheck`, ESLint direcionado e teste espacial de UI passam.

- Correção Macro 20 · Etapa 4 (heatmap funcional de recepção): a projeção espacial agora agrega
  `receptions`, `sideouts` e `sideoutRate` por região de contato da recepção. O sideout usa os
  `servingTeamId`/`winnerTeamId` do `TacticalRallyProjection` existente; a UI não recalcula o
  resultado. O mesmo visual de células do heatmap de ataque é reutilizado para recepção, com
  tooltip e tabela mostrando volume, sideouts e taxa.
- Fixture dirigida: 10 recepções na mesma região, 7 sideouts e taxa de 70%; typecheck, ESLint
  direcionado e teste de integração espacial passam.

- Correção Macro 20 · Etapa 3 (heatmap funcional de ataque): a projeção espacial agora agrega
  `attempts`, `points`, `errors` e `pointRate` por região de destino, usando o `outcome` real do
  evento. A visualização de ataque passou de círculos proporcionais para células de quadra com
  intensidade baseada na taxa de ponto e detalhes de amostra no tooltip/tabela. Saque e recepção
  permanecem sem alteração nesta etapa.
- Fixture dirigida: 10 ataques na mesma região, 6 pontos e taxa de ponto de 60%; typecheck e
  ESLint direcionado passam.

- Correção Macro 20 · Etapa 2 (persistência espacial): confirma que origem/destino capturados pela
  MiniCourt fluem do `captureDraft` ao evento canônico sem tipo paralelo, reutilizando o pipeline
  typed/visual/híbrido. Troca clique/touch em x/y normalizado 0..1, converte a orientação visual
  para a convenção canônica e deriva a zona das coordenadas via `CourtZoneResolver`
  (`SemanticMapper` → `normalizeTacticalMetadata` → `canonicalCourtLocation`), removendo o
  `captureDraft` do metadata persistido. Preserva digitado, visual, híbrido, correction, undo,
  replay e scouts antigos somente com zona; IndexedDB permanece na versão atual.
- Dirigido: novo teste de persistência da criação typed com x/y puro (zona derivada + direção +
  complete) e correção do teste pré-existente de correção espacial que esperava zona obsoleta
  (`targetZone` '1' → '2', valor real do resolver). `indexeddb-repositories.test.ts` agora passa
  16/16; `npm run typecheck`, ESLint direcionado e `git diff --check` passam.

- Correção Macro 20 · Etapa 1 (mini-quadra contextual, interação): ao digitar uma ação compatível
  (ataque) em modo contínuo com a captura de direção habilitada, uma mini-quadra contextual abre
  automaticamente; dois toques marcam origem e destino e Enter/Confirmar registra a trajetória
  desenhada no pipeline de evento existente. Reutiliza a geometria canônica (`CourtGeometry`) e o
  `TacticalCaptureDraft`; Esc cancela (mantém o buffer) e R refaz. Configuração global no scout
  `[ ] Capturar direção das ações` (interação apenas, sem persistência IndexedDB). Escopada a
  ataques para não interromper o prefill de saque. 2 testes de interação + 1 teste tático existente
  passando; `npm run typecheck`, ESLint direcionado e `git diff --check` passam.

- Macro 21 base histórica (antigas 21A + 21B): IndexedDB migrado de v4 para v5 adicionando a store
  `analyticsSnapshots`; `MatchAnalyticsSnapshot` como cache reconstruível com versão do schema,
  contagem de eventos-fonte e última sequência; `AnalyticsSnapshotRepository` e adaptador IndexedDB.
- `HistoricalAnalyticsService` construindo o snapshot a partir de `MatchReportModel`, validando o
  cache contra a versão/contagem/sequência atuais, invalidação + reconstrução por `delete`/`rebuild`
  e agregação histórica ponderada (numeradores/denominadores somados, nunca média simples de
  percentuais) para série de equipe e de atleta.
- Referências históricas de sideout e breakpoint preservando numerador, denominador, amostra,
  partidas usadas e permitindo manter amostra insuficiente explícita (denominador zerado → `null`).
- Identidade por `teamId`/`playerId` nos agregados; camisa permanece rótulo.
- Testes dirigidos: 8 testes de snapshot/agregação histórica + 1 teste de migração v5 e persistência
  no IndexedDB; `npm run typecheck` e `git diff --check` passam.

- Macro 20 Packages 20C–20D: one canonical court geometry now normalizes pointer coordinates,
  converts displayed orientation, derives zones from the active `ZoneSystemProfile`, and rejects
  persisted coordinates outside `0..1` while preserving zone-only scouts.
- One non-persisted `SpatialProjection` consumes effective `ScoutEvent` data and exposes samples,
  density, aggregated trajectories, and origin-by-target matrices through `MatchReportModel.spatial`.
- The match summary now includes attack-target, serve-target, and reception-contact heatmaps,
  aggregated trajectory maps, an origin × target matrix, textual summaries, and equivalent tables.
- Correction/undo changes the effective spatial projection naturally; typed, visual, and hybrid
  capture still share the canonical event pipeline, JSON keeps coordinates/input mode, and IndexedDB
  remains at version 4.
- Economic gate evidence: the two directed geometry/projection tests and the combined report/UI
  correction-and-undo flow pass; `npm run typecheck` and `git diff --check` pass.

- Macro 20 Package 20B: profile-driven `VisualScoutMapper` creates canonical serve, reception,
  attack, and block candidates without invoking the text parser or inventing optional metadata.
- Hybrid capture keeps the typed core authoritative, enriches only missing tactical fields, reports
  explicit team/player/skill/evaluation conflicts, and creates exactly one canonical event.
- The scout UI now switches between Typed, Visual, and Hybrid capture while reusing the roster,
  tactical court/details, and `ExpectedNextAction` only as a suggestion.
- Team-specific roster resolution rejects missing teams and athletes from the opposing roster;
  continuous typed framing, keyboard entry, and Enter commit remain operational.
- Directed evidence: 30 domain/application tests plus 3 integration/UI flows passing; TypeScript,
  targeted ESLint, and targeted Prettier checks passing.

- Macro 20 Package 20A: `ValidateAndCreateScoutEventUseCase` now owns attack-origin derivation,
  validation, completeness, and `ScoutEvent` creation from a canonical candidate.
- The typed register path retains normalization/tokenization/parsing/mapping and delegates to the
  common boundary without changing its diagnostics or generated volleyball data.
- New events record `inputMode` and `normalizedCode`; missing legacy `inputMode` resolves to `typed`
  without an IndexedDB migration or history rewrite.
- Directed evidence: 12 registration/common-pipeline/JSON tests passing; TypeScript, targeted ESLint,
  and targeted Prettier checks passing.

- Recharts 3.10.1 visual layer for team performance, rotations, setter distribution, attack
  evenness, and setter repetition.
- Setter-distribution filters backed by real setter, reception, set, and rally-phase dimensions.
- Text summaries and auditable tables paired with every chart; existing detailed report tables remain.
- Responsive chart containers, keyboard-enabled Recharts accessibility, and live-region tooltips.
- Attack-direction set dimension and Attack Evenness observed/reference breakdown preserved in the
  shared report model.

- Expected Sideout and Expected Breakpoint using explicit empirical references, with unavailable
  results instead of arbitrary fallback weights.
- Attack Evenness against explicit attacker-share references, with team, rotation, setter-position,
  phase, and reception-quality scopes.
- Setter Repetition derived from ordered attacks for overall, after-point, after-error,
  after-blocked, and within-rally categories.
- Setter Attack Conversion grouped by derived setter, P1–P6, attacker, reception quality, phase,
  and attack combination, without synthetic set events or assist terminology.
- Advanced analytics integrated into the shared report model, statistics CSV, and six-page PDF.

- V3 repository audit covering canonical input, effective event replay, derived setter context,
  normalized court coordinates, analytics/reporting, IndexedDB v4, and export boundaries.
- V3 canonical decisions for a shared visual-input pipeline, attack-derived setter context, and
  rebuildable analytics snapshot caches.
- Explicit no-video scope and third-party reference/license inventory for planned advanced,
  visual, spatial, and historical analytics.
- Baseline repair aligning one stale E2E with inferred attack origin and making Prettier compatible
  with the Windows checkout line endings, without changing application behavior.

- User-authorized local directory connection through the File System Access API with unsupported
  browser fallback to the existing individual downloads.
- One user-triggered subdirectory per export, named with both teams and the local date/time.
- Complete four-file package containing restorable JSON, effective scout CSV, raw-code TXT, and a
  dedicated set-score CSV for every played set, including five-set matches.
- Summary set scoreboard and explicit connected-folder state; no automatic external write.
- Persistent Free Log sessions accepting arbitrary text without parser, score, or match rules, with
  CSV/TXT exports.
- IndexedDB schema v4 adding Free Log storage and defensively ensuring required stores/indexes during
  upgrades from older local schemas.
- Playwright coverage for directory authorization, package contents, Free Log input, and reload.

- Separate operator metrics for accuracy, speed, completeness, correction rate, correction count,
  and tactical detail rate with captured/expected audit totals.
- Eight advanced exercise families: serve zones, serve direction, reception, attack direction,
  setter call, attack combination, rotation, and complete rally.
- Complete-rally exercises framed as three continuously typed contacts and validated through the
  same scout registration pipeline.
- Tactical exercise prompts with profile-derived locations, directions, calls, combinations, and
  rotations instead of hard-coded parser behavior.
- Browser flow coverage for redo, JSON export/restore, tactical analytics, and advanced operator
  metrics, alongside existing idle commit, late enrichment, reload, migration, and 5,000-event tests.

- Twenty-four tactical domain metrics for serve, reception, attack, setter distribution, sideout,
  breakpoint, and transition.
- Auditable metric breakdowns preserving numerator, denominator, category counts, and formula
  components before presentation formatting.
- Correction/undo-aware tactical statistics calculated from the effective event stream and the pure
  rally-context projection.
- Team and group filters plus zone matrices, direction maps, and distribution tables in the summary.
- Artificial-rally formula coverage for distributions, reception pressure, attack efficiency, setter
  linkage, and rally phase rates.

- Configurable `CodeProfile.tacticalInput` contracts for all eight tactical input dimensions.
- Profile-defined prefixes, value aliases, zone systems, and keyboard shortcuts with validation.
- Quick Tactical Editor interpreting compact commands and returning focus to continuous scout input.
- Keyboard-only complete Tactical capture through configurable `Alt+T` and `Alt+S` shortcuts.
- Zone-profile-driven court with origin/target selection and synchronized accessible form controls.
- Drawn court trajectories stored as normalized coordinates with `captureMethod: drawn`.
- Transient TacticalCaptureDraft removed by SemanticMapper before IndexedDB/JSON persistence.
- Custom profile editor serialization for optional tactical input configuration.

- Pure `RallyContextResolver` projection over the correction/undo-aware effective event stream.
- `ReceptionContextResolver` propagating explicit or derived reception quality to the related attack.
- `RallyPhaseResolver` deriving sideout, breakpoint, and transition with explicit metadata override.
- `ExpectedNextAction` suggestions for the active sequence, cleared by terminal rally results.
- Tactical rally projection with serving team and setter rotation position for each team/contact.
- MatchWorkspace integration with identical contextual results live and after IndexedDB replay.
- No synthetic contextual events; canonical persisted actions remain the only source of truth.

- Tactical metadata schema 2.0.0 with court locations, ball trajectories, and skill-specific data.
- Versioned zone profiles with aliases and configurable direction rules; explicit directions win.
- Configurable setter-call and attack-combination dictionary contracts.
- One V1/V2 adapter used by mapping, completeness, validation, CSV, statistics, and scout reediting.
- IndexedDB schema v3 migration that enriches legacy scouts and corrections without deleting V1 fields.
- Master JSON round trip preserving V2 tactical metadata, coordinates, trajectories, and configured values.

- Capture requirements classified as blocking, recommended, optional, or derived.
- `CompletenessEvaluator` kept separate from blocking `ValidationEngine` results.
- Immutable complete/partial snapshots with ordered missing-recommended-field diagnostics.
- Tactical core events persisted without origin, target, direction, or skill type.
- Compact partial feedback and completion action in the scout history.
- Late metadata enrichment through the existing auditable correction event.
- Enrichment undo, redo, export, reload, and deterministic replay coverage.

- Profile-driven `InputBuffer`, `ScoutCodeFramer`, and `ContinuousInputController` pipeline.
- Incremental empty, prefix, core-complete, enriching, complete, and invalid candidate states.
- Unambiguous next-event-prefix framing for concatenated scout codes.
- Configurable idle auto-commit with optional manual Enter commit.
- Sequential async persistence queue that preserves fast-input order without dropping contacts.
- Editable invalid/incomplete buffers with backspace recovery and no ghost events.
- Live buffer-state feedback in the scout UI; correction mode remains explicitly manual.

- Automatic rally outcome resolution into explicit, replayable `rally_result` events.
- Automatic score, serving-team transition, clockwise slot rotation, rally close, and set finish.
- Configurable indoor set targets, minimum lead, deciding set, and sets-to-win rules.
- Match roster with jersey resolution, active status, names, and match-scoped libero designation.
- Set lineups with six tactical slots independently mapped to P1–P6 and occupied by players.
- Scout context snapshot with player, tactical role, slot, and current rotation position.
- Explicit lineup confirmation and substitution events; substitutions preserve slot role and order.
- New-match UI for named rosters, optional libero, tactical slots, P1–P6, and initial serving team.
- Live scout UI for current serving team, server, both rotations, and six court occupants.
- Manual points retained only as audit events for controlled operational correction.
- Backward-compatible lineup bootstrap for existing matches without lineup events.

- Vite and React application shell.
- TypeScript strict configuration.
- Vitest and Testing Library smoke test.
- ESLint and Prettier configuration.
- Planned source and documentation folder structure.
- Project context and pipeline architecture documentation.
- Canonical contracts for skills, score, scout events, validation, metrics, and four profile types.
- Typed IDs, semantic versions, results, and profile errors.
- ProfileValidator, ProfileRegistry, and ProfileResolver.
- Default compact code profile, four complexity profiles, and versioned CBV reference profile.
- Eight-stage original roadmap, Evolution V2 roadmap, and eight architecture decision records.
- Profile-driven Normalizer, Tokenizer, Parser, and SemanticMapper.
- Syntax, complexity-profile, roster, and sequence validators with ok/warning/error severity.
- EventFactory and application use case for the complete scout-input pipeline.
- Immutable correction, undo, and redo history with raw input preservation.
- Typed ParseError and ValidationError failure paths.
- Repository ports for matches, events, teams, players, profiles, and training sessions.
- IndexedDB database and repository adapters with isolated object stores.
- Immediate persistence use case for confirmed scout events.
- Match, set, score, serving-team, and rally state contracts.
- Pure MatchReducer, tolerant RallyReducer, and deterministic replay.
- CreateMatch and OpenMatch application use cases.
- Home, new-match, scout, and summary screens with responsive keyboard-first UI.
- Team and player setup with Basic or Operational profile selection.
- Continuous scout input, team context, visible history, score controls, and set progression.
- Persistent correction, undo, and redo projections that survive database reload.
- Enter, Escape, Ctrl+Z, Ctrl+Shift+Z, and ArrowUp input behaviors.
- Versioned JSON export with profile snapshot and round-trip schema validation.
- Application service coordinating UI flows without moving domain rules into components.
- MetricDefinition, MetricRegistry, StatisticsEngine, scoped queries, and MetricResult pipeline.
- Basic attack, serve, reception, and block metrics with unavailable-result handling.
- Versioned CBV 2025/26 attack, serve, pass, block, efficiency, and scorer metrics.
- Rally-aware serve efficiency that relates a serve to the next reception in the same rally.
- Artificial-data formula tests for attack, serve, reception, and block definitions.
- Tactical and Advanced metadata capture for zones, direction, rotation, lineup, setter, tempo,
  combination, blockers, substitutions, phase, and transition.
- Tactical/Advanced tolerant range validation and rally phase classifier.
- Basic, Operational, Tactical, Advanced, and CBV match profile selection.
- Statistics dashboard fed exclusively by application ViewModels over MetricResult arrays.
- TrainingSession, TrainingExercise, TrainingAttempt, TrainingComparator, TimingEngine, and
  TrainingPerformanceMetrics domain modules.
- Situation-to-code exercise generation driven by CodeProfile and TrainingProfile data.
- Training submissions routed through the real scout normalization, tokenization, parsing,
  semantic mapping, and validation pipeline.
- Independent player, skill, evaluation, and syntax error classification.
- Accuracy, average time, median time, events per minute, and error-count metrics.
- Six selectable training modes: Basic, Operational, Tactical, Advanced, CBV, and Custom.
- CBV training preserved as a composition of training, tactical complexity, and competition profiles.
- Persistent IndexedDB training sessions with resume, attempt history, feedback, and final summary.
- Responsive training setup, exercise, feedback, live progress, history, and result screens.
- Derived CSV export with one row per effective canonical scout event and the specified audit columns.
- Raw-code TXT sequence export alongside the existing versioned master JSON round trip.
- ProfileEditorService with JSON mapping validation, ProfileValidator integration, registry activation,
  IndexedDB persistence, and reload hydration.
- Profile editor UI for skills, evaluations, aliases, grammar/required fields, identity, and version.
- Downloadable serialized CodeProfile configurations and selection of custom profiles in new matches.
- PWA manifest, theme metadata, SVG plus 192/512 PNG icons, and service-worker registration.
- Service worker app-shell installation that discovers hashed production assets and provides an offline
  navigation fallback after the first load.
- IndexedDB schema v2 with an explicit, data-preserving v1→v2 migration and safe version-change close.
- Immediate autosave plus tested recovery by closing, reopening, and replaying the canonical event log.
- Deep JSON backup validation for schema, profiles, references, event identity, and sequence uniqueness.
- Atomic JSON backup restoration for match, teams, players, profiles, and the complete event stream.
- Backup restoration control on the home screen with automatic opening of the restored match.
- Bulk IndexedDB event insertion and a 5,000-event persistence, projection, and metrics test.
- Linear correction/undo-aware timeline projection and history rendering in batches of 200 events.
- Playwright critical-path test in Chrome covering creation, scout, correction, undo, reload recovery,
  JSON download, and a training attempt.

## Tests

- `npm run test`: 274 tests passing, 0 failing.
- `npm run test:e2e`: 7 critical Playwright flows passing in Chrome.
- `npm run lint`: passing.
- `npm run typecheck`: passing.
- `npm run build`: passing.
- `npm run format:check`: passing.
- Development server smoke check: HTTP 200 and expected application root returned.

## Architectural decisions

- The UI shell lives under `src/ui` and contains no domain logic.
- Future dependencies must flow from UI to application to domain.
- Pipeline documentation is explicitly prospective until its owning phases are implemented.
- Technical phases 0–22 remain internal checklists grouped into eight operational macro stages.
- Profiles are data-driven, versioned, and separated by responsibility.
- The profile registry supports new code profiles without importing or changing a parser.
- The tokenizer consumes profile grammar and mappings rather than hard-coded sport semantics.
- Roster absence is a warning; structural and required-profile failures are blocking errors.
- Event creation occurs only after validation and preserves the exact raw input.
- IndexedDB is confined to infrastructure behind application repository ports.
- Score, set, serving team, and rally changes are explicit match events.
- Match state is a projection rebuilt from metadata plus the ordered event stream.
- Event storage enforces a unique sequence per match.
- Correction, undo, and redo remain immutable match-stream actions.
- Invalid scout input is fully validated before a rally or event is persisted.
- UI components consume application outputs and do not parse codes or calculate match state.
- JSON is the master export and includes schema version, metadata, teams, players, profiles, and events.
- Statistical values use ratios from 0 to 1; only the ViewModel formats percentages.
- Statistics consume the effective corrected/undo-aware timeline, never the raw event log directly.
- Competition metric formulas live in domain definitions and are selected by versioned profile IDs.
- Training reuses RegisterScoutEventUseCase and never introduces a second parser.
- Feedback pauses the next exercise timer until the operator explicitly continues.
- Training metrics are calculated in the domain and formatted by an application ViewModel.
- JSON remains the master match format; CSV and TXT are projections of the effective timeline.
- Custom profiles are serialized data persisted behind ProfileRepository, never generated TypeScript.
- The runtime registry is shared by match, training, and editor services and hydrated from IndexedDB.
- The service worker is isolated in infrastructure and does not leak browser APIs into the domain.
- Database upgrades are ordered migrations; imported backups are validated before one atomic write.
- Large histories are projected in linear time and only 200 effective events enter the DOM per batch.
- Continuous framing uses only `CodeProfile` structure and feeds each frame into the existing parser.
- Recommended capture fields affect completeness feedback but never blocking validity.
- Late enrichment is represented by the existing immutable correction history, not in-place mutation.
- IndexedDB remains the live source of truth; directory writes are explicit portable snapshots.
- JSON is the restorable master inside each folder package; CSV/TXT are derived human-readable files.
- Free Log intentionally bypasses scout parsing and match rules while remaining isolated and persisted.

## Pending

- Evolution V3 Macro 21 — tendências (séries de equipe/atleta alimentadas pelo
  `HistoricalAnalyticsService`) e Opponent Profile (21C + 21D), + atualização de ROADMAP, PROJECT
  CONTEXT, PIPELINES, CHANGELOG e versão `0.3.0`.

## Known debt

- Full libero replacement rules and competition-specific substitution limits remain intentionally
  deferred until they have dedicated profile contracts and tests.
- Custom training currently uses a versioned general-purpose preset; linking custom TrainingProfiles
  to the editor remains outside the CodeProfile editor scope.

## Next phase

Continue Evolution V3 Macro 21 by the tendências/Opponent Profile execution (21C + 21D) according
to the two-week economic plan. The base histórica (v5 migration, snapshots, historical aggregation
and references) is functionally complete. IndexedDB is now at v5. The package version remains
`0.2.0` until the final release execution sets `0.3.0`.
