# S5 — validação operacional e entrega do aditivo

**Objetivo:** confirmar que o scout ficou mais rápido de operar e que as análises respeitam trajetórias completas. **Depende de:** S1–S4. Não confundir esta etapa com o M8 original da versão 0.6.

## Verificação técnica

- Unitários/integração: fixtures de comprimentos 1/8/20, loops, fronteira por gol/ponto/período, censura, correção/desfazer, reload, backup legado, filtros e denominadores únicos; sem corte de trajetória nem contagem duplicada por perspectiva.
- E2E vôlei, futebol e futsal: abrir unidade, seguir início→fim, exportar e reabrir com a mesma evidência; inspeção das visões de pares/prefixo sem rótulo ambíguo.
- E2E do scout futsal: tempo T, escolha/troca de controle, um toque de bola, chute com e sem origem, gol/rebote, faltas, reinício, substituição volante, erro/retry e correção. Regressão de voleibol e futebol, incluindo suas substituições, sem mudar suas telas de coleta.
- UI real 1366×768 e 390×844: quadra, tempo, controle e ações essenciais no primeiro viewport; mouse, toque, teclado/foco, Escape, sem rolagem horizontal. `npm run typecheck`, lint dirigido, testes relevantes e `npm run build`; registrar comandos/resultados, não apenas intenção.

## Piloto e aceite

Com partida/trecho autorizado e operador real, medir quantidade de toques por marco e finalização, atraso entre lance e registro, T perdido, erros, correções, necessidade de rolagem e facilidade de troca. Fazer comparação justa com o fluxo atual em trecho equivalente e registrar duração/cobertura. Se não houver operador/trecho, escrever **aguardando piloto**; tempo Playwright não é esforço humano.

Atualizar ajuda, índice e documentação da versão com definições de “trajetória registrada completa”, cobertura, Markov local versus prefixo e indisponibilidade do modelo. A identificação 0.6 só muda quando o M8 original e o aceite técnico deste aditivo estiverem prontos; preservar pendências da 0.5. Não publicar instalador por simples conclusão documental.

**Prompt para o Luna:** “Execute apenas S5. Verifique as trajetórias de qualquer comprimento e o fluxo mínimo em três esportes, documente comandos e evidências, corrija falhas reproduzíveis do aditivo e separe piloto humano de automação. Consulte também M8 antes de mudar versão ou declarar entrega.”
