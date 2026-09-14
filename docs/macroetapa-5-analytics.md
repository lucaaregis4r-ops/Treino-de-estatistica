# Macroetapa 5 — Analytics por atleta, rotação e levantador

## Resultado

Os eventos efetivos da partida agora geram um `MatchReportModel` independente da interface. O modelo reúne box score por atleta, sideout, breakpoint, desempenho por rotação, direcionamento de ataque e distribuição do levantador com numeradores e denominadores auditáveis.

## Pipeline

```text
MatchEvent[]
  → projeção dos scouts efetivos
  → RallyContextResolver
  → MatchAnalyticsService + StatisticsEngine
  → MatchReportModel
  → SummaryScreen
```

Correções, undo e redo alteram a projeção efetiva; ao recarregar o workspace, o relatório é integralmente reconstruído. Nenhum total analítico é persistido e nenhuma regra estatística é calculada pela UI.

## Box score por atleta

Para cada atleta e equipe, o relatório expõe:

- ataque: volume, pontos, erros, bloqueados, continuidade, ponto %, erro %, bloqueado % e eficiência;
- saque: volume, aces, erros, continuidade, ace %, erro % e eficiência;
- recepção: volume, A, B, C, erros, positiva % e excelente %;
- bloqueio: pontos, toques, erros e pontos por set participado.

As taxas usam `AuditableMetric`, que sempre contém `value`, `numerator` e `denominator`. Quando não existe volume, `value` é `null` e o denominador permanece zero.

## Sideout e breakpoint

O `MatchReportModel` contém recortes por:

- equipe;
- atleta — recebedor no sideout e sacador no breakpoint;
- set;
- rotação P1–P6.

Sideout considera rallies nos quais a equipe recebia o saque. Breakpoint considera rallies nos quais ela sacava. O vencedor e a equipe sacadora vêm da projeção de rallies derivada dos eventos.

## Direcionamento e levantador

Cada grupo de ataques preserva:

- atleta e equipe;
- identidade e posição atual do levantador;
- origem, destino e direção;
- tipo e combinação;
- fase;
- qualidade da recepção anterior;
- quantidade de bloqueadores;
- volume, pontos, erros, bloqueados e eficiência auditável.

`setterPosition` é lida do contexto capturado no evento ou, para compatibilidade, da projeção do lineup vigente naquele contato. Ela nunca usa simplesmente a posição inicial do set.

O drill-down de `MatchAnalyticsService.queryAttacks` aceita todas essas dimensões simultaneamente. A distribuição do levantador agrega atleta, zona e combinação por posição P1–P6 e qualidade da recepção.

## Interface

O resumo da partida recebeu:

- box score por atleta;
- tabela `Rotação | Sideout | Breakpoint | Atq Ef. | Rec+ | Ace | Erro`;
- filtros de equipe, atacante e posição P1–P6 do levantador;
- tabela de origem, destino, direção, volume, eficiência e distribuição.

Os títulos das células percentuais exibem a fração numerador/denominador usada no cálculo.

## Cobertura

Os testes incluem uma rotação completa com P1–P6 e verificam:

- ataque, saque e recepção por atleta;
- sideout 6/6 e breakpoint 3/6;
- uma linha de análise para cada rotação;
- matrizes separadas por posição atual do levantador;
- drill-down simultâneo por todas as dimensões táticas;
- igualdade do relatório antes e depois de fechar/reabrir o banco;
- recalculo após correção, undo e redo;
- presença do painel analítico nos testes de fluxo e E2E.
