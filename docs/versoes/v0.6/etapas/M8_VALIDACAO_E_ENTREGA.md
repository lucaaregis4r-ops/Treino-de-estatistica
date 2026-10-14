# M8 — validação, piloto e entrega da 0.6

**Objetivo:** fechar a versão sem confundir verificação técnica com uso real. **Depende de:** M1–M7.

## Verificação técnica

1. Testar criação, filtro, backup, recarga, correção e exclusão em futsal, futebol e vôlei. Verificar três quadras/modalidades distintas, campos de evento separados e resolução de backup legado.
2. Executar fluxo E2E completo de futsal: nova partida, T, posse, chute, gol, falta 5/6, substituição com relógio rodando, goleiro-linha, pausa, virada de período, revisão, análise e exportação. Confirmar ausência de xG na modalidade.
3. Regressão específica da correção M1: substituição de futebol visível e persistida; substituição de vôlei com rotação correta. Inspeção visual real em desktop 1366×768 e celular 390×844, foco e operação por toque/teclado.
4. Rodar `npm run typecheck`, lint dirigido, testes unitários/integração/E2E relevantes e `npm run build`. Registrar comandos e resultados reais. Não repetir suíte sem alteração ou dúvida concreta.

## Piloto humano

Usar trecho de futsal autorizado, com operador em velocidade normal. Registrar duração, cliques/atalhos, pausas T perdidas, atraso de registro, ações omitidas, correções, facilidade de substituição e cobertura tática. Separar métricas do operador de tempos Playwright. Se não houver trecho/operador, declarar **aguardando piloto** e entregar apenas o estado tecnicamente verificado; não inventar aceite.

## Entrega

Atualizar documentação de usuário e índice da versão, com limitações de xG e exportação. Alterar identificação do aplicativo para 0.6 somente quando a implementação e a entrega solicitada estiverem prontas. Preservar histórico da 0.5 e não declarar suas pendências concluídas por consequência. Relatar arquivos, comportamento, decisões, testes e riscos remanescentes.

## Prompt para o Luna

```text
Leia o plano 0.6, a referência e este M8. Verifique tecnicamente a
versão inteira e faça piloto humano apenas se houver trecho autorizado e
operador real. Corrija falhas encontradas dentro do escopo 0.6, rode os
testes necessários e documente evidências. Não marque piloto como feito
por automação. Atualize a identificação 0.6 apenas na entrega pronta.
```
