# Referências e decisões técnicas da 0.6

## Regras e tática

| Fonte pesquisada | Implicação para o scout |
|---|---|
| [FIFA, *Futsal Laws of the Game 2025–26*](https://www.the-aiff.com/media/uploads/2025/09/Futsal-Laws-of-the-Game-2025-2026_EN.pdf), leis 1, 3, 6, 7 e 13 | Quadra própria; cinco atletas por equipe; substituições permitidas durante o jogo; dois períodos de 20 minutos de tempo efetivo; relógio parado nas interrupções; faltas acumuladas por período e tiro livre a partir da sexta. A edição aplicável à competição deve ser confirmada antes de automatizar qualquer regra. |
| [Méndez et al., 2019, perfis ofensivos em ligas de elite](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.01370/full) | Estudo observacional de 56 partidas de playoffs em Portugal, Espanha e Rússia classifica ataque posicional, contra-ataque, bola parada e goleiro-linha. Categorias úteis para descrição; perfis variaram entre ligas e resultados, logo não são benchmarks universais. |
| [Amatria et al., 2021, sequências ofensivas que terminaram em gol](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.578332/full) | Observação sequencial de duas ligas identificou padrões distintos. Separar tipo de ataque de resultado e não generalizar os padrões de gol para todas as competições ou para posses sem gol. |
| [Rigon, Talarico e Drezner, 2026, revisão de escopo](https://sjsp.aearedo.es/index.php/sjsp/article/view/goal-scoring-futsal-scoping-review?articlesBySimilarityPage=12) | Evidência predominantemente observacional/descritiva: relatórios devem mostrar amostra, cobertura e evitar linguagem causal. |
| [Alves et al., 2021, revisão técnico-tática](https://rsdjournal.org/rsd/article/view/20450) e [validação de categorias do goleiro](https://revistas.usp.br/rbefe/en/article/view/205368) | Manter defesa, goleiro e bola parada disponíveis na revisão, sem sobrecarregar a tela ao vivo. |

## xG no futsal

**O conceito de xG pode ser aplicado ao futsal.** Há trabalho específico em andamento, inclusive um [estudo de 2026 sobre vantagem na finalização](https://www.sciencedirect.com/science/article/pii/S3051268926000152) que propõe categorias observacionais para futura integração com modelos xG. Isso não valida automaticamente o modelo atual do projeto.

Em `src/domain/football/FootballModels.ts`, `estimateXg()` converte as posições para um campo de **105 × 68 m** e aplica os coeficientes de `reference/football-models/xg.json`. O artefato declara treino com **StatsBomb Open Data da Copa do Mundo masculina de futebol de campo de 2022** e avisa que não foi validado para outras populações. Uma quadra de futsal tem geometria, baliza, dinâmica de chute e contextos de goleiro-linha diferentes. Reescalar o ponto na quadra e aplicar os mesmos coeficientes produziria um número sem validação para futsal.

**Decisão da 0.6:** não chamar `estimateXg()`, `estimateXt()` ou `attributeChances()` na análise de futsal; não exibir xG, xGA, xT ou ΔxT em resumo, PDF, CSV ou tooltips de futsal. Mostrar mapa de chutes observados, resultado, gols/chutes e posses com chute, sempre com denominador e cobertura. Se no futuro houver amostra própria de finalizações de futsal, criar modelo e versão separados, com definição de eventos, partição treino/validação, calibração, Brier/log loss e limites por competição/gênero/faixa etária antes de habilitar o rótulo xG.

## Definições operacionais mínimas

- **Posse/controlado:** equipe com controle observado; disputa, bola parada e desconhecido são estados diferentes.
- **Transição ofensiva:** recuperação e ataque antes da reorganização defensiva observadas pelo operador; sem limiar de segundos inferido.
- **Bola parada:** origem identificada (lateral, escanteio, tiro livre, tiro de 10 m, pênalti, arremesso de meta, saída); origem não define resultado.
- **Goleiro-linha:** situação tática observada, com início/fim próprios; não supor a partir da posição da bola.
- **Falta acumulada:** somente quando marcada como tal pelo operador conforme decisão da arbitragem; a aplicação não concede automaticamente tiro livre nem altera placar.
- **Substituição:** troca observada de atletas identificados; deve poder ser corrigida ou desfeita e não mudar posse, placar ou relógio por si.
- **Revisão M6:** vincular etiqueta tática a um evento observado ou ao intervalo entre dois eventos ordenados; ausência de etiqueta não equivale a `não observado`. Reclassificação e remoção mantêm trilha auditável. Categorias descrevem o contexto registrado e não atribuem causalidade ou expectativa de sucesso.
