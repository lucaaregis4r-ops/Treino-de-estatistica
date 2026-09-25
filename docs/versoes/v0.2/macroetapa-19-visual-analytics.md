> **Versão/escopo:** 0.2 — macroetapas; V3 Analytics é nome de evolução, não release 0.3.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Macroetapa 19 — Visual Analytics

## Resultado

O resumo da partida agora apresenta uma camada visual responsiva sobre o mesmo `MatchReportModel`
usado pelas exportações. Recharts 3.10.1 é a única nova dependência de runtime desta macro.

## Hierarquia e componentes

A leitura segue a ordem: placar e resumo, performance das equipes, atletas, rotações, levantador e
tabelas detalhadas. A pasta `src/ui/screens/summary/charts` contém:

- `TeamPerformanceChart`: comparação das métricas gerais das equipes;
- `RotationPerformanceChart`: sideout, breakpoint, eficiência de ataque e recepção positiva em
  P1–P6;
- `SetterDistributionChart`: volume ofensivo empilhado por P1–P6, com filtros por levantador,
  recepção, set e fase;
- `AttackEvennessChart`: índice por posição do levantador, volume e distribuição observada versus
  referência;
- `SetterRepetitionChart`: repetição geral, após ponto, erro e bloqueio, sempre com oportunidades;
- `AnalyticsTooltip`: tooltip comum com valor formatado e numerador/denominador quando aplicável.

## Auditoria e acessibilidade

Cada gráfico possui título, resumo textual e tabela auditável. Os gráficos não substituem os dados
tabulares existentes. Os contêineres têm descrição acessível, a navegação de gráficos do Recharts
permanece ativa e o tooltip usa região `status` com `aria-live="polite"`.

O relatório passou a preservar o número do set em cada agrupamento de direção de ataque e o
breakdown observado/referência de Attack Evenness. Isso permite filtros reais e evita recomputar ou
inventar valores na UI.

## Limites

Mapas de quadra, heatmaps, modo visual/híbrido de captura e analytics espacial pertencem à Macro 20.
Histórico multi-partida e referências persistentes pertencem à Macro 21. A versão permanece `0.2.0`
até a conclusão integral da V3.
