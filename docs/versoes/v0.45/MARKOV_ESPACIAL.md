> **Versão/escopo:** 0.45 (roadmap; correspondência SemVer proposta no pacote: 0.4.5).
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Markov espacial e valor de quadra — 0.45

## Objetivo

Usar as coordenadas espaciais já registradas pelo Scout Trainer para responder perguntas como:

- recepções que terminaram em quais regiões estiveram associadas a maior chance de vencer o rally?
- saques direcionados a quais áreas produziram maior chance de breakpoint?
- ataques saindo de onde e terminando onde tiveram maior valor observado?
- quais trajetórias `origem -> destino` estiveram associadas aos melhores desfechos?

O espaço entra como **contexto analítico de primeira classe**, sem transformar cada coordenada em um novo estado Markov.

## Princípio arquitetural

Não criar estados como:

`reception_x0.43_y0.71`

ou:

`attack_P4_x0.81_y0.13_cross_#`

O estado principal continua pequeno:

`serve | reception | attack | block | defense | free_ball | other | terminal_win | terminal_loss`

Cada observação pode carregar contexto espacial separado:

```ts
interface SpatialContext {
  origin?: { x: number; y: number };
  target?: { x: number; y: number };
  originRegionId?: string;
  targetRegionId?: string;
  coordinateSystemVersion: string;
}
```

A análise espacial condiciona ou segmenta o cálculo; ela não multiplica automaticamente o espaço de estados.

## Três níveis de análise

### Nível A — Markov principal

Usa somente o estado principal e contexto esportivo. Responde:

`P(terminal_win | reception)`

### Nível B — Markov condicionado por região

Aplica região como contexto antes do cálculo. Exemplos:

`P(terminal_win | reception, targetRegion = R3)`

`P(terminal_win | attack, originRegion = P4, targetRegion = fundo_1)`

Comparar sempre com um baseline equivalente sob os mesmos filtros:

`deltaVsBaseline = P(win | state + region + filters) - P(win | state + filters)`

Isso permite frases como:

> Recepções terminando na região central próxima à rede estiveram associadas a +14 p.p. na probabilidade estimada de vencer o rally, n=37.

Nunca escrever que a região **causou** a diferença.

### Nível C — superfície contínua de valor

Preservar `x,y` normalizado e derivar uma superfície visual. V1 não precisa de modelo pesado.

Preferência de implementação:
1. usar coordenadas normalizadas existentes;
2. dividir a quadra em uma grade configurável ou reutilizar o sistema de zonas atual;
3. agregar `n`, vitórias e valor por célula;
4. comparar cada célula com o baseline da ação;
5. aplicar suavização estatística centralizada quando habilitada;
6. renderizar mapa de valor/probabilidade sem alterar o evento canônico.

A resolução da grade deve ser configurável. Começar com granularidade conservadora; não usar células tão pequenas que quase todas tenham n=1/2.

## Origem, destino e trajetória

A semântica depende da ação:

| Ação | Coordenada mais importante | Pergunta típica |
|---|---|---|
| saque | destino | para onde sacar esteve associado a mais breakpoint? |
| recepção | destino | para onde a recepção levou a bola e qual foi o valor? |
| ataque | origem + destino | de onde para onde os ataques tiveram maior valor? |
| defesa | origem e/ou destino conforme dado disponível | onde defendemos e para onde a bola foi conduzida? |
| free ball | destino | quais destinos permitiram melhor continuidade? |

Não forçar coordenada inexistente. `origin` e `target` são opcionais e a UI deve distinguir **sem coordenada** de **valor 0**.

## Unidade de observação

Toda saída espacial declara a unidade:

- `event`: cada ação espacial elegível é uma observação ligada ao desfecho do rally;
- `rally`: cada rally conta no máximo uma vez para a pergunta/recorte definido.

A implementação V1 deve definir explicitamente qual unidade cada métrica usa. Não misturar denominadores silenciosamente.

Para perguntas como “passes nesta área”, usar a ação de recepção como observação e ligar cada recepção ao terminal real de seu rally.

## Amostra e estabilização

Sempre retornar `n` e disponibilidade.

Padrão inicial:
- n < 5: não ranquear;
- 5–14: mostrar com aviso;
- n >= 15: normal.

Além da probabilidade empírica, o motor pode expor uma estimativa ajustada por baseline para evitar células 2/2 = 100% dominando o ranking.

Uma opção simples e auditável é shrinkage Beta-Binomial:

`adjustedP = (wins + priorStrength * baselineP) / (n + priorStrength)`

Regras:
- `priorStrength` centralizado e configurável;
- exportar o valor usado;
- manter também a probabilidade empírica;
- não esconder n pequeno com suavização;
- ranking continua obedecendo os limites de amostra.

Se a implementação dessa suavização tornar M2 grande demais, manter o contrato e entregar primeiro `empiricalP + sample warning`, registrando a suavização como subentrega antes de M3. Não substituir por heurística opaca.

## DTOs sugeridos

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
  wins: number;
  losses: number;
  empiricalPointProbability: number | null;
  adjustedPointProbability?: number | null;
  baselinePointProbability: number | null;
  deltaVsBaseline: number | null;
  available: boolean;
  warning?: 'small_sample';
}
```

```ts
interface SpatialValueCell {
  cellId: string;
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  center: { x: number; y: number };
  n: number;
  empiricalPointProbability: number | null;
  adjustedPointProbability?: number | null;
  deltaVsBaseline: number | null;
  available: boolean;
}
```

## Relação com a IA

A IA não recebe coordenadas cruas de todos os eventos.

Ela recebe achados agregados, por exemplo:

```json
{
  "findingId": "reception-target-R3",
  "label": "Recepção -> região central próxima à rede",
  "n": 37,
  "pointProbability": 0.68,
  "baseline": 0.54,
  "deltaVsBaseline": 0.14,
  "warning": null
}
```

Assim o Gemini explica o resultado; não cria o cálculo espacial.

## Critério de sucesso

A 0.45 deve conseguir responder, offline e sem IA:

> Em quais regiões uma determinada ação esteve associada a maior ou menor probabilidade de vencer o rally, com qual amostra e quanto isso diferiu do baseline comparável?
