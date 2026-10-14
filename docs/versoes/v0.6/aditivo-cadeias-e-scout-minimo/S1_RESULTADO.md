# S1 — resultado do scout mínimo de futsal

**Data:** 01/10/2026. **Próxima etapa:** [S2 — trajetórias completas](etapas/S2_TRAJETORIAS_COMPLETAS.md). A versão distribuída continua em 0.5.0 enquanto o aceite geral da 0.6 permanece aberto.

## Entrega

- Tela principal compacta com placar, faltas, período e relógio/T; controle observado antes da quadra específica de futsal; faixa de ações imediatamente abaixo. Os dois tamanhos alvo mostram relógio, controle, quadra e faixa sem rolagem obrigatória ou transbordamento horizontal.
- A/B, disputa, parada e desconhecido registram o estado em um clique. Com controle selecionado, um toque na quadra salva posição da bola e tempo do início do gesto. F prepara origem e destino da finalização, seguida de resultado; D e V/R usam um ponto, com opção de localização não observada. Atleta e revisão tática são opcionais. Composição, orientação, ajuste justificado de tempo e revisão ficam em Mais.
- Gol confirmado encerra a posse projetada e solicita novo controle; defesa e demais resultados mantêm o controle até outra observação. Desarme transfere controle sem girar a quadra. O giro depende apenas da orientação configurada para o período. T continua independente da coleta, inclusive com Mais aberto.
- Falha ao gravar preserva o fato preparado, a posição e o tempo capturado; o botão Tentar novamente envia uma vez. Desfazer, correções, substituição com relógio rodando, goleiro-linha, reabertura e backup seguem os contratos existentes.

## Verificação

- `e2e/futsal-minimal-layout.spec.ts`: caixas do relógio, controle, quadra e ações dentro do primeiro viewport em 1366×768 e 390×844; sem largura horizontal extra. Capturas dos dois tamanhos foram inspecionadas visualmente durante a execução.
- `e2e/futsal-essential-scout.spec.ts`: relógio/T com Mais aberto, controle, ponto, revisão, substituição, gol, defesa, faltas, correção/desfazer, segundo período, análise e exportações.
- `e2e/futsal-save-retry.spec.ts`: falha única injetada no IndexedDB durante gravação de posição; rascunho preservado, retry salva uma vez e o fato reaparece após reabertura.
- `e2e/futsal-touch-shortcuts.spec.ts`: toque real em viewport móvel e atalhos F/V/R/T/Escape, incluindo origem e destino da finalização e T com Mais aberto.
- `e2e/possession-transfer-orientation.spec.ts`: regressão do desarme e da orientação fixa no futebol e futsal.
- Testes dirigidos de domínio/projeção e gesto (21 testes aprovados), TypeScript, ESLint e `git diff --check` executados nesta rodada.
- Rodada E2E conjunta final: **7/7 cenários aprovados**. Uma execução anterior teve timeout ao abrir a tela inicial antes de criar a partida no teste de layout desktop; a repetição completa passou.

## Limites

- A suíte geral da versão 0.6 e o piloto com operador seguem pendentes da M8. S1 não libera a distribuição 0.6.
- A análise temporal só soma trechos de controle continuamente observados; o gol encerra esse trecho. Não foi incluído xG numérico de futsal.
