# M8 — Resultado da validação técnica

**Estado:** validação parcial; entrega 0.6 ainda não liberada. **Piloto humano:** aguardando piloto.

## Verificações concluídas

- `npm run typecheck` — passou.
- `npm run build` — passou; o Vite emitiu o aviso de bundle principal acima de 500 kB.
- `git diff --check` — passou.
- ESLint dirigido aos testes AppFlow e E2E alterados — passou.
- `npx playwright test e2e/futsal-essential-scout.spec.ts` — passou. O fluxo cobre T, posse, revisão, substituição com relógio ativo, goleiro-linha, finalizações, faltas até 6, correção/undo, avanço ao 2º período, análise, exportação e ausência de xG.
- `npx playwright test e2e/recovery-stage5.spec.ts -g 'football substitution'` — passou. Substituição visível, reabertura e evento persistido conferidos.

## Pendências que bloqueiam a entrega

- `npm test -- --maxWorkers=1` — execução interrompida após 5m53s, depois de reportar 7 falhas em `src/ui/app/AppFlow.test.tsx` e avançar para outros testes. O resultado integral não foi obtido; as falhas visíveis incluem fluxos de navegação, captura e teclado que requerem triagem por teste e regressão antes da entrega.
- Regressão E2E ampla `e2e/recovery-stage5.spec.ts` ainda tem cenários antigos que dependem do formulário de elenco anterior e do registro de voleibol anterior. O caso novo de substituição do futebol passou isoladamente; corrigir/adaptar os demais cenários antes de declarar a regressão completa.
- Não foi executado piloto humano com partida real. Nenhuma evidência automatizada substitui esse aceite operacional.
- Backup, filtro, correção e exclusão para as três modalidades ainda precisam ser conferidos conforme a lista integral do plano M8.

## Decisão de versão

O build comprova que a aplicação compila, mas as falhas de teste impedem declarar validada a entrega. Por isso, `package.json` e a identificação do aplicativo permanecem em `0.5.0` nesta etapa. Atualizar para `0.6.0` depois de resolver as pendências acima e registrar o aceite técnico; o piloto humano permanece separado e marcado como pendente.
