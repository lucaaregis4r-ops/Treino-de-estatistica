# Contrato analítico da 0.45

## 1. Vocabulário

### Evento
Registro canônico existente (`ScoutEvent`).

### Rally sequence
Projeção ordenada dos contatos/eventos elegíveis de um `rallyId`.

### Estado
Categoria analítica do contato. Deve ser pequena e estável.

### Contexto
Metadados usados para filtro/segmentação. Não devem virar estado automaticamente. Inclui contexto esportivo e espacial.

### Contexto espacial
Coordenadas `x,y`, origem/destino, zona/região derivada e versão do sistema de coordenadas. É parte formal do analytics, mas não multiplica automaticamente os estados Markov.

### Transição
Par ordenado `from -> to`.

### Terminal
Resultado observável do rally para a equipe analisada:
- `terminal_win`
- `terminal_loss`

### Valor de estado
Probabilidade estimada de terminar o rally em `terminal_win` a partir daquele estado dentro da amostra e método definidos.

### Valor de transição
Mudança entre o valor esperado antes/depois da transição. Não é causalidade.

### Valor espacial
Probabilidade/valor observado para uma ação sob determinado contexto espacial comparada a um baseline equivalente.

## 2. Regras estatísticas

- Sempre retornar `n` e a unidade da amostra quando relevante (`event` ou `rally`).
- Não mostrar 0% quando a métrica é indisponível.
- Rallies incompletos não recebem vencedor inventado.
- Filtros são aplicados antes da matriz ou comparação.
- A equipe de referência deve ser explícita.
- O mesmo rally não pode ser contado duas vezes quando a unidade declarada for `rally`.
- Estados absorventes não geram novas transições esportivas.
- Matriz, padrões e mapas devem ser reconstruíveis a partir dos eventos.
- A versão do método analítico deve acompanhar exportações.
- Coordenada ausente não equivale a `(0,0)` nem a valor zero.
- Resultados espaciais comparam-se a um baseline sob os mesmos filtros esportivos sempre que possível.
- Nenhum `delta` deve ser descrito como causal.

## 3. Granularidade

### Estado principal V1
`serve | reception | attack | block | defense | free_ball | other | terminal_win | terminal_loss`

### Dimensões opcionais de filtro/contexto
`teamId | setNumber | playerId | phase | receptionGrade | setterPosition | rotation | evaluation | outcome | originZone | targetZone | originX | originY | targetX | targetY`

Não produzir automaticamente estados como:

`attack_P3_receptionA_zone4_cross_#`

ou:

`reception_x0.43_y0.71`

Isso destrói a amostra e dificulta a interpretação.

## 4. Contrato espacial

O `x,y` normalizado deve ser preservado na projeção quando já existir no evento. A região é derivada por um perfil/zone system versionado; não reescrever o evento canônico para armazenar todas as derivações.

```ts
interface SpatialContext {
  origin?: { x: number; y: number };
  target?: { x: number; y: number };
  originRegionId?: string;
  targetRegionId?: string;
  coordinateSystemVersion: string;
}
```

Três saídas são distintas:
1. Markov principal por estado;
2. Markov/valor condicionado por região;
3. superfície `x,y` agregada para mapa de valor.

Para ataques e outras ações direcionais, a trajetória `originRegion -> targetRegion` pode ser analisada sem virar o estado principal.

## 5. Resultados

```ts
interface TransitionFinding {
  id: string;
  from: SequenceStateId;
  to: SequenceStateId;
  count: number;
  probability: number | null;
  fromStatePointProbability: number | null;
  toStatePointProbability: number | null;
  deltaPointProbability: number | null;
  sampleSize: number;
  available: boolean;
  warning?: 'small_sample';
}
```

```ts
interface SequencePatternFinding {
  pattern: readonly SequenceStateId[];
  occurrences: number;
  wins: number;
  losses: number;
  pointProbability: number | null;
  liftVsBaseline: number | null;
}
```

```ts
interface SpatialRegionFinding {
  findingId: string;
  skill: string;
  spatialRole: 'origin' | 'target' | 'trajectory';
  regionId?: string;
  originRegionId?: string;
  targetRegionId?: string;
  sampleUnit: 'event' | 'rally';
  n: number;
  empiricalPointProbability: number | null;
  adjustedPointProbability?: number | null;
  baselinePointProbability: number | null;
  deltaVsBaseline: number | null;
  available: boolean;
  warning?: 'small_sample';
}
```

## 6. Amostra e suavização

Padrão inicial centralizado:
- n < 5: indisponível para ranking;
- 5–14: mostrar com aviso;
- >= 15: normal.

Para mapas/células espaciais, manter sempre o valor empírico. Pode haver uma probabilidade ajustada por baseline, desde que:
- o método seja explícito e testável;
- o parâmetro seja centralizado;
- o valor empírico continue disponível;
- n pequeno continue sinalizado.

Método simples permitido para V1:

`adjustedP = (wins + priorStrength * baselineP) / (n + priorStrength)`

## 7. Perguntas

As perguntas táticas não consultam LLM. Elas consultam os resultados acima.

A IA recebe algo semelhante a:

```json
{
  "matchId": "local-id",
  "team": "Equipe A",
  "filters": {"set": 2, "phase": "sideout"},
  "sample": {"rallies": 31},
  "findings": [
    {
      "findingId": "transition-12",
      "label": "Recepção -> Ataque",
      "n": 18,
      "pointProbability": 0.61,
      "deltaPointProbability": 0.09
    },
    {
      "findingId": "reception-target-R3",
      "label": "Recepção -> região central próxima à rede",
      "n": 17,
      "pointProbability": 0.69,
      "baseline": 0.54,
      "deltaVsBaseline": 0.15
    }
  ]
}
```

Nomes de atletas devem ser omitidos/anonimizados por padrão na chamada externa. Eventos crus e listas completas de coordenadas também não são enviados por padrão.

## 8. Validação matemática mínima

Fixtures manuais pequenas devem possuir resultado calculável no papel.

Exemplo sequencial:
- 4 rallies passam por `reception -> attack`;
- 3 terminam em vitória;
- 1 em derrota;
- probabilidade empírica observada = 0,75.

Exemplo espacial:
- baseline de recepções: 10/20 rallies ganhos = 0,50;
- região R3: 6/8 ganhos = 0,75;
- `deltaVsBaseline = +0,25` antes de qualquer ajuste.

O teste deve conferir denominador, região e resultado. Não testar apenas snapshot visual.
