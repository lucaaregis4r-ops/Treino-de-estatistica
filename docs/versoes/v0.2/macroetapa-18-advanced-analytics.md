> **Versão/escopo:** 0.2 — macroetapas; V3 Analytics é nome de evolução, não release 0.3.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Macroetapa 18 — Advanced Volleyball Analytics

## Resultado

O `MatchReportModel` agora contém cinco famílias de analytics avançado calculadas sobre os scouts
efetivos da partida. Nenhuma métrica depende de componentes React ou de eventos sintéticos de
levantamento.

## Expected Sideout e Expected Breakpoint

As duas métricas recebem referências empíricas explícitas por avaliação. Para cada recepção ou
saque observado, o motor associa a taxa histórica correspondente e calcula a média dessas
probabilidades.

Não existe peso arbitrário nem baseline fabricado. Quando uma avaliação observada não possui
referência adequada, o resultado retorna:

```text
available = false
reasonUnavailable = insufficient_reference_sample
```

O resultado preserva observações, soma de sucessos esperados e tamanho da amostra de referência.
Até a Macro 21, as referências são fornecidas explicitamente pelos consumidores do serviço.

## Attack Evenness

Attack Evenness compara a distribuição observada de ataques com uma distribuição de referência
explícita:

```text
AEV = 1 - soma(|observado - esperado|) / 2
```

O valor fica entre 0 e 1 e representa proximidade da distribuição esperada. Ele é indicador de
concentração/diversidade ofensiva, não uma escala universal em que maior significa necessariamente
melhor.

O relatório produz recortes por equipe, rotação, posição P1–P6 do levantador, fase e qualidade da
recepção. Sem referência ou sem ataques, o recorte fica indisponível.

## Setter Repetition

A repetição usa exclusivamente a sequência de ataques, agrupada por partida, set, equipe e
levantador ativo. Cada ataque que possui um ataque seguinte é uma oportunidade. Se o próximo ataque
for do mesmo atleta, ocorre repetição.

Categorias:

- overall;
- after_point;
- after_error;
- after_blocked;
- within_rally.

Oportunidades, repetições e taxa permanecem auditáveis.

## Setter Attack Conversion

Cada ataque é associado ao levantador derivado pelo evento ou pelo `TacticalRallyProjection`. Os
grupos preservam:

- levantador e P1–P6;
- atacante;
- qualidade da recepção;
- fase;
- combinação de ataque;
- volume, pontos, erros e bloqueados;
- kill rate e eficiência de ataque.

A métrica não usa a palavra “assistência”, pois levantamentos normais continuam implícitos.

## Relatórios e exportações

O bloco `advanced` é compartilhado por aplicação, CSV e PDF. O CSV acrescenta disponibilidade,
motivo de indisponibilidade e tamanho da referência. O PDF mantém seis páginas e apresenta um resumo
avançado antes da distribuição detalhada do levantador.

## Referências

- `openvolley/ovlytics`, `R/attack_evenness.R`: distância normalizada de Attack Evenness.
- `openvolley/ovlytics`, `R/setting.R`: repetição baseada em ataques e levantador em quadra.
- `openvolley/volley-analytics-snippets`, `40-stats.Rmd`: metodologia de Expected Sideout e Expected
  Breakpoint, sem cópia literal de código.

As adaptações são implementações TypeScript próprias. Nenhuma dependência R foi adicionada.
