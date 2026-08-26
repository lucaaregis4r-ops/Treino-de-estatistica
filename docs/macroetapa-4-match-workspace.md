# Macroetapa 4 — Novo Match Workspace

## Resultado

A tela de scout foi reorganizada em torno da partida em andamento. O teclado permanece como meio principal de captura e as duas quadras fornecem o contexto visual de rotação, levantador, líbero, sacador e substituições.

## Estrutura implementada

- `ScoreHeader`: equipes, pontos, sets vencidos, set atual e correções manuais de ponto.
- `MatchContextBar`: equipe sacando, sacador, rotação derivada, levantador ativo e sua posição P1–P6, rally e troca de set.
- `CourtLineup`: uma quadra por equipe, com os seis atletas posicionados, destaques de levantador, líbero e sacador, estado da formação e substituição genérica.
- `ScoutInput`: captura contínua e enquadramento automático de códigos completos, mantendo Enter como confirmação manual quando necessário.
- `EventTimeline`: histórico recente com contexto tático, edição, undo, redo e carregamento incremental.
- `TacticalQuickEditor`: metadados táticos sob demanda, acionáveis por atalho e sem interromper o fluxo principal.

## Fluxo operacional

```text
TECLADO → ScoutInput → serviço de aplicação → eventos de domínio → replay
                                                            ↓
QUADRAS ← CourtLineup + MatchContextBar + ScoreHeader ← MatchWorkspace
```

A interface apenas apresenta o `MatchWorkspace` e envia intenções ao serviço de aplicação. Pontuação, saque, rotação, lineup, formação e histórico continuam determinados pelo domínio e reconstruídos por replay.

## Teclado e continuidade

- códigos enquadráveis são registrados automaticamente após a política de inatividade;
- Enter força o fechamento manual do candidato atual;
- `Ctrl+Z` desfaz e `Ctrl+Shift+Z` refaz;
- Escape cancela a edição ou limpa o candidato;
- os atalhos definidos no perfil abrem o editor rápido, focam a captura, escolhem origem/destino e editam o último evento;
- após registro, correção, substituição e fechamento do editor rápido, o foco retorna ao campo de scout;
- controles complementares usam elementos HTML nativos e permanecem alcançáveis por Tab e acionáveis pelo teclado.

## Responsividade

Em telas largas, as quadras aparecem lado a lado. Abaixo de 900 px elas são empilhadas; em telas estreitas, controles, substituições e timeline reduzem suas colunas sem remover a captura principal.

## Cobertura

Os testes de fluxo verificam:

- presença das regiões de placar, contexto, quadras, captura e timeline;
- foco inicial e recuperação do foco após registrar um evento;
- atualização real da posição P1 após uma substituição e exibição da troca recente;
- enquadramento de um fluxo concatenado;
- mudança visual da quadra visitante após rotação;
- correção tática sem interromper o histórico.
