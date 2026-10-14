# S0 — protótipo operacional do futsal

Hipótese de UX para a S1; requer inspeção com operador durante uma partida ou gravação. O registro da posição da bola deve estar sempre a um gesto após escolher a ação.

## Desktop 1366 × 768

```text
┌ A 2 × 1 B ─ 2º período ─ 08:42 ─ T iniciar/pausar ─ faltas 3/4 ┐
│ Quadra de futsal 40 × 20; lados fixos durante o período             │
│ Toque simples: posição da bola/desarme. Dois toques: chute.          │
│             Origem ● ──────────────────► ◎ Destino                   │
├ Posse: [A 1] [B 2] [disputa] [parada] [?] ─ A com a bola ───────────┤
│ Ações: [Finalizar F] [Desarme D] [Reinício R] [Falta V] [Mais]       │
│ Contexto: resultado do chute ou tipo de reinício; sem exigir atleta. │
└ Retorno: salvo/erro recuperável ─────────────────────── [Desfazer Z] ┘
```

## Mobile 390 × 844

```text
┌ A 2 × 1 B       2º · 08:42  [T] ┐
│ Faltas A 3 · B 4               │
├ Quadra 40 × 20 ────────────────┤
│                                │
│   toque / origem → destino      │
│                                │
├ Posse [A 1] [B 2] [⋯] ─────────┤
│ [Finalizar F] [Desarme D]       │
│ [Reinício R]  [Falta V]         │
│ Resultado e correção no rodapé  │
└ [Desfazer Z] ───────────────────┘
```

**Estados de interação:** foco do teclado visível; `F` ativa trajetória e resultado, `D` ativa ponto único e alterna posse, `T` apenas relógio; Escape cancela intenção sem salvar; erro mantém o rascunho para nova tentativa; `Z` desfaz o último fato. Teclas não disparam enquanto o usuário escreve em entrada, seleção ou diálogo. Resultado e atleta são detalhes opcionais quando não observados. Em 390 px a faixa pode rolar verticalmente; a quadra e o controle permanecem visíveis acima dela.

**Limite da S0:** a tela atual ainda contém painéis extensos. O desenho é contrato para a reorganização visual da S1. Nesta solicitação, atalhos, trajetória de chute, desarme e orientação por período já foram conectados ao fluxo existente.
