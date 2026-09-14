# Third-Party Notices

Este arquivo registra referências externas aprovadas para a evolução V3 do Scout Trainer. A
Macroetapa 18 incorporou adaptações TypeScript próprias dos conceitos identificados abaixo; nenhum
runtime ou código R é distribuído pelo aplicativo.

## Projetos sob licença MIT

### openvolley/ovlytics

- Projeto: <https://github.com/openvolley/ovlytics>
- Licença: MIT, conforme o arquivo `LICENSE` do projeto upstream.
- Referências utilizadas na Macro 18: `R/attack_evenness.R` (`rescale1`, `aev_f`,
  `ov_aev_reference_props`), `R/setting.R` (`ov_setter_repetition`) e `R/plotting.R`
  (`ov_heatmap_kde`).
- Adaptações atuais: distância normalizada do Attack Evenness e contagem de oportunidades/repetições
  do levantador sobre ataques. `ov_heatmap_kde` permanece apenas planejado para a Macro 20.
- Copyright upstream informado: 2024, the ovlytics package authors.
- Uso: implementação TypeScript própria, preservando este aviso de atribuição.

### openvolley/ovscout2

- Projeto: <https://github.com/openvolley/ovscout2>
- Licença: MIT, conforme o arquivo `LICENSE` do projeto upstream.
- Referências planejadas: `R/canvas.R`, `R/scout_input.R`, `R/scouting_utils.R` e
  `R/prior_player_skill.R`.
- Uso permitido no plano: padrão de interação e coordenadas normalizadas. Módulos de vídeo estão
  expressamente fora do escopo.

### recharts/recharts

- Projeto: <https://github.com/recharts/recharts>
- Licença: MIT, conforme o arquivo `LICENSE` do projeto upstream.
- Versão distribuída: 3.10.1.
- Uso atual: dependência de runtime dos gráficos responsivos e acessíveis da Macro 19.
- Copyright upstream informado: 2015–2025, Recharts Group.

### Makaron950/volley-workspace-public

- Projeto: <https://github.com/Makaron950/volley-workspace-public>
- Licença: MIT, conforme o arquivo `LICENSE` do projeto upstream.
- Referência planejada: `v_compare.py`.
- Uso permitido no plano: arquitetura conceitual de comparação, cache, perfis e agregação,
  reimplementada em TypeScript/IndexedDB; Python, Pandas, Streamlit e SQLite não serão adicionados.

## Referências sem licença confirmada para cópia

### openvolley/volley-analytics-snippets

- Projeto: <https://github.com/openvolley/volley-analytics-snippets>
- Referência utilizada na Macro 18: metodologia de Expected Sideout e Expected Breakpoint em
  `40-stats.Rmd`. `50-court-plots.Rmd` permanece planejado para a Macro 20.
- Restrição: usar somente metodologia, fórmulas e nomenclatura; não copiar código literal.

### Salahalioui/volley-insights

- Projeto: <https://github.com/Salahalioui/volley-insights>
- Referência: `src/components/StatScreen.vue`.
- Restrição: usar somente inspiração visual; não copiar Vue, funções ou estilos.

## Manutenção deste aviso

Toda adaptação futura deve registrar a origem, o arquivo/função consultado e a licença vigente no
momento da incorporação. Os textos completos das licenças aplicáveis devem acompanhar qualquer
trecho distribuído quando a licença assim exigir.
