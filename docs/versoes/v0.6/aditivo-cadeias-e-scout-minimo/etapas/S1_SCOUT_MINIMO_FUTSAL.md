# S1 — scout mínimo de futsal

**Estado:** implementada em 01/10/2026. [Resultado e verificações](../S1_RESULTADO.md). Próxima: S2.

**Objetivo:** registrar a bola, o controle e o tempo sem navegar por formulários durante um lance. **Depende de:** S0. **Base técnica:** `FutsalScoutScreen.tsx`/CSS, `GestureCourtInput.tsx`, `ScoutTrainerService.ts`, `FutsalScout.ts` e o fluxo de `football/FootballMinimalScoutScreen.tsx`.

## Tela principal

1. Topo compacto: placar, período, relógio regressivo com botão/T e faltas por equipe. O relógio fica visível e persiste independentemente da coleta. Quadra **específica de futsal** central e sempre acessível no primeiro viewport nos tamanhos-alvo.
2. Controle explícito A/B, disputa, parada e não observado, com estado pressionado visível. Selecionar A ou B registra a observação de controle; trocar diretamente para B após A registra a mudança observada definida em S0. Toque padrão na quadra salva **posição atual da bola** com equipe/estado selecionado e tempo capturado no início do gesto. Não criar passe, condução ou trajetória a partir de um toque.
3. Faixa inferior junto à quadra: Finalização, Falta, Reinício, Substituição, Goleiro-linha, Desfazer e Mais. Finalização abre resultado e origem tocável ou “não observada”; falta/reinício aceitam localização opcional. Se S0 aprovar passe/condução no vocabulário, incluí-los como fatos **voluntários e explícitos** em Mais, com domínio, serviço e backup; nunca gerá-los de dois toques na quadra. Atleta e tática permanecem opcionais. Composição, orientação, ajuste justificado do tempo e revisão tática ficam em Mais/área secundária, sem perder acesso nem alterar sua semântica.
4. Após gol confirmado, mostrar a posse encerrada por regra e pedir novo controle observado; defesa, bloqueio e rebote podem manter o controle. A troca de controle não altera T, placar ou faltas. Substituição continua possível com relógio rodando.
5. Salvar/erro: intenção e posição ficam preservadas quando o IndexedDB falha; oferecer “Tentar novamente” sem duplicar fato; Desfazer reverte a última ação correta; reabertura apresenta reconciliação do relógio e último controle sem fabricar intervalo observado. Corrigir rótulos da quadra gestual no modo ponto. T deve funcionar com menu aberto, salvo foco nativo em campo editável/diálogo.

## Aceite mensurável

- Após escolher o controle, **um toque** na quadra salva posição/tempo e atualiza o histórico sem confirmação. Finalização: ação → toque de origem (ou “não observada”) → resultado; nenhum campo tático obrigatório.
- Em 1366×768 e 390×844, relógio, quadra, controle e ações principais aparecem sem rolagem obrigatória nem largura horizontal extra. Conferir operação por mouse, toque e teclado, foco, Escape, indicadores de gravação/erro e contraste dos controles selecionados.
- E2E: T com menu aberto, troca A→B observada, posição com timestamp, gol/rebote, falta, reinício, substituição com relógio rodando, falha de persistência/retry, undo/correção, reload e backup. Regressão de M4–M7 passa; modelo de futebol/vôlei continua isolado.

**Prompt para o Luna:** “Execute apenas S1. Use o contrato S0 e a tela mínima do futebol como referência de interação. Reorganize o scout do futsal em topo, quadra, controle e faixa inferior, preservando fatos, revisão, trocas e relógio existentes. Teste os casos de aceite e relate evidência visual real dos dois viewports.”
