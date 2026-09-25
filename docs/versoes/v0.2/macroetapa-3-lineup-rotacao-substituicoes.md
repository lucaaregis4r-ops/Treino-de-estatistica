> **Versão/escopo:** 0.2 — macroetapas; V3 Analytics é nome de evolução, não release 0.3.
> **Classificação:** Histórico de planejamento/execução; não é a fila vigente.
> Organização documental: 21/09/2026. Entrada vigente: [COMECE AQUI](../../COMECE_AQUI.md).

# Macroetapa 3 — Lineup, rotação e substituições

## Resultado

A partida agora mantém separadas a função cadastrada do atleta, a função ativa no lineup, o slot tático e a posição P1–P6. Substituições comuns são a fonte da verdade e o estado tático é reconstruído por replay.

## Modelo implementado

- `Player.registeredRole`: função cadastrada do atleta, usada principalmente para reservas.
- `LineupSlot.tacticalRole`: identidade tática estável do slot.
- `LineupSlot.activeRole`: função exercida pelo ocupante atual.
- `SetLineup.positions`: associação mutável entre P1–P6 e slots, alterada somente pela rotação.
- `SubstitutionEvent`: registra equipe, set, placar, slot, atletas, funções, rotação e timestamp.

A escalação inicial deriva a função ativa do slot. Ao substituir, a função cadastrada do atleta que entra passa a ser sua função ativa; quando ela não foi cadastrada, a função ativa do slot é preservada para manter compatibilidade com cadastros antigos.

## Detecção automática do 5x1

O fluxo implementado é:

```text
SubstitutionEvent
  → MatchReducer
  → ActiveSetterResolver
  → TacticalPatternDetector
  → DerivedTacticalState
```

O detector agrupa duas substituições da mesma equipe, no mesmo set e placar, antes do próximo rally. Ele reconhece:

- saída do levantador e entrada de atleta ofensivo;
- saída do oposto e entrada do segundo levantador;
- mudança efetiva do levantador ativo;
- retorno, quando o levantador principal volta a ser o ativo.

As substituições continuam independentes. `DerivedSubstitutionGroup` apenas associa seus IDs para interpretação, analytics e apresentação. Não existe evento nem botão específico de inversão.

Estados ambíguos, como dois levantadores ativos ou nenhum, ficam como `unknown`.

## Contexto capturado e analytics

Cada novo `ScoutEvent` recebe no instante da captura:

- `setterPlayerId`;
- `setterPosition`;
- `formationState`.

`StatisticsScope` permite filtrar diretamente por esses três campos. A projeção tática de rallies também os expõe, sem precisar redescobrir o contexto posteriormente.

## Interface

A lateral do scout passou a oferecer uma ação genérica “Sai / Entra / Substituir” por equipe. Ela lista os atletas em quadra e os reservas disponíveis. Após cada troca, mostra discretamente a formação derivada e o levantador ativo.

No cadastro da partida, reservas podem receber função com a sintaxe:

```text
14 Rafael | levantador
18 Bruno | oposto
```

## Replay, undo e compatibilidade

- substituições participam do mesmo mecanismo de undo/redo das demais ações auditáveis;
- o replay recalcula lineup, levantador, formação e grupos derivados;
- o início de rally e a mudança de placar encerram a janela lógica;
- lineups e substituições antigos sem os campos novos continuam sendo inferidos durante o replay;
- a importação JSON valida os novos campos quando presentes.

## Cobertura

Foram adicionados testes para:

- resolução do levantador em slot diferente do original;
- ambiguidade com dois levantadores;
- detecção da inversão;
- janela incompleta sem classificação forçada;
- retorno à formação normal;
- fechamento da janela no próximo rally;
- undo e redo de substituição;
- integração persistida entre substituição, detecção e captura de scout.
