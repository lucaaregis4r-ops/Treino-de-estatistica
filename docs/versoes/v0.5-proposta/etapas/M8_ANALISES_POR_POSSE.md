# M8 — Análises compatíveis com a nova coleta

> **Roteiro vigente para o Terra (22/09/2026):** [implementacao-terra](../implementacao-terra/README.md). Este documento preserva a especificação anterior; sua ordem e seus prompts M/R/A foram substituídos pelas etapas T01–T12. Não executar os dois roteiros. Consulte o ESTADO vigente.

**Versão:** 0.5 proposta. **Modalidades do pacote:** vôlei e futebol; fluxo de posse exclusivo do futebol. **Dependências:** M7.

## Leitura mínima e limite da rodada

Leia ` AGENTS.md` na raiz, [LEIA_PRIMEIRO.md](../LEIA_PRIMEIRO.md), [ESTADO.md](../ESTADO.md), este arquivo e os trechos de código indicados abaixo. Consulte [MAPA_TECNICO.md](../MAPA_TECNICO.md) se precisar localizar dependências. Não ler/executar todos os planos históricos. Execute somente M8; preservar alterações existentes e atualizar ESTADO.md antes de encerrar.

## Objetivo

Mudar as perguntas do painel do novo modo para posse, progressão observada, desfecho e finalização, com cobertura explícita.

## Leitura de código

`src/ui/screens/summary/FootballAnalyticsPanel.tsx`, `FootballPitchPlot.tsx`, `FootballPressureResponsePanel.tsx`, `src/domain/football/FootballAnalytics.ts`, `FootballMarkovAnalyzer.ts`, `FootballModels.ts`, projeção de M4.

## Entregas

- Mapas de início observado, origem da perda quando conhecida, recuperação adversária e chutes, com camadas nomeadas sem misturar coordenadas de significados diferentes.
- Posses com chegada controlada observada por terço/área, máxima zona observada e caminhos de zonas. Não inferir acesso controlado a zonas intermediárias cruzadas por um segmento.
- Posses com ≥1 chute / posses elegíveis e chutes por posse; rebotes contam como chutes distintos na mesma posse. Separar início/fim conhecidos e cobertura espacial.
- Comparar desfechos por saída e episódios de pressão com amostra, desconhecidos e contexto comparável. Uma posse pode ter vários episódios: mostrar denominadores de episódios e posses separadamente.
- Perda seguida de chute na posse adversária seguinte quando continuidade for conhecida; associação temporal não prova responsabilidade causal.
- Posse temporal somente em intervalos continuamente acompanhados quanto ao controle. Mostrar tempos A/B, disputa, parada e lacunas; percentual A/B usa tempo controlado conhecido, com cobertura ao lado.
- Mapa territorial por número de posses com presença observada na zona, uma contagem por posse/zona. Não chamar frequência de cliques de tempo de ocupação.
- Ao clicar em indicador, abrir evidências da sequência/posse e permitir revisão.

## Limites obrigatórios

Não calcular passes totais, acerto de passe, rede de passe, distância conduzida, PPDA ou taxa individual de erro a partir de marcos. Não reaproveitar ΔxT de passe/condução como se fosse calculado para uma ação observada. xG existente mantém fonte/versão/cobertura. Não inferir quebra de linha apenas pela bola: posição defensiva não foi medida.

Markov, se incluído, deve chamar-se transições entre estados observados, separar protocolos/modos e não comparar diretamente coleta densa e esparsa como equivalentes. Pode ficar para depois se não for necessário às entregas acima. Filtros selecionam posses/evidências sem ligar pontos separados por lacunas ou ações ocultas.

## Aceite e verificação

Fixtures pequenas com resultados calculáveis à mão: uma posse com dois chutes; duas perdas com locais diferentes; zona marcada repetidamente; posse parcial; pressão desconhecida; intervalo suspenso; modos mistos. Verificar denominadores, zero versus indisponível e links para evidência. Testes focados, typecheck e inspeção visual.

## Prompt para o Luna

```text
Leia docs/COMECE_AQUI.md, docs/versoes/v0.5-proposta/LEIA_PRIMEIRO.md,
docs/versoes/v0.5-proposta/ESTADO.md e docs/versoes/v0.5-proposta/etapas/M8_ANALISES_POR_POSSE.md.
Execute somente M8, respeitando suas dependências e o checkout atual.
Preserve as alterações existentes e os dados. Verifique os critérios de aceite,
registre evidências e pendências em ESTADO.md e não inicie a etapa seguinte.
```
