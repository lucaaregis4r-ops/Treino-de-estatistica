> **Versão/escopo:** 0.45 (roadmap; correspondência SemVer proposta no pacote: 0.4.5).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

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

### Entrega integrada do Caminhos do rally

- `src/domain/analytics/markov/RallyPathAnalyzer.ts`: rallies reais, estados compostos, matriz de primeira ordem, absorção, foco e prefixos.
- `src/domain/analytics/markov/RallyPathAnalyzer.test.ts`: fixtures matemáticas de absorção, ciclo, filtros, recorrência e fluxo.
- `src/application/analytics/SequenceAnalyticsService.ts`: projeção efetiva, cache invalidado por eventos, terminal e sistema de zonas.
- `src/ui/screens/summary/SequenceAnalyticsPanel.tsx` e `.css`: explorador visual, filtros, fluxo, quadra, comparação, evidências e dados técnicos recolhidos.
- `src/ui/screens/summary/MatchAnalyticsPanel.tsx`: entrada integrada da análise com `Caminhos do rally` como seção inicial.

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
