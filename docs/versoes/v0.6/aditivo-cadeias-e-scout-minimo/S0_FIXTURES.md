# S0 — fixtures de contrato para S2–S5

Cada fixture deve guardar eventos/fatos de entrada, IDs de origem, unidades projetadas, cobertura, desfechos e denominadores esperados. Os casos abaixo são nomes estáveis para implementar em S2; os testes de domínio desta S0 cobrem desarme, trajetória e desfazer.

| Fixture | Entrada mínima | Resultado esperado |
|---|---|---|
| `rally_01_unico` | 1 contato, vencedor conhecido | 1 rally completo; 1 contato; `n=1` global |
| `rally_08_alternado` | 8 contatos de dois lados | 1 rally, 8 estados em ordem; 1 unidade por perspectiva |
| `rally_20_longo` | 20 contatos, vencedor conhecido | 20 estados exportados; nenhum corte em 2/3 |
| `rally_aberto` | Contatos sem vencedor | 1 incompleto; fora da taxa de vitória |
| `futebol_01_direto` | A controla, uma ação, B controla | 2 posses; A fechada, B aberta; sem disputa sintética |
| `futebol_09_longo` | A controla, 9 ações, B controla | 9 ações de A na ordem; 1 posse A no denominador |
| `futebol_rebote` | A chuta, defesa, A chuta de novo | 1 posse A se controle contínuo observado; 2 chutes |
| `futebol_desarme` | A controla, B desarma em 1 ponto | Controle final B; A fechada; campo mantém orientação do período |
| `futebol_gol_contra` | A finaliza, gol para B | Posse de A termina; placar de B cresce; sem posse presumida de B |
| `futebol_lacuna` | A controla, cobertura suspensa | Posse censurada; tempo posterior não atribuído a A |
| `futsal_desarme` | A controla, B desarma em 1 ponto | B controla sem marco de disputa; desfazer restaura A |
| `futsal_chute_trajetoria` | A finaliza com 2 pontos | Origem e destino preservados; mapa de chutes usa origem |
| `futsal_posse_aberta` | A controla, 1 ou 9 ações, fim da captura | Posse aberta/censurada; não entra em taxa de conclusão |
| `periodo_no_meio` | Controle A no 1º, controle B no 2º | Nunca atravessar o período; orientação vira apenas na troca |
| `correcao_limite` | Corrigir/desfazer controle ou desarme | Reprojeção altera fronteira; nenhum ID de ação duplicado |

Para cada taxa de S3, registrar `n` por unidade, número de censuras e filtro. A mesma ocorrência pode aparecer nas perspectivas A e B, mas o `sample.n` global do vôlei deve usar IDs de rally distintos. A contagem de padrões repetidos dentro de um rally/posse não aumenta `n` de unidades.
