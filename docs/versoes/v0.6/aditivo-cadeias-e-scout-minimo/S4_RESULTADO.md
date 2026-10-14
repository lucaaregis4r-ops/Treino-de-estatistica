# S4 — modelo probabilístico por contexto variável

**Data:** 01/10/2026. **Estado:** implementação concluída; validação funcional programada na S5. O aplicativo permanece em 0.5.0 enquanto M8 estiver parcial.

## Entrega

- Novo modelo derivado `variable-prefix-outcome-v1`, ajustado em memória e sob demanda para uma única modalidade. Usa apenas rallies/posses completos com desfecho; não grava parâmetros, não mistura partidas durante treino e não importa xG/xT de outro esporte.
- Cada unidade fornece uma sequência categorizada inteira. O modelo procura o maior contexto terminal observado, de qualquer comprimento; se faltar suporte, recua para contextos menores e registra o comprimento efetivamente usado. Isso não remove passos da trajetória integral exibida/exportada na S3.
- Ações terminais que codificariam diretamente o próprio rótulo (desarme/virada, falta ou reinício) ficam fora dos tokens preditores; no vôlei, o toque final marcado como falta também é excluído. Esses fatos permanecem na unidade auditável e definem o desfecho-alvo. Finalização continua como categoria de ação, sem usar o resultado do chute como preditor.
- A unidade conta uma vez por contexto, mesmo que repita a mesma combinação de ações. Um contexto publicado exige pelo menos **20 unidades distintas em pelo menos 3 partidas**. O treino geral exige **5 partidas e 100 unidades elegíveis**. Contextos que não cumprem o mínimo não são publicados.
- O LO(M)O retira uma partida inteira do treino em cada rodada. Compara o modelo variável contra três bases treinadas sem essa partida: resultado médio do esporte, resultado da equipe e cadeia de primeira ordem. Usa Brier multiclasses e log loss; o modelo precisa melhorar ambos sobre as três bases e manter erro de calibração top-1 em dez faixas ≤ 0,10.
- Probabilidades dos estados publicados recebem intervalo de 95% por bootstrap determinístico que reamostra partidas, preservando agrupamento interno. A tabela mostra contexto, suporte em unidades/partidas, resultados, intervalos e IDs de evidência.
- A tela compartilhada mostra “modelo indisponível neste recorte”, `n` e motivo se faltar volume, suporte distribuído, ganho sobre as bases, calibração ou recurso. As análises descritivas S3 continuam visíveis. A mesma seção aparece na análise de futsal.

## Limites e decisões

- Brier e log loss são calculados sobre resultados observados e não indicam causalidade. LO(M)O estima generalização a partidas não vistas no corpus, não garante previsão para outra competição.
- O intervalo por bootstrap representa variação entre partidas presentes na amostra. Três partidas por contexto é um mínimo operacional conservador, não uma garantia de amostra representativa.
- O modelo classifica desfechos conforme os adaptadores de rally/posse. Posse sem início/fim observados, rally incompleto e cobertura conflitante não entram na estimativa.
- Resultado indisponível é uma saída válida. O modelo não flexibiliza os limites para forçar a exibição de uma probabilidade.

## Verificação desta rodada

- `npm run typecheck`: passou.
- ESLint dirigido nos módulos de modelo, serviço, app e telas: passou.
- `git diff --check`: passou; busca de espaços finais nos arquivos novos/relevantes não encontrou ocorrências.
- Testes de unidade, E2E e suíte não foram executados nesta rodada; a validação funcional de contextos longos, ausência de vazamento por partida e rejeição de amostras pequenas fica para S5.
- Sem alteração de versão: `package.json` e distribuição permanecem em **0.5.0** enquanto a M8 estiver parcial.

**Próxima etapa:** [S5 — validação e entrega](etapas/S5_VALIDACAO.md).
