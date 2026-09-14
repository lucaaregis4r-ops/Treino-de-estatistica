# Entrega local — U7 — 13/09/2026

Resultado: correções solicitadas implementadas e verificação U7 executada. **Parcialmente verificado**, não 100% concluído. Nenhuma etapa seguinte, nova stack, publicação, commit ou push. A árvore já estava muito modificada e foi preservada.

## Mudanças desta revisão

- Gestual: seleção pela rotação real, Rede P4/P3/P2 e Fundo P5/P6/P1. Sugestão não reordena os atletas, tem borda tracejada e legenda própria; seleção tem fundo destacado. Rede/fundo são posições da rotação, não uma inferência nova de linha de passe.
- Um botão dedicado ao líbero; se houver dois cadastrados, seletor de disponibilidade mantém ambos acessíveis. Reservas ficam expansíveis; `Sem atleta identificado` continua explícito. Não há substituição automática causada por esses controles.
- Nome em tooltip nativo no hover e texto discreto da seleção para toque. Nomes ausentes não exibem `undefined`.
- Detalhes/correção com controles maiores no topo, conteúdo expandido no fluxo da página, teclado nativo e Escape devolvendo foco ao acionador. Sem sobreposição absoluta dos comandos de recuperação.
- Grade gestual corrigida, eliminando a segunda grade desktop conflitante. Quadra preserva 2:1, nomes fora da superfície normalizada, comandos acessíveis em 1366×640. Tablet/celular mantêm fluxo e rolagem; sem escala artificial da página.

Produção: `app.css`, `ScoutScreen.tsx`, `MatchContextBar.tsx`, `GestureCourtInput.tsx/.css`, `gesture/GestureScout.tsx`, `gesture/PlayerQuickPicker.tsx`, `gesture/gesture.css`. Novos testes pequenos do seletor e roteiro de navegador em `e2e/u7-interface.spec.ts`, reutilizando a infraestrutura existente.

## Evidências visuais e de dados

Pasta: [output/u7](../../output/u7). Fixture sintética Serra Vôlei × Lagoa AC, 16 atletas, três eventos iniciais, placar 2×1, R2 e sacador #02. Foi exportada **antes destas correções (estado U6)** e reimportada em contexto isolado. Não é um backup anterior a U1 e nenhuma base real do usuário foi limpa ou alterada para os ensaios.

| Tela | Antes | Depois |
|---|---|---|
| Início, 1366×640 | [antes](../../output/u7/before-inicio-1366x640.png) | [depois](../../output/u7/after-inicio-1366x640.png) |
| Partidas, 1366×640 | [antes](../../output/u7/before-partidas-1366x640.png) | [depois](../../output/u7/after-partidas-1366x640.png) |
| Gestual, 1366×640 | [antes](../../output/u7/before-gestual-1366x640.png) | [depois](../../output/u7/after-gestual-1366x640.png) |
| Gestual, 1024×768 | [antes](../../output/u7/before-gestual-1024x768.png) | [depois](../../output/u7/after-gestual-1024x768.png) |
| Gestual, 768×1024 | [antes](../../output/u7/before-gestual-768x1024.png) | [depois](../../output/u7/after-gestual-768x1024.png) |
| Gestual, 390×844 | [antes](../../output/u7/before-gestual-390x844.png) | [depois](../../output/u7/after-gestual-390x844.png) |
| Análise, 1366×640 | [antes](../../output/u7/before-analise-1366x640.png) | [depois](../../output/u7/after-analise-1366x640.png) |

Comparação usa o mesmo conjunto de eventos, não uma tela artificialmente preenchida depois. Início/Partidas/Análise não foram redesenhados nesta revisão; capturas conferem continuidade. A ausência de pontos na Análise é real: os três códigos da fixture não contêm coordenadas. Avisos temporários de exportação podem diferir entre capturas; não fazem parte dos dados comparados.

Ensaio separado de nomes longos + 20 reservas: cinco tamanhos acima incluindo 683×320 CSS px como proxy de reflow a 200%; sem overflow da página e registro alcançável por scroll. Isso não equivale a zoom nativo nem a um dispositivo físico.

[Relatório verificado](../../output/u7/relatorio-verificado.pdf): gerado depois de registrar saque e recepção com o líbero, salvar análise, selecionar Probabilidade de vitória e recarregar. JSON preservou match, atletas e eventos da fixture, acrescentou os dois registros e manteve configurações de análise/relatório. `pdfinfo` confirmou PDF 1.4 com 3 páginas; extração conferiu 5 eventos, placar 2×1 e `win_probability`. Rodapé `Scout Trainer 0.2` e subtítulo genérico do renderer são legados preservados, não uma mudança de versão nesta revisão.

## Verificações

Node 22.23.2 via nvm; Chrome já instalado, selecionado pela configuração Playwright do checkout. Não foi necessário instalar Chromium ou outra dependência.

| Comando/verificação | Resultado |
|---|---|
| `npm run typecheck` | Aprovado |
| `npm run build` | Aprovado; aviso de chunk >500 kB já existente |
| `npm run lint` | 18 erros e 1 aviso preexistentes; não aprovado globalmente |
| ESLint direcionado: contexto, quadra gestual, seletor, teste do seletor e E2E U7 | Aprovado |
| `npm test` — uma execução completa | 82/83 arquivos, 392/401 testes aprovados; 9 falhas AppFlow |
| AppFlow isolado, atual e cópia anterior às correções | Mesmos 8 casos falham, 5 passam em cada execução |
| Vitest dirigido: PlayerQuickPicker/GestureScout/GestureCourtInput | 3 arquivos, 13/13 aprovados; inclui novo caso de dois líberos, acrescentado depois da suíte completa |
| `npx playwright test e2e/u7-interface.spec.ts --workers=1` | 5/5 aprovados: comparação, persistência/relatório, Visual/Híbrido, toque/cancelamento, nomes longos/reflow |
| `npx playwright test e2e/critical-flow.spec.ts --workers=1 --timeout=20000` | 3/7 aprovados; os mesmos quatro casos falham também na cópia anterior às correções |

Logs: [build](../../output/u7/build-final.log), [types](../../output/u7/typecheck-final.log), [lint global](../../output/u7/lint.log), [lint dirigido](../../output/u7/lint-directed-final.log), [suíte completa](../../output/u7/tests.log), [AppFlow atual](../../output/u7/appflow-isolated.log), [AppFlow antes](../../output/u7/appflow-before.log), [dirigidos](../../output/u7/tests-directed.log), [E2E U7](../../output/u7/review-e2e-verified.log), [críticos atuais](../../output/u7/critical-e2e.log), [críticos antes](../../output/u7/critical-e2e-before.log).

As tentativas iniciais do novo roteiro falharam em seletores de teste (summary aninhado, label/role, mensagem com botão de fechar) e coordenadas de clique relativas à borda. O roteiro foi corrigido para acionar controles reais e conferir o retângulo medido; a última execução passou completa. Nenhuma tolerância do mapper foi alterada para fazer teste passar.

AppFlow: expectativas de confirmação/mini-quadra antigas, troca consultando `.options` de botão, digitação/auto-commit e contagem de projeção espacial. O conjunto de oito casos foi reproduzido em `/tmp/scout-u7-baseline-4p7mRd`, cópia do código com os nove arquivos de UI restaurados do snapshot **anterior às correções**, sem substituir arquivos do checkout. A nona falha da suíte concorrente, início do próximo set, não ocorreu isoladamente antes nem depois. Não é correto resumir isso como apenas seis falhas de rótulo, como constava no histórico U5/U6.

Lint: `HistoricalAnalyticsService.test` (8), `GestureExpectedActionResolver.test` (1), `registrations.test` (3), `App.tsx` (1 erro/1 aviso), `ScoutScreen.tsx` (2), reset de draft em `GestureScout.tsx` (1), `SpatialAnalyticsPanel.test` (2). Linhas violadoras não foram criadas nesta revisão.

E2E crítico: procura `Nova partida` depois de abrir Manual; compara `1 × 0` com texto hoje concatenado no cabeçalho; Alt+T no campo não abre `Comando tático`; procura navegação `Livre` que já mudou. Passaram sacador/rotação, sufixo tático inline e treino avançado. O ensaio de pacote de exportação passa suas verificações de arquivos antes de falhar na navegação para Área livre. O caso Alt+T exige decisão/correção funcional: o guard existente em `handleScreenKeyDown` retorna em inputs antes de consultar atalhos configurados; não foi tratado como simples mudança de texto.

## Auditoria e limites

Revisão desta solicitação limitada à apresentação, seleção local, teclado dos disclosures, testes e documentação. Motor de scout/rally/rotação, reducers, parsers, schemas, persistência IndexedDB, métricas e exporters não foram alterados. Não houve instalação, migração, limpeza da árvore suja ou nova dependência de rede. SHA-256 antes/depois iguais:

- `package.json`: `3ab7708250bc2f6088bb56cf7a1c8c00a30438fdad9f6c266a476276fecac04f`
- `package-lock.json`: `c1424cd987106fea557e6265a25b4156b407a209bef939d71a9b0f45f912e63d`
- `public/sw.js`: `7f71562f0894d62c5bbb07d9743b0afcb32570e2cba75a6eb16c840f16fa0922`

Pendências concretas estão em [VALIDACAO.md](VALIDACAO.md): placar repetido no Resumo (V05); mensagens/contagem da análise sem coordenadas e termos legados; atalhos/suítes antigas; ensaio com backup anterior a U1; zoom nativo, IME, falha real de gravação e parte dos percursos de teclado. Ações rápidas gestuais secundárias continuam sem evento próprio, conforme inventário U0; esta revisão não prometeu implementá-las. Avisos Recharts de tamanho zero em abas montadas mas ocultas continuam presentes.

Próxima ação: fechar essas pendências da U7, sem iniciar U8 (inexistente no pacote) ou redesenhar tudo novamente. Não foi identificada regressão nos registros, rotação e exportações efetivamente exercitados, mas as lacunas acima impedem certificar a matriz inteira.
